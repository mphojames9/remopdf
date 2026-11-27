import crypto from 'node:crypto';
import User from '../models/User.js';

/*
 * Who is an admin.
 *
 * The role itself is stored on the account (User.role). ADMIN_EMAILS in server/.env is how the first admin is made:
 * a comma-separated list of Gmail addresses, for example
 *
 *   ADMIN_EMAILS=you@gmail.com,partner@gmail.com
 *
 * An account whose address is in that list becomes an admin the next time it signs in or opens the admin panel.
 * Read on every call, so a changed .env is picked up after a restart. Those addresses cannot be demoted from the
 * panel: remove them from the list instead.
 */

export const adminEmails = () =>
  String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export const isAdminEmail = (email) => adminEmails().includes(String(email || '').trim().toLowerCase());

/** Gives role "admin" to an account listed in ADMIN_EMAILS (in the database and on the object passed in). */
export async function syncAdminRole(user) {
  if (!user || user.role === 'admin' || !isAdminEmail(user.email)) return user;
  await User.updateOne({ _id: user._id }, { $set: { role: 'admin' } });
  user.role = 'admin';
  return user;
}

/*
 * The access code. Adding or removing Premium needs it on top of being an admin, so a signed-in admin session on its
 * own (a borrowed laptop, a stolen token) cannot hand out or take away paid access. It is a secret you choose:
 *
 *   ADMIN_ACCESS_CODE=something-long-only-you-know
 *
 * Without it the premium tools stay switched off. It is only ever compared on the server, in constant time, and never
 * sent to the browser or stored.
 */
const configuredCode = () => String(process.env.ADMIN_ACCESS_CODE || '').trim();

export const accessCodeConfigured = () => configuredCode().length > 0;

export function accessCodeMatches(supplied) {
  const expected = configuredCode();
  if (!expected || typeof supplied !== 'string' || supplied.trim() === '') return false;
  const digest = (value) => crypto.createHash('sha256').update(value).digest(); // equal length, so timingSafeEqual is safe
  return crypto.timingSafeEqual(digest(supplied.trim()), digest(expected));
}
