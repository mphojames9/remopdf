import { getToken } from './auth';

// Same address auth.js uses: VITE_API_URL in the front-end .env (default: the local accounts server).
const API_URL = String(import.meta.env?.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

// The signed-in person's saved resumes, kept with their account (see server/routes/profile.js).

export class ResumeApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ResumeApiError';
    // 0 = the server could not be reached, 401 = not signed in or the session expired,
    // 404 = that resume no longer exists, 409 = the limit of resumes per account is reached.
    this.status = status;
  }
}

async function request(method, path, body) {
  const token = getToken();
  if (!token) throw new ResumeApiError('Please sign in to continue.', 401);

  let res;
  try {
    res = await fetch(`${API_URL}/api/profile${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ResumeApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) throw new ResumeApiError((data && data.message) || 'Something went wrong. Please try again.', res.status);
  return data;
}

const at = (id) => `/resumes/${encodeURIComponent(id)}`;

/**
 * Every resume in the account, newest edit first: { items: [{ id, title, name, profession, template, updatedAt }], limit }.
 * Only the details the list needs are sent, never the resumes themselves.
 */
export async function listResumes() {
  const data = await request('GET', '/resumes');
  return { items: (data && data.items) || [], limit: (data && data.limit) || 10 };
}

/** One resume: { item, resume } where resume is what the builder saved (or null when it cannot be read). */
export async function fetchResume(id) {
  const data = await request('GET', at(id));
  return { item: data.item, resume: data.resume || null };
}

/** Adds a resume to the account. `title` is optional. Resolves to { item }. */
export function createResume({ title, resume }) {
  return request('POST', '/resumes', { ...(title ? { title } : {}), resume });
}

/** Saves the whole resume (replaces what was saved before for that resume). Resolves to { item }. */
export function saveResume(id, resume) {
  return request('PUT', at(id), { resume });
}

/** Renames a resume. Resolves to { item }. */
export function renameResume(id, title) {
  return request('PATCH', at(id), { title });
}

/** Deletes a resume for good. */
export function deleteResume(id) {
  return request('DELETE', at(id));
}

/** Copies a resume into a new one. Resolves to { item } for the copy. */
export function duplicateResume(id) {
  return request('POST', `${at(id)}/duplicate`);
}
