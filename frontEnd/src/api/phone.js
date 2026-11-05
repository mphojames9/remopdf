import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from 'firebase/auth';
import { auth } from '../firebase';

// Used when the person types a local number such as 082 123 4567. Change it if most of your users are elsewhere.
const DEFAULT_COUNTRY_CODE = '27';

let verifier = null;
let confirmation = null;

/**
 * Turns what the person typed into E.164 ("+27821234567"), or returns '' if it cannot be a real number.
 *   "082 123 4567"      -> "+27821234567"
 *   "+27 82 123 4567"   -> "+27821234567"
 *   "0027821234567"     -> "+27821234567"
 */
export function normalizePhone(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  let e164;
  if (raw.startsWith('+')) e164 = `+${digits}`;
  else if (digits.startsWith('00')) e164 = `+${digits.slice(2)}`;
  else if (digits.startsWith('0')) e164 = `+${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  else return ''; // no "+" and no leading 0: we cannot tell the country, so ask for the full number
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : '';
}

const friendlyError = (err) => {
  switch (err?.code) {
    case 'auth/invalid-phone-number':
      return 'That mobile number does not look right. Check it and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/quota-exceeded':
      return 'We cannot send more codes right now. Please try again later.';
    case 'auth/invalid-verification-code':
      return 'That code is not correct. Check it and try again.';
    case 'auth/code-expired':
    case 'auth/session-expired':
      return 'That code has expired. Request a new one.';
    case 'auth/captcha-check-failed':
    case 'auth/missing-recaptcha-token':
      return 'We could not confirm you are not a robot. Please try again.';
    case 'auth/network-request-failed':
      return 'Cannot reach the server. Check your connection and try again.';
    case 'auth/operation-not-allowed':
    case 'auth/billing-not-enabled':
      return 'Phone verification is not available for this number right now.';
    default:
      return 'Could not verify your number. Please try again.';
  }
};

/** Forgets any pending code and removes the reCAPTCHA. Call it when the modal closes or the number changes. */
export function resetPhoneVerification() {
  try {
    verifier?.clear();
  } catch {
    /* already gone */
  }
  verifier = null;
  confirmation = null;
}

/**
 * Sends the 6-digit SMS code. `phone` must be E.164 (use normalizePhone first).
 * Needs an element with id "recaptcha-container" on the page. Throws an Error with a readable message.
 */
export async function sendPhoneCode(phone, containerId = 'recaptcha-container') {
  resetPhoneVerification();
  try {
    verifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
    confirmation = await signInWithPhoneNumber(auth, phone, verifier);
  } catch (err) {
    resetPhoneVerification();
    throw new Error(friendlyError(err));
  }
}

/**
 * Checks the code the person typed. Returns a Firebase ID token that proves the number; send it to
 * POST /api/auth/register as `phoneToken`. Throws an Error with a readable message.
 */
export async function confirmPhoneCode(code) {
  if (!confirmation) throw new Error('Request a new code first.');
  let token;
  try {
    const result = await confirmation.confirm(String(code).trim());
    token = await result.user.getIdToken();
  } catch (err) {
    throw new Error(friendlyError(err));
  }
  // Firebase was only needed to prove the number. The app's own sign-in is the token from our server,
  // so the Firebase session is closed straight away.
  try {
    await signOut(auth);
  } catch {
    /* ignore */
  }
  confirmation = null;
  return token;
}
