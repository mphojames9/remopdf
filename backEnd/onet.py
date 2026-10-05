"""
O*NET Web Services proxy (FastAPI port of onetRoutes.cjs).

Keeps the O*NET API key on the server. The React app (onetSuggestions.js) calls:

    GET /api/onet/search?keyword=software+engineer&end=8
        -> { "occupations": [{ "code", "title", "score" }] }

    GET /api/onet/occupations/15-1252.00
        -> { "code", "tasks": [...], "skills": [...], "technology": [...] }

Setup: set ONET_API_KEY in the server environment (Render -> Environment).
If the key is missing or O*NET is down, these routes answer with an error status and the
front end falls back to its own dataset, so the form never breaks.
"""
import math
import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import requests
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/onet", tags=["O*NET"])

ONET_BASE = "https://api-v2.onetcenter.org"
TIMEOUT_S = 8
CACHE_TTL_S = 24 * 60 * 60  # occupation data changes a few times a year
CACHE_MAX = 500
RATE_WINDOW_S = 60
RATE_MAX = 120  # requests per IP per minute; protects your O*NET quota
CODE_RE = re.compile(r"^\d{2}-\d{4}\.\d{2}$")
CODE_IN_TEXT = re.compile(r"\d{2}-\d{4}\.\d{2}")
CACHE_HEADERS = {"Cache-Control": "private, max-age=3600"}


class OnetError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


# ------------------------------ tiny rate limit ------------------------------

_hits = {}
_hits_lock = threading.Lock()


def _client_ip(request: Request) -> str:
    # Behind Render's proxy request.client is the proxy, so prefer X-Forwarded-For.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limited(request: Request) -> bool:
    now = time.time()
    ip = _client_ip(request)
    with _hits_lock:
        if len(_hits) > 5000:
            _hits.clear()
        entry = _hits.get(ip)
        if not entry or entry[1] < now:
            _hits[ip] = [1, now + RATE_WINDOW_S]
            return False
        entry[0] += 1
        return entry[0] > RATE_MAX


# ---------------------------------- cache ------------------------------------

_cache = {}
_cache_lock = threading.Lock()


def _cached(key, make):
    now = time.time()
    with _cache_lock:
        hit = _cache.get(key)
        if hit and hit[1] > now:
            return hit[0]
    value = make()  # if this raises, nothing is cached
    with _cache_lock:
        if len(_cache) >= CACHE_MAX:
            _cache.pop(next(iter(_cache)))  # evict the oldest entry
        _cache[key] = (value, now + CACHE_TTL_S)
    return value


# ------------------------------- O*NET client --------------------------------

def _onet_get(path, params=None):
    api_key = os.getenv("ONET_API_KEY")
    if not api_key:
        raise OnetError(503, "ONET_API_KEY is not set")

    try:
        res = requests.get(
            ONET_BASE + path,
            params=params or {},
            headers={
                "X-API-Key": api_key,
                "Accept": "application/json",
                "User-Agent": "RemoPDF-ResumeBuilder",
            },
            timeout=TIMEOUT_S,
        )
    except requests.Timeout:
        raise OnetError(502, "O*NET timed out")
    except requests.RequestException:
        raise OnetError(502, "O*NET request failed")

    if res.status_code == 204:
        return {}
    if not res.ok:
        raise OnetError(res.status_code, f"O*NET responded with {res.status_code}")
    try:
        return res.json()
    except ValueError:
        raise OnetError(502, "O*NET request failed")


def _get_list(path, end):
    # Ask for the first page of a list. If the service rejects the paging params, ask for the default page.
    try:
        return _onet_get(path, {"start": 1, "end": end})
    except OnetError as err:
        if err.status in (400, 422):
            return _onet_get(path)
        raise


# ------------------------------- normalisers ---------------------------------
# Written defensively so a small change in O*NET's response shape does not break the form.

def _as_array(value):
    return value if isinstance(value, list) else []


def _text_of(item):
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        return item.get("statement") or item.get("name") or item.get("title") or item.get("text") or ""
    return ""


def _normalize_occupations(data):
    data = data if isinstance(data, dict) else {}
    items = _as_array(data.get("occupation") or data.get("occupations") or data.get("results"))
    out = []
    for o in items:
        if not isinstance(o, dict):
            continue
        code = o.get("code")
        if not code:
            match = CODE_IN_TEXT.search(str(o.get("href") or ""))
            code = match.group(0) if match else None
        try:
            raw = o.get("relevance_score")
            score = float(raw) if raw is not None else None
            if score is not None and not math.isfinite(score):
                score = None
        except (TypeError, ValueError):
            score = None
        title = str(o.get("title") or "").strip()
        if code and title:
            out.append({"code": code, "title": title, "score": score})
    return out


def _normalize_texts(items):
    texts = (str(_text_of(i)).strip() for i in _as_array(items))
    return [t for t in texts if t]


def _normalize_tasks(data):
    data = data if isinstance(data, dict) else {}
    return _normalize_texts(data.get("task") or data.get("tasks") or data.get("element"))


def _normalize_skills(data):
    data = data if isinstance(data, dict) else {}
    return _normalize_texts(data.get("element") or data.get("skill"))


def _normalize_technology(data):
    # Technology skills come grouped by category, each with example products ("Microsoft Excel").
    # Hot technologies first, then the rest in the order O*NET lists them.
    found = []

    def walk(node):
        if isinstance(node, list):
            for child in node:
                walk(child)
            return
        if not isinstance(node, dict):
            return
        examples = node.get("example") or node.get("examples")
        if isinstance(examples, list):
            for ex in examples:
                name = str(_text_of(ex)).strip()
                if name:
                    hot = isinstance(ex, dict) and (ex.get("hot_technology") is True or ex.get("hot_technology") == "true")
                    found.append({"name": name, "hot": hot})
        for key, value in node.items():
            if key not in ("example", "examples"):
                walk(value)

    walk(data)

    seen = set()
    unique = []
    for f in found:
        key = f["name"].lower()
        if key not in seen:
            seen.add(key)
            unique.append(f)
    return [f["name"] for f in unique if f["hot"]] + [f["name"] for f in unique if not f["hot"]]


# ---------------------------------- routes -----------------------------------

def _send_error(err: OnetError):
    status = err.status if err.status in (503, 429) else 502
    if status == 502:
        print(f"[onet] {err}")  # never log the key or the request headers
    return JSONResponse({"error": str(err)}, status_code=status)


@router.get("/search")
def search(request: Request, keyword: str = "", end: str = "8"):
    if _rate_limited(request):
        return JSONResponse({"error": "slow_down"}, status_code=429)

    keyword = keyword.strip()[:100]
    if len(keyword) < 2:
        return JSONResponse({"occupations": []})
    try:
        end_n = int(end)
    except ValueError:
        end_n = 8
    end_n = min(20, max(1, end_n or 8))

    try:
        occupations = _cached(
            f"search:{keyword.lower()}:{end_n}",
            lambda: _normalize_occupations(_onet_get("/online/search", {"keyword": keyword, "start": 1, "end": end_n})),
        )
        return JSONResponse({"occupations": occupations}, headers=CACHE_HEADERS)
    except OnetError as err:
        return _send_error(err)


def _fetch_detail(code):
    base = f"/online/occupations/{code}/details"
    jobs = {
        "tasks": (f"{base}/tasks", 20),
        "skills": (f"{base}/skills", 20),
        "tech": (f"{base}/technology_skills", 30),
    }
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {name: pool.submit(_get_list, path, end) for name, (path, end) in jobs.items()}

    results, failures = {}, []
    for name, future in futures.items():
        try:
            results[name] = future.result()
        except OnetError as err:
            failures.append(err)
        except Exception:
            failures.append(OnetError(502, "O*NET request failed"))

    # Auth, quota and outage problems must not be cached as "no data".
    blocking = next((e for e in failures if e.status in (401, 403, 429, 502, 503)), None)
    if blocking:
        raise blocking

    return {
        "code": code,
        "tasks": _normalize_tasks(results["tasks"]) if "tasks" in results else [],
        "skills": _normalize_skills(results["skills"]) if "skills" in results else [],
        "technology": _normalize_technology(results["tech"]) if "tech" in results else [],
    }


@router.get("/occupations/{code}")
def occupation_detail(code: str, request: Request):
    if _rate_limited(request):
        return JSONResponse({"error": "slow_down"}, status_code=429)
    if not CODE_RE.match(code):
        return JSONResponse({"error": "bad_code"}, status_code=400)

    try:
        detail = _cached(f"detail:{code}", lambda: _fetch_detail(code))
        return JSONResponse(detail, headers=CACHE_HEADERS)
    except OnetError as err:
        return _send_error(err)
