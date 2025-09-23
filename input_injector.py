from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Optional

import pyperclip
import keyboard


@dataclass
class InjectOptions:
    auto_send: bool = False
    restore_clipboard_delay_s: float = 0.2


def paste_via_clipboard(text: str, opts: Optional[InjectOptions] = None) -> None:
    opts = opts or InjectOptions()
    try:
        old = pyperclip.paste()
    except Exception:
        old = None

    try:
        pyperclip.copy(text)
        time.sleep(0.05)
        keyboard.send("ctrl+v")
        if opts.auto_send:
            time.sleep(0.02)
            keyboard.send("enter")
    finally:
        if old is not None:
            def restore():
                time.sleep(opts.restore_clipboard_delay_s)
                try:
                    pyperclip.copy(old)
                except Exception:
                    pass
            threading.Thread(target=restore, daemon=True).start()



