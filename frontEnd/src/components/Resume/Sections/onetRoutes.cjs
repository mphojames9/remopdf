/* -------------------------------------------------------------------------- */
/*                         O*NET Web Services proxy (v2)                      */
/* -------------------------------------------------------------------------- */
/*
  Keeps your O*NET API key on the server. The React app calls these two routes:

    GET /api/onet/search?keyword=software+engineer&end=8
        -> { occupations: [{ code, title, score }] }

    GET /api/onet/occupations/15-1252.00
        -> { code, tasks: string[], skills: string[], technology: string[] }

  Setup
    1. Put the key in your server's environment (never in the React code, never in git):
         ONET_API_KEY=your-key-here
    2. Mount the router (Express, Node 18+ for the built-in fetch):
         app.use('/api/onet', require('./routes/onetRoutes.cjs'));
         // or, in an ES module project:
         // import onetRoutes from './routes/onetRoutes.cjs';  app.use('/api/onet', onetRoutes);

  If the key is missing or O*NET is down, these routes answer with an error status and the
  front end falls back to your own dataset, so the form never breaks.
*/

const express = require('express');

const router = express.Router();

const ONET_BASE = 'https://api-v2.onetcenter.org';
const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // occupation data changes a few times a year
const CACHE_MAX = 500;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 120; // requests per IP per minute; protects your O*NET quota
const CODE_RE = /^\d{2}-\d{4}\.\d{2}$/;
const CODE_IN_TEXT = /\d{2}-\d{4}\.\d{2}/;

class OnetError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* ------------------------------ tiny rate limit ----------------------------- */

const hits = new Map();
router.use((req, res, next) => {
  const now = Date.now();
  if (hits.size > 5000) hits.clear();
  const entry = hits.get(req.ip);
  if (!entry || entry.reset < now) {
    hits.set(req.ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return next();
  }
  entry.count += 1;
  if (entry.count > RATE_MAX) return res.status(429).json({ error: 'slow_down' });
  return next();
});

/* ---------------------------------- cache ----------------------------------- */

const cache = new Map();
const cached = (key, make) => {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise;
  const promise = make().catch((err) => {
    cache.delete(key); // never keep a failure
    throw err;
  });
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { promise, expires: Date.now() + CACHE_TTL_MS });
  return promise;
};

/* ------------------------------- O*NET client ------------------------------- */

async function onetGet(path, params = {}) {
  const apiKey = process.env.ONET_API_KEY;
  if (!apiKey) throw new OnetError(503, 'ONET_API_KEY is not set');

  const url = new URL(ONET_BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'X-API-Key': apiKey, Accept: 'application/json', 'User-Agent': 'RemoPDF-ResumeBuilder' },
      signal: controller.signal,
    });
    if (res.status === 204) return {};
    if (!res.ok) throw new OnetError(res.status, `O*NET responded with ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err instanceof OnetError) throw err;
    throw new OnetError(502, err && err.name === 'AbortError' ? 'O*NET timed out' : 'O*NET request failed');
  } finally {
    clearTimeout(timer);
  }
}

// Ask for the first page of a list. If the service rejects the paging params, ask for the default page.
async function getList(path, end) {
  try {
    return await onetGet(path, { start: 1, end });
  } catch (err) {
    if (err.status === 400 || err.status === 422) return onetGet(path);
    throw err;
  }
}

/* ------------------------------- normalisers -------------------------------- */
// Written defensively so a small change in O*NET's response shape does not break the form.

const asArray = (v) => (Array.isArray(v) ? v : []);
const textOf = (item) =>
  typeof item === 'string' ? item : (item && (item.statement || item.name || item.title || item.text)) || '';

function normalizeOccupations(data) {
  const list = asArray(data && (data.occupation || data.occupations || data.results));
  return list
    .map((o) => {
      const code = (o && o.code) || (String((o && o.href) || '').match(CODE_IN_TEXT) || [])[0];
      const score = o && o.relevance_score != null ? Number(o.relevance_score) : null;
      return { code, title: String((o && o.title) || '').trim(), score: Number.isFinite(score) ? score : null };
    })
    .filter((o) => o.code && o.title);
}

const normalizeTasks = (data) =>
  asArray(data && (data.task || data.tasks || data.element))
    .map((t) => String(textOf(t)).trim())
    .filter(Boolean);

const normalizeSkills = (data) =>
  asArray(data && (data.element || data.skill))
    .map((s) => String(textOf(s)).trim())
    .filter(Boolean);

// Technology skills come grouped by category, each with example products ("Microsoft Excel").
// Hot technologies first, then the rest in the order O*NET lists them.
function normalizeTechnology(data) {
  const found = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const examples = node.example || node.examples;
    if (Array.isArray(examples)) {
      examples.forEach((ex) => {
        const name = String(textOf(ex)).trim();
        if (name) found.push({ name, hot: !!ex && (ex.hot_technology === true || ex.hot_technology === 'true') });
      });
    }
    Object.keys(node).forEach((k) => {
      if (k !== 'example' && k !== 'examples') walk(node[k]);
    });
  };
  walk(data);

  const seen = new Set();
  const unique = found.filter((f) => {
    const key = f.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...unique.filter((f) => f.hot), ...unique.filter((f) => !f.hot)].map((f) => f.name);
}

/* ---------------------------------- routes ---------------------------------- */

const sendError = (res, err) => {
  const status = err.status === 503 || err.status === 429 ? err.status : 502;
  if (status === 502) console.error('[onet]', err.message); // never log the key or the request headers
  res.status(status).json({ error: err.message });
};

router.get('/search', async (req, res) => {
  const keyword = String(req.query.keyword || '').trim().slice(0, 100);
  if (keyword.length < 2) return res.json({ occupations: [] });
  const end = Math.min(20, Math.max(1, parseInt(req.query.end, 10) || 8));

  try {
    const occupations = await cached(`search:${keyword.toLowerCase()}:${end}`, async () =>
      normalizeOccupations(await onetGet('/online/search', { keyword, start: 1, end }))
    );
    res.set('Cache-Control', 'private, max-age=3600');
    return res.json({ occupations });
  } catch (err) {
    return sendError(res, err);
  }
});

router.get('/occupations/:code', async (req, res) => {
  const { code } = req.params;
  if (!CODE_RE.test(code)) return res.status(400).json({ error: 'bad_code' });

  try {
    const detail = await cached(`detail:${code}`, async () => {
      const base = `/online/occupations/${code}/details`;
      const [tasks, skills, tech] = await Promise.allSettled([
        getList(`${base}/tasks`, 20),
        getList(`${base}/skills`, 20),
        getList(`${base}/technology_skills`, 30),
      ]);

      // Auth, quota and outage problems must not be cached as "no data".
      const failures = [tasks, skills, tech].filter((r) => r.status === 'rejected').map((r) => r.reason);
      const blocking = failures.find((e) => e && [401, 403, 429, 502, 503].includes(e.status));
      if (blocking) throw blocking;

      return {
        code,
        tasks: tasks.status === 'fulfilled' ? normalizeTasks(tasks.value) : [],
        skills: skills.status === 'fulfilled' ? normalizeSkills(skills.value) : [],
        technology: tech.status === 'fulfilled' ? normalizeTechnology(tech.value) : [],
      };
    });
    res.set('Cache-Control', 'private, max-age=3600');
    return res.json(detail);
  } catch (err) {
    return sendError(res, err);
  }
});

module.exports = router;
