import { getToken } from './auth';

// Same address auth.js uses: the accounts server on Render (override with VITE_ACCOUNTS_URL for local development).
const API_URL = String(import.meta.env?.VITE_ACCOUNTS_URL || 'https://remopdf-server.onrender.com').replace(/\/+$/, '');

export class PaymentApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'PaymentApiError';
    // 0 = the server could not be reached, 401 = not signed in or the session expired.
    this.status = status;
  }
}

async function request(method, path, body) {
  const token = getToken();
  if (!token) throw new PaymentApiError('Please sign in to continue.', 401);

  let res;
  try {
    res = await fetch(`${API_URL}/api/payments${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new PaymentApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) throw new PaymentApiError((data && data.message) || 'Something went wrong. Please try again.', res.status);
  return data;
}

/**
 * { premium, tier, expiresAt, daysLeft, testMode, channels, plans: [{ id, name, amount, currency, days }] }
 *   premium  true for any paid plan
 *   tier     'free' | 'plus' | 'pro' | 'max': the plan the account has right now
 *   plans    the three plans that can be bought; amount is in the smallest unit (5900 = R59.00)
 */
export const getPaymentStatus = () => request('GET', '/status');

/**
 * Starts a payment. `details` is { plan, name, phone }: `plan` is 'plus' | 'pro' | 'max' (the server looks up the
 * price, so the browser only says which plan), name and phone come from the billing form (the email always comes
 * from the account). Resolves to { accessCode, reference }, or { premium: true } when the account already has that
 * plan or a better one.
 */
export const startPayment = (details = {}) => request('POST', '/initialize', details);

/** Asks the server to confirm a payment with Paystack. Resolves to { status: 'success' | 'failed' | 'pending', ... }. */
export const verifyPayment = (reference) => request('GET', `/verify/${encodeURIComponent(reference)}`);

/*
 * The AI pass: a short signed note from the accounts server saying which plan this account has right now (free, plus,
 * pro or max). The AI service checks the signature itself, so it never has to reach the accounts server (which may
 * only run on this computer), and it picks the AI model for that plan. Kept in memory until half a minute before it
 * runs out. Call forgetAiPass() when the plan changes (a payment just went through) so the next request carries the
 * new plan instead of the old one.
 */
let aiPass = null; // { value, until, forToken }
let aiPassRequest = null; // one request at a time, however many panels ask together

export const forgetAiPass = () => {
  aiPass = null;
};

/** Resolves to the pass (a string). */
export function getAiPass() {
  const token = getToken();
  if (aiPass && aiPass.forToken === token && aiPass.until - Date.now() > 30000) return Promise.resolve(aiPass.value);
  if (!aiPassRequest) {
    aiPassRequest = request('GET', '/ai-pass')
      .then((data) => {
        aiPass = { value: data.pass, until: Date.now() + (Number(data.expiresIn) || 0) * 1000, forToken: token };
        return data.pass;
      })
      .finally(() => {
        aiPassRequest = null;
      });
  }
  return aiPassRequest;
}

/**
 * The AI service answers 429 both for "too many requests this minute" and for "today's AI allowance is used up".
 * Only the second carries detail.code === 'quota'. Resolves to { message, tier, limit } for that one, or null.
 * Reads a copy of the response, so the caller can still read the body afterwards.
 */
export async function readQuota(res) {
  try {
    const detail = (await res.clone().json())?.detail;
    if (detail && typeof detail === 'object' && detail.code === 'quota') {
      return { message: String(detail.message || ''), tier: String(detail.tier || ''), limit: Number(detail.limit) || 0 };
    }
  } catch {
    /* not JSON: an ordinary rate limit */
  }
  return null;
}
