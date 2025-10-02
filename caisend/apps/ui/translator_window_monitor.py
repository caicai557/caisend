#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TranslatorWindowMonitor - 易翻译窗口监控器

监控易翻译窗口的激活、移动和失焦事件
使用Win32 API的事件驱动机制（SetWinEventHook）

Performance Requirements:
- Window detection: <50ms
- Event callback: <10ms
"""

import win32gui
import win32con
import win32api
from ctypes import WINFUNCTYPE, c_int, c_uint, c_void_p, windll
from dataclasses import dataclass
from typing import Optional, Callable
import time


# Win32 event hook callback type
WinEventProcType = WINFUNCTYPE(
    None,
    c_void_p,  # hWinEventHook
    c_uint,    # event
    c_void_p,  # hwnd
    c_int,     # idObject
    c_int,     # idChild
    c_uint,    # dwEventThread
    c_uint     # dwmsEventTime
)


@dataclass
class WindowInfo:
    """窗口信息数据类"""
    hwnd: int              # Windows窗口句柄
    title: str             # 窗口标题
    rect: tuple            # (left, top, right, bottom)
    is_foreground: bool    # 是否前台窗口


class TranslatorWindowMonitor:
    """
    易翻译窗口监控器
    
    使用Win32 SetWinEventHook监听窗口事件，事件驱动而非轮询
    """
    
    def __init__(self):
        self.translator_hwnd = None
        self.callback = None
        self.hook_foreground = None
        self.hook_location = None
        self._win_event_proc = None  # 保持引用防止GC
        self._last_translator_rect = None
        
    def detect_translator_window(self) -> Optional[WindowInfo]:
        """
        检测当前易翻译窗口
        
        Returns:
            WindowInfo: 找到易翻译窗口时返回窗口信息
            None: 未找到时返回None
            
        Performance: <50ms
        """
        start_time = time.perf_counter()
        
        translator_windows = []
        
        def enum_callback(hwnd, _):
            try:
                if not win32gui.IsWindowVisible(hwnd):
                    return True
                
                title = win32gui.GetWindowText(hwnd)
                class_name = win32gui.GetClassName(hwnd)
                
                # 易翻译窗口特征
                translator_keywords = [
                    '易翻译',
                    'easytranslator',
                    'easy translator',
                    'traneasy',
                    '翻译助手',
                    'translation assistant',
                    '翻译器',
                    'translator'
                ]
                
                title_lower = title.lower()
                if any(keyword in title_lower for keyword in translator_keywords):
                    try:
                        rect = win32gui.GetWindowRect(hwnd)
                        fg_hwnd = win32gui.GetForegroundWindow()
                        
                        translator_windows.append({
                            'hwnd': hwnd,
                            'title': title,
                            'rect': rect,
                            'is_foreground': (hwnd == fg_hwnd)
                        })
                    except:
                        pass
                        
            except:
                pass
            return True
        
        win32gui.EnumWindows(enum_callback, None)
        
        # 优先返回前台窗口
        for win in translator_windows:
            if win['is_foreground']:
                elapsed = (time.perf_counter() - start_time) * 1000
                print(f"[TranslatorMonitor] 检测到前台易翻译窗口 (耗时: {elapsed:.1f}ms)")
                return WindowInfo(**win)
        
        # 否则返回第一个找到的窗口
        if translator_windows:
            win = translator_windows[0]
            elapsed = (time.perf_counter() - start_time) * 1000
            print(f"[TranslatorMonitor] 检测到易翻译窗口 (耗时: {elapsed:.1f}ms)")
            return WindowInfo(**win)
        
        elapsed = (time.perf_counter() - start_time) * 1000
        print(f"[TranslatorMonitor] 未找到易翻译窗口 (耗时: {elapsed:.1f}ms)")
        return None
    
    def start_monitoring(self, on_activated, on_moved, on_deactivated):
        """
        开始监控易翻译窗口事件
        
        Args:
            on_activated: 窗口激活回调 fn(hwnd: int)
            on_moved: 窗口移动回调 fn(hwnd: int)
            on_deactivated: 窗口失焦回调 fn(hwnd: int)
        """
        print("[TranslatorMonitor] 启动窗口监控...")
        
        # 初始检测
        window_info = self.detect_translator_window()
        if window_info:
            self.translator_hwnd = window_info.hwnd
            self._last_translator_rect = window_info.rect
            print(f"[TranslatorMonitor] 已锁定易翻译窗口: {window_info.title} (hwnd={window_info.hwnd})")
        else:
            print("[TranslatorMonitor] 警告：未检测到易翻译窗口，将持续监听...")
        
        # 创建事件处理函数
        def win_event_callback(hWinEventHook, event, hwnd, idObject, idChild, dwEventThread, dwmsEventTime):
            try:
                if idObject != 0 or idChild != 0:  # 只处理窗口事件
                    return
                
                # 检查是否是易翻译窗口
                if hwnd != self.translator_hwnd:
                    # 尝试重新检测（可能是新打开的易翻译窗口）
                    try:
                        title = win32gui.GetWindowText(hwnd)
                        title_lower = title.lower()
                        translator_keywords = ['易翻译', 'easytranslator', 'traneasy', '翻译助手']
                        
                        if any(keyword in title_lower for keyword in translator_keywords):
                            print(f"[TranslatorMonitor] 检测到新的易翻译窗口: {title} (hwnd={hwnd})")
                            self.translator_hwnd = hwnd
                        else:
                            return
                    except:
                        return
                
                # 处理不同事件
                if event == win32con.EVENT_SYSTEM_FOREGROUND:
                    # 窗口激活
                    print(f"[TranslatorMonitor] 易翻译窗口激活 (hwnd={hwnd})")
                    on_activated(hwnd)
                    
                elif event == win32con.EVENT_OBJECT_LOCATIONCHANGE:
                    # 窗口位置变化
                    try:
                        rect = win32gui.GetWindowRect(hwnd)
                        if rect != self._last_translator_rect:
                            print(f"[TranslatorMonitor] 易翻译窗口移动: {rect}")
                            self._last_translator_rect = rect
                            on_moved(hwnd)
                    except:
                        pass
                
            except Exception as e:
                print(f"[TranslatorMonitor] 事件处理错误: {e}")
        
        # 创建并保存回调引用（防止GC）
        self._win_event_proc = WinEventProcType(win_event_callback)
        
        # 设置前台窗口变化钩子
        self.hook_foreground = windll.user32.SetWinEventHook(
            win32con.EVENT_SYSTEM_FOREGROUND,
            win32con.EVENT_SYSTEM_FOREGROUND,
            0,
            self._win_event_proc,
            0,
            0,
            0
        )
        
        # 设置窗口位置变化钩子
        self.hook_location = windll.user32.SetWinEventHook(
            win32con.EVENT_OBJECT_LOCATIONCHANGE,
            win32con.EVENT_OBJECT_LOCATIONCHANGE,
            0,
            self._win_event_proc,
            0,
            0,
            0
        )
        
        # 监控失焦事件（通过前台窗口变化推断）
        self._on_deactivated_callback = on_deactivated
        self._previous_foreground = self.translator_hwnd
        
        print(f"[TranslatorMonitor] 监控已启动 (前台钩子={self.hook_foreground}, 位置钩子={self.hook_location})")
    
    def check_focus_change(self):
        """
        检查焦点变化（需要定期调用）
        
        用于检测易翻译失去焦点的情况
        """
        try:
            current_foreground = win32gui.GetForegroundWindow()
            
            # 如果前台窗口从易翻译变为其他窗口
            if self._previous_foreground == self.translator_hwnd and current_foreground != self.translator_hwnd:
                print(f"[TranslatorMonitor] 易翻译窗口失焦 (hwnd={self.translator_hwnd})")
                if self._on_deactivated_callback:
                    self._on_deactivated_callback(self.translator_hwnd)
            
            self._previous_foreground = current_foreground
            
        except Exception as e:
            print(f"[TranslatorMonitor] 焦点检查错误: {e}")
    
    def stop_monitoring(self):
        """停止监控"""
        print("[TranslatorMonitor] 停止窗口监控...")
        
        if self.hook_foreground:
            windll.user32.UnhookWinEvent(self.hook_foreground)
            self.hook_foreground = None
            
        if self.hook_location:
            windll.user32.UnhookWinEvent(self.hook_location)
            self.hook_location = None
        
        self._win_event_proc = None
        print("[TranslatorMonitor] 监控已停止")
    
    def get_window_rect(self, hwnd: int) -> Optional[tuple]:
        """
        获取窗口矩形区域
        
        Args:
            hwnd: 窗口句柄
            
        Returns:
            (left, top, right, bottom) 或 None
        """
        try:
            return win32gui.GetWindowRect(hwnd)
        except:
            return None

