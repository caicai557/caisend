#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
话术推荐助手 - 主程序
集成版：使用新架构 (AppCoordinator + MessagePipeline + PhraseMatcher)
"""
import sys
import signal
import win32event
import win32api
import winerror
from PyQt5 import QtWidgets, QtCore

from apps.cdp.cdp_telegram_capture import TelegramCapture
from apps.core.app_coordinator import AppCoordinator
# from apps.ui.floating_window_simple import FloatingWindow  # 使用简化版悬浮窗（有样式）
from apps.ui.floating_window_interactive import FloatingWindow
from apps.ui.window_controller import WindowController
from apps.ui.system_tray import SystemTray
from apps.ui.floating_window_controller import FloatingWindowController
from apps.ui.translator_floating_controller import TranslatorFloatingController
from config import SAVE_MESSAGES, MESSAGES_DB_PATH, Config

MAX_RECENT = 4
AUTO_FILL = True


def ensure_single_instance():
    mutex = win32event.CreateMutex(None, False, "CaisendAssistantMutex")
    if win32api.GetLastError() == winerror.ERROR_ALREADY_EXISTS:
        print("[App] Already running, exiting.")
        sys.exit(0)

class AppController:
    """应用控制器 - 集成AppCoordinator架构"""
    
    def __init__(self):
        ensure_single_instance()
        self.app = QtWidgets.QApplication(sys.argv)
        self.capture = None
        self.floating_windows = []  # 浮动窗口列表
        self.system_tray = None  # 系统托盘
        self.window_controller = WindowController()
        
        # Initialize new coordinator
        self.coordinator = AppCoordinator(
            messages_db_path="messages.db",
            phrases_db_path="phrases.db",
            enable_matching=True
        )
        
        # 持久化浮动窗口
        self.persistent_floating_window = None
        
        # 浮动窗口控制器（根据配置选择Telegram或易翻译）
        self.floating_controller = None
        self.translator_controller = None
        
        # 读取配置
        self.attach_target = Config.UI_CONFIG.get('attach_target', 'telegram')
        self.show_all_when_no_match = Config.UI_CONFIG.get('show_all_when_no_match', True)
        
        print(f"[AppController] 浮动窗口吸附目标: {self.attach_target}")
        print(f"[AppController] 无匹配显示全部: {self.show_all_when_no_match}")
    
    def initialize(self):
        """初始化应用组件"""
        try:
            print("[启动] 初始化AppController系统...")
            
            self.app.setQuitOnLastWindowClosed(False)
            
            # Connect coordinator signals
            self.coordinator.phrases_matched_signal.connect(self._on_phrases_matched)
            
            # 初始化系统托盘
            if QtWidgets.QSystemTrayIcon.isSystemTrayAvailable():
                self.system_tray = SystemTray(parent=None)
                self.system_tray.show()
                print("[成功] 系统托盘已启动")
            else:
                print("[警告] 系统不支持托盘，跳过托盘初始化")
            
            # 如果配置为显示全部话术，立即创建常驻浮动窗口
            if self.show_all_when_no_match:
                print("[启动] 创建常驻浮动窗口...")
                self._create_persistent_floating_window()
            
            print("[成功] 应用控制器初始化完成")
            return True
            
        except Exception as e:
            print(f"[错误] 应用控制器初始化失败: {e}")
            return False

    def on_new_message(self, text: str, is_outgoing: bool = False):
        """
        处理CDP捕获的新消息（兼容旧接口）
        
        Args:
            text: Message text
            is_outgoing: Whether message is outgoing
        """
        text = (text or "").strip()
        if not text:
            return
        
        try:
            # Convert to CDP event format for coordinator
            import time
            cdp_event = {
                'chat_id': 'unknown',
                'chat_title': 'Telegram',
                'sender_id': 'self' if is_outgoing else 'other',
                'sender_name': 'Me' if is_outgoing else 'Contact',
                'message_id': f'msg_{int(time.time() * 1000)}',
                'text': text,
                'ts_ms': int(time.time() * 1000),
                'lang': None,
                'is_outgoing': is_outgoing
            }
            
            # Process through coordinator (handles DB insertion + matching)
            success = self.coordinator.process_cdp_event(cdp_event)
            
            if success:
                print(f"[AppController] Message processed: {text[:50]}...")
            
        except Exception as exc:
            print(f"[AppController] 处理消息失败: {exc}")
    
    def _on_phrases_matched(self, phrases: list):
        """
        处理匹配到的话术
        
        更新浮动窗口显示的话术
        """
        try:
            # 如果浮动窗口已存在，直接更新话术
            if self.persistent_floating_window is not None:
                if phrases:
                    # 有匹配话术，显示匹配的
                    phrase_texts = [p.get('text', '') for p in phrases if p.get('text')]
                    if phrase_texts:
                        self.persistent_floating_window.update_phrases(phrase_texts)
                        print(f"[AppController] 🔄 浮动窗口已更新为匹配话术 ({len(phrase_texts)}条)")
                        
                        # Auto-fill 第一条匹配话术
                        if AUTO_FILL:
                            best_phrase = phrases[0]
                            phrase_text = best_phrase.get('text', '')
                            if phrase_text:
                                self.window_controller.fill_input(phrase_text, auto_send=False)
                                print(f"[AppController] ✍️ 自动填充: {phrase_text[:50]}...")
                else:
                    # 无匹配，恢复显示全部话术
                    if self.show_all_when_no_match:
                        all_phrases = self._get_all_phrases()
                        phrase_texts = [p.get('text', '') for p in all_phrases if p.get('text')]
                        if phrase_texts:
                            self.persistent_floating_window.update_phrases(phrase_texts)
                            print(f"[AppController] 🔄 浮动窗口已恢复显示全部话术 ({len(phrase_texts)}条)")
                return
            
            # 浮动窗口不存在（不应该发生，因为在initialize时就创建了）
            # 但为了兼容性，还是处理一下
            print("[AppController] ⚠️ 浮动窗口未初始化，尝试创建...")
            
            # 如果无匹配，且配置为显示全部话术
            if not phrases and self.show_all_when_no_match:
                phrases = self._get_all_phrases()
            
            if not phrases:
                return
            
            # 提取话术文本
            phrase_texts = [p.get('text', '') for p in phrases if p.get('text')]
            if not phrase_texts:
                return
            
            # 创建浮动窗口（兜底逻辑）
            self._create_persistent_floating_window()
            
        except Exception as exc:
            print(f"[AppController] ❌ 处理话术失败: {exc}")
            import traceback
            traceback.print_exc()
    
    def _get_all_phrases(self):
        """
        获取所有话术
        
        Returns:
            list: 所有话术列表
        """
        try:
            # 获取所有话术
            import sqlite3
            conn = sqlite3.connect("phrases.db")
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, keywords, text, priority, recency_ms, frequency
                FROM phrases
                ORDER BY priority DESC, frequency DESC, recency_ms DESC
                LIMIT 50
            """)
            
            rows = cursor.fetchall()
            conn.close()
            
            phrases = []
            for row in rows:
                phrases.append({
                    'id': row[0],
                    'keywords': row[1],
                    'text': row[2],
                    'priority': row[3],
                    'recency_ms': row[4],
                    'frequency': row[5]
                })
            
            print(f"[AppController] ✅ 加载了 {len(phrases)} 条话术")
            return phrases
            
        except Exception as e:
            print(f"[AppController] ❌ 加载全部话术失败: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def _create_persistent_floating_window(self):
        """
        创建常驻浮动窗口
        
        在应用启动时立即创建，显示所有话术
        """
        try:
            # 加载所有话术
            phrases = self._get_all_phrases()
            
            if not phrases:
                print("[AppController] 数据库中无话术，跳过浮动窗口创建")
                return
            
            # 提取话术文本
            phrase_texts = [p.get('text', '') for p in phrases if p.get('text')]
            
            if not phrase_texts:
                print("[AppController] 无有效话术文本，跳过浮动窗口创建")
                return
            
            # 创建交互式浮动窗口
            self.persistent_floating_window = FloatingWindow(
                phrase_texts,
                use_smart_positioning=True
            )
            
            # 根据配置创建控制器
            if self.attach_target == 'translator':
                # 易翻译模式
                self.translator_controller = TranslatorFloatingController(
                    self.persistent_floating_window
                )
                self.translator_controller.start()
                print(f"[AppController] ✅ 易翻译常驻浮动窗口已创建 ({len(phrase_texts)}条话术)")
            else:
                # Telegram模式
                self.floating_controller = FloatingWindowController(
                    self.persistent_floating_window
                )
                self.floating_controller.start()
                print(f"[AppController] ✅ Telegram常驻浮动窗口已创建 ({len(phrase_texts)}条话术)")
            
            # 连接到托盘
            if hasattr(self, 'system_tray') and self.system_tray:
                self.system_tray.set_floating_window(self.persistent_floating_window)
            
        except Exception as exc:
            print(f"[AppController] ❌ 创建常驻浮动窗口失败: {exc}")
            import traceback
            traceback.print_exc()

    def get_stats(self):
        """获取统计信息"""
        return self.coordinator.get_stats()
        
    def start_capture(self):
        """启动CDP消息捕获"""
        print("[启动] 启动CDP消息捕获...")
        try:
            self.capture = TelegramCapture(callback=self.on_new_message)
            # 启动监听（在后台线程中）
            import threading
            self.capture_thread = threading.Thread(target=self.capture.listen, daemon=True)
            self.capture_thread.start()
            print("[成功] CDP消息捕获器已启动")
            
            # Start floating window intelligent positioning
            # Note: Controller is created on first phrase match
            if self.attach_target == 'translator':
                if self.translator_controller:
                    self.translator_controller.start()
                    print("[成功] 易翻译浮动窗口智能定位已启动")
                else:
                    print("[提示] 易翻译浮动窗口控制器将在首次匹配话术时启动")
            else:
                if self.floating_controller:
                    self.floating_controller.start()
                    print("[成功] Telegram浮动窗口智能定位已启动")
                else:
                    print("[提示] Telegram浮动窗口控制器将在首次匹配话术时启动")
            
            return True
        except Exception as e:
            print(f"[错误] 启动捕获异常: {e}")
            return False

    def stop_capture(self):
        """停止CDP消息捕获"""
        if self.capture:
            self.capture.close()
            print("[停止] CDP消息捕获器已停止")

    def cleanup_all(self):
        """清理所有资源"""
        print("[AppController] Cleaning up all resources...")
        
        # 停止Telegram浮动窗口控制器
        if self.floating_controller:
            self.floating_controller.stop()
            print("[AppController] Telegram浮动窗口控制器已停止")
        
        # 停止易翻译浮动窗口控制器
        if self.translator_controller:
            self.translator_controller.stop()
            print("[AppController] 易翻译浮动窗口控制器已停止")
        
        # 关闭持久化浮动窗口
        if self.persistent_floating_window:
            self.persistent_floating_window.close()
            print("[AppController] 持久化浮动窗口已关闭")
        
        # 停止捕获
        self.stop_capture()
        
        # 清理系统托盘
        if self.system_tray:
            self.system_tray.hide()
        
        # 清理浮动窗口
        for win in self.floating_windows:
            try:
                win.close()
            except:
                pass
        self.floating_windows.clear()
        
        print("[成功] 资源清理完成")

    def run(self):
        """运行应用"""
        if not self.initialize():
            return 1
            
        if not self.start_capture():
            print("[警告] 消息捕获启动失败，但程序继续运行")
        
        print("\n=== AppController系统已启动 ===")
        print("[就绪] 最近4条消息窗口管理已就绪")
        print("[激活] CDP消息监控已激活")
        print("[等待] 等待Telegram消息...")
        print("\n按 Ctrl+C 退出程序")
        
        # 设置信号处理
        def signal_handler(sig, frame):
            print("\n[退出] 收到退出信号，正在清理...")
            self.cleanup_all()
            if self.app:
                self.app.quit()
            sys.exit(0)
            
        signal.signal(signal.SIGINT, signal_handler)
        
        try:
            return self.app.exec_()
        except KeyboardInterrupt:
            print("\n[退出] 用户中断...")
            self.cleanup_all()
            return 0

def main():
    """主函数"""
    try:
        controller = AppController()
        return controller.run()
    except Exception as e:
        print(f"[错误] 程序启动失败: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())