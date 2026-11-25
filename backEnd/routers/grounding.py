"""
Grounding: is what the AI wrote backed by what the person actually wrote?

The writing assistant, the job-tailored rewrite and the cover letter all tell the model "never invent facts", and
routers/coaching.py already throws away any rewrite that carries a NUMBER the writer never wrote. But a resume line
can be false without a single digit in it:

    "Assisted with welding"          ->  "Led welding operations for the department"     (a promotion nobody earned)
    "Inspected finished panels"      ->  "Improved product quality across the plant"       (a result nobody stated)
    "Used Pastel for stock"          ->  "Managed stock in SAP and Pastel"                 (a tool nobody used)
    "Acting supervisor"              ->  "Supervisor of the finishing team"                (a qualifier quietly dropped)

An employer asks about every line of a resume, so each of these costs the person more than a plain line would.
This module is the deterministic half of the answer: it compares what the model wrote with the writer's own text
and returns what is not backed, worded as instructions the model can follow on a second try.

    problems(source, text, ...)         -> [str]    what is wrong with one piece of text (empty = backed)
    vet(source, items, ...)             -> (kept, failures)
    settle_rewrites(source, items, ask_again, ...) -> [dict]   vet, ask the model once more when too few survive
    letter_problems(source, body, ...)  -> [str]    the same rules for a cover letter (nothing has to be kept)
    drop_ungrounded_sentences(...)      -> str      the last guarantee for a letter

The checks lean towards NOT flagging: a missed invention is caught by the person reading their own resume, but a
false alarm costs a model call and can leave them with fewer versions. Every rule below is therefore narrow.

Pure Python, no FastAPI and no network: see tests/test_grounding.py.
"""
import re
from typing import Callable, Dict, Iterable, List, Optional, Sequence, Tuple

from routers import coaching
from routers.summary_guard import numbers_in

MAX_PROBLEMS = 6  # per piece of text: enough to fix in one go, short enough for the model to follow


# --------------------------------------------------------------------------- #
#                                   plain text                                #
# --------------------------------------------------------------------------- #

def _plain(text: str) -> str:
    """The text without the editor's simple markup (**bold**, *italic*, '- ' bullets)."""
    out = (text or "").replace("*", "")
    return re.sub(r"^[ \t]*[-\u2022]\s+", "", out, flags=re.M)


def _support(source: str, context: str, allowed: str) -> str:
    """Everything the new text is allowed to lean on, lower-cased."""
    return _plain("\n".join(part for part in (source, context, allowed) if part)).lower()


# --------------------------------------------------------------------------- #
#                         1. a result nobody stated                           #
# --------------------------------------------------------------------------- #

# A word that claims an outcome. It is fine when the writer used the same word family, wrong when the model added it.
# "cut", "drove" and "raised" are left out on purpose: in a factory or a warehouse they are ordinary work verbs.
_OUTCOME_ROOTS = (
    "reduc", "increas", "boost", "improv", "enhanc", "accelerat", "streamlin", "optimis", "optimiz", "eliminat",
    "minimis", "minimiz", "maximis", "maximiz", "exceed", "surpass", "outperform", "achiev", "grow",
)
_OUTCOME: List[Tuple[re.Pattern, re.Pattern]] = [
    (re.compile(rf"\b{root}\w*", re.I), re.compile(rf"\b{root}", re.I)) for root in _OUTCOME_ROOTS
]
_OUTCOME.append((re.compile(r"\bsav(?:e[sd]?|ings?)\b", re.I), re.compile(r"\bsav(?:e[sd]?|ings?)\b", re.I)))
_OUTCOME.append((re.compile(r"\b(?:doubled|tripled)\b", re.I), re.compile(r"\b(?:doubled|tripled)\b", re.I)))
_OUTCOME_PHRASES = re.compile(
    r"\b(?:resulting in|resulted in|leading to|led to|as a result|ahead of schedule|on schedule|within budget|"
    r"zero defects|without incident|cost[- ]effective|higher quality|better quality|greater efficiency)\b",
    re.I,
)

# Praise nobody can verify. The same rule: allowed only when the writer used the word.
_EMBELLISH = re.compile(
    r"\b(?:successful(?:ly)?|significant(?:ly)?|substantial(?:ly)?|dramatic(?:ally)?|consistent(?:ly)?|"
    r"exceptional(?:ly)?|outstanding|award[- ]winning|world[- ]class|industry[- ]leading|high[- ]performing|"
    r"best[- ]in[- ]class|proven|track record|extensive(?:ly)?)\b",
    re.I,
)


def _unbacked_results(text: str, support: str) -> List[str]:
    found: List[str] = []
    for rewrite_re, support_re in _OUTCOME:
        for m in rewrite_re.finditer(text):
            if not support_re.search(support):
                found.append(m.group(0).lower())
                break
    for m in _OUTCOME_PHRASES.finditer(text):
        if not re.search(re.escape(m.group(0).lower()), support):
            found.append(m.group(0).lower())
    for m in _EMBELLISH.finditer(text):
        if not re.search(r"\b" + re.escape(m.group(0).lower()[:6]), support):
            found.append(m.group(0).lower())
    return list(dict.fromkeys(found))


# --------------------------------------------------------------------------- #
#                  2. a level of responsibility nobody held                   #
# --------------------------------------------------------------------------- #

_LEAD_VERB = re.compile(
    r"\b(?:led|leads?|leading|manag(?:ed|es|ing)|supervis(?:ed|es|ing)|direct(?:ed|ing)|headed|oversaw|overseeing|"
    r"ran|spearhead(?:ed|ing)?|mentor(?:ed|ing)?|coach(?:ed|es|ing)?|trained|delegat(?:ed|ing)|appointed)\b",
    re.I,
)
_PEOPLE = frozenset(
    "team teams staff crew crews department departments employee employees workers worker operators operator "
    "technicians technician personnel people juniors junior apprentices apprentice trainees trainee artisans "
    "artisan labourers labourer colleagues members workforce shift shifts supervisors managers".split()
)
# Any of these in the writer's own text means they did lead people, so leading verbs are fine.
_LEAD_SUPPORT = re.compile(
    r"\b(?:led|leads?|leading|leader\w*|manag\w*|supervis\w*|foreman|forewoman|chargehand|charge hand|in charge|"
    r"superintend\w*|head|heads|overs\w*|direct(?:ed|ing|or)|chief|principal|spearhead\w*|mentor\w*|"
    r"coach(?:ed|es|ing)?|train(?:ed|ing|er)|delegat\w*)\b",
    re.I,
)
# A seniority word is a claim about the writer. (role word in the new text) -> (the stem the writer's text must hold)
_SENIORITY = [
    (re.compile(r"\bsenior\b", re.I), "senior"),
    (re.compile(r"\bprincipal\b", re.I), "principal"),
    (re.compile(r"\bchief\b", re.I), "chief"),
    (re.compile(r"\bdirector\b", re.I), "director"),
    (re.compile(r"\bexecutive\b", re.I), "executive"),
    (re.compile(r"\bhead of\b", re.I), "head"),
    (re.compile(r"\bteam lead(?:er)?\b", re.I), "lead"),
    (re.compile(r"\bsupervisor\b", re.I), "supervis"),
    (re.compile(r"\bmanager\b", re.I), "manag"),
]


def _inflated_scope(text: str, support: str) -> Tuple[List[str], List[str]]:
    """(leading verbs used on people with nothing to back them, seniority words with nothing to back them)"""
    verbs: List[str] = []
    if not _LEAD_SUPPORT.search(support):
        for fragment in re.split(r"[\n.;]+", text):
            for m in _LEAD_VERB.finditer(fragment):
                nearby = re.findall(r"[A-Za-z]+", fragment[m.end():])[:8]
                if any(word.lower() in _PEOPLE for word in nearby):
                    verbs.append(m.group(0).lower())
    ranks = [name for pattern, stem in _SENIORITY for name in [pattern.search(text)] if name and not re.search(r"\b" + stem, support)]
    return list(dict.fromkeys(verbs)), list(dict.fromkeys(m.group(0).lower() for m in ranks))


# --------------------------------------------------------------------------- #
#                    3. a tool, standard or place nobody named                #
# --------------------------------------------------------------------------- #

_ACRONYM = re.compile(r"(?<![A-Za-z0-9])[A-Z][A-Z0-9&]*[A-Z0-9](?![A-Za-z0-9])")
_CAPWORD = re.compile(r"(?<![A-Za-z0-9])[A-Z][a-z]+(?:[A-Z][a-z]*)*(?![A-Za-z0-9])")
_NOT_NAMES = frozenset({"cv", "ats", "pdf"})  # things every resume and letter says about itself
_NEUTRAL = re.compile(r"\bhiring (?:manager|team|committee)s?\b", re.I)  # a letter may address them


def _is_sentence_start(text: str, index: int) -> bool:
    before = text[:index].rstrip(" \t")
    return not before or before[-1] in ".!?\n\"'(\u201c\u2018["


def _named(text: str, *, acronyms_only: bool = False) -> List[str]:
    """Acronyms (PASTEL, ISO, H&S) and capitalised words that are not the first word of a sentence (Excel, Harbour)."""
    plain = _plain(text)
    found: List[str] = []
    for m in _ACRONYM.finditer(plain):
        if sum(ch.isalpha() for ch in m.group(0)) >= 2:
            found.append(m.group(0))
    if not acronyms_only:
        for m in _CAPWORD.finditer(plain):
            if len(m.group(0)) >= 3 and not _is_sentence_start(plain, m.start()):
                found.append(m.group(0))
    seen: Dict[str, str] = {}
    for token in found:
        if token.lower() not in _NOT_NAMES:
            seen.setdefault(token.lower(), token)
    return list(seen.values())


def _mentions(haystack_lower: str, token: str) -> bool:
    return bool(re.search(r"(?<![a-z0-9])" + re.escape(token.lower()) + r"(?:s|es)?(?![a-z0-9])", haystack_lower))


# --------------------------------------------------------------------------- #
#                  4. a level the writer gave, quietly removed                #
# --------------------------------------------------------------------------- #

_LEVEL_WORDS = (
    "acting", "interim", "trainee", "intern", "internship", "junior", "apprentice", "apprenticeship", "volunteer",
    "temporary", "part-time", "part time", "entry-level", "entry level", "basic", "familiar", "exposure",
)
_SUPPORT_SOURCE = re.compile(r"\b(?:assist\w*|help(?:ed|ing|s)?)\b", re.I)
_SUPPORT_KEPT = re.compile(r"\b(?:assist\w*|help\w*|support\w*|contribut\w*|particip\w*|involve\w*)\b", re.I)


def _dropped_levels(source: str, text: str) -> List[str]:
    src, new = _plain(source).lower(), _plain(text).lower()
    lost = [w for w in _LEVEL_WORDS if re.search(r"\b" + re.escape(w) + r"\w*", src) and not re.search(r"\b" + re.escape(w[:5]), new)]
    if _SUPPORT_SOURCE.search(src) and not _SUPPORT_KEPT.search(new):
        lost.append("assisted")
    return lost


# --------------------------------------------------------------------------- #
#                                   the check                                 #
# --------------------------------------------------------------------------- #

def _quote(words: Iterable[str], limit: int = 4) -> str:
    return ", ".join(f'"{w}"' for w in list(words)[:limit])


def problems(source: str, text: str, *, context: str = "", allowed: str = "", keep_facts: bool = True) -> List[str]:
    """What in `text` is not backed by `source`, as instructions for the model. Empty when it is backed.

    source      the writer's own words (the block being rewritten, or the whole resume for a letter)
    context     other facts the writer gave, such as the job title of the entry (counts as backed, never has to be kept)
    allowed     words that may appear without being a claim (the position and company in a letter, "6 years")
    keep_facts  also require that the writer's figures, tools and levels ("acting", "assisted") are still there; true
                for a rewrite of a block, false for a letter, which only picks some of the resume
    """
    plain = _NEUTRAL.sub(" ", _plain(text))
    support = _support(source, context, allowed)
    out: List[str] = []

    new_figures = sorted(
        {coaching._canon(n) for n in numbers_in(plain)} - {""} - coaching.figures_in("\n".join((source, context, allowed))),
        key=lambda n: (len(n), n),
    )
    if new_figures:
        out.append(f"Remove the figure {_quote(new_figures)}: the writer never wrote it. Never add, round or change a number.")

    verbs, ranks = _inflated_scope(plain, support)
    if verbs:
        out.append(
            f"Remove {_quote(verbs)} used on people: the text never says the writer led, managed or supervised anyone. "
            'Keep the level of responsibility the writer gave ("assisted" stays "assisted").'
        )
    if ranks:
        out.append(f"Remove the seniority word {_quote(ranks)}: nothing in the text gives the writer that rank.")

    results = _unbacked_results(plain, support)
    if results:
        out.append(f"Remove {_quote(results)}: the text states no such result. Say what the work was, not what it achieved.")

    names = [n for n in _named(plain) if not _mentions(support, n)]
    if names:
        out.append(f"Remove {_quote(names)}: the writer never named it. Only use tools, standards, employers, places and languages the text names.")

    if keep_facts:
        rewritten = plain.lower()
        lost_figures = sorted(coaching.figures_in(source) - coaching.figures_in(plain), key=lambda n: (len(n), n))
        lost_names = [n for n in _named(source, acronyms_only=True) if not _mentions(rewritten, n)]
        if lost_figures or lost_names:
            kept = _quote(lost_names + lost_figures, 5)
            out.append(f"Keep {kept}: the writer stated it, and an employer or an ATS searches for it.")
        levels = _dropped_levels(source, plain)
        if levels:
            out.append(f"Keep the level the writer gave ({_quote(levels)}): do not make the work sound more senior than it was.")

    return out[:MAX_PROBLEMS]


# --------------------------------------------------------------------------- #
#                               rewrites (a list)                             #
# --------------------------------------------------------------------------- #

def vet(
    source: str, items: Sequence[dict], *, context: str = "", allowed: str = "", keep_facts: bool = True
) -> Tuple[List[dict], List[Tuple[str, List[str]]]]:
    """(the rewrites that are backed, [(label, what was wrong)] for the ones that were not)."""
    kept: List[dict] = []
    failures: List[Tuple[str, List[str]]] = []
    for item in items:
        found = problems(source, item.get("text", ""), context=context, allowed=allowed, keep_facts=keep_facts)
        if found:
            failures.append((str(item.get("label") or "Version"), found))
        else:
            kept.append(item)
    return kept, failures


def correction(failures: Sequence[Tuple[str, Sequence[str]]]) -> str:
    """The message that tells the model exactly what was wrong with each rejected version."""
    blocks = []
    for label, found in failures[:3]:
        blocks.append(f'Version "{label}":\n' + "\n".join(f"- {p}" for p in found))
    return (
        "These versions were rejected because they say things the writer's text does not support:\n\n"
        + "\n\n".join(blocks)
        + "\n\nWrite all three versions again with every problem fixed. Use only what the writer's text states, in the "
        "same way it states it. All the earlier rules still apply. Return only the JSON object, in the same shape as before."
    )


def settle_rewrites(
    source: str,
    items: Sequence[dict],
    ask_again: Callable[[str], Sequence[dict]],
    *,
    context: str = "",
    allowed: str = "",
    want: int = 2,
    limit: int = 3,
    log: Callable[[str], None] = print,
) -> List[dict]:
    """The rewrites that are backed by the writer's text.

    When fewer than `want` survive and something was rejected, the model is told exactly what was wrong and asked
    once more. Whatever the second try gets right is added to what already passed. A second try that fails (the
    network, today's allowance) simply leaves the first answer's survivors, so this can only ever remove untruths.
    """
    kept, failures = vet(source, items, context=context, allowed=allowed)
    if len(kept) < want and failures:
        try:
            again = ask_again(correction(failures))
        except Exception as err:  # a failed correction round must never lose what already passed
            log(f"[grounding] correction round failed: {type(err).__name__}: {str(err)[:120]}")
            again = []
        more, _ = vet(source, again, context=context, allowed=allowed)
        have = {item.get("text", "").strip() for item in kept}
        for item in more:
            if item.get("text", "").strip() not in have:
                kept.append(item)
                have.add(item.get("text", "").strip())
    out = [dict(item) for item in kept[:limit]]
    for n, item in enumerate(out, 1):
        item["id"] = f"rw{n}"
    return out


# --------------------------------------------------------------------------- #
#                                cover letters                                #
# --------------------------------------------------------------------------- #

def letter_problems(source: str, body: str, *, allowed: str = "") -> List[str]:
    """The same rules for a finished letter. `source` is the whole resume as words; nothing has to be kept."""
    return problems(source, body, allowed=allowed, keep_facts=False)


_SENTENCE_END = re.compile(r"(?<=[.!?])\s+")


def drop_ungrounded_sentences(source: str, body: str, *, allowed: str = "") -> str:
    """The last guarantee: no sentence that claims an invented result, rank, tool or figure leaves the server.

    Whatever the model did on either try, a sentence the resume does not back is removed. If too little text is left
    the route answers that there is no AI letter and the app shows its own draft, which is built only from the resume.
    """
    paragraphs: List[str] = []
    for paragraph in re.split(r"\n\s*\n", body):
        rows: List[str] = []
        for line in paragraph.split("\n"):
            sentences = _SENTENCE_END.split(line.strip()) if line.strip() else []
            good = [s for s in sentences if not letter_problems(source, s, allowed=allowed)]
            if good:
                rows.append(" ".join(good))
        if rows:
            paragraphs.append("\n".join(rows))
    return "\n\n".join(paragraphs).strip()
