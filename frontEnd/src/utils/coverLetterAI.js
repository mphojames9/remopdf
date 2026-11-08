/*
  Client for the AI cover letter, on the FastAPI backend (routers/writing_ai.py):

    POST /api/writing/cover-letter   resume + position + what the job asks for  ->  the letter body
    POST /api/writing/job-posting    the link to the job advert (or its pasted text)  ->  position, company, address,
                                     requirements, duties

  The Groq key lives on the server (env GROQ_API_KEY). Nothing secret is in this file, and the key must never be
  put in the React app: anything in the bundle is public.

  Same rules as the writing assistant (components/Resume/Sections/writingAI.js):
    - Premium only. Before the request the app gets a short-lived "AI pass" from the accounts server (getAiPass in
      api/payments.js); the AI service checks the pass itself before it uses the key.
    - Errors are reported with WritingAIError and these codes:
        'signin'       not signed in, or the session ran out
        'premium'      signed in, but no active Premium payment
        'empty'        the resume has nothing to write a letter from yet
        'busy'         too many requests in a short time
        'timeout' | 'offline' | 'unavailable'
      and, for readJobPosting only (the message is written for the person to read):
        'badlink'      that is not a web address that can be used
        'unreadable'   the page could not be read (sign-in wall, blocked, gone, loads only in a browser)
        'nodetails'    the page was read but no job requirements were found in it

    generateCoverLetterBody({ resumeData, jobTitle, company, tone, requirements, duties, fresh, signal })  -> string
      The BODY of the letter: paragraphs separated by a blank line, "- " for a bullet. The date, address block,
      "Dear ...", closing and signature are added by buildLetterModel() in utils/coverLetter.js.
      fresh: true skips the server's reply cache, so "Rewrite" gives a new version.

    readJobPosting({ url, text, signal })  -> { jobTitle, company, address, requirements[], duties[], source }
      url: the link to the advert. text: the advert pasted by hand (used when a site cannot be read by a server).
      The server downloads the page itself, because a browser may not read other sites' pages.

  Only the words of the resume are sent (buildResumeBrief): no phone, email, address, photo or date of birth.
*/

import { getToken } from '../api/auth';
import { getAiPass, forgetAiPass, PaymentApiError } from '../api/payments';
import { WritingAIError } from '../components/Resume/Sections/writingAI';
import { buildResumeBrief, MAX_ITEM_CHARS, MAX_REQUIREMENT_ITEMS, MAX_DUTY_ITEMS } from './coverLetter';

// Same address writingAI.js uses. Set VITE_API_URL to override it.
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'https://remopdf-backend.onrender.com').replace(/\/$/, '');
const LETTER_URL = `${API_ORIGIN}/api/writing/cover-letter`;
const POSTING_URL = `${API_ORIGIN}/api/writing/job-posting`;

// Render's free tier can need 30-50 s to wake up, and a letter takes a few seconds on top of that.
const LETTER_TIMEOUT_MS = 70000;
// Reading an advert adds the download of the page (up to 20 s on the server) to the wake-up and the AI.
const POSTING_TIMEOUT_MS = 90000;

// Developer hint only: people just see the page's short notice. The server answers with {"detail": "..."}.
const logFailure = async (url, res) => {
  let detail = '';
  try {
    const raw = await res.text();
    try {
      const parsed = JSON.parse(raw).detail;
      detail = typeof parsed === 'string' ? parsed : JSON.stringify(parsed) || raw;
    } catch {
      detail = raw.slice(0, 200); // not JSON: usually Render's own page while the service wakes up or redeploys
    }
  } catch {
    /* no readable body */
  }
  console.warn(`[coverLetterAI] ${res.status} from ${url}${detail ? `: ${detail}` : ''}`);
};

// The Premium pass from the accounts server. What goes wrong becomes the page's error codes.
async function passOrThrow(what) {
  try {
    return await getAiPass();
  } catch (err) {
    if (err instanceof PaymentApiError) {
      if (err.status === 401) throw new WritingAIError('signin', `Sign in to ${what}.`);
      if (err.status === 403) throw new WritingAIError('premium', 'This is a Premium feature.');
      if (err.status === 0) throw new WritingAIError('offline', 'Could not reach the accounts server.');
      console.warn(`[coverLetterAI] ${err.status} from the accounts server when asking for the AI pass: ${err.message}`);
    }
    throw new WritingAIError('unavailable', 'The AI writer is unavailable right now.');
  }
}

/**
 * POSTs `payload` with the Premium pass and returns the parsed JSON answer.
 *   what      "write your letter" | "read the job advert": completes "Sign in to ..." in messages
 *   explain   async (res) => WritingAIError | null: turns the statuses only this request knows (400, 422 ...) into
 *             an error; null falls through to 'unavailable'
 */
async function postWithPass(url, payload, { what, timeoutMs, signal, explain }) {
  // One controller for both "the caller gave up" and "this took too long".
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }

  const body = JSON.stringify(payload);
  try {
    const send = (pass) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pass}` }, // the pass, never the sign-in token
        body,
        signal: controller.signal,
      });

    let res;
    try {
      res = await send(await passOrThrow(what));
      if (res.status === 401) {
        // The pass ran out between two requests (it lasts a few minutes): get a fresh one and try once more.
        forgetAiPass();
        res = await send(await passOrThrow(what));
      }
    } catch (err) {
      if (err instanceof WritingAIError) throw err;
      if (err && err.name === 'AbortError') {
        if (timedOut) throw new WritingAIError('timeout', 'The AI took too long to answer.');
        throw err; // the caller cancelled: let it ignore this
      }
      throw new WritingAIError('offline', 'Could not reach the AI service.');
    }

    if (res.status === 401) throw new WritingAIError('signin', `Sign in to ${what}.`);
    if (res.status === 403) throw new WritingAIError('premium', 'This is a Premium feature.');
    if (res.status === 429) throw new WritingAIError('busy', 'Too many requests in a short time.');
    if (!res.ok) {
      const known = explain ? await explain(res.clone()) : null;
      await logFailure(url, res);
      throw known || new WritingAIError('unavailable', 'The AI writer is unavailable right now.');
    }

    try {
      return await res.json();
    } catch {
      throw new WritingAIError('unavailable', 'The AI writer is unavailable right now.');
    }
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

/* ------------------------------------------------------------------ the letter */

const clipList = (value, max) =>
  (Array.isArray(value) ? value : [])
    .map((item) => String(item ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_ITEM_CHARS))
    .filter(Boolean)
    .slice(0, max);

export async function generateCoverLetterBody({
  resumeData,
  jobTitle = '',
  company = '',
  tone = 'formal',
  requirements = [],
  duties = [],
  fresh = false,
  signal,
} = {}) {
  // No sign-in, no request: the server would refuse it anyway.
  if (!getToken()) throw new WritingAIError('signin', 'Sign in to have AI write your letter.');

  const brief = buildResumeBrief(resumeData);
  if (!brief.hasContent) throw new WritingAIError('empty', 'Add some details to your resume first.');

  const data = await postWithPass(
    LETTER_URL,
    {
      resume: brief.resume,
      job_title: String(jobTitle || '').trim().slice(0, 120),
      company: String(company || '').trim().slice(0, 120),
      tone,
      years_experience: brief.yearsExperience,
      fresh: Boolean(fresh),
      requirements: clipList(requirements, MAX_REQUIREMENT_ITEMS),
      duties: clipList(duties, MAX_DUTY_ITEMS),
    },
    {
      what: 'have AI write your letter',
      timeoutMs: LETTER_TIMEOUT_MS,
      signal,
      // 400: the server found nothing to write from in the resume.
      explain: async (res) => (res.status === 400 ? new WritingAIError('empty', 'Add some details to your resume first.') : null),
    },
  );

  const body = typeof data?.body === 'string' ? data.body.trim() : '';
  if (!body) throw new WritingAIError('unavailable', 'The AI writer is unavailable right now.');
  return body;
}

/* ------------------------------------------------------------------ the job advert */

// "12 Rivonia Road, Sandton, Gauteng, 2196, ZA" -> "... , South Africa". Adverts often give a country code.
const countryName = (code) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
};

const tidyAddress = (value) => {
  const parts = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s*,\s*/)
    .filter(Boolean);
  if (parts.length > 1 && /^[A-Z]{2}$/.test(parts[parts.length - 1])) parts[parts.length - 1] = countryName(parts[parts.length - 1]);
  return parts.join(', ').slice(0, 200);
};

const oneLine = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const POSTING_CODES = ['badlink', 'unreadable', 'nodetails'];

// The server answers a page it cannot use with {"detail": {"code": "...", "message": "..."}}.
const explainPosting = async (res) => {
  let detail = null;
  try {
    detail = (await res.json())?.detail;
  } catch {
    /* not JSON */
  }
  if (detail && typeof detail === 'object' && !Array.isArray(detail) && POSTING_CODES.includes(detail.code)) {
    return new WritingAIError(detail.code, oneLine(detail.message, 300) || 'That advert could not be read.');
  }
  // A request the server's own checks refused (for example a link that is far too long).
  if (res.status === 400 || res.status === 422) return new WritingAIError('badlink', 'That link could not be used.');
  return null;
};

export async function readJobPosting({ url = '', text = '', signal } = {}) {
  if (!getToken()) throw new WritingAIError('signin', 'Sign in to read the job advert.');

  const link = String(url || '').trim().slice(0, 2000);
  const pasted = String(text || '').trim().slice(0, 20000);
  if (!link && !pasted) throw new WritingAIError('badlink', 'Paste the link to the job advert.');

  const data = await postWithPass(POSTING_URL, { url: link, text: pasted }, { what: 'read the job advert', timeoutMs: POSTING_TIMEOUT_MS, signal, explain: explainPosting });

  const requirements = clipList(data?.requirements, MAX_REQUIREMENT_ITEMS);
  const duties = clipList(data?.duties, MAX_DUTY_ITEMS);
  if (requirements.length === 0 && duties.length === 0) {
    throw new WritingAIError('nodetails', 'We could not find what the job asks for in that advert. Paste the job description into the box instead.');
  }
  return {
    jobTitle: oneLine(data?.job_title, 120),
    company: oneLine(data?.company, 120),
    address: tidyAddress(data?.address),
    requirements,
    duties,
    source: data?.source === 'text' ? 'text' : 'link',
  };
}
