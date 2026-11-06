import admin from 'firebase-admin';

// Checking a Firebase ID token only needs the project id: the token is verified against Google's public keys,
// so no service-account file is required for this.
const getApp = () =>
  admin.apps[0] || admin.initializeApp({ projectId: (process.env.FIREBASE_PROJECT_ID || 'remopdf-125a').trim() });

const MAX_TOKEN_AGE_SECONDS = 30 * 60; // the person must have signed in to Firebase in the last 30 minutes

/**
 * Checks the Firebase ID token the browser got after the person opened the link in the verification email.
 * Returns { email } (lowercased) when the token proves a verified email address, or { email: null, reason }
 * when it is missing, forged, expired, old, was not made by email/password sign-in, or the address is not
 * verified yet. The reason is written to the server log (never the token or the email address) and is also
 * sent back by /register, so a refusal can be traced from the browser's Network tab or the Render logs.
 * The email address is only ever taken from here, never from the request body.
 */
export async function checkEmailToken(idToken) {
  const refuse = (reason) => {
    console.warn(`verifiedEmailFromToken: refused - ${reason}`);
    return { email: null, reason };
  };

  if (typeof idToken !== 'string' || !idToken) return refuse('the request had no emailToken');
  try {
    const decoded = await admin.auth(getApp()).verifyIdToken(idToken);
    if (decoded.email_verified !== true) return refuse('the token says the email is not verified');
    const provider = decoded.firebase?.sign_in_provider;
    if (provider !== 'password') return refuse(`sign_in_provider is "${provider}", expected "password"`);
    if (typeof decoded.email !== 'string' || !decoded.email) return refuse('the token has no email');
    const signedInSeconds = Math.round(Date.now() / 1000 - Number(decoded.auth_time || 0));
    if (signedInSeconds > MAX_TOKEN_AGE_SECONDS) {
      return refuse(`the Firebase sign-in is ${signedInSeconds}s old, the limit is ${MAX_TOKEN_AGE_SECONDS}s`);
    }
    return { email: decoded.email.toLowerCase(), reason: null };
  } catch (err) {
    const detail = String(err?.message || '').slice(0, 300);
    return refuse(`verifyIdToken failed: ${err?.code || 'error'}${detail ? ` - ${detail}` : ''}`);
  }
}

/** The verified email address (lowercased), or null. See checkEmailToken for the rules and the reason. */
export async function verifiedEmailFromToken(idToken) {
  return (await checkEmailToken(idToken)).email;
}
