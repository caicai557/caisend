from __future__ import annotations

import ctypes
from dataclasses import dataclass


user32 = ctypes.windll.user32


@dataclass(frozen=True)
class Rect:
    left: int
    top: int
    right: int
    bottom: int


def get_foreground_hwnd() -> int:
    try:
        return int(user32.GetForegroundWindow())
    except Exception:
        return 0


def get_window_title(hwnd: int) -> str:
    try:
        buf = ctypes.create_unicode_buffer(512)
        user32.GetWindowTextW(hwnd, buf, 512)
        return buf.value or ""
    except Exception:
        return ""


def get_window_rect(hwnd: int) -> Rect | None:
    class RECT(ctypes.Structure):
        _fields_ = [("left", ctypes.c_long), ("top", ctypes.c_long), ("right", ctypes.c_long), ("bottom", ctypes.c_long)]
    rc = RECT()
    try:
        if user32.GetWindowRect(hwnd, ctypes.byref(rc)):
            return Rect(rc.left, rc.top, rc.right, rc.bottom)
    except Exception:
        pass
    return None


def set_noactivate(hwnd: int) -> None:
    GWL_EXSTYLE = -20
    WS_EX_NOACTIVATE = 0x08000000
    WS_EX_TOOLWINDOW = 0x00000080
    WS_EX_TOPMOST = 0x00000008
    try:
        ex = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
        user32.SetWindowLongW(hwnd, GWL_EXSTYLE, ex | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW | WS_EX_TOPMOST)
    except Exception:
        pass



