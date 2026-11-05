/*
  Client for the AI writing assistant (POST /api/writing/analyze on the FastAPI backend).

  The Groq key lives on the server (routers/writing_ai.py, env GROQ_API_KEY). Nothing secret is in
  this file, and the key must never be put in the React app: anything in the bundle is public.

  The AI is a Premium feature. Before a review the app gets a short-lived "AI pass" from the accounts server
  (getAiPass in api/payments.js): a signed note that this account has Premium right now. The AI service checks
  the pass itself before it uses the key, so it never has to reach the accounts server. This file only reports
  what was said:
    403 -> WritingAIError('premium')    signed in, but no active Premium payment
    401 -> WritingAIError('signin')     not signed in, or the session ran out

    analyzeWriting({ text, field, jobTitle, signal })   -> { rewrites }
      rewrites = up to 3 whole-text versions to choose from: { id, label, text }
*/

import { getToken } from '../../../api/auth';
import { getAiPass, forgetAiPass, PaymentApiError } from '../../../api/payments';

// Same address onetSuggestions.js uses. Set VITE_API_URL to override it.
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'https://remopdf-backend.onrender.com').replace(/\/$/, '');
const ANALYZE_URL = `${API_ORIGIN}/api/writing/analyze`;

// Render's free tier can need 30-50 s to wake up, so the first request after idle is slow.
const REQUEST_TIMEOUT_MS = 45000;
const CACHE_MAX = 60;

export const MIN_CHARS = 20; // shorter than this there is nothing worth reviewing yet
export const MAX_CHARS = 4000; // the server rejects more than this

const cache = new Map();

export class WritingAIError extends Error {
  // code: 'busy' | 'timeout' | 'offline' | 'unavailable' | 'signin' | 'premium'
  constructor(code, message) {
    super(message);
    this.name = 'WritingAIError';
    this.code = code;
  }
}

// Developer hint only: people using the form just see the panel's short notice. The server answers
// with {"detail": "..."} (for example "GROQ_API_KEY is not set on the server"), so the console says why.
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
  console.warn(`[writingAI] ${res.status} from ${ANALYZE_URL}${detail ? `: ${detail}` : ''}`);
};

const cacheKey = (text, field, jobTitle) => `${field}\u0000${jobTitle}\u0000${text}`;

// The Premium pass from the accounts server (see getAiPass). What goes wrong becomes the panel's error codes.
async function passOrThrow() {
  try {
    return await getAiPass();
  } catch (err) {
    if (err instanceof PaymentApiError) {
      if (err.status === 401) throw new WritingAIError('signin', 'Sign in to use AI suggestions.');
      if (err.status === 403) {
        cache.clear(); // Premium is over (or was never there): nothing kept from before is shown again
        throw new WritingAIError('premium', 'AI suggestions are a Premium feature.');
      }
      if (err.status === 0) throw new WritingAIError('offline', 'Could not reach the accounts server.');
      console.warn(`[writingAI] ${err.status} from the accounts server when asking for the AI pass: ${err.message}`);
    }
    throw new WritingAIError('unavailable', 'AI review is unavailable right now.');
  }
}

export async function analyzeWriting({ text, field = 'other', jobTitle = '', signal } = {}) {
  // No sign-in, no request: the server would refuse it anyway. Checked before the cache so a result kept
  // from an earlier account is never shown to someone who is signed out.
  const token = getToken();
  if (!token) throw new WritingAIError('signin', 'Sign in to use AI suggestions.');

  const body = String(text || '').slice(0, MAX_CHARS);
  const title = String(jobTitle || '').trim().slice(0, 120);
  const key = cacheKey(body, field, title);
  if (cache.has(key)) return cache.get(key);

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
      fetch(ANALYZE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pass}` }, // the pass, never the sign-in token
        body: JSON.stringify({ text: body, field, job_title: title || null }),
        signal: controller.signal,
      });

    let res;
    try {
      res = await send(await passOrThrow());
      if (res.status === 401) {
        // The pass ran out between two reviews (it lasts a few minutes): get a fresh one and try once more.
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

    if (res.status === 401) throw new WritingAIError('signin', 'Sign in to use AI suggestions.');
    if (res.status === 403) {
      cache.clear(); // Premium is over (or was never there): nothing kept from before is shown again
      throw new WritingAIError('premium', 'AI suggestions are a Premium feature.');
    }
    if (res.status === 429) throw new WritingAIError('busy', 'Too many reviews in a short time.');
    if (!res.ok) {
      await logFailure(res);
      throw new WritingAIError('unavailable', 'AI review is unavailable right now.');
    }

    let data;
    try {
      data = await res.json();
    } catch {
      throw new WritingAIError('unavailable', 'AI review is unavailable right now.');
    }

    const rewrites = (Array.isArray(data.rewrites) ? data.rewrites : [])
      .filter((r) => r && typeof r.text === 'string' && r.text.trim())
      .slice(0, 3)
      .map((r, i) => ({
        id: r.id || `rw${i + 1}`,
        label: typeof r.label === 'string' && r.label.trim() ? r.label.trim() : `Option ${i + 1}`,
        text: r.text,
      }));
    // A server that still answers with one "improved" text counts as a single option.
    if (rewrites.length === 0 && typeof data.improved === 'string' && data.improved.trim()) {
      rewrites.push({ id: 'rw1', label: 'Polished version', text: data.improved });
    }
    const result = { rewrites };
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, result);
    return result;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}
