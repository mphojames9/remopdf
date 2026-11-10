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
  - Qualifications. A degree, diploma or certificate is checked by the employer with the school, so a letter may name
    one ONLY if the resume's Education or Certificates sections list it. The Summary and Skills do not count: they
    are free text and can be filled from the job advert ("Bachelor's degree or Diploma Operations Management"),
    which is what once put two qualifications in a letter for a person who held one.
        held_qualification_text()                    Education + Certificates as one line of text
        unsupported_qualifications()                 what a text claims that the resume does not list
        drop_unsupported_qualification_sentences()   the last guarantee: removes every sentence that claims one
        drop_unlisted_qualification_terms()          keeps an unlisted qualification out of the ATS keywords
        looks_like_qualification()                   a Skills entry that is really a qualification
    Mirrors src/utils/letterClaims.js (the same check on the device). Keep _QUALIFICATION_KINDS in step with KINDS there.
"""
import re
from typing import Iterable, List, Optional, Sequence, Tuple

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
#                  qualifications: only what the resume lists                 #
# --------------------------------------------------------------------------- #

_I = re.I

# Each kind is looked for in this order, and the words a kind matches are blanked before the next kind looks, so
# "National Senior Certificate" is one matric claim (not also a certificate) and "Master's degree" is one master claim.
_QUALIFICATION_KINDS = [
    ("matric", [re.compile(r"\b(?:national\s+senior\s+certificate|senior\s+certificate|matric(?:ulation)?|grade\s*1[0-2])\b", _I)]),
    ("nqf", [re.compile(r"\bnqf\b", _I), re.compile(r"\bN[1-6]\b")]),
    (
        "bachelor",
        [
            re.compile(r"\bbachelor['’]?s?\b", _I),
            re.compile(r"\bB\.?\s?(?:Sc|Com|Comm|Tech|Eng|Ed|Admin|Phil|Compt)\b"),
            re.compile(r"\bB\.?A\b\.?"),
            re.compile(r"\bBBA\b"),
            re.compile(r"\bLLB\b"),
        ],
    ),
    (
        "master",
        [
            re.compile(r"\b(?:master['’]?s|master\s+(?:degree|of|in)|mba)\b", _I),
            re.compile(r"\bM\.?\s?(?:Sc|Com|Tech|Eng|Ed|Phil|Admin)\b"),
            re.compile(r"\bM\.?A\b\.?"),
        ],
    ),
    ("honours", [re.compile(r"\b(?:honou?rs|hons)\b", _I)]),
    ("doctorate", [re.compile(r"\b(?:ph\.?\s?d|doctorate|doctoral)\b", _I)]),
    ("degree", [re.compile(r"\bdegrees?\b", _I)]),
    ("diploma", [re.compile(r"\bdiplomas?\b", _I)]),
    (
        "certificate",
        [
            re.compile(r"\b(?:certificates?|certifications?)\b", _I),
            re.compile(r"\b(?:am|was|being|become|became)\s+(?:an?\s+)?(?:fully\s+)?certified\b", _I),
        ],
    ),
]

# "a high degree of accuracy" is not a qualification
_DEGREE_BEFORE_RE = re.compile(
    r"\b(?:high|higher|large|great|greater|certain|some|any|same|significant|considerable|fair|good|varying|lesser)\s+$", _I
)
_DEGREE_AFTER_RE = re.compile(r"^\s+of\b", _I)

# What the RESUME must hold for a kind in the letter to be backed. Any degree backs the word "degree"; nothing else is
# interchangeable (a diploma does not back a bachelor's degree).
_BACKED_BY = {
    "matric": ("matric",),
    "nqf": ("nqf",),
    "bachelor": ("bachelor",),
    "master": ("master",),
    "honours": ("honours",),
    "doctorate": ("doctorate",),
    "degree": ("degree", "bachelor", "master", "honours", "doctorate"),
    "diploma": ("diploma",),
    "certificate": ("certificate",),
}

# "Diploma in Operations Management": the qualification word, then the subject. The subject must be listed too.
_QUALIFICATION_WORD_RE = re.compile(
    r"\b(?:diplomas?|degrees?|certificates?|certification|bachelor['’]?s?(?:\s+degree)?|master['’]?s?(?:\s+degree)?"
    r"|honou?rs(?:\s+degree)?|doctorate)\b",
    _I,
)
_SUBJECT_RE = re.compile(
    r"^(?:\s+(?:in|of))?\s+([A-Z][A-Za-z&'’-]*(?:\s+(?:(?:and|of|in|for|&)\s+)?[A-Z][A-Za-z&'’-]*){0,4})"
)
_SUBJECT_CONNECTORS = frozenset({"and", "of", "in", "for", "the"})

# A qualification is not a skill: degrees, diplomas, certificates, licences, registrations, school grades and
# "N years of experience". Same words as _QUALIFICATION_RE in routers/job_match.py and skillFilter.js on the device.
_LOOKS_LIKE_QUALIFICATION_RE = re.compile(
    r"\b("
    r"bachelor['’]?s?|b\.?\s?sc|b\.?\s?com|b\.?\s?tech|btech|honou?rs|master['’]s|masters|mba|ph\.?d|doctorate|"
    r"degree|diploma|higher certificate|national certificate|senior certificate|n[1-6]|nqf(?:\s*level)?(?:\s*\d+)?|"
    r"matric|grade\s*1[0-2]|"
    r"certificate|certification|certified|accredited|accreditation|"
    r"licen[cs]e|licen[cs]ed|qualification|qualified|registration|registered|"
    r"\d+\+?\s*(?:years?|yrs?)|years?['’]?\s+(?:of\s+)?experience"
    r")\b",
    _I,
)


def _squash(value) -> str:
    return re.sub(r"\s+", " ", value).strip() if isinstance(value, str) else ""


def _kinds_in(text: str) -> List[Tuple[int, str, str]]:
    """[(position, kind, phrase)] for every qualification named in `text`, in reading order."""
    work = text or ""
    found: List[Tuple[int, str, str]] = []
    for kind, patterns in _QUALIFICATION_KINDS:
        for pattern in patterns:
            source = work
            for m in pattern.finditer(source):
                if kind == "degree" and (
                    _DEGREE_BEFORE_RE.search(source[: m.start()]) or _DEGREE_AFTER_RE.match(source[m.end():])
                ):
                    continue
                found.append((m.start(), kind, m.group(0)))
                work = work[: m.start()] + " " * (m.end() - m.start()) + work[m.end():]
    return sorted(found, key=lambda item: item[0])


def _prefixes(text: str) -> set:
    return {w[:5] for w in re.findall(r"[a-z]+", (text or "").lower())}


def _unlisted_subjects(text: str, held_text: str) -> List[str]:
    """'Diploma in Operations Management' when the resume lists a diploma, but not in that subject."""
    held = _prefixes(held_text)
    out: List[str] = []
    for m in _QUALIFICATION_WORD_RE.finditer(text or ""):
        subject = _SUBJECT_RE.match(text[m.end():])
        if not subject:
            continue
        words = [w for w in re.findall(r"[A-Za-z]+", subject.group(1)) if w.lower() not in _SUBJECT_CONNECTORS and len(w) >= 3]
        if words and any(w.lower()[:5] not in held for w in words):
            out.append(_squash(m.group(0) + subject.group(0)))
    return out


def _mask_phrases(text: str, ignore: Iterable[str]) -> str:
    out = text or ""
    for phrase in ignore or ():
        words = _squash(phrase).split(" ")
        words = [w for w in words if w]
        if not words:
            continue
        pattern = re.compile(r"\s+".join(re.escape(w) for w in words), _I)
        out = pattern.sub(lambda hit: " " * len(hit.group(0)), out)
    return out


def _education_parts(entry) -> Tuple[str, str, str]:
    """(degree, field, institution) from a tuple or from an object with those attributes."""
    if isinstance(entry, (tuple, list)):
        degree, field, institution = (list(entry) + ["", "", ""])[:3]
    else:
        degree, field, institution = (getattr(entry, name, "") for name in ("degree", "field", "institution"))
    return _squash(degree), _squash(field), _squash(institution)


def held_qualification_text(education: Sequence = (), certificates: Optional[Sequence[str]] = None) -> str:
    """The Education entries and the Certificates, as one line of text. '' when the resume lists none.

    education: (degree, field, institution) tuples, or objects with those three attributes.
    certificates: the names exactly as the Certificates section lists them.
    """
    rows: List[str] = []
    for entry in education or ():
        degree, field, institution = _education_parts(entry)
        name = f"{degree} {field}" if degree and field and field.lower() not in degree.lower() else (degree or field)
        row = ", ".join(part for part in (name, institution) if part)
        if row:
            rows.append(row)
    for certificate in certificates or ():
        name = _squash(certificate)
        if name:
            rows.append(f"Certificate: {name}")
    return "; ".join(rows)


def unsupported_qualifications(text: str, held_text: str, history: str = "", ignore: Iterable[str] = ()) -> List[str]:
    """The degrees, diplomas and certificates named in `text` that the resume does not list, as `text` words them.

    held_text: held_qualification_text(...). '' means the resume lists nothing, so every claim is unsupported.
    history: the applicant's own work-history wording. It can back the word "certificate" ("issued certificates to
             trainees" describes work), but never a degree, diploma or any other qualification: those must be listed
             under Education, whatever the duties say.
    ignore: phrases that are not claims (the position title and company name from the advert, the applicant's own job
            titles and employers).
    """
    clear = _mask_phrases(text, ignore)
    if not _squash(clear):
        return []
    held = {kind for _, kind, _ in _kinds_in(held_text)}
    own_words = _squash(history).lower()

    bad: List[str] = []
    for _, kind, phrase in _kinds_in(clear):
        if any(k in held for k in _BACKED_BY[kind]):
            continue
        if kind == "certificate" and own_words and phrase.lower() in own_words:
            continue
        bad.append(phrase)
    bad.extend(_unlisted_subjects(clear, held_text))
    return list(dict.fromkeys(bad))


def looks_like_qualification(text: str) -> bool:
    """True when a Skills entry is really a qualification (degree, diploma, certificate, licence, years of experience)."""
    return bool(_LOOKS_LIKE_QUALIFICATION_RE.search(text or ""))


def drop_unlisted_qualification_terms(terms: Iterable[str], held_text: str) -> List[str]:
    """The shared keywords, minus any qualification word the resume's Education and Certificates do not list."""
    held = {kind for _, kind, _ in _kinds_in(held_text)}
    kept: List[str] = []
    for term in terms:
        if all(any(k in held for k in _BACKED_BY[kind]) for _, kind, _ in _kinds_in(term)):
            kept.append(term)
    return kept


_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
_BULLET_RE = re.compile(r"^\s*[-•]\s+")


def drop_unsupported_qualification_sentences(body: str, held_text: str, history: str = "", ignore: Iterable[str] = ()) -> str:
    """The letter with every sentence (or bullet) that claims an unlisted qualification taken out.

    Paragraph breaks and bullets are kept; a paragraph left empty goes too. The result is checked again as a whole and
    anything still unsupported is removed, so unsupported_qualifications() on the result is always []. A letter that
    claims nothing unlisted comes back unchanged.
    """
    ignore = tuple(ignore or ())

    def claims(piece: str) -> bool:
        return bool(unsupported_qualifications(piece, held_text, history, ignore))

    def clean_once(text: str) -> str:
        paragraphs: List[str] = []
        for paragraph in re.split(r"\n\s*\n", text):
            lines: List[str] = []
            for line in paragraph.split("\n"):
                if not line.strip():
                    continue
                if _BULLET_RE.match(line):
                    if not claims(line):
                        lines.append(line)
                    continue
                if not claims(line):
                    lines.append(line)
                    continue
                kept = [s for s in _SENTENCE_SPLIT_RE.split(line.strip()) if s and not claims(s)]
                if kept:
                    lines.append(" ".join(kept))
            if lines:
                paragraphs.append("\n".join(lines))
        return "\n\n".join(paragraphs)

    if not unsupported_qualifications(body, held_text, history, ignore):
        return body

    result = clean_once(body)
    # A claim can straddle a line break ("...a degree" / "Operations Management"). Remove whatever the whole-text check
    # still finds, sentence by sentence; if that does not clear it, nothing safe is left to return.
    for _ in range(3):
        left = unsupported_qualifications(result, held_text, history, ignore)
        if not left:
            return result.strip()
        pieces = [p for p in re.split(r"(?<=[.!?])\s+|\n+", result) if p.strip()]
        offending = {w.lower() for w in left}
        survivors = [p for p in pieces if not any(w in p.lower() for w in offending)]
        result = "\n\n".join(survivors) if survivors != pieces else ""
    return result.strip() if not unsupported_qualifications(result, held_text, history, ignore) else ""


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


def qualification_problem(claimed: List[str], held_text: str) -> str:
    """The instruction that tells the model which qualifications it may not name, and which ones the applicant holds."""
    named = ", ".join(f'"{c}"' for c in claimed[:4])
    if _squash(held_text):
        return (
            f"The letter names a qualification the resume does not list: {named}. "
            f"The ONLY qualifications this applicant holds are: {_squash(held_text)}. "
            "Remove every other degree, diploma or certificate, even when the job posting asks for it: the posting says "
            "what the employer wants, not what the applicant has. When the posting offers a choice (\"X or Y\"), name only "
            "the one that is listed."
        )
    return (
        f"The letter names a qualification the resume does not list: {named}. "
        "The resume lists no degree, diploma or certificate at all. Remove every one from the letter, even when the job "
        "posting asks for it."
    )


def letter_problems(
    body: str,
    job_title: str,
    items: List[str],
    held_text: Optional[str] = None,
    history: str = "",
    ignore: Iterable[str] = (),
) -> List[str]:
    """What is wrong with a finished letter, as instructions the model can follow. Empty when it is fine.

    held_text: held_qualification_text(...). None skips the qualification check; '' means the resume lists none.
    The qualification problem always comes first, so the cut at four problems can never drop it.
    """
    problems: List[str] = []
    title = job_title.strip()

    if held_text is not None:
        claimed = unsupported_qualifications(body, held_text, history, ignore)
        if claimed:
            problems.append(qualification_problem(claimed, held_text))

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
