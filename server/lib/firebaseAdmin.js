// Checking a Firebase ID token only needs the project id: the token is verified against Google's public keys,
// so no service-account file is required for this.
//
// firebase-admin is loaded here, on first use, instead of at the top of the file: if it can not be loaded, only
// sign-in is refused (with the reason in the log) and the rest of the server keeps running.

const projectId = () => (process.env.FIREBASE_PROJECT_ID || 'remopdf-125a').trim();

// Only these addresses may sign in. Google accounts on any other domain (Outlook, Yahoo, a company domain) are refused.
const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

// The person must have completed the Google sign-in window in the last 10 minutes. The browser sends the token
// straight after that, so a real sign-in is always well inside this; an old, leaked token is not.
const MAX_SIGN_IN_AGE_SECONDS = 10 * 60;

// Newer firebase-admin versions export these by name; with some module setups they sit under `default`.
const pick = (ns, name) => ns?.[name] ?? ns?.default?.[name];

// The Firebase Auth client, created once. Uses the modern entry points (firebase-admin/app and /auth) and falls
// back to the classic `admin` namespace for very old versions. Only the project id is given: no credentials.
async function loadAuth() {
  let getApps;
  let initializeApp;
  let getAuth;
  try {
    const app = await import('firebase-admin/app');
    const auth = await import('firebase-admin/auth');
    getApps = pick(app, 'getApps');
    initializeApp = pick(app, 'initializeApp');
    getAuth = pick(auth, 'getAuth');
  } catch {
    // firebase-admin older than version 10 has no such entry points
  }

  if (typeof getApps === 'function' && typeof initializeApp === 'function' && typeof getAuth === 'function') {
    return getAuth(getApps()[0] || initializeApp({ projectId: projectId() }));
  }

  const mod = await import('firebase-admin');
  const admin = mod.default || mod;
  const app = (admin.apps && admin.apps[0]) || admin.initializeApp({ projectId: projectId() });
  return admin.auth(app);
}

let authPromise = null;
const getAuthClient = () => {
  authPromise ||= loadAuth().catch((err) => {
    authPromise = null; // a failed start is tried again on the next request
    throw err;
  });
  return authPromise;
};

const NOT_CONFIRMED = 'We could not confirm your Google account. Please try signing in again.';
const NOT_GMAIL = 'Only Gmail accounts can sign in. Please choose an @gmail.com address.';

/**
 * Checks the Firebase ID token the browser got after the person signed in with Google.
 * Returns { ok: true, email, name } (email lowercased) when the token proves a verified Gmail address that signed
 * in with Google a moment ago. Otherwise returns { ok: false, code, message, reason }:
 *   code     'not-gmail' (a real Google account, but not a Gmail address) or 'invalid' (anything else)
 *   message  what the person sees
 *   reason   for whoever is debugging; written to the server log (never the token or the email address) and
 *            also sent back by /api/auth/google, so a refusal can be traced from the browser's Network tab
 *            or the Render logs
 * The email address is only ever taken from here, never from the request body.
 */
export async function checkGoogleToken(idToken) {
  const refuse = (reason, { code = 'invalid', message = NOT_CONFIRMED, err } = {}) => {
    console.warn(`checkGoogleToken: refused - ${reason}`);
    if (err?.stack) console.warn(err.stack); // server log only, never sent to the browser
    return { ok: false, code, message, reason };
  };

  if (typeof idToken !== 'string' || !idToken) return refuse('the request had no idToken');
  try {
    const decoded = await (await getAuthClient()).verifyIdToken(idToken);

    const provider = decoded.firebase?.sign_in_provider;
    if (provider !== 'google.com') return refuse(`sign_in_provider is "${provider}", expected "google.com"`);
    if (decoded.email_verified !== true) return refuse('the token says the email is not verified');
    if (typeof decoded.email !== 'string' || !decoded.email) return refuse('the token has no email');

    const email = decoded.email.trim().toLowerCase();
    const domain = email.slice(email.lastIndexOf('@') + 1);
    if (!GMAIL_DOMAINS.has(domain)) return refuse('the Google account is not a Gmail address', { code: 'not-gmail', message: NOT_GMAIL });

    const signedInSeconds = Math.round(Date.now() / 1000 - Number(decoded.auth_time || 0));
    if (signedInSeconds > MAX_SIGN_IN_AGE_SECONDS) {
      return refuse(`the Google sign-in is ${signedInSeconds}s old, the limit is ${MAX_SIGN_IN_AGE_SECONDS}s`);
    }

    return { ok: true, email, name: typeof decoded.name === 'string' ? decoded.name : '' };
  } catch (err) {
    const detail = String(err?.message || '').slice(0, 300);
    return refuse(`verifyIdToken failed: ${err?.code || 'error'}${detail ? ` - ${detail}` : ''}`, { err });
  }
}
