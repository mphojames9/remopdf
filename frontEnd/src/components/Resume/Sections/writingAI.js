/*
  Client for the AI writing assistant (POST /api/writing/analyze on the FastAPI backend).

  The Groq key lives on the server (routers/writing_ai.py, env GROQ_API_KEY). Nothing secret is in
  this file, and the key must never be put in the React app: anything in the bundle is public.

    analyzeWriting({ text, field, jobTitle, signal })   -> { suggestions, improved }
    applySuggestion(text, suggestion)                   -> new text, or null if it no longer fits
    applySuggestions(text, suggestions)                 -> new text with every edit that still fits
    canApply(text, suggestion)                          -> true if the edit can still be applied
*/

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
  // code: 'busy' | 'timeout' | 'offline' | 'unavailable'
  constructor(code, message) {
    super(message);
    this.name = 'WritingAIError';
    this.code = code;
  }
}

const cacheKey = (text, field, jobTitle) => `${field}\u0000${jobTitle}\u0000${text}`;

export async function analyzeWriting({ text, field = 'other', jobTitle = '', signal } = {}) {
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
    let res;
    try {
      res = await fetch(ANALYZE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: body, field, job_title: title || null }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err && err.name === 'AbortError') {
        if (timedOut) throw new WritingAIError('timeout', 'The AI took too long to answer.');
        throw err; // the caller cancelled: let it ignore this
      }
      throw new WritingAIError('offline', 'Could not reach the AI service.');
    }

    if (res.status === 429) throw new WritingAIError('busy', 'Too many reviews in a short time.');
    if (!res.ok) throw new WritingAIError('unavailable', 'AI review is unavailable right now.');

    let data;
    try {
      data = await res.json();
    } catch {
      throw new WritingAIError('unavailable', 'AI review is unavailable right now.');
    }

    const result = {
      suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      improved: typeof data.improved === 'string' && data.improved.trim() ? data.improved : null,
    };
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, result);
    return result;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

/* -------------------------------------------------------------------------- */
/*                         Applying a suggestion to the text                   */
/* -------------------------------------------------------------------------- */

const occurrences = (text, part) => (part ? text.split(part).length - 1 : 0);

// An edit only applies while its "original" still appears exactly once in the current text. If the
// writer has changed that part since the review, the suggestion is out of date and is hidden.
export const canApply = (text, s) => !!(s && s.original && typeof s.replacement === 'string' && occurrences(text, s.original) === 1);

export const applySuggestion = (text, s) => (canApply(text, s) ? text.replace(s.original, () => s.replacement) : null);

export const applySuggestions = (text, list) => list.reduce((current, s) => applySuggestion(current, s) ?? current, text);
