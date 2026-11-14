import React, { useState, useEffect, useRef } from 'react';
import logo from '../../assets/logo.webp';
import logoMobile from '../../assets/logo1.webp';
import { friendlyAuthError, getGoogleIdToken, isSignInCancelled } from '../../api/googleAuth';
import { wakeServer } from '../../api/auth';

const COPY = {
  heading: 'Make a resume applicant tracking systems can read.',
  lead: 'Pick one of 30 layouts and download a clean A4 PDF.',
};

/* Icons */
const Svg = ({ children, className = 'w-5 h-5', strokeWidth = 2 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {children}
  </svg>
);

const IconClose = ({ className }) => (
  <Svg className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Svg>
);


/* Google's "G" mark, in its own colours (Google's branding rules ask for this on a "Continue with Google" button). */
const GoogleLogo = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const IconLock = ({ className }) => (
  <Svg className={className}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
);

const IconAlert = ({ className = 'w-4 h-4' }) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </Svg>
);

const IconSpinner = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/* The RemoPDF logo on a transparent background. Bigger screens (md and up, 768px) use src/assets/logo.webp,
   phones use src/assets/logo1.webp. Only the matching file is downloaded. */
const BrandLogo = ({ className = 'h-8' }) => (
  <picture>
    <source media="(min-width: 768px)" srcSet={logo} />
    <img
      src={logoMobile}
      alt="RemoPDF"
      draggable={false}
      className={`w-auto max-w-[10rem] select-none object-contain ${className}`}
    />
  </picture>
);

/* ---- Side panel (tablet and up) ---- */
const BrandPanel = ({ copy }) => (
  <aside className="relative hidden w-[44%] shrink-0 flex-col overflow-hidden bg-[#091122] p-9 text-white md:flex">
    <div>
      <BrandLogo className="h-7" />
    </div>
    <div key={copy.heading} className="auth-swap mt-9">
      <h2 className="text-[22px] font-semibold leading-[1.22] tracking-tight lg:text-[26px]">{copy.heading}</h2>
      <p className="mt-3 max-w-[19rem] text-[13px] leading-relaxed text-slate-300">{copy.lead}</p>
    </div>
  </aside>
);

const MODAL_CSS = `
  @keyframes auth-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes auth-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
  @keyframes auth-pop { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } }
  @keyframes auth-swap { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .auth-overlay { animation: auth-fade .2s ease-out; }
  .auth-card { animation: auth-rise .3s cubic-bezier(.22,1,.36,1); }
  @media (min-width: 768px) { .auth-card { animation-name: auth-pop; animation-duration: .34s; } }
  .auth-swap { animation: auth-swap .3s cubic-bezier(.22,1,.36,1); }
  /* iPhone Safari zooms the page when an input is smaller than 16px, so only iOS gets the larger size. */
  @supports (-webkit-touch-callout: none) { .auth-input { font-size: 16px !important; } }
  @media (prefers-reduced-motion: reduce) {
    .auth-overlay, .auth-card, .auth-swap { animation: none; }
  }
`;

/**
 * Sign in dialog: one button, "Continue with Google", Gmail accounts only. A two-panel card on tablets and desktops,
 * full screen on phones. New people get an account automatically the first time, so there is no Register tab,
 * no password and no email to open.
 *
 * Props
 *  - open:      whether the dialog is shown
 *  - onClose:   () => void
 *  - onSignIn:  async (idToken) => void. idToken is the Firebase ID token for the Gmail account the person chose; the
 *               handler sends it to the accounts server (see hooks/useResumeProfile.js signIn). Throw an Error to show its
 *               message in the dialog.
 *  - termsHref / privacyHref (optional): where the links under the button point.
 */
export default function AuthModal({ open, onClose, onSignIn, termsHref = '/terms-of-use', privacyHref = '/PrivacyPolicy' }) {
  // '' = idle, 'google' = the Google window is open, 'server' = Google said yes and our server is signing the person in.
  const [stage, setStage] = useState('');
  const [formError, setFormError] = useState('');
  const [formNotice, setFormNotice] = useState('');
  const buttonRef = useRef(null);
  // Each tap gets a number. Closing the dialog bumps it, so a Google window that finishes after the dialog was
  // closed does not sign the person in behind their back.
  const attemptRef = useRef(0);

  const busy = stage !== '';
  // The dialog can always be closed while the Google window is open (it may have been lost behind another window),
  // but not in the short moment the server is signing the person in.
  const locked = stage === 'server';

  // Start clean every time the dialog is closed.
  useEffect(() => {
    if (open) return;
    attemptRef.current += 1;
    setStage('');
    setFormError('');
    setFormNotice('');
  }, [open]);

  // The accounts server sleeps on Render's free plan. Waking it as soon as the dialog opens means it is usually
  // ready by the time the person has chosen their Google account.
  useEffect(() => {
    if (open) wakeServer();
  }, [open]);

  // Escape closes the dialog and the page behind it does not scroll while it is open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !locked) onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, locked, onClose]);

  // Focus the button when the dialog opens. Not on touch screens, where it adds nothing.
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => {
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
      buttonRef.current?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const handleGoogle = async () => {
    if (busy) return;
    const attempt = (attemptRef.current += 1);
    const current = () => attempt === attemptRef.current;

    setFormError('');
    setFormNotice('');
    setStage('google');
    try {
      // The Google window has to open straight from the tap, so nothing is awaited before this line.
      const idToken = await getGoogleIdToken();
      if (!current()) return;

      setStage('server');
      const awake = await wakeServer({
        onSlow: () => current() && setFormNotice('Almost done. Starting our server, this can take up to a minute…'),
      });
      if (!current()) return;
      if (!awake) {
        setFormNotice('');
        setFormError('Our server is taking a long time to start. Please wait a moment and try again.');
        return;
      }

      setFormNotice('');
      await onSignIn?.(idToken);
      if (current()) onClose();
    } catch (err) {
      if (!current()) return;
      setFormNotice('');
      if (!isSignInCancelled(err)) setFormError(friendlyAuthError(err));
    } finally {
      if (current()) setStage('');
    }
  };

  const closeButtonClass =
    'flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50 disabled:opacity-40';

  return (
    <div
      className="auth-overlay fixed inset-0 z-[120] flex items-stretch justify-center bg-slate-950/60 md:items-center md:p-6 md:backdrop-blur-sm"
      onClick={() => { if (!locked) onClose(); }}
    >
      <style>{MODAL_CSS}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="auth-card relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white md:h-[min(40rem,calc(100dvh_-_3rem))] md:max-w-[52rem] md:flex-row md:rounded-[28px] md:shadow-[0_32px_80px_-16px_rgba(2,6,23,0.6)] lg:max-w-[58rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <BrandPanel copy={COPY} />

        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-white">
          {/* Phones: a full-screen app bar with the logo and a close button */}
          <header className="shrink-0 border-b border-slate-100 bg-white pt-[env(safe-area-inset-top)] md:hidden">
            <div className="flex h-14 items-center justify-between pl-5 pr-3">
              <BrandLogo className="h-7" />
              <button type="button" onClick={onClose} disabled={locked} aria-label="Close" className={closeButtonClass}>
                <IconClose className="h-[18px] w-[18px]" />
              </button>
            </div>
          </header>

          {/* Tablet and up: close button in the corner of the card */}
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            aria-label="Close"
            className={`${closeButtonClass} absolute right-4 top-4 z-10 hidden md:flex`}
          >
            <IconClose className="h-[18px] w-[18px]" />
          </button>

          <div className="pro-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="w-full px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 md:my-auto md:px-10 md:pb-10 md:pt-16">
              <div className="auth-swap mx-auto w-full max-w-[25rem]">
                <h2 id="auth-title" className="text-xl font-semibold leading-tight tracking-tight text-slate-900 md:text-[22px]">
                  Sign in to RemoPDF
                </h2>
                <p className="mb-6 mt-1 text-[13px] leading-relaxed text-slate-500">
                  Sign in with your Gmail account (name@gmail.com). New to RemoPDF? Your account is created automatically.
                </p>

                <div className="space-y-3.5">
                  {formError && (
                    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] leading-snug text-red-700">
                      <IconAlert className="mt-px h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {formNotice && (
                    <div role="status" className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12.5px] leading-snug text-amber-800">
                      <IconAlert className="mt-px h-4 w-4 shrink-0" />
                      <span>{formNotice}</span>
                    </div>
                  )}

                  <button
                    ref={buttonRef}
                    type="button"
                    onClick={handleGoogle}
                    disabled={busy}
                    className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-slate-300 bg-white text-[13px] font-semibold text-slate-800 shadow-sm transition-all hover:bg-slate-50 hover:shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-[#d9856b]/30 disabled:cursor-wait disabled:opacity-70 disabled:shadow-none"
                  >
                    {busy ? <IconSpinner /> : <GoogleLogo className="h-[18px] w-[18px]" />}
                    {stage === 'google' ? 'Waiting for Google…' : stage === 'server' ? 'Signing you in…' : 'Continue with Google'}
                  </button>
                </div>

                <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-slate-500">
                  <IconLock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>Secure sign-in with Google. RemoPDF never sees or stores your Google password.</span>
                </p>

                <p className="mt-6 text-center text-[11.5px] leading-relaxed text-slate-400">
                  By continuing, you agree to our{' '}
                  <a href={termsHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1e3a8a] underline-offset-2 hover:underline">Terms of Use</a>{' '}
                  and{' '}
                  <a href={privacyHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1e3a8a] underline-offset-2 hover:underline">Privacy Policy</a>.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const initialsOf = (user) =>
  `${String(user.firstName || '').trim().charAt(0)}${String(user.lastName || '').trim().charAt(0)}`.toUpperCase() || '?';

/* Shown instead of the two buttons once someone is signed in: their name, with a menu to sign out. */
const UserMenu = ({ user, onSignOut, variant }) => {
  const [open, setOpen] = useState(false);
  const dark = variant === 'dark';
  const firstName = String(user.firstName || '').trim();
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Account';

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={fullName}
        className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50 ${
          dark
            ? 'border-white/25 text-slate-100 hover:bg-white/10'
            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
        }`}
      >
        <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d9856b] text-[11px] font-semibold text-white">
          {initialsOf(user)}
        </span>
        <span className="max-w-[6.5rem] truncate sm:hidden">{firstName || fullName}</span>
        <span className="hidden max-w-[12rem] truncate sm:inline">{fullName}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            <div className="px-3 py-2.5">
              <p className="truncate text-[13px] font-semibold text-slate-900">{fullName}</p>
              {user.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
            </div>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); if (onSignOut) onSignOut(); }}
              className="w-full rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus-visible:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * The header button. Signed out: one "Sign in" button (`onOpen()` opens the Google sign-in dialog; new people get an
 * account automatically, so there is no separate Register button).
 * Signed in (`user` given): the person's name with a Sign out menu (`onSignOut`).
 * Use variant="dark" on dark bars (like the mobile bar) and "light" on light backgrounds.
 */
export const AuthButtons = ({ onOpen, variant = 'light', user = null, onSignOut }) => {
  if (user) return <UserMenu user={user} onSignOut={onSignOut} variant={variant} />;
  return (
    <button
      type="button"
      onClick={() => onOpen('signin')}
      className="rounded-full bg-[#d9856b] px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-[#d9856b]/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#d9856b]/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50 focus-visible:ring-offset-2"
    >
      Sign in
    </button>
  );
};
