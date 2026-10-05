import * as dataset from './datasetSuggestions';

/* -------------------------------------------------------------------------- */
/*                 O*NET first, your dataset when O*NET has nothing            */
/* -------------------------------------------------------------------------- */
/*
  Same three functions as datasetSuggestions.js, but async:

    suggestTitles()        job titles for the "Title" field
    suggestAchievements()  idea bullets for one job (O*NET task statements)
    suggestSkills()        skills (O*NET technology skills + skills) for the user's job titles

  For each call:
    1. The job title is looked up in O*NET (through the server proxy at /api/onet).
    2. If O*NET knows the occupation, its data is used.   -> source: 'onet'
    3. If the occupation is not found, O*NET has no data for it, or the request fails,
       the call is answered by datasetSuggestions.js.      -> source: 'dataset'

  The API key lives on the server (see onetRoutes.cjs). Nothing secret is in this file.

  CONSOLE LOGGING (see "console logging" below): every call prints which source answered it
  (green badge = O*NET API, orange badge = your dataset), the suggestions it returned, and,
  when the dataset answered, why O*NET was not used.
*/

// Absolute backend URL: a relative '/api/onet' only works behind the Vite dev proxy. On
// remopdf.site it hits the static host (HTML, not JSON) and inside the Android WebView it
// cannot reach the backend at all. Set VITE_API_URL to override the default.
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'https://remopdf-backend.onrender.com').replace(/\/$/, '');
const ONET_API = `${API_ORIGIN}/api/onet`;
// Render's free tier can take 30-50 s to wake up, so the first request after idle may still
// time out and fall back to the dataset; later ones are fast.
const REQUEST_TIMEOUT_MS = 15000;
// O*NET scores each keyword match 0-100. Below this the match is too loose to trust.
const MIN_RELEVANCE = 45;
// After a failed request (server down, key missing, quota hit) skip O*NET for a while so the
// form answers from the dataset straight away instead of waiting on a timeout for every keystroke.
const COOLDOWN_MS = 60 * 1000;
const MAX_TITLES_FOR_SKILLS = 3;

/* ------------------------------ console logging ----------------------------- */

const DEBUG = true; // false = silent
const START_COLLAPSED = false; // true = each log group starts folded, click it to open

const BADGE = {
  onet: 'background:#0b7a3e;color:#fff;font-weight:bold;padding:1px 6px;border-radius:3px',
  dataset: 'background:#c2410c;color:#fff;font-weight:bold;padding:1px 6px;border-radius:3px',
};
const PLAIN = 'color:inherit;font-weight:normal';

const describeError = (err) => {
  if (err && err.name === 'AbortError') return `timed out after ${REQUEST_TIMEOUT_MS} ms`;
  if (err && err.name === 'SyntaxError') return 'response was not JSON (is the /api/onet proxy running?)';
  return String((err && err.message) || err || 'unknown error');
};

// One line per real network request to the O*NET proxy. A repeated lookup that is answered from
// the in-memory cache makes no request, so it prints no line here.
const logRequest = (path, params, outcome, started) => {
  if (!DEBUG) return;
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  console.log(`%cO*NET API%c GET ${ONET_API}${path}${qs} -> ${outcome} (${Date.now() - started} ms)`, BADGE.onet, PLAIN);
};

// One group per suggestion call: where the answer came from, what was returned, and the details.
const logResult = (name, input, result, details = {}) => {
  if (!DEBUG) return;
  const fromOnet = result.source === 'onet';
  const list = Array.isArray(result.suggestions) ? result.suggestions : [];
  const open = START_COLLAPSED ? console.groupCollapsed : console.group;
  open.call(
    console,
    `%c${fromOnet ? 'O*NET API' : 'MY DATASET'}%c ${name} -> ${list.length} suggestion(s)`,
    BADGE[fromOnet ? 'onet' : 'dataset'],
    PLAIN
  );
  console.log('input:', input);
  Object.keys(details).forEach((key) => console.log(`${key}:`, details[key]));
  if (list.length) {
    console.table(list.map((suggestion, i) => ({ '#': i + 1, suggestion, from: fromOnet ? 'O*NET API' : 'my dataset' })));
  }
  console.groupEnd();
};

/* --------------------------------- helpers --------------------------------- */

const norm = (value) =>
  String(value == null ? '' : value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const unique = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = norm(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const interleave = (lists) => {
  const out = [];
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let i = 0; i < longest; i += 1) {
    lists.forEach((list) => {
      if (i < list.length) out.push(list[i]);
    });
  }
  return out;
};

const asList = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v ? [v] : []);

// "Senior Software Engineer" is looked up as "Software Engineer".
const SENIORITY = new Set(['senior', 'sr', 'junior', 'jr', 'lead', 'principal', 'trainee', 'intern', 'ii', 'iii', 'iv']);
const cleanQuery = (value) => {
  const words = String(value || '')
    .replace(/[^\w\s+#./&-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const kept = words.filter((w) => !SENIORITY.has(w.toLowerCase()));
  return (kept.length ? kept : words).join(' ').trim();
};

// O*NET names are official plurals ("Software Developers, Applications"). On a resume you
// write the singular, so keep the main part of the name and singularise its last word.
const KEEP_PLURAL = new Set([
  'news', 'physics', 'mathematics', 'statistics', 'economics', 'analytics', 'logistics',
  'ethics', 'electronics', 'politics', 'linguistics', 'genetics',
]);
const singular = (word) => {
  const lower = word.toLowerCase();
  if (lower.length < 4 || !lower.endsWith('s') || KEEP_PLURAL.has(lower)) return word;
  if (/(ss|us|is)$/.test(lower)) return word;
  if (/ies$/.test(lower)) return `${word.slice(0, -3)}y`;
  if (/(ches|shes|xes|zes|sses)$/.test(lower)) return word.slice(0, -2);
  return word.slice(0, -1);
};
const friendlyTitle = (raw) => {
  const first = String(raw || '').split(',')[0].trim();
  if (!first) return first;
  // "Janitors and Cleaners" is a list of plurals: leave it. "Computer and Information Systems
  // Managers" is one role: singularise the last word.
  const parts = first.split(/\s+and\s+/i);
  if (parts.length > 1 && /s$/i.test(parts[0].trim().split(/\s+/).pop())) return first;
  const words = first.split(/\s+/);
  words[words.length - 1] = singular(words[words.length - 1]);
  return words.join(' ');
};

// Task statements read as bullets without the closing full stop.
const cleanTask = (text) => String(text || '').replace(/\s+/g, ' ').trim().replace(/[.;\s]+$/, '');

/* ------------------------------- request layer ------------------------------ */

let pausedUntil = 0;
const pause = () => {
  pausedUntil = Date.now() + COOLDOWN_MS;
};

async function getJson(path, params) {
  if (Date.now() < pausedUntil) {
    throw new Error(`O*NET is paused for another ${Math.ceil((pausedUntil - Date.now()) / 1000)} s after an earlier failure`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const started = Date.now();
  try {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    const res = await fetch(`${ONET_API}${path}${qs}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
    logRequest(path, params, res.status, started);
    if (res.status === 401 || res.status === 403 || res.status === 429 || res.status >= 500) {
      pause();
      throw new Error(`O*NET proxy answered ${res.status}`);
    }
    if (!res.ok) throw new Error(`O*NET proxy answered ${res.status}`);
    // A dev server without the proxy answers with an HTML page; json() throws and we fall back.
    return await res.json();
  } catch (err) {
    if (!/O\*NET proxy/.test(String(err && err.message))) {
      logRequest(path, params, `FAILED: ${describeError(err)}`, started);
      pause(); // network error, timeout, bad JSON
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Remember answers (and share a request that is already running). Failures are not kept.
const searchCache = new Map();
const detailCache = new Map();
const remember = (cache, key, make) => {
  if (cache.has(key)) return cache.get(key);
  const promise = make().catch((err) => {
    cache.delete(key);
    throw err;
  });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  cache.set(key, promise);
  return promise;
};

const searchOccupations = (keyword, end = 8) =>
  remember(searchCache, `${norm(keyword)}|${end}`, async () => {
    const data = await getJson('/search', { keyword, end });
    return (Array.isArray(data && data.occupations) ? data.occupations : []).filter((o) => o && o.code && o.title);
  });

const getOccupationDetail = (code) =>
  remember(detailCache, code, async () => {
    const data = await getJson(`/occupations/${encodeURIComponent(code)}`);
    return {
      tasks: Array.isArray(data && data.tasks) ? data.tasks : [],
      skills: Array.isArray(data && data.skills) ? data.skills : [],
      technology: Array.isArray(data && data.technology) ? data.technology : [],
    };
  });

const isRelevant = (occupation) => occupation.score == null || occupation.score >= MIN_RELEVANCE;

// The O*NET occupation a job title refers to, or null when O*NET has no good match.
const resolveOccupation = async (title) => {
  const q = cleanQuery(title);
  if (q.length < 2) return null;
  const list = await searchOccupations(q, 5);
  return list.find(isRelevant) || null;
};

const occupationLabel = (o) => `${o.code} ${o.title}${o.score == null ? '' : ` (match score ${o.score})`}`;

/* -------------------------------- job titles -------------------------------- */

export const suggestTitles = async ({ query = '', skills = [], previousTitles = [], limit = 8 } = {}) => {
  const q = cleanQuery(query);
  let why = 'nothing typed yet, so titles come from your skills and earlier jobs';
  if (q.length >= 2) {
    try {
      const found = await searchOccupations(q, limit + 4);
      const relevant = found.filter(isRelevant);
      const titles = unique(relevant.map((o) => friendlyTitle(o.title)));
      if (titles.length) {
        const result = { suggestions: titles.slice(0, limit), source: 'onet' };
        logResult('suggestTitles', { query }, result, { 'O*NET occupations matched': relevant.map(occupationLabel) });
        return result;
      }
      why = `O*NET has no occupation matching "${q}" (no results, or every match scored below ${MIN_RELEVANCE})`;
    } catch (err) {
      why = `O*NET request failed: ${describeError(err)}`;
    }
  }
  // Nothing typed (suggestions from skills and earlier jobs) or O*NET has no match.
  const result = { ...dataset.suggestTitles({ query, skills, previousTitles, limit }), source: 'dataset' };
  logResult('suggestTitles', { query, skills, previousTitles }, result, { 'why the dataset answered': why });
  return result;
};

/* ------------------------------- achievements ------------------------------- */

// O*NET task statements for the occupation. Ideas that mention one of the user's skills come first.
const buildTaskPool = (tasks, skills, existing, exclude) => {
  const skip = new Set([...asList(existing), ...asList(exclude)].map(norm).filter(Boolean));
  const skillKeys = skills.map(norm).filter((k) => k.length >= 3);
  return tasks
    .map(cleanTask)
    .filter(Boolean)
    .map((text, i) => ({ text, i, hit: skillKeys.some((k) => norm(text).includes(k)) ? 1 : 0 }))
    .sort((a, b) => b.hit - a.hit || a.i - b.i)
    .map((x) => x.text)
    .filter((text) => {
      const key = norm(text);
      if (skip.has(key)) return false;
      skip.add(key);
      return true;
    });
};

export const suggestAchievements = async ({
  title = '',
  skills = [],
  existing = [],
  exclude = [],
  round = 0,
  limit = 5,
} = {}) => {
  let why = 'no job title typed yet';
  try {
    const occupation = await resolveOccupation(title);
    if (occupation) {
      const detail = await getOccupationDetail(occupation.code);
      const pool = buildTaskPool(detail.tasks, skills, existing, exclude);
      if (pool.length) {
        const total = pool.length;
        const count = Math.min(limit, total);
        const start = (Math.max(0, round) * limit) % total;
        const suggestions = Array.from({ length: count }, (_, i) => pool[(start + i) % total]);
        const result = { suggestions, total, roleLabel: friendlyTitle(occupation.title), source: 'onet' };
        logResult('suggestAchievements', { title, round }, result, {
          'O*NET occupation used': occupationLabel(occupation),
          'task statements available': total,
        });
        return result;
      }
      why = `O*NET occupation ${occupationLabel(occupation)} has no task statements left (none returned, or all already used)`;
    } else if (cleanQuery(title).length >= 2) {
      why = `O*NET has no occupation matching "${title}"`;
    }
  } catch (err) {
    why = `O*NET request failed: ${describeError(err)}`;
  }
  const result = { ...dataset.suggestAchievements({ title, skills, existing, exclude, round, limit }), source: 'dataset' };
  logResult('suggestAchievements', { title, round }, result, { 'why the dataset answered': why });
  return result;
};

/* ---------------------------------- skills ---------------------------------- */

// Skills for the user's job titles: O*NET technology skills (hot technologies first) mixed with
// its core skills, earlier (more recent) jobs first.
const onetSkillPool = async (jobTitles) => {
  const titles = unique(asList(jobTitles).map((t) => String(t || '').trim())).slice(0, MAX_TITLES_FOR_SKILLS);
  const resolved = await Promise.all(
    titles.map(async (title) => {
      try {
        const occupation = await resolveOccupation(title);
        if (!occupation) return { title, error: 'no matching O*NET occupation' };
        return { title, occupation, detail: await getOccupationDetail(occupation.code) };
      } catch (err) {
        return { title, error: describeError(err) };
      }
    })
  );
  const found = resolved.filter((r) => r.detail);
  const perTitle = found.map((r) => interleave([r.detail.technology, r.detail.skills]));
  return {
    pool: unique(interleave(perTitle)),
    matched: found.map(
      (r) => `"${r.title}" -> ${occupationLabel(r.occupation)}: ${r.detail.technology.length} technology + ${r.detail.skills.length} skills`
    ),
    missed: resolved.filter((r) => !r.detail).map((r) => `"${r.title}": ${r.error}`),
  };
};

const matchesQuery = (skill, q) => {
  const n = norm(skill);
  return n.includes(q);
};

export const suggestSkills = async ({ query = '', exclude = [], jobTitles = [], limit = 10 } = {}) => {
  let why = 'no job titles yet';
  let info = { pool: [], matched: [], missed: [] };
  try {
    info = await onetSkillPool(jobTitles);
    const { pool } = info;
    if (pool.length) {
      const skip = new Set(asList(exclude).map(norm).filter(Boolean));
      const q = norm(query);
      let list = pool.filter((s) => !skip.has(norm(s)));
      if (q) {
        list = list.filter((s) => matchesQuery(s, q));
        list = [...list.filter((s) => norm(s).startsWith(q)), ...list.filter((s) => !norm(s).startsWith(q))];
      }
      if (list.length) {
        const result = { suggestions: list.slice(0, limit), personalised: true, source: 'onet' };
        logResult('suggestSkills', { query, jobTitles }, result, {
          'O*NET occupations used': info.matched,
          'job titles O*NET could not use': info.missed,
          'skills in the O*NET pool': pool.length,
        });
        return result;
      }
      why = `O*NET returned ${pool.length} skills but none match what was typed ("${query}") or they are already added`;
    } else if (info.missed.length) {
      why = 'O*NET could not use any of the job titles';
    }
  } catch (err) {
    why = `O*NET request failed: ${describeError(err)}`;
  }
  // No job title yet, O*NET does not know them, or nothing in O*NET matches what was typed.
  const result = { ...dataset.suggestSkills({ query, exclude, jobTitles, limit }), source: 'dataset' };
  logResult('suggestSkills', { query, jobTitles }, result, {
    'why the dataset answered': why,
    'job titles O*NET could not use': info.missed,
  });
  return result;
};
