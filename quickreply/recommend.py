from __future__ import annotations

from typing import Iterable, List, Set


def to_bigrams(text: str) -> Set[str]:
    compact = "".join(ch for ch in (text or "") if not ch.isspace())
    if len(compact) < 2:
        return set()
    return {compact[i : i + 2] for i in range(len(compact) - 1)}


def jaccard_similarity(a: Set[str], b: Set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    uni = len(a | b)
    return float(inter) / float(uni) if uni else 0.0


def recommend(context: str, candidates: Iterable[str], top_k: int) -> List[str]:
    grams = to_bigrams(context or "")
    scored: List[tuple[float, str]] = []
    for phrase in candidates:
        score = jaccard_similarity(grams, to_bigrams(phrase))
        scored.append((score, phrase))
    scored.sort(key=lambda s: s[0], reverse=True)
    return [p for _, p in scored[: max(0, int(top_k))]]



