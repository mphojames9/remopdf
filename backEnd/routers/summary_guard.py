"""
Honesty checks for AI-written resume summaries.

A resume summary is read by an employer who will ask about every line, so one invented tool, figure or title is
worse than a plain summary. The model is told not to invent, but a prompt is a request, not a guarantee. This
module is the guarantee: it checks the model's answer against the candidate's own resume and rejects the answer
(with a reason the model is shown on its next try) when anything is not backed by it.

Pure Python, no FastAPI and no network, so it can be tested on its own (see tests/test_summary_guard.py).

    build_facts(jobs, skills, education, today)   -> the candidate's resume as the model is shown it, with every
                                                     job's dates and the length of time computed here, not guessed
    check_summary(text, claims, facts, ...)       -> None when the summary is backed by the resume, otherwise the
                                                     reason it is not
    job_words_used(text, job_terms)               -> the job's keywords the summary genuinely uses
"""
import datetime as _dt
import re
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple

# --------------------------------------------------------------------------- #
#                         matching (same rules as job_match)                  #
# --------------------------------------------------------------------------- #

_TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9+#]*")


def _stem(token: str) -> str:
    if len(token) > 4 and token.endswith("ies"):
        return token[:-3] + "y"
    if len(token) > 3 and token.endswith("s") and not token.endswith("ss"):
        return token[:-1]
    return token


def norm(text: str) -> str:
    return " ".join(_stem(t) for t in _TOKEN_RE.findall((text or "").lower()))


def has_term(norm_text: str, term: str) -> bool:
    t = norm(term)
    return bool(t) and f" {t} " in f" {norm_text} "


def _prefixes(norm_text: str) -> Set[str]:
    """First five letters of every word: 'manager', 'management' and 'managing' all share 'manag'."""
    return {w[:5] for w in norm_text.split() if len(w) >= 5}


_SMALL_WORDS = {"and", "the", "for", "with", "our", "you", "are", "can", "not", "all", "any", "per", "use", "its", "has", "was", "who", "how"}


def _covered(term: str, fact_tokens: Set[str], fact_prefixes: Set[str]) -> bool:
    """True when every meaningful word of the term has a relative somewhere in the facts."""
    meaningful = [w for w in norm(term).split() if len(w) >= 3 and w not in _SMALL_WORDS]
    if not meaningful:
        return True  # 'IT', 'HR', 'and': too short to say anything about
    for w in meaningful:
        if len(w) >= 5:
            if w[:5] not in fact_prefixes:
                return False
        elif w not in fact_tokens:
            return False
    return True


_NUM_RE = re.compile(r"\d[\d,.]*")


def numbers_in(text: str) -> Set[str]:
    return {n.rstrip(".,") for n in _NUM_RE.findall(text or "")}


# --------------------------------------------------------------------------- #
#                      dates and how long each job lasted                     #
# --------------------------------------------------------------------------- #

_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
_MONTH_LOOKUP = {name.lower(): i + 1 for i, name in enumerate(_MONTH_NAMES)}


def parse_month(value) -> Optional[int]:
    v = str(value or "").strip().lower()
    if not v:
        return None
    if v.isdigit():
        n = int(v)
        return n if 1 <= n <= 12 else None
    return _MONTH_LOOKUP.get(v[:3])


def parse_year(value) -> Optional[int]:
    m = re.search(r"\b(?:19|20)\d{2}\b", str(value or ""))
    return int(m.group(0)) if m else None


def _index(year: int, month: Optional[int]) -> int:
    return year * 12 + ((month or 1) - 1)


def job_months(start_month, start_year, end_month, end_year, current: bool, today: _dt.date) -> Optional[int]:
    """Whole months between the two dates, counted the way a reader of the resume would ('2014 – 2023' is nine years)."""
    sy = parse_year(start_year)
    if sy is None:
        return None
    start = _index(sy, parse_month(start_month))
    if current:
        end = _index(today.year, today.month)
    else:
        ey = parse_year(end_year)
        if ey is None:
            return None
        end = _index(ey, parse_month(end_month))
    return end - start if end >= start else None


def date_range(start_month, start_year, end_month, end_year, current: bool) -> str:
    def piece(m, y) -> str:
        year = parse_year(y)
        if year is None:
            return ""
        month = parse_month(m)
        return f"{_MONTH_NAMES[month - 1]} {year}" if month else str(year)

    start = piece(start_month, start_year)
    end = "Present" if current else piece(end_month, end_year)
    return " – ".join(p for p in (start, end) if p)


def duration_text(months: int) -> str:
    years, rest = divmod(max(months, 0), 12)
    parts = []
    if years:
        parts.append(f"{years} year{'s' if years != 1 else ''}")
    if rest:
        parts.append(f"{rest} month{'s' if rest != 1 else ''}")
    return " ".join(parts)


def build_facts(jobs: Sequence[Dict], skills: Sequence[str], education: Sequence[str], today: Optional[_dt.date] = None, limit: int = 8000) -> str:
    """
    The resume as the model sees it, and as the checks below judge it. Each job is a dict with: title, employer,
    achievements (already stripped of markup), start_month, start_year, end_month, end_year, current.
    """
    today = today or _dt.date.today()
    lines: List[str] = []
    history: List[str] = []
    for job in list(jobs)[:6]:
        head = " at ".join(p for p in (job.get("title", "").strip(), job.get("employer", "").strip()) if p)
        when = date_range(job.get("start_month"), job.get("start_year"), job.get("end_month"), job.get("end_year"), bool(job.get("current")))
        months = job_months(job.get("start_month"), job.get("start_year"), job.get("end_month"), job.get("end_year"), bool(job.get("current")), today)
        length = duration_text(months) if months and months >= 1 else ""
        stamp = ", ".join(p for p in (when, length) if p)
        body = (job.get("achievements") or "").strip()
        if not head and not body:
            continue
        first = f"- {head}" if head else "- (job title not given)"
        if stamp:
            first += f" ({stamp})"
        history.append(first + (":\n  " + body.replace("\n", "\n  ") if body else ""))
    if history:
        lines.append("WORK HISTORY (newest first as the candidate listed it)")
        lines.extend(history)
    listed = [s.strip() for s in skills if isinstance(s, str) and s.strip()][:60]
    if listed:
        lines.append("SKILLS THE CANDIDATE LISTS: " + "; ".join(listed))
    edu = [e.strip() for e in education if isinstance(e, str) and e.strip()][:6]
    if edu:
        lines.append("EDUCATION: " + "; ".join(edu))
    return "\n".join(lines)[:limit]


# --------------------------------------------------------------------------- #
#                              the checks themselves                          #
# --------------------------------------------------------------------------- #

# Words that say nothing a reader can verify. They are what makes a summary sound like every other summary, and
# each one is a claim the candidate would have to defend.
_HYPE_RE = re.compile(
    r"\b(proven|seasoned|extensive|exceptional|outstanding|excellent|expert|dynamic|passionate|results[- ]driven|"
    r"dedicated|hard[- ]?working|motivated|innovative|visionary|world[- ]class|track record|highly (?:skilled|experienced|effective)|"
    r"successful|accomplished|renowned|unparalleled|self[- ]starter|team player|go[- ]getter|detail[- ]oriented)\b",
    re.I,
)

# Words that only make sense on a summary written for an application, or that give away how it was made.
_LEAK_RE = re.compile(
    r"(o\*net|\bonet\b|\boccupations?\b|applicant tracking|\bATS\b|\bkeywords?\b|job (?:advert|description|posting)|"
    r"\b(?:this|the) (?:role|position|job|vacancy)\b|\bapplying for\b|\bapply for\b|the advertised)",
    re.I,
)

# The narrow version, for text that is not a summary (a rewritten achievement may well say "keyword research").
_MACHINERY_RE = re.compile(r"(o\*net|\bonet\b|\boccupations?\b|applicant tracking|the advertised)", re.I)


def leaked_phrase(text: str) -> Optional[str]:
    """'O*NET', 'occupation' and the like: words that belong to how the tool works, never on a resume."""
    m = _MACHINERY_RE.search(text or "")
    return m.group(0) if m else None


_FIRST_PERSON_RE = re.compile(r"\b(i|i'm|i’ve|i've|my|me|myself|we|our)\b", re.I)

# Status and seniority. 'Senior' or 'led' on a resume is a claim about rank. The word may be used only when the
# candidate's own history uses it (or a relative of it) for them.
_STATUS_FAMILIES: List[Tuple[str, re.Pattern]] = [
    ("manage", re.compile(r"\bmanag\w*", re.I)),
    ("supervise", re.compile(r"\bsupervis\w*", re.I)),
    ("lead", re.compile(r"\b(?:lead|leads|leading|leader|leaders|leadership|led)\b", re.I)),
    ("senior", re.compile(r"\bsenior\w*", re.I)),
    ("head", re.compile(r"\bhead(?:s|ed)?\b", re.I)),
    ("director", re.compile(r"\b(?:director|directed|directing|executive|chief|principal|president)\b", re.I)),
    ("own", re.compile(r"\b(?:owner|owned|owns|founder|founded|co-?founder)\b", re.I)),
    ("train", re.compile(r"\b(?:train|trained|trains|training|trainer|mentor\w*|coach\w*)\b", re.I)),
    ("budget", re.compile(r"\bbudget\w*", re.I)),
    ("recruit", re.compile(r"\b(?:recruit\w*|hire|hired|hiring|onboard\w*)\b", re.I)),
]

# Quantities written as words slip past a digit check ("nine years", "a dozen staff").
_NUMBER_WORD_RE = re.compile(
    r"\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|"
    r"nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|hundreds|thousand|thousands|million|millions|"
    r"dozen|dozens|decade|decades|double|doubled|triple|tripled)\b",
    re.I,
)

_ALLOWED_CAPITALS = {
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
    "english", "afrikaans",
}


# Plain connective vocabulary a summary needs that is not a claim about the person. Anything else of six letters or
# more has to have a relative in the resume (same first five letters), or it is the model's own vocabulary.
_GENERIC = set(norm(
    "experience experienced professional professionals background career working skilled strengths strength ability "
    "across within through including alongside combining combines combined brings bringing delivers delivering delivered "
    "ensuring ensures ensured maintaining maintains maintained environment environments standards standard supporting "
    "supports supported responsible responsibility responsibilities knowledge practical practices practice focused "
    "focuses various several different diverse multiple support improving improved improves effective effectively "
    "strong solid hands-on handson daily organisation organization company companies customers customer clients client "
    "colleagues department departments business businesses members teams people service services quality planning "
    "operations operational activities activity processes process procedures procedure results outcomes level levels "
    "range number applied applying using through while between throughout"
).split())


def _ungrounded_words(text_norm: str, fact_prefixes: Set[str]) -> List[str]:
    out: List[str] = []
    for w in dict.fromkeys(text_norm.split()):
        if len(w) < 6 or w in _GENERIC or w[:5] in fact_prefixes:
            continue
        out.append(w)
    return out


def _sentences(text: str) -> List[str]:
    return [s for s in re.split(r"(?<=[.!?])\s+", (text or "").strip()) if s]


def _proper_nouns(text: str) -> List[str]:
    """Capitalised words in the middle of a sentence and ALL-CAPS words: employers, systems, tools, places."""
    found: List[str] = []
    for sentence in _sentences(text):
        for i, word in enumerate(sentence.split()):
            core = re.sub(r"^[^A-Za-z0-9]+|[^A-Za-z0-9+#&]+$", "", word)
            if len(core) < 2:
                continue
            if core.isupper() and any(c.isalpha() for c in core):
                found.append(core)
            elif i > 0 and core[0].isupper():
                found.append(core)
    return found


def evidence_found(evidence: str, fact_tokens: List[str]) -> bool:
    """The quoted evidence must really be in the resume: mostly the same words, and a real run of them in order."""
    ev = norm(evidence).split()
    if len(ev) < 2:
        return False
    fact_set = set(fact_tokens)
    if sum(1 for t in ev if t in fact_set) / len(ev) < 0.8:
        return False
    need = min(3, len(ev))
    joined = " " + " ".join(fact_tokens) + " "
    return any(" " + " ".join(ev[i : i + need]) + " " in joined for i in range(len(ev) - need + 1))


def check_summary(
    text: str,
    claims: object,
    facts: str,
    *,
    job_terms: Iterable[str] = (),
    forbidden_names: Iterable[str] = (),
    qualification_re: Optional[re.Pattern] = None,
    strict: bool = True,
) -> Optional[str]:
    """
    None when the summary is backed by the resume; otherwise one sentence saying what is not. The sentence is
    shown to the model on its next attempt, so it names the exact word to fix.
    """
    if not (120 <= len(text) <= 900):
        return "it must be between 120 and 900 characters"
    count = len(_sentences(text))
    if count < 1 or count > 5:
        return "it must be 2 to 4 sentences"
    if _FIRST_PERSON_RE.search(text):
        return "it uses first person (I, my, me); start with the role instead"
    leak = _LEAK_RE.search(text)
    if leak:
        return f"it mentions “{leak.group(0)}”; a summary never refers to the job advert, the application or how it was made"
    hype = _HYPE_RE.search(text)
    if hype:
        return f"“{hype.group(0)}” is an unprovable claim; say what the person did instead"

    facts_norm = norm(facts)
    fact_tokens_list = facts_norm.split()
    fact_tokens = set(fact_tokens_list)
    fact_prefixes = _prefixes(facts_norm)
    text_norm = norm(text)

    # The job's title and the employer are never claimed. The title is allowed only when the history has it.
    for name in forbidden_names:
        if name and has_term(text_norm, name) and not has_term(facts_norm, name):
            return f"it names “{name}”, which is the job being applied for and not something in the resume"

    # Figures: every number must be one the resume (or a date/length computed from it) contains.
    extra = numbers_in(text) - numbers_in(facts)
    if extra:
        return f"it contains the figure {sorted(extra)[0]}, which the resume does not state"
    for match in _NUMBER_WORD_RE.finditer(text):
        word = match.group(0).lower()
        if word not in fact_tokens and _stem(word) not in fact_tokens:
            return f"it uses the quantity “{word}”, which the resume does not state"

    if qualification_re is not None:
        low = facts.lower()
        for match in qualification_re.finditer(text):
            if match.group(0).lower() not in low:
                return f"it claims “{match.group(0)}”, which the resume does not list"

    # Rank and status words.
    for label, pattern in _STATUS_FAMILIES:
        hit = pattern.search(text)
        if hit and not pattern.search(facts):
            return f"it says “{hit.group(0)}”, but nothing in the resume says this person did that ({label})"

    # Names: employers, systems, tools, places.
    for noun in _proper_nouns(text):
        n = norm(noun)
        if not n or noun.lower() in _ALLOWED_CAPITALS:
            continue
        if not all((w[:5] in fact_prefixes) if len(w) >= 5 else (w in fact_tokens) for w in n.split()):
            return f"it names “{noun}”, which is not in the resume"

    # The job's own words: allowed only where the resume already says it.
    for term in job_terms:
        if not term or not has_term(text_norm, term):
            continue
        if not _covered(term, fact_tokens, fact_prefixes):
            return f"it uses “{term}” from the job advert, but the resume does not show this person doing that"

    # Vocabulary the resume never uses. Soft: the last attempt skips it so a plain, true summary is never refused
    # only for being worded a little differently from the resume.
    if strict:
        stray = _ungrounded_words(text_norm, fact_prefixes)
        if len(stray) >= 3:
            return f"it brings in words the resume never uses ({', '.join(stray[:4])}); describe the work in the candidate's own words"

    # Evidence: every strength the model relied on must be traceable to words in the resume.
    if not isinstance(claims, list) or len(claims) < 2:
        return "it must list at least 2 strengths, each with the exact resume words that prove it"
    for claim in claims[:8]:
        if not isinstance(claim, dict):
            return "each strength must have the exact resume words that prove it"
        evidence = str(claim.get("evidence", ""))
        if not evidence_found(evidence, fact_tokens_list):
            return f"the evidence “{evidence[:80]}” is not in the resume; copy the candidate's own words exactly"
    return None


def job_words_used(text: str, job_terms: Iterable[str]) -> List[str]:
    """The job's keywords the summary really uses (they were already checked against the resume)."""
    text_norm = norm(text)
    seen: List[str] = []
    for term in job_terms:
        if term and has_term(text_norm, term) and term not in seen:
            seen.append(term)
    return seen
