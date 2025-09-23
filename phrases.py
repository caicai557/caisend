from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import List


DEFAULT_PATH = Path(__file__).with_name("phrases.json")


@dataclass(frozen=True)
class Phrase:
    id: str
    tpl: str
    tags: tuple[str, ...] = ()


def load_phrases(path: Path | None = None) -> List[Phrase]:
    file = path or DEFAULT_PATH
    try:
        raw = json.loads(file.read_text(encoding="utf-8"))
    except Exception:
        return []
    phrases: List[Phrase] = []
    for it in raw or []:
        pid = str(it.get("id", "")).strip() or ""
        tpl = str(it.get("tpl", "")).strip()
        tags = tuple(map(str, it.get("tags", []) or []))
        if tpl:
            phrases.append(Phrase(id=pid, tpl=tpl, tags=tags))
    return phrases


def to_strings(items: List[Phrase]) -> List[str]:
    return [p.tpl for p in items]



