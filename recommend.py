from __future__ import annotations

from typing import Iterable, List, Set


def to_bigrams(text: str) -> Set[str]:
    """
    Build a set of character bigrams from the given text, ignoring whitespace.
    Works well enough for Chinese and simple latin text without extra deps.
    """
    compact = "".join(ch for ch in (text or "") if not ch.isspace())
    if len(compact) < 2:
        return set()
    return {compact[i : i + 2] for i in range(len(compact) - 1)}


def jaccard_similarity(a: Set[str], b: Set[str]) -> float:
    if not a or not b:
        return 0.0
    intersection_size = len(a & b)
    union_size = len(a | b)
    return float(intersection_size) / float(union_size) if union_size else 0.0


def recommend(context: str, candidates: Iterable[str], top_k: int) -> List[str]:
    """
    Rank candidate phrases by Jaccard similarity of bigrams to the context.

    - context: source text to match against
    - candidates: iterable of candidate phrase strings
    - top_k: number of items to return
    """
    grams = to_bigrams(context or "")
    scored: List[tuple[float, str]] = []
    for phrase in candidates:
        score = jaccard_similarity(grams, to_bigrams(phrase))
        scored.append((score, phrase))
    scored.sort(key=lambda s: s[0], reverse=True)
    return [p for _, p in scored[: max(0, int(top_k))]]



