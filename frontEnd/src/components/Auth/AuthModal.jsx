import React, { useState, useEffect, useRef } from 'react';
import logo from '../../assets/logo.webp';
import logoMobile from '../../assets/logo1.webp';
import {
  RESEND_COOLDOWN_SECONDS,
  confirmEmailVerified,
  confirmPasswordReset,
  endEmailVerification,
  friendlyAuthError,
  normalizePhone,
  resendVerificationEmail,
  startEmailVerification,
  startPasswordReset,
} from '../../api/emailVerify';
import { wakeServer } from '../../api/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

const EMPTY_SIGN_IN = { email: '', password: '', remember: true };
const EMPTY_RESET = { password: '', confirm: '' };
const EMPTY_REGISTER = { firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '', terms: false };

const COPY = {
  signin: {
    heading: 'Good to see you again.',
    lead: 'Sign in to continue with your resume, PDFs and invoices.',
    title: 'Sign in',
    subtitle: 'Enter your email and password.',
  },
  register: {
    heading: 'Make a resume applicant tracking systems can read.',
    lead: 'Pick one of 30 layouts and download a clean A4 PDF.',
    title: 'Create your account',
    subtitle: 'Add your details to get started.',
  },
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

const IconEye = ({ className }) => (
  <Svg className={className}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

const IconEyeOff = ({ className }) => (
  <Svg className={className}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.4 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.4 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </Svg>
);

const IconMail = ({ className }) => (
  <Svg className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Svg>
);

const IconPhone = ({ className }) => (
  <Svg className={className}>
    <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
    <path d="M11 18.5h2" />
  </Svg>
);

const IconLock = ({ className }) => (
  <Svg className={className}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
);

const IconCheck = ({ className, strokeWidth }) => (
  <Svg className={className} strokeWidth={strokeWidth}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
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

/* Validation. Keys are added in field order so the first invalid field can be focused. */
const validateSignIn = (v) => {
  const errors = {};
  const email = v.email.trim();
  if (!email) errors.email = 'Enter your email address.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (!v.password) errors.password = 'Enter your password.';
  return errors;
};

// Forgot password, step 1: only the email address is asked for.
const validateForgotEmail = (v) => {
  const errors = {};
  const email = v.email.trim();
  if (!email) errors.email = 'Enter your email address.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  return errors;
};

// Forgot password, step 2: the new password, typed twice.
const validateForgotPassword = (v) => {
  const errors = {};
  if (!v.password) errors.newPassword = 'Enter your new password.';
  else if (v.password.length < MIN_PASSWORD) errors.newPassword = `Use at least ${MIN_PASSWORD} characters.`;
  if (!v.confirm) errors.newConfirm = 'Confirm your new password.';
  else if (v.confirm !== v.password) errors.newConfirm = 'The passwords do not match.';
  return errors;
};

const validateRegister = (v) => {
  const errors = {};
  const email = v.email.trim();
  if (!v.firstName.trim()) errors.firstName = 'Enter your first name.';
  if (!v.lastName.trim()) errors.lastName = 'Enter your last name.';
  if (!email) errors.email = 'Enter your email address.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (!v.phone.trim()) errors.phone = 'Enter your mobile number.';
  else if (!normalizePhone(v.phone)) errors.phone = 'Enter a valid number, like 082 123 4567 or +27 82 123 4567.';
  if (!v.password) errors.password = 'Create a password.';
  else if (v.password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  if (!v.confirm) errors.confirm = 'Confirm your password.';
  else if (v.confirm !== v.password) errors.confirm = 'The passwords do not match.';
  if (!v.terms) errors.terms = 'Accept the terms to create your account.';
  return errors;
};

const passwordScore = (pw) => {
  let score = 0;
  if (pw.length >= MIN_PASSWORD) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) score += 1;
  return score;
};

const STRENGTH_LEVELS = [
  { label: 'Weak', color: '#ef4444' },
  { label: 'Fair', color: '#f59e0b' },
  { label: 'Good', color: '#22c55e' },
  { label: 'Strong', color: '#16a34a' },
];

const PasswordStrength = ({ password }) => {
  if (!password) return null;
  const score = Math.max(1, passwordScore(password));
  const level = STRENGTH_LEVELS[score - 1];
  return (
    <div className="mt-2 flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {STRENGTH_LEVELS.map((_, i) => (
          <span
            key={i}
            className="h-[3px] flex-1 rounded-full transition-colors duration-300"
            style={{ backgroundColor: i < score ? level.color : '#e2e8f0' }}
          />
        ))}
      </div>
      <span className="w-11 text-right text-[11px] font-semibold" style={{ color: level.color }}>{level.label}</span>
    </div>
  );
};

/* A labelled input with an optional leading icon and an error line. Password fields get a show / hide button. */
const Field = ({ id, label, type = 'text', value, onChange, onBlur, error, autoComplete, inputMode, placeholder, inputRef, icon: Icon, children }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-700">{label}</label>
      <div className="group relative">
        {Icon && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
              error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#d9856b]'
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
        <input
          id={id}
          ref={inputRef}
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`auth-input h-11 w-full rounded-xl border text-[14px] text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${isPassword ? 'pr-11' : 'pr-3.5'} ${
            error
              ? 'border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-red-100'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-[#d9856b] focus:ring-[#d9856b]/15'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50"
          >
            {show ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-red-600">
          <IconAlert className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {children}
    </div>
  );
};

/* A square checkbox that shows a tick in the brand colour. */
const Checkbox = ({ id, checked, onChange, invalid, describedBy, children }) => (
  <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-snug text-slate-600">
    <span className="relative mt-px flex h-4 w-4 shrink-0">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-invalid={invalid ? 'true' : 'false'}
        aria-describedby={describedBy}
        className={`peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded border bg-white transition checked:border-[#d9856b] checked:bg-[#d9856b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9856b]/20 ${
          invalid ? 'border-red-400' : 'border-slate-300'
        }`}
      />
      <IconCheck className="pointer-events-none absolute inset-0 m-auto h-2.5 w-2.5 text-white opacity-0 transition-opacity peer-checked:opacity-100" strokeWidth={3.5} />
    </span>
    <span>{children}</span>
  </label>
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
 * Sign in / Register modal. A two-panel card on tablets and desktops, full screen on phones.
 *
 * Props
 *  - open:           whether the modal is shown
 *  - mode:           'signin' | 'register'
 *  - onModeChange:   (mode) => void, called when the person switches tabs
 *  - onClose:        () => void
 *  - onSignIn:       async ({ email, password, remember }) => void. Throw an Error to show its message in the form.
 *  - onRegister:     async ({ firstName, lastName, email, phone, emailToken, password }) => void. Throw an Error to show its message in the form.
 *                    emailToken is a Firebase ID token proving the person opened the link in the verification email sent to `email`;
 *                    the server checks it. `phone` is saved as typed (+27 form) and is not verified.
 *  - onResetPassword (optional): async ({ email, password, emailToken }) => void. When given, a "Forgot password?" link is
 *                    shown on the Sign in form. The person asks for a reset email, opens its link, then enters the new password
 *                    here; emailToken is the Firebase ID token proving they opened it. The handler saves the new password on the
 *                    server and signs the person in (see api/auth.js resetPassword). Throw an Error to show its message in the form.
 *  - termsHref / privacyHref (optional): where the links in the Register form point.
 */
export default function AuthModal({
  open,
  mode = 'signin',
  onModeChange,
  onClose,
  onSignIn,
  onRegister,
  onResetPassword,
  termsHref = '/terms',
  privacyHref = '/privacy',
}) {
  const [signIn, setSignIn] = useState(EMPTY_SIGN_IN);
  const [register, setRegister] = useState(EMPTY_REGISTER);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const firstFieldRef = useRef(null);
  // Sign-up has two steps: the details form, then "Check your inbox" (open the link in the verification email).
  const [step, setStep] = useState('form'); // 'form' | 'verify'
  const [resendIn, setResendIn] = useState(0);
  // True when this email was already verified in an earlier attempt, so no new email was sent.
  const [emailAlreadyVerified, setEmailAlreadyVerified] = useState(false);
  // A calm, non-error message on the "Check your inbox" step (not verified yet, a new email was sent, ...).
  const [formNotice, setFormNotice] = useState('');
  // Forgot password (Sign in tab only): '' = normal sign in, 'email' = asking for the reset email,
  // 'confirm' = "check your inbox", where the new password is entered after the link was opened.
  const [forgotStep, setForgotStep] = useState('');
  const [resetForm, setResetForm] = useState(EMPTY_RESET);

  const isRegister = mode === 'register';
  const copy = COPY[isRegister ? 'register' : 'signin'];
  const values = isRegister ? register : signIn;
  const onForgotEmail = !isRegister && forgotStep === 'email';
  const onForgotConfirm = !isRegister && forgotStep === 'confirm';
  const forgotAddress = signIn.email.trim().toLowerCase();
  let errors;
  if (isRegister) errors = validateRegister(register);
  else if (onForgotEmail) errors = validateForgotEmail(signIn);
  else if (onForgotConfirm) errors = validateForgotPassword(resetForm);
  else errors = validateSignIn(signIn);
  const errorFor = (name) => (submitAttempted || touched[name] ? errors[name] : undefined);
  const phoneE164 = isRegister ? normalizePhone(register.phone) : '';
  const emailAddress = isRegister ? register.email.trim().toLowerCase() : '';
  const onVerifyStep = isRegister && step === 'verify';
  let title = onVerifyStep ? 'Check your inbox' : copy.title;
  let subtitle = onVerifyStep ? 'One last step to finish creating your account.' : copy.subtitle;
  if (onForgotEmail) {
    title = 'Reset your password';
    subtitle = 'Enter your email and we will send you a reset link.';
  } else if (onForgotConfirm) {
    title = 'Check your inbox';
    subtitle = 'One last step to choose your new password.';
  }

  // Start clean every time the modal is closed, so a password is never left behind.
  useEffect(() => {
    if (open) return;
    setSignIn(EMPTY_SIGN_IN);
    setRegister(EMPTY_REGISTER);
    setTouched({});
    setSubmitAttempted(false);
    setSubmitting(false);
    setFormError('');
    setFormNotice('');
    setStep('form');
    setResendIn(0);
    setEmailAlreadyVerified(false);
    setForgotStep('');
    setResetForm(EMPTY_RESET);
    endEmailVerification(); // closes the Firebase session used to check the email
  }, [open]);

  // "Resend email" unlocks after a short countdown.
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Escape closes the modal and the page behind it does not scroll while it is open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, submitting, onClose]);

  // Put the cursor in the first field when the modal opens or the tab changes. Not on touch screens,
  // where it would open the keyboard and cover the form before the person has seen it.
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => {
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
      firstFieldRef.current?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [open, mode, forgotStep]);

  if (!open) return null;

  const setField = (name, value) => {
    (isRegister ? setRegister : setSignIn)((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const setResetField = (name, value) => {
    setResetForm((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const blur = (name) => () => setTouched((t) => ({ ...t, [name]: true }));

  const switchMode = (next) => {
    // Tapping "Sign in" while on the forgot-password steps leads back to the normal sign-in form.
    if (submitting || (next === mode && !forgotStep)) return;
    // Keep the email the person already typed, drop everything else.
    const email = values.email;
    setSignIn({ ...EMPTY_SIGN_IN, email });
    setRegister({ ...EMPTY_REGISTER, email });
    setTouched({});
    setSubmitAttempted(false);
    setFormError('');
    setFormNotice('');
    setStep('form');
    setResendIn(0);
    setEmailAlreadyVerified(false);
    setForgotStep('');
    setResetForm(EMPTY_RESET);
    endEmailVerification();
    if (next !== mode) onModeChange?.(next);
  };

  /* ---- Forgot password ---- */

  // The sign-in form's "Forgot password?" link. The email typed so far is kept.
  const openForgot = () => {
    if (submitting) return;
    setSignIn((prev) => ({ ...prev, password: '' }));
    setResetForm(EMPTY_RESET);
    setTouched({});
    setSubmitAttempted(false);
    setFormError('');
    setFormNotice('');
    setResendIn(0);
    setForgotStep('email');
  };

  // Back to the normal sign-in form, or (from "Check your inbox") back to the email box to fix a typo.
  const backFromForgot = (toStep) => {
    if (submitting) return;
    setResetForm(EMPTY_RESET);
    setTouched({});
    setSubmitAttempted(false);
    setFormError('');
    setFormNotice('');
    setResendIn(0);
    setForgotStep(toStep);
  };

  const resendResetEmail = async () => {
    if (submitting || resendIn > 0) return;
    setFormError('');
    setFormNotice('');
    setSubmitting(true);
    try {
      await startPasswordReset(forgotAddress);
      setFormNotice('We sent you a new email. If you do not see it, check your spam folder.');
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Creates the account once the email is proven. The server re-checks the token; nothing here is trusted on its own.
  const finishRegister = async (emailToken) => {
    await onRegister?.({
      firstName: register.firstName.trim(),
      lastName: register.lastName.trim(),
      email: emailAddress,
      password: register.password,
      phone: phoneE164,
      emailToken,
    });
    onClose();
  };

  const backToDetails = () => {
    if (submitting) return;
    setStep('form');
    setFormError('');
    setFormNotice('');
    setResendIn(0);
    setEmailAlreadyVerified(false);
    endEmailVerification();
  };

  const resendEmail = async () => {
    if (submitting || resendIn > 0) return;
    setFormError('');
    setFormNotice('');
    setSubmitting(true);
    try {
      const result = await resendVerificationEmail(emailAddress, register.password);
      if (result.alreadyVerified) {
        setEmailAlreadyVerified(true);
        setFormNotice('This email is already verified. Tap "I\'ve verified my email" to continue.');
      } else {
        setFormNotice('We sent you a new email. If you do not see it, check your spam folder.');
        setResendIn(RESEND_COOLDOWN_SECONDS);
      }
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setFormNotice('');

    // Step 2 (sign-up): has the link in the email been opened? If so, create the account.
    if (isRegister && step === 'verify') {
      setSubmitting(true);
      try {
        const result = await confirmEmailVerified(emailAddress, register.password);
        if (!result.verified) {
          setFormNotice('Your email is not verified yet. Open the link in the email we sent you first, then tap the button again.');
          return;
        }
        const awake = await wakeServer({
          onSlow: () => setFormNotice('Almost done. Starting our server, this can take up to a minute…'),
        });
        if (!awake) {
          setFormNotice('');
          setFormError('Our server is taking a long time to start. Please wait a moment and tap the button again.');
          return;
        }
        setFormNotice('');
        await finishRegister(result.emailToken);
      } catch (err) {
        setFormError(friendlyAuthError(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitAttempted(true);
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) {
      document.getElementById(`auth-${firstInvalid}`)?.focus();
      return;
    }

    // Forgot password, step 2: the link was opened and a new password chosen. Prove that with Firebase,
    // then have the server save the same password on the account and sign the person in.
    if (onForgotConfirm) {
      setSubmitting(true);
      try {
        const { emailToken } = await confirmPasswordReset(forgotAddress, resetForm.password);
        const awake = await wakeServer({
          onSlow: () => setFormNotice('Almost done. Starting our server, this can take up to a minute…'),
        });
        if (!awake) {
          setFormNotice('');
          setFormError('Our server is taking a long time to start. Please wait a moment and tap the button again.');
          return;
        }
        setFormNotice('');
        await onResetPassword?.({ email: forgotAddress, password: resetForm.password, emailToken });
        onClose();
      } catch (err) {
        setFormNotice('');
        setFormError(friendlyAuthError(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Forgot password, step 1: send the reset email, then show "Check your inbox".
    if (onForgotEmail) {
      setSubmitting(true);
      try {
        wakeServer(); // the accounts server may be asleep: wake it while the person opens the email
        await startPasswordReset(forgotAddress);
        setSubmitAttempted(false);
        setTouched({});
        setResendIn(RESEND_COOLDOWN_SECONDS);
        setForgotStep('confirm');
      } catch (err) {
        setFormError(friendlyAuthError(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      if (isRegister) {
        // Step 1 (sign-up): create (or pick up) the Firebase account, send the verification email, show "Check your inbox".
        // The accounts server may be asleep (Render free plan), so it is woken in the background: by the time the
        // person has opened the email, it is ready to save the account.
        wakeServer();
        const result = await startEmailVerification(emailAddress, register.password);
        setEmailAlreadyVerified(result.alreadyVerified);
        setResendIn(result.alreadyVerified ? 0 : RESEND_COOLDOWN_SECONDS);
        setStep('verify');
      } else {
        await onSignIn?.({
          email: signIn.email.trim().toLowerCase(),
          password: signIn.password,
          remember: signIn.remember,
        });
        onClose();
      }
    } catch (err) {
      setFormError(isRegister ? friendlyAuthError(err) : ((err && err.message) || 'Something went wrong. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const closeButtonClass =
    'flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50 disabled:opacity-40';

  return (
    <div
      className="auth-overlay fixed inset-0 z-[120] flex items-stretch justify-center bg-slate-950/60 md:items-center md:p-6 md:backdrop-blur-sm"
      onClick={() => { if (!submitting) onClose(); }}
    >
      <style>{MODAL_CSS}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="auth-card relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white md:h-[min(46rem,calc(100dvh_-_3rem))] md:max-w-[52rem] md:flex-row md:rounded-[28px] md:shadow-[0_32px_80px_-16px_rgba(2,6,23,0.6)] lg:max-w-[58rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <BrandPanel copy={copy} />

        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-white">
          {/* Phones: a full-screen app bar with the logo and a close button */}
          <header className="shrink-0 border-b border-slate-100 bg-white pt-[env(safe-area-inset-top)] md:hidden">
            <div className="flex h-14 items-center justify-between pl-5 pr-3">
              <BrandLogo className="h-7" />
              <button type="button" onClick={onClose} disabled={submitting} aria-label="Close" className={closeButtonClass}>
                <IconClose className="h-[18px] w-[18px]" />
              </button>
            </div>
          </header>

          {/* Tablet and up: close button in the corner of the card */}
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className={`${closeButtonClass} absolute right-4 top-4 z-10 hidden md:flex`}
          >
            <IconClose className="h-[18px] w-[18px]" />
          </button>

          <div className="pro-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="w-full px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 md:my-auto md:px-10 md:pb-10 md:pt-16">
              <div className="mx-auto w-full max-w-[25rem]">
                {/* Sign in / Register switch with a sliding indicator */}
                <div role="tablist" aria-label="Account" className="relative grid h-10 grid-cols-2 rounded-full bg-slate-100 p-1">
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1 left-1 top-1 w-[calc(50%_-_4px)] rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.15)] transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
                    style={{ transform: isRegister ? 'translateX(100%)' : 'translateX(0)' }}
                  />
                  {[
                    { id: 'signin', label: 'Sign in' },
                    { id: 'register', label: 'Register' },
                  ].map((tab) => {
                    const active = mode === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => switchMode(tab.id)}
                        className={`relative z-10 rounded-full text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50 ${
                          active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div key={`${mode}-${forgotStep}`} className="auth-swap mt-6">
                  <h2 id="auth-title" className="text-xl font-semibold leading-tight tracking-tight text-slate-900 md:text-[22px]">{title}</h2>
                  <p className="mb-5 mt-1 text-[13px] text-slate-500">{subtitle}</p>

                  <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
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

                    {onVerifyStep ? (
                      <>
                        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                          <span aria-hidden="true" className="mt-0.5 text-[#d9856b]">
                            <IconMail className="h-5 w-5" />
                          </span>
                          <p className="text-[13px] leading-relaxed text-slate-600">
                            {emailAlreadyVerified ? (
                              <>
                                <span className="font-semibold text-slate-900">{emailAddress}</span> is already verified. Tap the button below to
                                finish creating your account.
                              </>
                            ) : (
                              <>
                                We sent a verification link to <span className="font-semibold text-slate-900">{emailAddress}</span>. Open the link,
                                then come back here and tap the button below. Can&apos;t find it? Check your spam or junk folder.
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[12.5px]">
                          <button
                            type="button"
                            onClick={backToDetails}
                            disabled={submitting}
                            className="font-semibold text-[#1e3a8a] underline-offset-2 hover:underline focus:outline-none focus-visible:underline disabled:opacity-50"
                          >
                            Change email
                          </button>
                          <button
                            type="button"
                            onClick={resendEmail}
                            disabled={submitting || resendIn > 0}
                            className="font-semibold text-[#1e3a8a] underline-offset-2 hover:underline focus:outline-none focus-visible:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                          >
                            {resendIn > 0 ? `Resend email in ${resendIn}s` : 'Resend email'}
                          </button>
                        </div>
                      </>
                    ) : onForgotEmail ? (
                      <>
                        <Field
                          id="auth-email"
                          label="Email"
                          type="email"
                          icon={IconMail}
                          value={signIn.email}
                          onChange={(e) => setField('email', e.target.value)}
                          onBlur={blur('email')}
                          error={errorFor('email')}
                          autoComplete="email"
                          placeholder="you@example.com"
                          inputRef={firstFieldRef}
                        />
                        <div className="text-[12.5px]">
                          <button
                            type="button"
                            onClick={() => backFromForgot('')}
                            disabled={submitting}
                            className="font-semibold text-[#1e3a8a] underline-offset-2 hover:underline focus:outline-none focus-visible:underline disabled:opacity-50"
                          >
                            Back to sign in
                          </button>
                        </div>
                      </>
                    ) : onForgotConfirm ? (
                      <>
                        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                          <span aria-hidden="true" className="mt-0.5 text-[#d9856b]">
                            <IconMail className="h-5 w-5" />
                          </span>
                          <p className="text-[13px] leading-relaxed text-slate-600">
                            If <span className="font-semibold text-slate-900">{forgotAddress}</span> has an account, we sent a reset link to it.
                            Open the link and choose your new password on that page, then enter the same password below.
                            Can&apos;t find it? Check your spam or junk folder.
                          </p>
                        </div>
                        <Field
                          id="auth-newPassword"
                          label="New password"
                          type="password"
                          icon={IconLock}
                          value={resetForm.password}
                          onChange={(e) => setResetField('password', e.target.value)}
                          onBlur={blur('newPassword')}
                          error={errorFor('newPassword')}
                          autoComplete="new-password"
                          placeholder={`At least ${MIN_PASSWORD} characters`}
                          inputRef={firstFieldRef}
                        >
                          <PasswordStrength password={resetForm.password} />
                        </Field>
                        <Field
                          id="auth-newConfirm"
                          label="Confirm new password"
                          type="password"
                          icon={IconLock}
                          value={resetForm.confirm}
                          onChange={(e) => setResetField('confirm', e.target.value)}
                          onBlur={blur('newConfirm')}
                          error={errorFor('newConfirm')}
                          autoComplete="new-password"
                        />
                        <div className="flex items-center justify-between text-[12.5px]">
                          <button
                            type="button"
                            onClick={() => backFromForgot('email')}
                            disabled={submitting}
                            className="font-semibold text-[#1e3a8a] underline-offset-2 hover:underline focus:outline-none focus-visible:underline disabled:opacity-50"
                          >
                            Change email
                          </button>
                          <button
                            type="button"
                            onClick={resendResetEmail}
                            disabled={submitting || resendIn > 0}
                            className="font-semibold text-[#1e3a8a] underline-offset-2 hover:underline focus:outline-none focus-visible:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                          >
                            {resendIn > 0 ? `Resend email in ${resendIn}s` : 'Resend email'}
                          </button>
                        </div>
                      </>
                    ) : isRegister ? (
                      <>
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                          <Field
                            id="auth-firstName"
                            label="First name"
                            value={register.firstName}
                            onChange={(e) => setField('firstName', e.target.value)}
                            onBlur={blur('firstName')}
                            error={errorFor('firstName')}
                            autoComplete="given-name"
                            inputRef={firstFieldRef}
                          />
                          <Field
                            id="auth-lastName"
                            label="Last name"
                            value={register.lastName}
                            onChange={(e) => setField('lastName', e.target.value)}
                            onBlur={blur('lastName')}
                            error={errorFor('lastName')}
                            autoComplete="family-name"
                          />
                        </div>
                        <Field
                          id="auth-email"
                          label="Email"
                          type="email"
                          icon={IconMail}
                          value={register.email}
                          onChange={(e) => setField('email', e.target.value)}
                          onBlur={blur('email')}
                          error={errorFor('email')}
                          autoComplete="email"
                          placeholder="you@example.com"
                        />
                        <Field
                          id="auth-phone"
                          label="Mobile number"
                          type="tel"
                          icon={IconPhone}
                          value={register.phone}
                          onChange={(e) => setField('phone', e.target.value)}
                          onBlur={blur('phone')}
                          error={errorFor('phone')}
                          autoComplete="tel"
                          inputMode="tel"
                          placeholder="082 123 4567"
                        >
                          <p className="mt-1.5 text-[11.5px] text-slate-500">Saved with your account. We will not send you a code by SMS.</p>
                        </Field>
                        <Field
                          id="auth-password"
                          label="Password"
                          type="password"
                          icon={IconLock}
                          value={register.password}
                          onChange={(e) => setField('password', e.target.value)}
                          onBlur={blur('password')}
                          error={errorFor('password')}
                          autoComplete="new-password"
                          placeholder={`At least ${MIN_PASSWORD} characters`}
                        >
                          <PasswordStrength password={register.password} />
                        </Field>
                        <Field
                          id="auth-confirm"
                          label="Confirm password"
                          type="password"
                          icon={IconLock}
                          value={register.confirm}
                          onChange={(e) => setField('confirm', e.target.value)}
                          onBlur={blur('confirm')}
                          error={errorFor('confirm')}
                          autoComplete="new-password"
                        />
                        <div>
                          <Checkbox
                            id="auth-terms"
                            checked={register.terms}
                            onChange={(e) => { setField('terms', e.target.checked); setTouched((t) => ({ ...t, terms: true })); }}
                            invalid={!!errorFor('terms')}
                            describedBy={errorFor('terms') ? 'auth-terms-error' : undefined}
                          >
                            I agree to the{' '}
                            <a href={termsHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1e3a8a] underline-offset-2 hover:underline">Terms of Service</a>
                            {' '}and{' '}
                            <a href={privacyHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1e3a8a] underline-offset-2 hover:underline">Privacy Policy</a>.
                          </Checkbox>
                          {errorFor('terms') && (
                            <p id="auth-terms-error" role="alert" className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-red-600">
                              <IconAlert className="h-3.5 w-3.5 shrink-0" />
                              {errors.terms}
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <Field
                          id="auth-email"
                          label="Email"
                          type="email"
                          icon={IconMail}
                          value={signIn.email}
                          onChange={(e) => setField('email', e.target.value)}
                          onBlur={blur('email')}
                          error={errorFor('email')}
                          autoComplete="email"
                          placeholder="you@example.com"
                          inputRef={firstFieldRef}
                        />
                        <Field
                          id="auth-password"
                          label="Password"
                          type="password"
                          icon={IconLock}
                          value={signIn.password}
                          onChange={(e) => setField('password', e.target.value)}
                          onBlur={blur('password')}
                          error={errorFor('password')}
                          autoComplete="current-password"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <Checkbox id="auth-remember" checked={signIn.remember} onChange={(e) => setField('remember', e.target.checked)}>
                            Remember me
                          </Checkbox>
                          {onResetPassword && (
                            <button
                              type="button"
                              onClick={openForgot}
                              className="text-[12.5px] font-semibold text-[#1e3a8a] underline-offset-2 hover:underline focus:outline-none focus-visible:underline"
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#d9856b] text-[13px] font-semibold text-white shadow-lg shadow-[#d9856b]/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#d9856b]/35 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#d9856b]/30 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70 disabled:shadow-none"
                    >
                      {submitting && <IconSpinner />}
                      {submitting
                        ? (isRegister
                            ? (step === 'verify' ? 'Checking…' : 'Please wait…')
                            : (onForgotEmail ? 'Sending…' : onForgotConfirm ? 'Saving…' : 'Signing in…'))
                        : (isRegister
                            ? (step === 'verify' ? "I've verified my email" : 'Continue')
                            : (onForgotEmail ? 'Send reset link' : onForgotConfirm ? 'Save new password' : 'Sign in'))}
                    </button>
                  </form>

                  <p className="mt-5 text-center text-[12.5px] text-slate-500">
                    {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                      type="button"
                      onClick={() => switchMode(isRegister ? 'signin' : 'register')}
                      className="font-semibold text-[#1e3a8a] underline-offset-2 hover:underline focus:outline-none focus-visible:underline"
                    >
                      {isRegister ? 'Sign in' : 'Register'}
                    </button>
                  </p>
                </div>
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
 * The header buttons. Signed out: Sign in + Register (`onOpen('signin' | 'register')` opens the modal on that tab).
 * Signed in (`user` given): the person's name with a Sign out menu (`onSignOut`).
 * Use variant="dark" on dark bars (like the mobile bar) and "light" on light backgrounds.
 */
export const AuthButtons = ({ onOpen, variant = 'light', user = null, onSignOut }) => {
  if (user) return <UserMenu user={user} onSignOut={onSignOut} variant={variant} />;
  const dark = variant === 'dark';
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onOpen('signin')}
        className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50 ${
          dark
            ? 'border-white/25 text-slate-100 hover:bg-white/10'
            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
        }`}
      >
        Sign in
      </button>
      <button
        type="button"
        onClick={() => onOpen('register')}
        className="rounded-full bg-[#d9856b] px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-[#d9856b]/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#d9856b]/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50 focus-visible:ring-offset-2"
      >
        Register
      </button>
    </div>
  );
};
