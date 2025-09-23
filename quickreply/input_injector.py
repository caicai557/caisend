from __future__ import annotations

import threading
import time
from typing import Optional

import pyperclip
import keyboard


def paste_via_clipboard(text: str, auto_send: bool = False, restore_delay: float = 0.2) -> None:
    """
    Copy text to clipboard, send Ctrl+V to paste into the focused app,
    optionally send Enter, then restore previous clipboard after a short delay.
    """
    try:
        old: Optional[str] = pyperclip.paste()
    except Exception:
        old = None
    try:
        pyperclip.copy(text)
        time.sleep(0.05)
        keyboard.send("ctrl+v")
        if auto_send:
            time.sleep(0.02)
            keyboard.send("enter")
    finally:
        if old is not None:
            def restore():
                time.sleep(restore_delay)
                try:
                    pyperclip.copy(old)
                except Exception:
                    pass
            threading.Thread(target=restore, daemon=True).start()



