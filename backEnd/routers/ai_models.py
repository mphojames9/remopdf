"""
Which Groq model answers which job, how hard it thinks, how much each plan may use, and what happens when it fails.

Every AI call in the backend (routers/writing_ai.py and routers/job_match.py) goes through complete() here, so the
quality settings live in one place and cannot drift apart.

The four plans
  The accounts server (routes/payments.js) puts the plan the person has paid for into the signed "AI pass"
  (claim "tier"). routers/writing_ai.py checks the pass and hands the tier to plan_for(), which answers with
  everything that changes from plan to plan:

      plan   price   model                 thinking          token room   AI actions / day   what it can use
      ----   -----   -------------------   ---------------   ----------   ----------------   ------------------------------
      free   R0      openai/gpt-oss-20b    low               x1.0          6                 writing suggestions only
      plus   R59     openai/gpt-oss-120b   low               x1.0         25                 everything
      pro    R99     openai/gpt-oss-120b   medium (default)  x1.0         40                 everything
      max    R159    openai/gpt-oss-120b   high              x1.3         60                 everything

  "Thinking" is moved one step down (free, plus) or up (max) from the level each task asks for in TASKS below, so a
  Max person gets "high" where Pro gets "medium", and "medium" where Pro gets "low" (reading an advert).
  Groq's list prices (US$ per million tokens in / out): gpt-oss-20b 0.075 / 0.30, gpt-oss-120b 0.15 / 0.60.
  See README-PLANS.md for the cost per action and the margin per plan.

Settings (all optional, set in Render -> Environment)
  GROQ_MODEL            If set, this model is used for EVERYTHING, for every plan (and no fallback is needed). It is
                        also the instant way back to the old behaviour:  GROQ_MODEL=openai/gpt-oss-20b
  GROQ_MODEL_FREE | GROQ_MODEL_PLUS | GROQ_MODEL_PRO | GROQ_MODEL_MAX
                        Swap the model of ONE plan without touching code (for example when Groq releases a better one).
  GROQ_FALLBACK_MODEL   Used when the main model is rate-limited, down, slow or returns something unusable.
                        Default: openai/gpt-oss-20b (the free plan has none: it already runs on that model).
                        Set it to the same value as the main model to turn the fallback off.
  AI_DAILY_FREE | AI_DAILY_PLUS | AI_DAILY_PRO | AI_DAILY_MAX
                        AI actions per person per day (South African time). 0 = no AI on that plan.

How a call is made (see complete())
  1. main model, the plan's thinking level for the task
  2. if the reply was cut off or empty (reasoning models spend part of the token budget thinking): same model, thinking
     "low" and a bigger budget
  3. if the call failed (rate limit, timeout, 5xx) or the reply still cannot be used: the fallback model
  The caller gets the first usable reply. If nothing was usable it gets the last reply (or the last error), so its own
  error handling is unchanged.

Daily allowance (see spend())
  Every model request the routes make costs credits (one, or two for a cover letter). The count is kept in memory,
  per person, and starts again at midnight in South Africa. It is a safety limit for the Groq bill, not accounting:
  it starts again if the service restarts. Cached answers are free.

Pure Python (no FastAPI), so it can be tested on its own: see tests/test_ai_models.py.
"""
import datetime
import json
import os
import re
import threading
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Tuple

PREMIUM_MODEL = "openai/gpt-oss-120b"
FALLBACK_MODEL = "openai/gpt-oss-20b"
LIGHT_MODEL = "openai/gpt-oss-20b"  # the free plan's model: the cheapest one that still follows the rules of the prompts

# Kept so older imports (`from routers.writing_ai import DEFAULT_MODEL`) still work.
DEFAULT_MODEL = PREMIUM_MODEL

TIERS = ("free", "plus", "pro", "max")  # lowest to highest
DEFAULT_TIER = "pro"  # used when nothing says otherwise: this is exactly how every Premium person was served before plans
_EFFORTS = ("low", "medium", "high")


@dataclass(frozen=True)
class Task:
    effort: str  # gpt-oss thinking level: "low" | "medium" | "high"
    max_tokens: int  # reasoning tokens count against this too, so it is far larger than the visible answer
    timeout_s: float  # per attempt; the app waits 45 s (70 s for a letter), so two attempts must fit inside that
    temperature: float


# One row per kind of call, at the PRO level. "medium" is where the writing quality comes from; extraction only needs
# "low" because it copies from the advert rather than composing. Other plans move these up or down (see TIER_SPECS).
TASKS = {
    # as-you-type review of one block of the resume: three rewrites + coaching
    "analyze": Task("medium", 5000, 20, 0.4),
    # the same, tailored to a job target
    "rewrite": Task("medium", 5000, 20, 0.35),
    # the cover letter (and its correction round)
    "letter": Task("medium", 5000, 30, 0.55),
    # professional summary written from the work history (up to 3 attempts)
    "summary": Task("medium", 3500, 22, 0.3),
    # skills the work history supports / the job asks for
    "skills": Task("medium", 4000, 22, 0.15),
    # reading a job advert: position, requirements, duties, keywords
    "posting": Task("low", 3500, 22, 0.1),
    "target": Task("low", 4000, 22, 0.1),
}

# The lowest plan that may use each kind of call. The free plan gets the writing assistant (the as-you-type review) so
# every signed-in person can try the AI; the heavier features (cover letter, job matching) are what the paid plans add.
MIN_TIER = {
    "analyze": "free",
    "rewrite": "plus",
    "letter": "plus",
    "summary": "plus",
    "skills": "plus",
    "posting": "plus",
    "target": "plus",
}

# What one model request costs against the daily allowance. A letter reads the whole resume and the advert and is
# written (and often corrected) at length, so it costs two; everything else costs one.
TASK_CREDITS = {"letter": 2}


@dataclass(frozen=True)
class TierSpec:
    model: str
    fallback: Optional[str]
    effort_shift: int  # -1 = one thinking step below the task's own level, +1 = one step above
    budget_x: float  # more thinking needs more room, or the answer gets cut off
    daily_credits: int


TIER_SPECS: Dict[str, TierSpec] = {
    # R0: the small model, thinking low. About R0.007 per action; no fallback (it is already the cheapest model).
    "free": TierSpec(LIGHT_MODEL, None, -1, 1.0, 6),
    # R59: the large model with little thinking. Noticeably better wording and far fewer answers thrown away by the
    # honesty checks, for about R0.016 per action.
    "plus": TierSpec(PREMIUM_MODEL, FALLBACK_MODEL, -1, 1.0, 25),
    # R99: the large model thinking at the task's own level ("medium"): what Premium was before plans existed. About R0.032.
    "pro": TierSpec(PREMIUM_MODEL, FALLBACK_MODEL, 0, 1.0, 40),
    # R159: the large model thinking one step harder everywhere ("high" where Pro has "medium") with 30% more room to
    # think. About R0.053 per action.
    "max": TierSpec(PREMIUM_MODEL, FALLBACK_MODEL, 1, 1.3, 60),
}


def _env(name: str) -> str:
    return (os.getenv(name) or "").strip()


def clean_tier(tier: Optional[str]) -> str:
    """The tier if it is one we know, otherwise DEFAULT_TIER."""
    return tier if tier in TIER_SPECS else DEFAULT_TIER


def tier_rank(tier: Optional[str]) -> int:
    return TIERS.index(tier) if tier in TIERS else -1


def allowed(tier: Optional[str], task: str) -> bool:
    """Whether this plan may use this kind of call at all."""
    needed = MIN_TIER.get(task, "plus")
    return tier_rank(tier) >= tier_rank(needed)


def daily_limit(tier: str) -> int:
    tier = clean_tier(tier)
    raw = _env(f"AI_DAILY_{tier.upper()}")
    if raw.isdigit():
        return int(raw)
    return TIER_SPECS[tier].daily_credits


def primary_model() -> str:
    """The model that answers first for the default (Pro) plan. GROQ_MODEL, when set, wins for every task."""
    return plan_for(DEFAULT_TIER).model


def _fallback_for(primary: str, default: Optional[str]) -> Optional[str]:
    if _env("GROQ_MODEL"):
        return None  # the operator chose one model on purpose
    fb = _env("GROQ_FALLBACK_MODEL") or default
    return fb if fb and fb.lower() != primary.lower() else None


def fallback_model(primary: Optional[str] = None) -> Optional[str]:
    """The safety-net model, or None when it is the same as the main one (nothing to fall back to)."""
    primary = primary or primary_model()
    return _fallback_for(primary, FALLBACK_MODEL)


def is_reasoning_model(model: str) -> bool:
    return model.startswith("openai/gpt-oss")


@dataclass(frozen=True)
class Plan:
    """Everything one request needs to know about the plan it is served under."""

    tier: str
    model: str
    fallback: Optional[str]
    effort_shift: int
    budget_x: float
    daily_credits: int

    @property
    def cache_id(self) -> str:
        """What a stored reply is filed under. Includes the tier, so a Max answer (thought harder) is never served to
        Plus, and a Plus answer is never served to Max."""
        return f"{self.tier}:{self.model}"

    def effort_for(self, task_effort: str) -> str:
        index = _EFFORTS.index(task_effort) if task_effort in _EFFORTS else 1
        return _EFFORTS[max(0, min(len(_EFFORTS) - 1, index + self.effort_shift))]


def plan_for(tier: Optional[str] = None) -> Plan:
    """The plan for a tier ("free" | "plus" | "pro" | "max"); anything else is served as DEFAULT_TIER."""
    tier = clean_tier(tier)
    spec = TIER_SPECS[tier]
    model = _env("GROQ_MODEL") or _env(f"GROQ_MODEL_{tier.upper()}") or spec.model
    fallback = _fallback_for(model, spec.fallback)
    return Plan(tier, model, fallback, spec.effort_shift, spec.budget_x, daily_limit(tier))


@dataclass(frozen=True)
class Access:
    """Who is asking and what they have paid for: read from the signed AI pass."""

    tier: str
    subject: str  # the account id (the pass's "sub"); the daily allowance is counted per subject


# --------------------------------------------------------------------------- #
#                              daily allowance                                #
# --------------------------------------------------------------------------- #

SOUTH_AFRICA = datetime.timezone(datetime.timedelta(hours=2))  # no daylight saving there, so a fixed offset is exact

_usage: Dict[str, int] = {}
_usage_day: Optional[str] = None
_usage_lock = threading.Lock()


class QuotaExceeded(Exception):
    def __init__(self, tier: str, limit: int, used: int):
        super().__init__(f"daily AI allowance of {limit} used up on the {tier} plan")
        self.tier = tier
        self.limit = limit
        self.used = used


def today(now: Optional[datetime.datetime] = None) -> str:
    return (now or datetime.datetime.now(SOUTH_AFRICA)).astimezone(SOUTH_AFRICA).date().isoformat()


def spend(tier: str, subject: str, task: str, *, now: Optional[datetime.datetime] = None) -> Tuple[int, int]:
    """Charges one model request to the person's allowance for today. Returns (used, limit) afterwards.
    Raises QuotaExceeded, and charges nothing, when the request does not fit in what is left."""
    global _usage_day
    plan = plan_for(tier)
    cost = TASK_CREDITS.get(task, 1)
    day = today(now)
    with _usage_lock:
        if _usage_day != day:  # a new day: yesterday's counts are no longer needed
            _usage.clear()
            _usage_day = day
        used = _usage.get(subject, 0)
        if used + cost > plan.daily_credits:
            raise QuotaExceeded(plan.tier, plan.daily_credits, used)
        _usage[subject] = used + cost
        return used + cost, plan.daily_credits


def usage(subject: str, tier: str, *, now: Optional[datetime.datetime] = None) -> Tuple[int, int]:
    """(used today, daily limit) without charging anything."""
    day = today(now)
    with _usage_lock:
        used = _usage.get(subject, 0) if _usage_day == day else 0
    return used, plan_for(tier).daily_credits


def reset_usage() -> None:
    """For tests."""
    global _usage_day
    with _usage_lock:
        _usage.clear()
        _usage_day = None


# --------------------------------------------------------------------------- #
#                                 reading replies                             #
# --------------------------------------------------------------------------- #

def extract_json(raw: str) -> dict:
    """Parse the model's reply, tolerating code fences or stray prose around the object."""
    if not raw:
        raise ValueError("empty reply")
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.I)
    try:
        value = json.loads(cleaned)
    except ValueError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start == -1 or end <= start:
            raise ValueError("no JSON object in reply")
        value = json.loads(cleaned[start : end + 1])
    if not isinstance(value, dict):
        raise ValueError("reply is not an object")
    return value


def _usable(raw: str) -> bool:
    try:
        extract_json(raw)
        return True
    except ValueError:
        return False


# --------------------------------------------------------------------------- #
#                                   the call                                  #
# --------------------------------------------------------------------------- #

def _params(model: str, messages, task: Task, effort: str, max_tokens: int, temperature: Optional[float]) -> dict:
    params = dict(
        model=model,
        messages=messages,
        temperature=task.temperature if temperature is None else temperature,
        max_completion_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    if is_reasoning_model(model):
        params["extra_body"] = {"reasoning_effort": effort}
    return params


def _with_timeout(client, seconds: float):
    """One attempt, no hidden SDK retries: the fallback model is the retry. Works with a bare fake client too."""
    with_options = getattr(client, "with_options", None)
    return with_options(timeout=seconds, max_retries=0) if callable(with_options) else client


def complete(
    get_client: Callable[[], object],
    messages: List[dict],
    *,
    task: str,
    model: Optional[str] = None,
    temperature: Optional[float] = None,
    log: Callable[[str], None] = print,
    plan: Optional[Plan] = None,
) -> str:
    """The model's raw JSON reply for `messages`, following the plan in the module docstring.

    get_client   returns the OpenAI-compatible Groq client (it may raise HTTPException when the key is missing: that
                 is passed straight up, it is not a model failure)
    plan         what the person has paid for (plan_for(tier)); without one the call is served as the default (Pro) plan
    model        overrides the plan's main model (kept for older callers)
    """
    spec = TASKS[task]
    plan = plan or plan_for(DEFAULT_TIER)
    main = model or plan.model
    backup = _fallback_for(main, plan.fallback if not model else FALLBACK_MODEL)
    client = get_client()

    first_effort = plan.effort_for(spec.effort)
    first_budget = int(spec.max_tokens * plan.budget_x)
    stretch_cap = int(8000 * plan.budget_x)

    # (model, effort, max_tokens) in the order they are tried.
    attempts: List[Tuple[str, str, int]] = [(main, first_effort, first_budget)]
    last_raw: Optional[str] = None
    last_error: Optional[BaseException] = None
    stretched = False  # the "low effort, bigger budget" retry is used at most once

    i = 0
    while i < len(attempts):
        name, effort, budget = attempts[i]
        i += 1
        try:
            response = _with_timeout(client, spec.timeout_s).chat.completions.create(
                **_params(name, messages, spec, effort, budget, temperature)
            )
        except Exception as err:  # rate limit, timeout, 5xx, model unavailable: try the next model
            last_error = err
            log(f"[ai] {task}/{plan.tier}: {name} failed ({type(err).__name__}: {str(err)[:160]})")
            if i == len(attempts) and backup and name != backup:
                attempts.append((backup, "low", spec.max_tokens))
            continue

        choice = response.choices[0]
        raw = choice.message.content or ""
        cut_off = getattr(choice, "finish_reason", None) == "length"
        if raw and not cut_off and _usable(raw):
            return raw

        last_raw, last_error = raw, None
        why = "was cut off" if cut_off else ("was empty" if not raw else "was not valid JSON")
        log(f"[ai] {task}/{plan.tier}: reply from {name} {why}")
        if i == len(attempts):
            if is_reasoning_model(name) and effort != "low" and not stretched and name == main:
                # Thinking used up the budget: think less, and allow more room.
                stretched = True
                attempts.append((name, "low", min(int(budget * 1.5), stretch_cap)))
            elif backup and name != backup:
                attempts.append((backup, "low", spec.max_tokens))

    if last_raw is not None:
        return last_raw  # let the caller's own "could not be read" handling answer
    assert last_error is not None
    raise last_error
