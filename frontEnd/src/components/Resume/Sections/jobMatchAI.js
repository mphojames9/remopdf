/*
  Client for job targeting (the FastAPI backend, routers/job_match.py). Premium only.

    buildJobTarget({ url, text, title, signal })              -> { target, notice }
    suggestJobSkills({ target, resumeData, signal })          -> { supported: [{ skill, jobItem, evidence }], toConfirm: [{ skill, jobItem, reason }] }
                                                                 skills only: qualifications never come back (see skillFilter.js)
    writeSummary({ target, resumeData, variant, signal })     -> { summary }   a professional summary written from the work history
    rewriteForJob({ text, field, jobTitle, target, signal })  -> { rewrites: [{ id, label, text, adds }] }

  Plus the small helpers the rest of the app needs: sanitizeJobTarget (anything read back from a saved resume is
  cleaned before it is used) and hasJobTarget.

  Same rules as writingAI.js: the Groq and O*NET keys live on the server, the request carries the short-lived
  "AI pass" from the accounts server (getAiPass), and the AI service checks it before doing anything. Errors use
  the same codes the writing panel already understands:
    'signin' | 'premium' | 'busy' | 'timeout' | 'offline' | 'unavailable'
  and, for reading a job advert or writing a summary, 'badlink' | 'unreadable' | 'nodetails' | 'needhistory' with a message a person can act on.
*/

import { getToken } from '../../../api/auth';
import { getAiPass, forgetAiPass, PaymentApiError } from '../../../api/payments';
import { collectStrings, hasJobTarget, stripMarkup, norm } from './atsScore';
import { isSkillTerm } from './skillFilter';

export { hasJobTarget };

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'https://remopdf-backend.onrender.com').replace(/\/$/, '');
const URLS = {
  target: `${API_ORIGIN}/api/jobmatch/target`,
  skills: `${API_ORIGIN}/api/jobmatch/skills`,
  rewrite: `${API_ORIGIN}/api/jobmatch/rewrite`,
  summary: `${API_ORIGIN}/api/jobmatch/summary`,
};

// Reading a page, asking Groq and asking O*NET happen one after the other, and Render's free tier can need
// 30-50 s to wake up, so the first target of a session gets a long timeout.
const TIMEOUT_MS = { target: 75000, skills: 45000, rewrite: 45000, summary: 45000 };
const CACHE_MAX = 40;

export class JobMatchError extends Error {
  // code: 'busy' | 'timeout' | 'offline' | 'unavailable' | 'signin' | 'premium' | 'badlink' | 'unreadable' | 'nodetails' | 'needhistory'
  constructor(code, message) {
    super(message);
    this.name = 'JobMatchError';
    this.code = code;
  }
}

/* -------------------------------------------------------------------------- */
/*                              What is kept on a resume                       */
/* -------------------------------------------------------------------------- */

const KINDS = new Set(['skill', 'tool', 'credential', 'soft', 'domain']);
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strList = (v, count, chars) =>
  (Array.isArray(v) ? v : []).map((x) => str(x, chars)).filter(Boolean).slice(0, count);

/**
 * Anything saved in resumeData.jobTarget goes through this on the way in, so a damaged or hand-edited save can
 * never break the builder. Returns undefined (no target), { skipped: true } (the person chose to skip), or a
 * complete target.
 */
export function sanitizeJobTarget(raw) {
  if (!raw || typeof raw !== 'object') return undefined;
  const seen = new Set();
  const keywords = (Array.isArray(raw.keywords) ? raw.keywords : [])
    .map((k) => (typeof k === 'string' ? { term: k } : k))
    .filter((k) => k && typeof k === 'object')
    .map((k) => ({
      term: str(k.term, 40),
      kind: KINDS.has(k.kind) ? k.kind : 'skill',
      must: k.must === true,
      source: k.source === 'onet' ? 'onet' : 'ad',
    }))
    .filter((k) => {
      const key = norm(k.term);
      if (k.term.length < 2 || !key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 40);

  const title = str(raw.title, 120);
  if (!title && keywords.length === 0) return raw.skipped === true ? { skipped: true } : undefined;

  const o = raw.onet && typeof raw.onet === 'object' ? raw.onet : null;
  return {
    title,
    company: str(raw.company, 120),
    address: str(raw.address, 200),
    seniority: str(raw.seniority, 20),
    source: ['link', 'text', 'title'].includes(raw.source) ? raw.source : 'title',
    requirements: strList(raw.requirements, 12, 200),
    duties: strList(raw.duties, 8, 200),
    keywords,
    onet:
      o && /^\d{2}-\d{4}\.\d{2}$/.test(String(o.code || ''))
        ? {
            code: String(o.code),
            title: str(o.title, 120),
            skills: strList(o.skills, 14, 60),
            technology: strList(o.technology, 16, 60),
            tasks: strList(o.tasks, 8, 200),
          }
        : null,
    createdAt: str(raw.createdAt, 40) || undefined,
  };
}

// What the server needs to know about the job (never the person's details).
const targetPayload = (t) => ({
  title: t.title || '',
  company: t.company || '',
  requirements: t.requirements || [],
  duties: t.duties || [],
  keywords: (t.keywords || []).slice(0, 40).map((k) => ({ term: k.term, must: Boolean(k.must), kind: KINDS.has(k.kind) ? k.kind : 'skill' })),
  onet_skills: t.onet?.skills || [],
  onet_technology: t.onet?.technology || [],
});

/* -------------------------------------------------------------------------- */
/*                                 The request                                 */
/* -------------------------------------------------------------------------- */

async function passOrThrow() {
  try {
    return await getAiPass();
  } catch (err) {
    if (err instanceof PaymentApiError) {
      if (err.status === 401) throw new JobMatchError('signin', 'Sign in to tailor your resume to a job.');
      if (err.status === 403) {
        forgetJobMatchCache(); // Premium is over (or was never there): nothing kept from before is shown again
        throw new JobMatchError('premium', 'Tailoring to a job is a Premium feature.');
      }
      if (err.status === 0) throw new JobMatchError('offline', 'Could not reach the accounts server.');
      console.warn(`[jobMatch] ${err.status} from the accounts server when asking for the AI pass: ${err.message}`);
    }
    throw new JobMatchError('unavailable', 'Job matching is unavailable right now.');
  }
}

// Developer hint only: the server answers {"detail": "..."} or {"detail": {"code", "message"}}.
async function readDetail(res) {
  let raw = '';
  try {
    raw = await res.text();
  } catch {
    return { code: '', message: '' };
  }
  try {
    const detail = JSON.parse(raw).detail;
    if (detail && typeof detail === 'object') return { code: String(detail.code || ''), message: String(detail.message || '') };
    return { code: '', message: String(detail || raw).slice(0, 200) };
  } catch {
    return { code: '', message: raw.slice(0, 200) }; // not JSON: usually Render's own page while the service wakes up
  }
}

async function post(kind, body, signal) {
  if (!getToken()) throw new JobMatchError('signin', 'Sign in to tailor your resume to a job.');

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS[kind]);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }

  try {
    const send = (pass) =>
      fetch(URLS[kind], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pass}` }, // the pass, never the sign-in token
        body: JSON.stringify(body),
        signal: controller.signal,
      });

    let res;
    try {
      res = await send(await passOrThrow());
      if (res.status === 401) {
        forgetAiPass(); // the pass ran out between two requests: get a fresh one and try once more
        res = await send(await passOrThrow());
      }
    } catch (err) {
      if (err instanceof JobMatchError) throw err;
      if (err && err.name === 'AbortError') {
        if (timedOut) throw new JobMatchError('timeout', 'This took too long. The server may be waking up, so try again in a few seconds.');
        throw err; // the caller cancelled: let it ignore this
      }
      throw new JobMatchError('offline', 'Could not reach the AI service.');
    }

    if (res.status === 401) throw new JobMatchError('signin', 'Sign in to tailor your resume to a job.');
    if (res.status === 403) {
      forgetJobMatchCache();
      throw new JobMatchError('premium', 'Tailoring to a job is a Premium feature.');
    }
    if (res.status === 429) throw new JobMatchError('busy', 'Too many requests in a short time.');
    if (!res.ok) {
      const { code, message } = await readDetail(res);
      if ((res.status === 400 || res.status === 422) && ['badlink', 'unreadable', 'nodetails', 'needhistory'].includes(code)) {
        throw new JobMatchError(code, message || 'That job could not be read.');
      }
      console.warn(`[jobMatch] ${res.status} from ${URLS[kind]}${message ? `: ${message}` : ''}`);
      throw new JobMatchError('unavailable', 'Job matching is unavailable right now.');
    }
    try {
      return await res.json();
    } catch {
      throw new JobMatchError('unavailable', 'Job matching is unavailable right now.');
    }
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

const cacheOf = () => new Map();
const caches = { skills: cacheOf(), rewrite: cacheOf() };
const remember = (cache, key, value) => {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, value);
  return value;
};

/* -------------------------------------------------------------------------- */
/*                                  The calls                                  */
/* -------------------------------------------------------------------------- */

export async function buildJobTarget({ url = '', text = '', title = '', signal } = {}) {
  const data = await post('target', { url: String(url).trim(), text: String(text).trim(), title: String(title).trim() }, signal);
  const target = sanitizeJobTarget({ ...(data && data.target), createdAt: new Date().toISOString() });
  if (!target || target.skipped) throw new JobMatchError('nodetails', 'We could not find what that job asks for.');
  const notice = data && data.notice && typeof data.notice.message === 'string' ? data.notice.message : null;
  return { target, notice };
}

// What the server needs to know about the resume to write from it (the person's contact details are never sent).
const resumePayload = (d, { withSummary = true } = {}) => ({
  summary: withSummary ? stripMarkup(d.summary).slice(0, 4000) : '',
  skills: (Array.isArray(d.skills) ? d.skills : []).map((s) => str(s && s.text, 60)).filter(Boolean).slice(0, 60),
  jobs: (Array.isArray(d.experiences) ? d.experiences : []).slice(0, 6).map((j) => ({
    title: str(j && j.title, 120),
    employer: str(j && j.employer, 120),
    achievements: stripMarkup(j && j.achievements).slice(0, 4000),
  })),
  education: collectStrings(d.education).map((t) => t.slice(0, 120)).slice(0, 6),
});

export async function suggestJobSkills({ target, resumeData, signal } = {}) {
  if (!hasJobTarget(target)) return { supported: [], toConfirm: [] };
  const body = { target: targetPayload(target), resume: resumePayload(resumeData || {}) };
  const key = JSON.stringify(body);
  const cache = caches.skills;
  if (cache.has(key)) return cache.get(key);

  const data = await post('skills', body, signal);
  // Skills only: the server already drops qualifications, and this keeps them out even if an older server answers.
  const named = (list) => (Array.isArray(list) ? list : []).filter((s) => s && typeof s.skill === 'string' && isSkillTerm(s.skill));
  const supported = named(data.supported).map((s) => ({ skill: s.skill.trim(), jobItem: str(s.job_item, 200), evidence: str(s.evidence, 160) }));
  const toConfirm = named(data.to_confirm).map((s) => ({ skill: s.skill.trim(), jobItem: str(s.job_item, 200), reason: str(s.reason, 140) }));
  return remember(cache, key, { supported, toConfirm });
}

// A professional summary written from the work history (and shaped for the job, when there is a job target).
// Not cached here: "Write another" must give a different one (the variant number tells the server).
export async function writeSummary({ target, resumeData, variant = 0, signal } = {}) {
  const body = {
    target: hasJobTarget(target) ? targetPayload(target) : null,
    resume: resumePayload(resumeData || {}, { withSummary: false }),
    variant: Math.max(0, Math.min(5, Number(variant) || 0)),
  };
  const data = await post('summary', body, signal);
  const summary = data && typeof data.summary === 'string' ? data.summary.trim() : '';
  if (!summary) throw new JobMatchError('unavailable', 'Job matching is unavailable right now.');
  return { summary };
}

export async function rewriteForJob({ text, field = 'experience', jobTitle = '', target, signal } = {}) {
  const body = {
    text: String(text || '').slice(0, 4000),
    field: field === 'summary' ? 'summary' : 'experience',
    job_title: str(jobTitle, 120) || null,
    target: targetPayload(target || {}),
  };
  const key = JSON.stringify(body);
  const cache = caches.rewrite;
  if (cache.has(key)) return cache.get(key);

  const data = await post('rewrite', body, signal);
  const rewrites = (Array.isArray(data.rewrites) ? data.rewrites : [])
    .filter((r) => r && typeof r.text === 'string' && r.text.trim())
    .slice(0, 3)
    .map((r, i) => ({
      id: r.id || `rw${i + 1}`,
      label: str(r.label, 32) || `Option ${i + 1}`,
      text: r.text,
      adds: strList(r.adds, 5, 40),
    }));
  return remember(cache, key, { rewrites });
}

// Cleared when Premium ends or the account changes, so nothing from before is shown to the next person.
export const forgetJobMatchCache = () => {
  caches.skills.clear();
  caches.rewrite.clear();
};
