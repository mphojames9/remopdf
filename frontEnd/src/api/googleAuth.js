import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
// Same import line the old emailVerify.js used to get `auth`. If firebase.js lives somewhere else or exports it
// differently (for example as a default export), change this one line.
import { auth } from '../firebase';

/*
 * Sign in with Google, Gmail addresses only.
 *
 *   1. getGoogleIdToken()  opens Google's account chooser in a pop-up window and returns a Firebase ID token.
 *   2. api/auth.js loginWithGoogle(idToken)  sends it to the accounts server, which checks it, creates the account the
 *      first time and returns our own sign-in.
 *
 * Firebase is only used to prove which Google account the person chose. The real account (and the sign-in) stay in
 * our own database. The Firebase session is closed again right after the token is taken, so nothing lingers.
 */

const GMAIL_RE = /@(gmail|googlemail)\.com$/i;

export class GoogleSignInError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'GoogleSignInError';
    this.code = code;
  }
}

// The person closed the window or tapped the button twice. Nothing went wrong, so nothing should be shown.
const CANCELLED_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']);
export const isSignInCancelled = (err) => err instanceof GoogleSignInError ? err.code === 'cancelled' : CANCELLED_CODES.has(err?.code);

const MESSAGES = {
  'auth/popup-blocked': 'Your browser blocked the Google window. Allow pop-ups for this site, then try again.',
  'auth/network-request-failed': 'We could not reach Google. Check your internet connection and try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/user-disabled': 'This Google account has been disabled. Please contact support.',
  'auth/unauthorized-domain': 'Google sign-in is not switched on for this website address yet. Please contact support.',
  'auth/operation-not-allowed': 'Google sign-in is not switched on yet. Please contact support.',
  'auth/operation-not-supported-in-this-environment': 'Google sign-in does not work in this browser. Open remopdf.site in Chrome, Safari or Edge and try again.',
  'auth/web-storage-unsupported': 'Your browser is blocking the storage Google sign-in needs. Turn off private browsing or allow cookies, then try again.',
  'auth/account-exists-with-different-credential': 'This Gmail address is already linked to another sign-in method. Please contact support.',
  'auth/internal-error': 'Something went wrong on our side. Please try again in a moment.',
};

/** Turns anything thrown by this file (or by the sign-in request) into a message the person can read. */
export function friendlyAuthError(err) {
  if (err instanceof GoogleSignInError) return err.message;
  const code = typeof err?.code === 'string' ? err.code : '';
  if (MESSAGES[code]) return MESSAGES[code];
  // Not a Firebase error (for example the server's own message from /api/auth/google): show it as it is.
  if (!code.startsWith('auth/') && typeof err?.message === 'string' && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}

// The Android app (Capacitor) is a WebView. Google does not allow its sign-in page inside one, and WebViews have no
// pop-ups, so the window below can not work there. It needs Capacitor's native Google sign-in instead.
const insideNativeApp = () => {
  try {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
};

/**
 * Opens the Google account chooser and returns a fresh Firebase ID token for the chosen Gmail account.
 * MUST be called straight from a tap or click, with nothing awaited before it, or browsers block the pop-up.
 * Throws a GoogleSignInError (code 'cancelled' when the window was just closed, 'not-gmail' for any other address),
 * or the Firebase error. Pass whatever it throws to isSignInCancelled() and friendlyAuthError().
 */
export async function getGoogleIdToken() {
  if (insideNativeApp()) {
    throw new GoogleSignInError(
      'Google sign-in is not available in the app yet. Open remopdf.site in your phone’s browser to sign in.',
      'native-unsupported'
    );
  }

  const provider = new GoogleAuthProvider();
  // Always show the account chooser, so the person can pick another Gmail account instead of being signed in silently.
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const { user } = await signInWithPopup(auth, provider);

    const email = String(user.email || '');
    if (!GMAIL_RE.test(email)) {
      throw new GoogleSignInError(`Only Gmail accounts can sign in. ${email || 'That account'} is not a Gmail address.`, 'not-gmail');
    }
    return await user.getIdToken();
  } catch (err) {
    if (CANCELLED_CODES.has(err?.code)) throw new GoogleSignInError('', 'cancelled');
    throw err;
  } finally {
    try {
      await firebaseSignOut(auth);
    } catch {
      /* there was no session to close */
    }
  }
}
