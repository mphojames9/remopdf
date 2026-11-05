import { useEffect, useRef, useState } from 'react';
import {
  RESEND_COOLDOWN_SECONDS,
  confirmEmailVerified,
  endEmailVerification,
  friendlyAuthError,
  resendVerificationEmail,
} from '../api/emailVerify';

/**
 * The "Check your inbox" step of sign-up. It replaces the SMS code step in AuthModal.jsx.
 * Put this file next to AuthModal.jsx and fix the import path above if that folder is not src/components.
 *
 * Props
 *   email, password   what the person typed on the register form
 *   alreadyVerified   startEmailVerification() returned { alreadyVerified: true }, so no email was sent this time
 *   onVerified(token) async. Send { firstName, lastName, email, password, phone, emailToken: token } to
 *                     /api/auth/register and finish sign-up exactly as the old SMS step did. If it throws, the
 *                     error's message is shown here and the person stays on this step.
 *   onChangeEmail()   go back to the register form
 *
 * The colours below are neutral placeholders: swap the `ui` object for your modal's own classes or styles.
 */

const ui = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center' },
  title: { margin: 0, fontSize: 20, fontWeight: 700 },
  text: { margin: 0, fontSize: 14, lineHeight: 1.5, opacity: 0.85 },
  primary: { padding: '12px 16px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 15, cursor: 'pointer', background: '#1f6feb', color: '#fff' },
  secondary: { padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(128,128,128,0.5)', fontWeight: 600, fontSize: 14, cursor: 'pointer', background: 'transparent', color: 'inherit' },
  link: { padding: 6, border: 'none', background: 'none', fontSize: 14, textDecoration: 'underline', cursor: 'pointer', color: 'inherit' },
  error: { margin: 0, padding: '10px 12px', borderRadius: 8, fontSize: 14, background: 'rgba(220,38,38,0.12)', color: '#b91c1c' },
  info: { margin: 0, padding: '10px 12px', borderRadius: 8, fontSize: 14, background: 'rgba(31,111,235,0.12)' },
};

export default function EmailVerifyStep({ email, password, alreadyVerified = false, onVerified, onChangeEmail }) {
  const [busy, setBusy] = useState(''); // '' | 'verify' | 'resend'
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  // the email was sent a moment ago (before this step opened), so the resend button starts out waiting
  const [cooldown, setCooldown] = useState(alreadyVerified ? 0 : RESEND_COOLDOWN_SECONDS);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      endEmailVerification(); // leaving this step (or closing the modal) closes the Firebase session
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerified = async () => {
    if (busy) return;
    setBusy('verify');
    setError('');
    setInfo('');
    try {
      const result = await confirmEmailVerified(email, password);
      if (!result.verified) {
        if (alive.current) setInfo('Your email is not verified yet. Open the link in the email we sent you first, then tap this button again.');
        return;
      }
      await onVerified(result.emailToken);
    } catch (err) {
      if (alive.current) setError(friendlyAuthError(err));
    } finally {
      if (alive.current) setBusy('');
    }
  };

  const handleResend = async () => {
    if (busy || cooldown > 0) return;
    setBusy('resend');
    setError('');
    setInfo('');
    try {
      const { alreadyVerified: verifiedNow } = await resendVerificationEmail(email, password);
      if (!alive.current) return;
      if (verifiedNow) {
        setInfo("This email is already verified. Tap \"I've verified my email\" to continue.");
      } else {
        setInfo('We sent you a new email. If you do not see it, check your spam folder.');
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } catch (err) {
      if (alive.current) setError(friendlyAuthError(err));
    } finally {
      if (alive.current) setBusy('');
    }
  };

  const handleChangeEmail = async () => {
    if (busy) return;
    await endEmailVerification();
    onChangeEmail();
  };

  return (
    <div style={ui.wrap}>
      <h2 style={ui.title}>Check your inbox</h2>

      {alreadyVerified ? (
        <p style={ui.text}>
          <strong>{email}</strong> is already verified. Tap the button below to finish creating your account.
        </p>
      ) : (
        <p style={ui.text}>
          We sent a verification link to <strong>{email}</strong>. Open the link, then come back here and tap the
          button below. Can&apos;t find the email? Check your spam or junk folder.
        </p>
      )}

      {error && (
        <p style={ui.error} role="alert">
          {error}
        </p>
      )}
      {info && (
        <p style={ui.info} role="status">
          {info}
        </p>
      )}

      <button type="button" style={{ ...ui.primary, opacity: busy ? 0.7 : 1 }} onClick={handleVerified} disabled={Boolean(busy)}>
        {busy === 'verify' ? 'Checking…' : "I've verified my email"}
      </button>

      <button
        type="button"
        style={{ ...ui.secondary, opacity: busy || cooldown > 0 ? 0.6 : 1 }}
        onClick={handleResend}
        disabled={Boolean(busy) || cooldown > 0}
      >
        {busy === 'resend' ? 'Sending…' : cooldown > 0 ? `Resend email (${cooldown}s)` : 'Resend email'}
      </button>

      <button type="button" style={ui.link} onClick={handleChangeEmail} disabled={Boolean(busy)}>
        Change email
      </button>
    </div>
  );
}
