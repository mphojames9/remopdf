"""
The coaching half of a rewrite reply, and the one honesty check every rewrite goes through.

A rewrite panel used to show three reworded versions and nothing else. That is polish, not help: the single thing
that most separates a strong resume from an average one is real numbers (how many, how often, how much, how fast),
and only the writer knows them. So each reply now carries two more things, both optional and both safe:

    why     one plain sentence per version: what this version does better than the others
    needs   up to 3 questions about lines that describe work but state no scale or result
            ("How many staff did you supervise?"). They are questions for the writer, never claims: the model is told
            never to put a figure of its own in one, and any that quote a line that is not in the writer's text, or a
            line that already has a number, are dropped here.

And one rule for the text itself: a rewrite may not contain a number the original did not have. That has been the
rule for job-tailored rewrites for a while; it now also covers the plain writing assistant (routers/writing_ai.py).

Pure Python, no FastAPI: see tests/test_coaching.py.
"""
import re
from typing import List, Set

from routers.summary_guard import norm, numbers_in

_WORD_NUMBERS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17,
    "eighteen": 18, "nineteen": 19, "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60,
    "seventy": 70, "eighty": 80, "ninety": 90, "hundred": 100, "thousand": 1000, "million": 1000000, "dozen": 12,
}
_WORD_RE = re.compile(r"\b(" + "|".join(_WORD_NUMBERS) + r")\b", re.I)


def _canon(number: str) -> str:
    """'2,000' and '2000' are the same figure; '3.50' and '3.5' too."""
    n = number.replace(",", "").rstrip(".")
    if "." in n:
        n = n.rstrip("0").rstrip(".")
    return n


def figures_in(text: str) -> Set[str]:
    """Every figure in the text, written either as digits or as a number word ('five' is the figure 5)."""
    found = {_canon(n) for n in numbers_in(text or "")}
    found.discard("")
    found.update(str(_WORD_NUMBERS[m.group(1).lower()]) for m in _WORD_RE.finditer(text or ""))
    return found


def adds_a_figure(original: str, rewritten: str) -> bool:
    """True when the rewrite states a number (as digits) that the original does not have in any form.

    Number words in the rewrite are not counted: turning '5' into 'five' is fine, and the model is told to keep its
    figures as the writer wrote them.
    """
    new = {_canon(n) for n in numbers_in(rewritten or "")}
    new.discard("")
    return not new <= figures_in(original)


# --------------------------------------------------------------------------- #
#                                 why / needs                                 #
# --------------------------------------------------------------------------- #

def _one_line(value, limit: int) -> str:
    return re.sub(r"\s+", " ", value).strip()[:limit] if isinstance(value, str) else ""


def clean_why(value) -> str:
    """One short plain sentence. Empty when the model gave nothing usable."""
    text = _one_line(value, 160)
    if len(text) < 8:
        return ""
    # Cut at the first full stop so a rambling note stays a single sentence.
    m = re.search(r"[.!?](\s|$)", text)
    return text[: m.end()].strip() if m else text


def _found_in(line: str, text_norm: str) -> bool:
    """The quoted line really comes from the writer's text (the model copies imperfectly, so allow small slips)."""
    tokens = [t for t in norm(line).split() if len(t) >= 2]
    if len(tokens) < 2:
        return False
    words = set(text_norm.split())
    return sum(1 for t in tokens if t in words) / len(tokens) >= 0.8


def clean_needs(raw, text: str, limit: int = 3) -> List[dict]:
    """The model's 'make it stronger' questions, minus anything that does not hold up. [{line, ask}]"""
    out: List[dict] = []
    seen: Set[str] = set()
    text_norm = norm(text)
    for item in raw if isinstance(raw, list) else []:
        if not isinstance(item, dict):
            continue
        line = _one_line(item.get("line"), 160)
        ask = _one_line(item.get("ask"), 180)
        if len(ask) < 12 or not ask.endswith("?"):
            continue  # a question for the writer, not a statement
        if re.search(r"\d", ask):
            continue  # the model must never put a figure of its own in a question
        if not line or re.search(r"\d", line):
            continue  # nothing to point at, or that line already has its number
        if not _found_in(line, text_norm):
            continue
        key = norm(line)
        if key in seen:
            continue
        seen.add(key)
        out.append({"line": line, "ask": ask})
        if len(out) >= limit:
            break
    return out
