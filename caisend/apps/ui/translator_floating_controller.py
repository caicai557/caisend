#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TranslatorFloatingController - 易翻译浮动窗口控制器

管理浮动窗口相对易翻译窗口的智能定位
- 吸附到易翻译窗口下方
- 实时跟随易翻译移动
- 易翻译失焦时隐藏
- 易翻译重新激活时重新吸附（重置手动拖动）
"""

from PyQt5.QtWidgets import QWidget
from PyQt5.QtCore import QTimer
import win32gui

from apps.ui.translator_window_monitor import TranslatorWindowMonitor
from apps.ui.monitor_manager import MonitorManager
from apps.ui.position_calculator import PositionCalculator, FloatingWindowPosition


class TranslatorFloatingController:
    """
    易翻译浮动窗口控制器
    
    协调 TranslatorWindowMonitor, MonitorManager, PositionCalculator
    实现浮动窗口智能吸附到易翻译窗口
    """
    
    def __init__(self, floating_window: QWidget):
        """
        初始化控制器
        
        Args:
            floating_window: 要控制的浮动窗口（QWidget）
        """
        self.window = floating_window
        self.window_monitor = TranslatorWindowMonitor()
        self.monitor_mgr = MonitorManager()
        self.pos_calc = PositionCalculator()
        
        self.current_translator_hwnd = None
        self.is_monitoring = False
        
        # 防抖动定时器（50ms）
        self.debounce_timer = QTimer()
        self.debounce_timer.setSingleShot(True)
        self.debounce_timer.timeout.connect(self._execute_update)
        self.pending_update = None
        
        # 焦点检查定时器（200ms）
        self.focus_check_timer = QTimer()
        self.focus_check_timer.timeout.connect(self._check_focus)
        
        # 手动拖动标志
        self.manual_position_override = False
        
        # 监听浮动窗口的拖动事件
        if hasattr(self.window, 'state'):
            # 浮动窗口被拖动时设置手动覆盖标志
            original_mouse_release = self.window.mouseReleaseEvent
            
            def on_mouse_release(event):
                if hasattr(self.window.state, 'is_dragging') and self.window.state.is_dragging:
                    self.manual_position_override = True
                    print("[TranslatorController] 用户手动拖动，已暂停自动吸附")
                original_mouse_release(event)
            
            self.window.mouseReleaseEvent = on_mouse_release
        
        print("[TranslatorController] 易翻译浮动窗口控制器已初始化")
    
    def start(self):
        """启动智能定位"""
        if self.is_monitoring:
            print("[TranslatorController] 控制器已在运行")
            return
        
        print("[TranslatorController] 启动易翻译浮动窗口智能定位...")
        
        # 启动窗口监控
        self.window_monitor.start_monitoring(
            on_activated=self._on_window_activated,
            on_moved=self._on_window_moved,
            on_deactivated=self._on_window_deactivated
        )
        
        # 启动焦点检查定时器
        self.focus_check_timer.start(200)  # 每200ms检查一次焦点
        
        # 初始定位
        window_info = self.window_monitor.detect_translator_window()
        if window_info:
            self.current_translator_hwnd = window_info.hwnd
            if window_info.is_foreground:
                self._update_position(window_info.hwnd)
                self.window.show()
            else:
                self.window.hide()
        
        self.is_monitoring = True
        print("[TranslatorController] 智能定位已启动")
    
    def stop(self):
        """停止智能定位"""
        if not self.is_monitoring:
            return
        
        print("[TranslatorController] 停止易翻译浮动窗口智能定位...")
        
        self.window_monitor.stop_monitoring()
        self.debounce_timer.stop()
        self.focus_check_timer.stop()
        
        self.is_monitoring = False
        print("[TranslatorController] 智能定位已停止")
    
    def _on_window_activated(self, hwnd: int):
        """
        易翻译窗口激活回调
        
        重置手动拖动标志，重新吸附
        """
        print(f"[TranslatorController] 易翻译窗口激活: hwnd={hwnd}")
        
        self.current_translator_hwnd = hwnd
        
        # 重置手动拖动标志（易翻译重新激活时重新吸附）
        if self.manual_position_override:
            print("[TranslatorController] 易翻译重新激活，重置手动拖动标志，重新吸附")
            self.manual_position_override = False
        
        # 显示并更新位置
        self._update_position(hwnd)
        self.window.show()
        self.window.raise_()  # 置顶
    
    def _on_window_moved(self, hwnd: int):
        """
        易翻译窗口移动回调
        
        使用防抖动机制，避免频繁更新
        """
        if self.manual_position_override:
            # 用户手动拖动后，不自动跟随
            return
        
        # 防抖动：50ms内的多次移动只执行最后一次
        self.pending_update = hwnd
        self.debounce_timer.start(50)
    
    def _on_window_deactivated(self, hwnd: int):
        """
        易翻译窗口失焦回调
        
        隐藏浮动窗口
        """
        print(f"[TranslatorController] 易翻译窗口失焦: hwnd={hwnd}")
        self.window.hide()
    
    def _check_focus(self):
        """定期检查焦点变化"""
        self.window_monitor.check_focus_change()
    
    def _execute_update(self):
        """执行防抖动后的位置更新"""
        if self.pending_update:
            self._update_position(self.pending_update)
            self.pending_update = None
    
    def _update_position(self, translator_hwnd: int):
        """
        更新浮动窗口位置
        
        吸附到易翻译窗口下方居中
        """
        try:
            # 获取易翻译窗口位置
            translator_rect = win32gui.GetWindowRect(translator_hwnd)
            
            # 获取浮动窗口大小
            floating_width = self.window.width()
            floating_height = self.window.height()
            
            # 获取窗口所在显示器
            target_monitor = self.monitor_mgr.get_monitor_for_window(translator_hwnd)
            
            if not target_monitor:
                print("[TranslatorController] ⚠️ 未找到目标显示器，使用主显示器")
                target_monitor = self.monitor_mgr.get_primary_monitor()
            
            # 计算吸附位置（下方居中）
            position = self.pos_calc.calculate_position(
                telegram_rect=translator_rect,
                floating_size=(floating_width, floating_height),
                monitor=target_monitor
            )
            
            # 应用位置
            self.window.move(position.x, position.y)
            
            print(f"[TranslatorController] ✅ 位置更新: ({position.x}, {position.y}) | {position.placement}")
            
        except Exception as e:
            print(f"[TranslatorController] ❌ 更新位置失败: {e}")
            import traceback
            traceback.print_exc()
    
    def reset_manual_override(self):
        """
        重置手动拖动标志
        
        可以被外部调用，强制重新吸附
        """
        self.manual_position_override = False
        if self.current_translator_hwnd:
            self._update_position(self.current_translator_hwnd)
            print("[TranslatorController] 已重置手动拖动标志并重新吸附")

