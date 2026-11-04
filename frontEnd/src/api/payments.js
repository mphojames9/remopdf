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
