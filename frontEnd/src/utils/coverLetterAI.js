/*
  Client for the AI cover letter (POST /api/writing/cover-letter on the FastAPI backend, routers/writing_ai.py).

  The Groq key lives on the server (env GROQ_API_KEY). Nothing secret is in this file, and the key must never be
  put in the React app: anything in the bundle is public.

  Same rules as the writing assistant (components/Resume/Sections/writingAI.js):
    - Premium only. Before the request the app gets a short-lived "AI pass" from the accounts server (getAiPass in
      api/payments.js); the AI service checks the pass itself before it uses the key.
    - Errors are reported with WritingAIError and these codes:
        'signin'       not signed in, or the session ran out
        'premium'      signed in, but no active Premium payment
        'empty'        the resume has nothing to write a letter from yet
        'busy'         too many letters in a short time
        'timeout' | 'offline' | 'unavailable'

    generateCoverLetterBody({ resumeData, jobTitle, company, tone, fresh, signal })  -> string
      The BODY of the letter: paragraphs separated by a blank line, "- " for a bullet. The date, address block,
      "Dear ...", closing and signature are added by buildLetterModel() in utils/coverLetter.js.
      fresh: true skips the server's reply cache, so "Rewrite" gives a new version.

  Only the words of the resume are sent (buildResumeBrief): no phone, email, address, photo or date of birth.
*/

import { getToken } from '../api/auth';
import { getAiPass, forgetAiPass, PaymentApiError } from '../api/payments';
import { WritingAIError } from '../components/Resume/Sections/writingAI';
import { buildResumeBrief } from './coverLetter';

// Same address writingAI.js uses. Set VITE_API_URL to override it.
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'https://remopdf-backend.onrender.com').replace(/\/$/, '');
const LETTER_URL = `${API_ORIGIN}/api/writing/cover-letter`;

// Render's free tier can need 30-50 s to wake up, and a letter takes a few seconds on top of that.
const REQUEST_TIMEOUT_MS = 70000;

// Developer hint only: people just see the page's short notice. The server answers with {"detail": "..."}.
const logFailure = async (res) => {
  let detail = '';
  try {
    const raw = await res.text();
    try {
      detail = JSON.parse(raw).detail || raw;
    } catch {
      detail = raw.slice(0, 200); // not JSON: usually Render's own page while the service wakes up or redeploys
    }
  } catch {
    /* no readable body */
  }
  console.warn(`[coverLetterAI] ${res.status} from ${LETTER_URL}${detail ? `: ${detail}` : ''}`);
};

// The Premium pass from the accounts server. What goes wrong becomes the page's error codes.
async function passOrThrow() {
  try {
    return await getAiPass();
  } catch (err) {
    if (err instanceof PaymentApiError) {
      if (err.status === 401) throw new WritingAIError('signin', 'Sign in to have AI write your letter.');
      if (err.status === 403) throw new WritingAIError('premium', 'AI cover letters are a Premium feature.');
      if (err.status === 0) throw new WritingAIError('offline', 'Could not reach the accounts server.');
      console.warn(`[coverLetterAI] ${err.status} from the accounts server when asking for the AI pass: ${err.message}`);
    }
    throw new WritingAIError('unavailable', 'The AI writer is unavailable right now.');
  }
}

export async function generateCoverLetterBody({ resumeData, jobTitle = '', company = '', tone = 'formal', fresh = false, signal } = {}) {
  // No sign-in, no request: the server would refuse it anyway.
  if (!getToken()) throw new WritingAIError('signin', 'Sign in to have AI write your letter.');

  const brief = buildResumeBrief(resumeData);
  if (!brief.hasContent) throw new WritingAIError('empty', 'Add some details to your resume first.');

  const payload = JSON.stringify({
    resume: brief.resume,
    job_title: String(jobTitle || '').trim().slice(0, 120),
    company: String(company || '').trim().slice(0, 120),
    tone,
    years_experience: brief.yearsExperience,
    fresh: Boolean(fresh),
  });

  // One controller for both "the caller gave up" and "this took too long".
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }

  try {
    const send = (pass) =>
      fetch(LETTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pass}` }, // the pass, never the sign-in token
        body: payload,
        signal: controller.signal,
      });

    let res;
    try {
      res = await send(await passOrThrow());
      if (res.status === 401) {
        // The pass ran out between two requests (it lasts a few minutes): get a fresh one and try once more.
        forgetAiPass();
        res = await send(await passOrThrow());
      }
    } catch (err) {
      if (err instanceof WritingAIError) throw err;
      if (err && err.name === 'AbortError') {
        if (timedOut) throw new WritingAIError('timeout', 'The AI took too long to answer.');
        throw err; // the caller cancelled: let it ignore this
      }
      throw new WritingAIError('offline', 'Could not reach the AI service.');
    }

    if (res.status === 401) throw new WritingAIError('signin', 'Sign in to have AI write your letter.');
    if (res.status === 403) throw new WritingAIError('premium', 'AI cover letters are a Premium feature.');
    if (res.status === 429) throw new WritingAIError('busy', 'Too many letters in a short time.');
    if (res.status === 400) {
      await logFailure(res);
      throw new WritingAIError('empty', 'Add some details to your resume first.');
    }
    if (!res.ok) {
      await logFailure(res);
      throw new WritingAIError('unavailable', 'The AI writer is unavailable right now.');
    }

    let data;
    try {
      data = await res.json();
    } catch {
      throw new WritingAIError('unavailable', 'The AI writer is unavailable right now.');
    }

    const body = typeof data?.body === 'string' ? data.body.trim() : '';
    if (!body) throw new WritingAIError('unavailable', 'The AI writer is unavailable right now.');
    return body;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}
