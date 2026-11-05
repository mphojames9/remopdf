import admin from 'firebase-admin';

// Checking a Firebase ID token only needs the project id: the token is verified against Google's public keys,
// so no service-account file is required for this.
const getApp = () =>
  admin.apps[0] || admin.initializeApp({ projectId: (process.env.FIREBASE_PROJECT_ID || 'remopdf-125a').trim() });

const MAX_TOKEN_AGE_SECONDS = 30 * 60; // the person must have signed in to Firebase in the last 30 minutes

/**
 * Takes the Firebase ID token the browser got after the person opened the link in the verification email and
 * returns the email address it proves (lowercased), or null if the token is missing, forged, expired, old,
 * was not made by email/password sign-in, or belongs to an address that is not verified yet.
 * The email address is only ever taken from here, never from the request body.
 */
export async function verifiedEmailFromToken(idToken) {
  if (typeof idToken !== 'string' || !idToken) return null;
  try {
    const decoded = await admin.auth(getApp()).verifyIdToken(idToken);
    if (decoded.email_verified !== true) return null;
    if (decoded.firebase?.sign_in_provider !== 'password') return null;
    if (typeof decoded.email !== 'string' || !decoded.email) return null;
    if (Date.now() / 1000 - Number(decoded.auth_time || 0) > MAX_TOKEN_AGE_SECONDS) return null;
    return decoded.email.toLowerCase();
  } catch {
    return null;
  }
}
