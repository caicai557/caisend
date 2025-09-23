from __future__ import annotations

from typing import Callable, Dict

import keyboard


class HotkeyManager:
    def __init__(self) -> None:
        self._ids: Dict[str, int] = {}

    def register(self, combo: str, callback: Callable[[], None]) -> None:
        try:
            if combo in self._ids:
                keyboard.remove_hotkey(self._ids[combo])
            self._ids[combo] = keyboard.add_hotkey(combo, callback)
        except Exception:
            # Fallback: ignore registration errors
            pass

    def clear(self) -> None:
        for k, hid in list(self._ids.items()):
            try:
                keyboard.remove_hotkey(hid)
            except Exception:
                pass
        self._ids.clear()



