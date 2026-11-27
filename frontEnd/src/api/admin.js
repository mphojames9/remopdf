import { getToken } from './auth';

// Same address auth.js uses: the accounts server on Render (override with VITE_ACCOUNTS_URL for local development).
const API_URL = String(import.meta.env?.VITE_ACCOUNTS_URL || 'https://remopdf-server.onrender.com').replace(/\/+$/, '');

export class AdminApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'AdminApiError';
    // 0 = the server could not be reached, 401 = not signed in (or suspended / deleted), 403 = signed in but not an admin.
    this.status = status;
    // Set for a few answers the screen reacts to: 'ACCESS_CODE' (wrong access code) and 'ACCESS_CODE_NOT_SET'.
    this.code = code || '';
  }
}

async function request(method, path, body) {
  const token = getToken();
  if (!token) throw new AdminApiError('Please sign in to continue.', 401);

  let res;
  try {
    res = await fetch(`${API_URL}/api/admin${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AdminApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) throw new AdminApiError((data && data.message) || 'Something went wrong. Please try again.', res.status, data && data.code);
  return data;
}

/** { users, premium, free, admins, suspended, newLast7Days, activeLast7Days, signupsByDay: [{ date, count }] x 14, premiumTools, maxBankedDays } */
export const getAdminStats = () => request('GET', `/stats?tzOffset=${new Date().getTimezoneOffset()}`);

/**
 * One page of accounts: { items, total, page, pages, limit }.
 * params: { search, filter: 'all' | 'premium' | 'free' | 'admin' | 'suspended', sort: 'newest' | 'oldest' | 'name' | 'recent', page, limit }
 */
export const listUsers = ({ search = '', filter = 'all', sort = 'newest', page = 1, limit = 20 } = {}) => {
  const params = new URLSearchParams({ filter, sort, page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  return request('GET', `/users?${params.toString()}`);
};

/** { user, phone, payments, resumes } for one account. */
export const getUserDetail = (id) => request('GET', `/users/${encodeURIComponent(id)}`);

/** changes: any of { firstName, lastName, role: 'user' | 'admin', disabled: boolean }. Resolves to { user }. */
export const updateUser = (id, changes) => request('PATCH', `/users/${encodeURIComponent(id)}`, changes);

/** Deletes the account and its resumes (payment records are kept). Resolves to { ok: true }. */
export const deleteUser = (id) => request('DELETE', `/users/${encodeURIComponent(id)}`);

/**
 * Activates Premium or adds days to it (the days start when the current ones end). Needs the admin's access code.
 * Resolves to the same { user, phone, payments, resumes } as getUserDetail, already updated.
 */
export const grantPremium = (id, { days, note = '', accessCode }) =>
  request('POST', `/users/${encodeURIComponent(id)}/premium`, { days, note, accessCode });

/** Ends Premium right now. Needs the access code. Resolves to the updated { user, phone, payments, resumes }. */
export const removePremium = (id, { note = '', accessCode }) =>
  request('POST', `/users/${encodeURIComponent(id)}/premium/revoke`, { note, accessCode });
