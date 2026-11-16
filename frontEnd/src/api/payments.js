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
 * { premium, tier, expiresAt, daysLeft, testMode, channels, maxBankedDays, plans: [{ id, name, amount, currency, days }] }
 *   premium        true while Premium is running
 *   tier           'free' | 'premium': the plan the account has right now
 *   daysLeft       days of Premium left, counting any that were paid for in advance
 *   maxBankedDays  the most days that can be waiting at once (more cannot be added until some are used)
 *   plans          the three lengths of Premium that can be bought: 7d, 14d and 30d; amount is in the smallest unit
 *                  (3900 = R39.00)
 */
export const getPaymentStatus = () => request('GET', '/status');

/**
 * Starts a payment. `details` is { plan, name, phone }: `plan` is '7d' | '14d' | '30d' (the server looks up the
 * price, so the browser only says how long), name and phone come from the billing form (the email always comes from
 * the account). Resolves to { accessCode, reference }. Paying while Premium is running adds the new days after the
 * current ones; the server answers 409 only when that would pile up more than maxBankedDays.
 */
export const startPayment = (details = {}) => request('POST', '/initialize', details);

/** Asks the server to confirm a payment with Paystack. Resolves to { status: 'success' | 'failed' | 'pending', ... }. */
export const verifyPayment = (reference) => request('GET', `/verify/${encodeURIComponent(reference)}`);

/*
 * The AI pass: a short signed note from the accounts server saying this account has Premium right now. Only Premium
 * accounts get one (the free plan has no AI suggestions: 403). The AI service checks the signature itself, so it never
 * has to reach the accounts server (which may only run on this computer), and it serves the account on the best model. Kept in memory until half a minute before it
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
