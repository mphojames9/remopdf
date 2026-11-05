import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
// Same import line that phone.js used to get `auth`. If firebase.js lives somewhere else or exports it
// differently (for example as a default export), change this one line.
import { auth } from '../firebase';

/*
 * Free email verification for sign-up, using Firebase's own verification link.
 *
 *   1. startEmailVerification(email, password)  creates (or signs in to) a Firebase email/password account and
 *                                               sends the verification email.
 *   2. The person opens the link in the email. Firebase's hosted page does the verification, so nothing has to
 *      be handled inside the app and it works in the Android WebView too.
 *   3. confirmEmailVerified(email, password)    reloads the account; once verified it returns a fresh ID token
 *                                               (and signs out of Firebase). Send that token to /api/auth/register
 *                                               as `emailToken`.
 *
 * Firebase is only used to prove the email address. The real account (and the login) stay in our own database.
 */

export const RESEND_COOLDOWN_SECONDS = 60;

// The server only accepts a token whose sign-in is under 30 minutes old. If the person took longer than this
// to open the link, confirmEmailVerified() signs in again so the token is fresh.
const FRESH_SIGN_IN_SECONDS = 20 * 60;

const UNFINISHED_SIGNUP =
  'This email already has an unfinished sign-up with a different password. Use the same password you entered the first time.';

// Firebase reports a wrong password under different codes depending on the project's settings.
const WRONG_PASSWORD_CODES = new Set(['auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials']);

const MESSAGES = {
  'auth/invalid-email': "That email address doesn't look right. Check it and try again.",
  'auth/missing-email': 'Enter your email address.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'We could not reach the server. Check your internet connection and try again.',
  'auth/weak-password': 'Choose a stronger password (at least 8 characters).',
  'auth/password-does-not-meet-requirements': 'Choose a stronger password (at least 8 characters).',
  'auth/operation-not-allowed': 'Email sign-up is not available right now. Please contact support.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/user-not-found': 'Your sign-up session ended. Please go back and start again.',
  'auth/user-token-expired': 'Your sign-up session ended. Please go back and start again.',
  'auth/requires-recent-login': 'Your sign-up session ended. Please go back and start again.',
  'auth/email-already-in-use': UNFINISHED_SIGNUP,
  'auth/internal-error': 'Something went wrong on our side. Please try again in a moment.',
};
// wrong-password style codes only ever reach friendlyAuthError from the sign-up flow
WRONG_PASSWORD_CODES.forEach((code) => {
  MESSAGES[code] = UNFINISHED_SIGNUP;
});

export class EmailVerifyError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'EmailVerifyError';
    this.code = code;
  }
}

/** Turns anything thrown by this file (or by the register request) into a message the person can read. */
export function friendlyAuthError(err) {
  if (err instanceof EmailVerifyError) return err.message;
  const code = typeof err?.code === 'string' ? err.code : '';
  if (MESSAGES[code]) return MESSAGES[code];
  // Not a Firebase error (for example the server's own message from /api/auth/register): show it as it is.
  if (!code.startsWith('auth/') && typeof err?.message === 'string' && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}

const cleanEmail = (email) => String(email || '').trim().toLowerCase();

/**
 * South African numbers in the usual ways people type them become +27XXXXXXXXX. Anything else gives ''.
 * Same rule the server uses, so the form can check the number before anything is sent.
 */
export function normalizePhone(value) {
  const compact = String(value || '').trim().replace(/[\s().-]/g, '');
  const match = compact.match(/^(?:(?:\+27|0027|27)0?|0)([1-9]\d{8})$/);
  return match ? `+27${match[1]}` : '';
}

// The Firebase session lives only while the person is on the "check your inbox" step. If it is gone (the
// modal was reopened, the app was restarted), the email and password from the form sign back in to it.
async function ensureSignedIn(email, password) {
  const address = cleanEmail(email);
  const current = auth.currentUser;
  if (current && cleanEmail(current.email) === address) return current;
  const credential = await signInWithEmailAndPassword(auth, address, password);
  return credential.user;
}

/**
 * Step 1. Call when the register form is valid.
 * Returns { alreadyVerified }. When true, this address was verified in an earlier attempt, so no new email was
 * sent and the person can go straight on with "I've verified my email".
 * Throws the Firebase error (pass it to friendlyAuthError) or an EmailVerifyError.
 */
export async function startEmailVerification(email, password) {
  const address = cleanEmail(email);
  let user;
  try {
    user = (await createUserWithEmailAndPassword(auth, address, password)).user;
  } catch (err) {
    if (err?.code !== 'auth/email-already-in-use') throw err;
    // An earlier sign-up with this email was started but never finished: pick it up with the same password.
    try {
      user = (await signInWithEmailAndPassword(auth, address, password)).user;
    } catch (signInErr) {
      if (WRONG_PASSWORD_CODES.has(signInErr?.code)) throw new EmailVerifyError(UNFINISHED_SIGNUP, 'unfinished-signup');
      throw signInErr;
    }
  }

  if (user.emailVerified) return { alreadyVerified: true };
  await sendEmailVerification(user);
  return { alreadyVerified: false };
}

/** "Resend email". The 60-second wait is the caller's job (RESEND_COOLDOWN_SECONDS). */
export async function resendVerificationEmail(email, password) {
  const user = await ensureSignedIn(email, password);
  await user.reload();
  if (user.emailVerified) return { alreadyVerified: true };
  await sendEmailVerification(user);
  return { alreadyVerified: false };
}

/**
 * "I've verified my email".
 * Returns { verified: false } when the link has not been opened yet, or { verified: true, emailToken }.
 * Once the token is in hand, the Firebase session is closed: only the token is needed from here on.
 */
export async function confirmEmailVerified(email, password) {
  const user = await ensureSignedIn(email, password);
  await user.reload();
  if (!user.emailVerified) return { verified: false };

  // true = ask Firebase for a new token, so it carries email_verified: true
  let result = await user.getIdTokenResult(true);
  const signedInSeconds = Date.now() / 1000 - Number(result.claims.auth_time || 0);
  if (signedInSeconds > FRESH_SIGN_IN_SECONDS) {
    const credential = await signInWithEmailAndPassword(auth, cleanEmail(email), password);
    result = await credential.user.getIdTokenResult(true);
  }

  await endEmailVerification();
  return { verified: true, emailToken: result.token };
}

/** Closes the Firebase session (Change email, closing the modal, or after the token was taken). Never throws. */
export async function endEmailVerification() {
  try {
    await signOut(auth);
  } catch {
    // nothing to do: there was no session to close
  }
}
