import admin from 'firebase-admin';

// Checking a Firebase ID token only needs the project id: the token is verified against Google's public keys,
// so no service-account file is required for this.
const getApp = () =>
  admin.apps[0] || admin.initializeApp({ projectId: (process.env.FIREBASE_PROJECT_ID || 'remopdf-125a').trim() });

const MAX_TOKEN_AGE_SECONDS = 10 * 60; // the SMS code must have been confirmed in the last 10 minutes

/**
 * Takes the Firebase ID token the browser got after the person typed the SMS code and returns the phone
 * number it proves (E.164, e.g. "+27821234567"), or null if the token is missing, forged, expired, old,
 * or was not made by phone sign-in. The phone number is only ever taken from here, never from the request body.
 */
export async function verifiedPhoneFromToken(idToken) {
  if (typeof idToken !== 'string' || !idToken) return null;
  try {
    const decoded = await admin.auth(getApp()).verifyIdToken(idToken);
    if (decoded.firebase?.sign_in_provider !== 'phone' || !decoded.phone_number) return null;
    if (Date.now() / 1000 - Number(decoded.auth_time || 0) > MAX_TOKEN_AGE_SECONDS) return null;
    return decoded.phone_number;
  } catch {
    return null;
  }
}
