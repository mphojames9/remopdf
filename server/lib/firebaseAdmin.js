// Checking a Firebase ID token only needs the project id: the token is verified against Google's public keys,
// so no service-account file is required for this.
//
// firebase-admin is loaded here, on first use, instead of at the top of the file: if it can not be loaded, only
// sign-up is refused (with the reason in the log) and the rest of the server keeps running.

const projectId = () => (process.env.FIREBASE_PROJECT_ID || 'remopdf-125a').trim();

const MAX_TOKEN_AGE_SECONDS = 30 * 60; // the person must have signed in to Firebase in the last 30 minutes

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

/**
 * Checks the Firebase ID token the browser got after the person opened the link in the verification email.
 * Returns { email, authTime } (email lowercased; authTime = when the person signed in to Firebase, in seconds)
 * when the token proves a verified email address, or { email: null, reason }
 * when it is missing, forged, expired, old, was not made by email/password sign-in, or the address is not
 * verified yet. The reason is written to the server log (never the token or the email address) and is also
 * sent back by /register, so a refusal can be traced from the browser's Network tab or the Render logs.
 * The email address is only ever taken from here, never from the request body.
 */
export async function checkEmailToken(idToken) {
  const refuse = (reason, err) => {
    console.warn(`verifiedEmailFromToken: refused - ${reason}`);
    if (err?.stack) console.warn(err.stack); // server log only, never sent to the browser
    return { email: null, reason };
  };

  if (typeof idToken !== 'string' || !idToken) return refuse('the request had no emailToken');
  try {
    const decoded = await (await getAuthClient()).verifyIdToken(idToken);
    if (decoded.email_verified !== true) return refuse('the token says the email is not verified');
    const provider = decoded.firebase?.sign_in_provider;
    if (provider !== 'password') return refuse(`sign_in_provider is "${provider}", expected "password"`);
    if (typeof decoded.email !== 'string' || !decoded.email) return refuse('the token has no email');
    const signedInSeconds = Math.round(Date.now() / 1000 - Number(decoded.auth_time || 0));
    if (signedInSeconds > MAX_TOKEN_AGE_SECONDS) {
      return refuse(`the Firebase sign-in is ${signedInSeconds}s old, the limit is ${MAX_TOKEN_AGE_SECONDS}s`);
    }
    return { email: decoded.email.toLowerCase(), authTime: Number(decoded.auth_time), reason: null };
  } catch (err) {
    const detail = String(err?.message || '').slice(0, 300);
    return refuse(`verifyIdToken failed: ${err?.code || 'error'}${detail ? ` - ${detail}` : ''}`, err);
  }
}

/** The verified email address (lowercased), or null. See checkEmailToken for the rules and the reason. */
export async function verifiedEmailFromToken(idToken) {
  return (await checkEmailToken(idToken)).email;
}