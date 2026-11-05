import { getToken } from './auth';

// Same address auth.js and resume.js use: VITE_API_URL in the front-end .env (default: the local accounts server).
const API_URL = String(import.meta.env?.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

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

/** { premium, expiresAt, testMode, plan: { name, amount, currency, days } }. amount is in the smallest unit (4900 = 49.00). */
export const getPaymentStatus = () => request('GET', '/status');

/**
 * Starts a payment. `details` is { name, phone } from the billing form (the email always comes from the account).
 * Resolves to { accessCode, reference }, or { premium: true } when access is already paid for.
 */
export const startPayment = (details = {}) => request('POST', '/initialize', details);

/** Asks the server to confirm a payment with Paystack. Resolves to { status: 'success' | 'failed' | 'pending', ... }. */
export const verifyPayment = (reference) => request('GET', `/verify/${encodeURIComponent(reference)}`);

/*
 * The AI pass: a short signed note from the accounts server saying this account has Premium right now. The AI
 * service checks the signature itself, so it never has to reach the accounts server (which may only run on this
 * computer). Kept in memory until half a minute before it runs out; the accounts server answers 403 to an account
 * without Premium, which reaches the caller as a PaymentApiError with status 403.
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
