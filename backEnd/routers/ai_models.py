"""
Which Groq model answers which job, how hard it thinks, and what happens when it fails.

Every AI call in the backend (routers/writing_ai.py and routers/job_match.py) goes through complete() here, so the
quality settings live in one place and cannot drift apart.

Why this file exists
  The resume features used to run on a small model (gpt-oss-20b) with its thinking turned down to "low" for every
  call, including the cover letter and the professional summary. Small model + little thinking = generic wording,
  weaker matching of the resume to the advert, and more answers thrown away by the honesty checks. Premium people
  now get the larger model (gpt-oss-120b) thinking at "medium", with the small one kept only as a safety net.

Settings (all optional, set in Render -> Environment)
  GROQ_MODEL            If set, this model is used for EVERYTHING (and no fallback is needed). It is also the instant
                        way back to the old behaviour:  GROQ_MODEL=openai/gpt-oss-20b
  GROQ_FALLBACK_MODEL   Used when the main model is rate-limited, down, slow or returns something unusable.
                        Default: openai/gpt-oss-20b.  Set it to the same value as the main model to turn the fallback off.

How a call is made (see complete())
  1. main model, task's normal thinking level
  2. if the reply was cut off or empty (reasoning models spend part of the token budget thinking): same model, thinking
     "low" and a bigger budget
  3. if the call failed (rate limit, timeout, 5xx) or the reply still cannot be used: the fallback model
  The caller gets the first usable reply. If nothing was usable it gets the last reply (or the last error), so its own
  error handling is unchanged.

Pure Python (no FastAPI), so it can be tested on its own: see tests/test_ai_models.py.
"""
import json
import os
import re
from dataclasses import dataclass
from typing import Callable, List, Optional, Tuple

PREMIUM_MODEL = "openai/gpt-oss-120b"
FALLBACK_MODEL = "openai/gpt-oss-20b"

# Kept so older imports (`from routers.writing_ai import DEFAULT_MODEL`) still work.
DEFAULT_MODEL = PREMIUM_MODEL


@dataclass(frozen=True)
class Task:
    effort: str  # gpt-oss thinking level: "low" | "medium" | "high"
    max_tokens: int  # reasoning tokens count against this too, so it is far larger than the visible answer
    timeout_s: float  # per attempt; the app waits 45 s (70 s for a letter), so two attempts must fit inside that
    temperature: float


# One row per kind of call. "medium" is where the writing quality comes from; extraction only needs "low" because it
# copies from the advert rather than composing.
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


def _env(name: str) -> str:
    return (os.getenv(name) or "").strip()


def primary_model() -> str:
    """The model that answers first. GROQ_MODEL, when set, wins for every task."""
    return _env("GROQ_MODEL") or PREMIUM_MODEL


def fallback_model(primary: Optional[str] = None) -> Optional[str]:
    """The safety-net model, or None when it is the same as the main one (nothing to fall back to)."""
    primary = primary or primary_model()
    if _env("GROQ_MODEL"):
        return None  # the operator chose one model on purpose
    fb = _env("GROQ_FALLBACK_MODEL") or FALLBACK_MODEL
    return fb if fb.lower() != primary.lower() else None


def is_reasoning_model(model: str) -> bool:
    return model.startswith("openai/gpt-oss")


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
) -> str:
    """The model's raw JSON reply for `messages`, following the plan in the module docstring.

    get_client   returns the OpenAI-compatible Groq client (it may raise HTTPException when the key is missing: that
                 is passed straight up, it is not a model failure)
    model        the main model; defaults to primary_model()
    """
    spec = TASKS[task]
    main = model or primary_model()
    backup = fallback_model(main)
    client = get_client()

    # (model, effort, max_tokens) in the order they are tried.
    plan: List[Tuple[str, str, int]] = [(main, spec.effort, spec.max_tokens)]
    last_raw: Optional[str] = None
    last_error: Optional[BaseException] = None
    stretched = False  # the "low effort, bigger budget" retry is used at most once

    i = 0
    while i < len(plan):
        name, effort, budget = plan[i]
        i += 1
        try:
            response = _with_timeout(client, spec.timeout_s).chat.completions.create(
                **_params(name, messages, spec, effort, budget, temperature)
            )
        except Exception as err:  # rate limit, timeout, 5xx, model unavailable: try the next model
            last_error = err
            log(f"[ai] {task}: {name} failed ({type(err).__name__}: {str(err)[:160]})")
            if i == len(plan) and backup and name != backup:
                plan.append((backup, "low", spec.max_tokens))
            continue

        choice = response.choices[0]
        raw = choice.message.content or ""
        cut_off = getattr(choice, "finish_reason", None) == "length"
        if raw and not cut_off and _usable(raw):
            return raw

        last_raw, last_error = raw, None
        why = "was cut off" if cut_off else ("was empty" if not raw else "was not valid JSON")
        log(f"[ai] {task}: reply from {name} {why}")
        if i == len(plan):
            if is_reasoning_model(name) and effort != "low" and not stretched and name == main:
                # Thinking used up the budget: think less, and allow more room.
                stretched = True
                plan.append((name, "low", min(int(budget * 1.5), 8000)))
            elif backup and name != backup:
                plan.append((backup, "low", spec.max_tokens))

    if last_raw is not None:
        return last_raw  # let the caller's own "could not be read" handling answer
    assert last_error is not None
    raise last_error
