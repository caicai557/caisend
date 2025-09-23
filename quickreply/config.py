from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    top_k: int = 5
    hotkey_show: str = "alt+`"
    hotkey_reload: str = "ctrl+alt+r"
    hotkey_toggle_send: str = "ctrl+alt+enter"
    target_keywords: tuple[str, ...] = ("易翻译", "微信", "QQ", "企业微信", "WeChat", "Telegram")


def load_settings(path: Path) -> Settings:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return Settings()
    return Settings(
        top_k=int(raw.get("top_k", 5)),
        hotkey_show=str(raw.get("hotkey_show", "alt+`")),
        hotkey_reload=str(raw.get("hotkey_reload", "ctrl+alt+r")),
        hotkey_toggle_send=str(raw.get("hotkey_toggle_send", "ctrl+alt+enter")),
        target_keywords=tuple(raw.get("target_keywords", Settings().target_keywords)),
    )



