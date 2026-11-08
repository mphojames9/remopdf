"""
Helpers for the AI cover letter (routers/writing_ai.py). Plain Python, no web framework, so they can be tested on
their own.

What they are for
  - Adverts are full of boilerplate ("manage multiple priorities", "strong communication, interpersonal and
    stakeholder management skills"). Pasted back into a letter it reads as empty and says nothing about the
    applicant. split_requirements() separates those lines from the specific ones.
  - matching_terms() finds the words the advert and the resume share. Those are the honest ATS keywords: the letter
    is asked to use them, spelled the way the advert spells them.
  - letter_problems() checks a finished letter (position missing, vague stand-ins such as "the role you are
    offering", boilerplate or advert wording copied, clichés). The route asks the model to fix them once.
  - ensure_position() is the last guarantee: whatever the model did, the first paragraph names the position.
  - normalize_dashes() turns the Unicode hyphens a model likes to use into a plain "-". The PDF fonts have no glyph
    for them, so "high-gloss" used to print as "highgloss".
"""
import re
from typing import List, Tuple

# --------------------------------------------------------------------------- #
#                      boilerplate lines in job adverts                       #
# --------------------------------------------------------------------------- #

# A requirement or duty that matches is "general": every advert has it and it says nothing specific.
GENERIC_ITEM_RE = re.compile(
    r"multiple priorities|meet(?:ing)? deadlines|work(?:ing)? independently|team environment|"
    r"collaborative(?:ly)?|interpersonal|stakeholder management|communication skills|"
    r"relevant systems|tools,? (?:and )?technologies|similar role|industry environment|"
    r"efficient and professional|agreed objectives|performance outcomes|established timelines|"
    r"fast[- ]paced|self[- ]motivated|team player|associated with the role",
    re.I,
)

# The same boilerplate, as it must NOT appear in the finished letter.
BOILERPLATE_IN_LETTER_RE = re.compile(
    r"multiple priorities|stakeholder management|relevant systems|tools,? (?:and )?technologies|"
    r"similar role|industry environment|team environment|work(?:ing)? independently|established timelines|"
    r"agreed objectives|performance outcomes|efficient and professional|associated with the role",
    re.I,
)

# "the role you are offering", "the advertised position", "the opportunity you have available" ...
VAGUE_POSITION_RE = re.compile(
    r"\b(?:role|position|vacancy|opportunity|job)\s+(?:that\s+)?(?:you\s+(?:are\s+|have\s+)?(?:offering|advertis\w+|available)"
    r"|(?:being\s+|currently\s+)?(?:offered|advertised|available))\b"
    r"|\b(?:advertised|vacant)\s+(?:role|position|vacancy)\b",
    re.I,
)

CLICHE_RE = re.compile(
    r"i am writing to (?:express|apply)|team player|hard[- ]working|results[- ]driven|passionate about|"
    r"proven track record|go-getter|\bdynamic\b",
    re.I,
)


def split_requirements(items: List[str]) -> Tuple[List[str], List[str]]:
    """(specific, general). The order, most important first, is kept inside each list."""
    specific: List[str] = []
    general: List[str] = []
    for item in items:
        (general if GENERIC_ITEM_RE.search(item) else specific).append(item)
    return specific, general


# --------------------------------------------------------------------------- #
#                      words the advert and the resume share                  #
# --------------------------------------------------------------------------- #

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z]{3,}")
_SUFFIXES = ("ations", "ation", "ings", "ing", "ers", "ed", "es", "er", "s")

_STOP = frozenset(
    """that this with from have has will your their they them these those which what when where while about above
    across also another around because been before being between both could does each either else even ever every
    into just like make many more most much must need only other over same should some such than then there
    through under until upon very were would able ability experience experienced skills skill strong proven
    demonstrated working work role position including include includes least years year within relevant required
    requirement requirements advantageous related similar""".split()
)


def _stem(word: str) -> str:
    for suffix in _SUFFIXES:
        if word.endswith(suffix) and len(word) - len(suffix) >= 4:
            return word[: -len(suffix)]
    return word


def matching_terms(posting_items: List[str], corpus: str, limit: int = 12) -> List[str]:
    """Words from the advert (in the advert's own spelling) that the resume text also contains."""
    resume_stems = {_stem(w.lower()) for w in _WORD_RE.findall(corpus) if w.lower() not in _STOP}
    seen = set()
    found: List[str] = []
    for item in posting_items:
        for word in _WORD_RE.findall(item):
            lower = word.lower()
            if lower in _STOP:
                continue
            stem = _stem(lower)
            if stem in seen:
                continue
            seen.add(stem)
            if stem in resume_stems:
                found.append(lower)
                if len(found) >= limit:
                    return found
    return found


# --------------------------------------------------------------------------- #
#                               the finished letter                           #
# --------------------------------------------------------------------------- #

# Hyphen-like characters the standard PDF fonts cannot draw (they would be dropped), as a plain hyphen.
_DASH_MAP = {
    ord("\u2010"): "-",  # hyphen
    ord("\u2011"): "-",  # non-breaking hyphen
    ord("\u2012"): "-",  # figure dash
    ord("\u2015"): "-",  # horizontal bar
    ord("\u2043"): "-",  # hyphen bullet
    ord("\u2212"): "-",  # minus sign
    ord("\u00ad"): "",  # soft hyphen
    ord("\u200b"): "",  # zero-width space
    ord("\u200c"): "",
    ord("\u200d"): "",
    ord("\ufeff"): "",
}


def normalize_dashes(text: str) -> str:
    return text.translate(_DASH_MAP)


def _words(text: str) -> List[str]:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).split()


def mentions(text: str, phrase: str) -> bool:
    """True when `phrase` appears in `text` as whole words, ignoring case and punctuation."""
    wanted = _words(phrase)
    if not wanted:
        return False
    return f" {' '.join(wanted)} " in f" {' '.join(_words(text))} "


def _first_paragraph(body: str) -> str:
    return body.split("\n\n", 1)[0] if body else ""


def letter_problems(body: str, job_title: str, items: List[str]) -> List[str]:
    """What is wrong with a finished letter, as instructions the model can follow. Empty when it is fine."""
    problems: List[str] = []
    title = job_title.strip()

    if title and not mentions(_first_paragraph(body), title):
        problems.append(f'The first sentence must name the position exactly as written: "{title}".')

    vague = VAGUE_POSITION_RE.search(body)
    if vague:
        problems.append(
            f'Remove the vague wording "{vague.group(0)}". '
            + (f'Say "{title}" instead.' if title else 'Say "a role at your organisation" if no position is given.')
        )

    boiler = BOILERPLATE_IN_LETTER_RE.search(body)
    if boiler:
        problems.append(
            f'Remove "{boiler.group(0)}": it is boilerplate from the advert and proves nothing. '
            "Describe real work from the resume instead, or leave it out."
        )

    cliche = CLICHE_RE.search(body)
    if cliche:
        problems.append(f'Remove the cliché "{cliche.group(0)}".')

    padded = f" {' '.join(_words(body))} "
    for item in items:
        if GENERIC_ITEM_RE.search(item):
            continue
        tokens = _words(item)
        copied = next((" ".join(tokens[i : i + 5]) for i in range(len(tokens) - 4) if f" {' '.join(tokens[i : i + 5])} " in padded), None)
        if copied:
            problems.append(f'You copied wording from the advert ("{copied}"). Put it in your own words and tie it to a duty from the resume.')
            break

    return problems[:4]


def retry_instruction(problems: List[str]) -> str:
    rows = "\n".join(f"- {p}" for p in problems)
    return (
        "Your letter has these problems:\n"
        f"{rows}\n\n"
        "Write the whole letter again with every problem fixed. All the earlier rules still apply. "
        'Return only the JSON object {"body": "..."}.'
    )


def ensure_position(body: str, job_title: str, company: str = "") -> str:
    """The first paragraph always names the position, whatever the model wrote."""
    title = re.sub(r"^(?:the|a|an)\s+", "", job_title.strip(), flags=re.I)
    if not title or not body or mentions(_first_paragraph(body), title):
        return body
    where = company.strip() or "your organisation"
    return f"I am applying for the {title} position at {where}. {body}"
