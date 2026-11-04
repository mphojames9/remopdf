import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getPaymentStatus, startPayment, verifyPayment } from '../../api/payments';

/* -------------------------------------------------------------------------- */
/*  Checkout screen (Paystack): full screen, light, white background.         */
/*                                                                            */
/*  Step 1  Details   the person confirms who is paying (name, email, phone). */
/*  Step 2  Payment   Paystack's secure window opens on the card form; the    */
/*                    card number, expiry and CVV are typed THERE, never into */
/*                    this app, so card numbers never touch our code or our   */
/*                    server.                                                 */
/*  Step 3  Done      the server confirms the payment with Paystack.          */
/*                                                                            */
/*  While the Paystack window is open the server is asked every few seconds   */
/*  whether the payment went through. Only the server's answer unlocks        */
/*  anything, so a closed window or a missed callback cannot lose a payment.  */
/*                                                                            */
/*  Props                                                                     */
/*    open       boolean                                                      */
/*    user       the signed-in person, or null                                */
/*    onClose    () => void   closed without paying                           */
/*    onPaid     () => void   payment confirmed (or already active)           */
/*    onSignIn   () => void   the person needs an account first               */
/*    doneLabel  text of the final button (default 'Continue to download')    */
/* -------------------------------------------------------------------------- */

const INLINE_SRC = 'https://js.paystack.co/v2/inline.js';
const POLL_MS = 3000;
const GIVE_UP_MS = 5 * 60 * 1000;
const PHONE_RE = /^[0-9+()\-\s]{7,20}$/; // same rule as the server
// Outfit is the font the builder already uses; the rest are fallbacks if it has not loaded.
const FONT_STACK = "'Outfit', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

let scriptPromise = null;
const loadPaystack = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.PaystackPop) return Promise.resolve(window.PaystackPop);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = INLINE_SRC;
      script.async = true;
      script.onload = () => (window.PaystackPop ? resolve(window.PaystackPop) : reject(new Error('missing')));
      script.onerror = () => {
        scriptPromise = null; // allow another try (e.g. the connection came back)
        script.remove();
        reject(new Error('load'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
};

// The amount arrives in the smallest unit (4900 = 49.00).
const formatPrice = (amount, currency) => {
  const value = Number(amount) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

const describeAccess = (days) => (days > 0 ? `${days} days of PDF downloads` : 'Unlimited PDF downloads, no expiry');

/* ------------------------------ small pieces ------------------------------ */

const Icon = ({ children, className = 'h-4 w-4', strokeWidth = 1.8 }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const LockIcon = ({ className }) => (
  <Icon className={className}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Icon>
);

const ShieldIcon = ({ className }) => (
  <Icon className={className}>
    <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.4 7.5 9.5 4.4-1.1 7.5-4.9 7.5-9.5V6L12 3Z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

const CheckIcon = ({ className, strokeWidth = 2.4 }) => (
  <Icon className={className} strokeWidth={strokeWidth}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);

// tone="light" is for use on a dark button, the default is for use on the white page.
const Spinner = ({ className = 'h-4 w-4', tone = 'dark' }) => (
  <span
    className={`${className} inline-block animate-spin rounded-full border-2 ${
      tone === 'light' ? 'border-white/30 border-t-white' : 'border-slate-200 border-t-slate-700'
    }`}
    aria-hidden="true"
  />
);

const STEPS = ['Details', 'Payment', 'Done'];

// `current` is the active step (0-2); 3 means every step is finished.
const Stepper = ({ current }) => (
  <ol className="flex items-center gap-2.5 text-[12px] font-medium" aria-label="Checkout progress">
    {STEPS.map((label, index) => {
      const state = index < current ? 'done' : index === current ? 'active' : 'todo';
      return (
        <React.Fragment key={label}>
          <li className="flex items-center gap-2" aria-current={state === 'active' ? 'step' : undefined}>
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                state === 'todo' ? 'border border-slate-300 text-slate-400' : 'bg-slate-900 text-white'
              }`}
            >
              {state === 'done' ? <CheckIcon className="h-2.5 w-2.5" strokeWidth={3} /> : index + 1}
            </span>
            <span className={state === 'todo' ? 'text-slate-400' : 'text-slate-900'}>{label}</span>
          </li>
          {index < STEPS.length - 1 && <span className={`h-px flex-1 ${index < current ? 'bg-slate-900' : 'bg-slate-200'}`} aria-hidden="true" />}
        </React.Fragment>
      );
    })}
  </ol>
);

// 16px text on inputs stops iPhones zooming in when a field is focused.
const inputClass = (invalid, readOnly = false) =>
  `h-11 w-full rounded-xl border px-3.5 text-base transition sm:text-sm focus:outline-none focus:ring-4 disabled:opacity-60 ${
    readOnly ? 'cursor-not-allowed border-slate-200 bg-slate-50 pr-10 text-slate-500' : 'bg-white text-slate-900 shadow-sm placeholder:text-slate-400'
  } ${
    invalid
      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
      : readOnly
        ? ''
        : 'border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:ring-slate-900/10'
  }`;

const Field = ({ id, label, hint, error, children }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-[12.5px] font-medium text-slate-700">
      <span>{label}</span>
      {hint && <span className="text-[11.5px] font-normal text-slate-400">{hint}</span>}
    </label>
    {children}
    {error && (
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-[11.5px] font-medium text-rose-600">
        {error}
      </p>
    )}
  </div>
);

const primaryButton =
  'flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-[14px] font-semibold text-white shadow-md shadow-slate-900/10 transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20 disabled:opacity-60';
const secondaryButton =
  'flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/10 disabled:opacity-50';

/* --------------------------------- dialog --------------------------------- */

export default function PaymentModal({ open, user, onClose, onPaid, onSignIn, doneLabel = 'Continue to download' }) {
  // 'loading' | 'ready' | 'starting' | 'awaiting' | 'success' | 'error'
  const [phase, setPhase] = useState('loading');
  const [plan, setPlan] = useState(null);
  const [testMode, setTestMode] = useState(false);
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);

  // Billing details typed in step 1.
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});

  const referenceRef = useRef(null);
  // The last payment that was started and not yet settled. If the window was closed before the confirmation
  // arrived, it is checked again before a second payment can be started, so nobody pays twice.
  const lastReferenceRef = useRef(null);
  const inFlightRef = useRef(false);
  const primaryRef = useRef(null);
  const nameRef = useRef(null);
  // The latest callbacks, so effects below never restart just because the parent re-rendered.
  const onPaidRef = useRef(onPaid);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onPaidRef.current = onPaid;
    onCloseRef.current = onClose;
  });

  const signedIn = Boolean(user);
  const busy = phase === 'starting' || phase === 'awaiting';
  const step = phase === 'success' ? 3 : busy ? 1 : 0;

  // Finds out the price, and whether access is already paid for.
  const loadStatus = useCallback(() => {
    let cancelled = false;
    setMessage('');
    setPhase('loading');
    getPaymentStatus()
      .then((status) => {
        if (cancelled) return;
        if (status.premium) {
          onPaidRef.current?.();
          return;
        }
        setPlan(status.plan);
        setTestMode(Boolean(status.testMode));
        setPhase('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setMessage(err.message || 'Something went wrong. Please try again.');
        setPhase('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Opening the dialog: start from the account's name, and look up the price.
  useEffect(() => {
    if (!open) return undefined;
    referenceRef.current = null;
    setMessage('');
    setErrors({});
    setChecking(false);
    if (!signedIn) {
      setPhase('ready');
      return undefined;
    }
    setName([user?.firstName, user?.lastName].filter(Boolean).join(' ').trim());
    setPhone('');
    return loadStatus();
    // Only reopening (or signing in) should reset the form, not every change to the user object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, signedIn, loadStatus]);

  // Asks the server about the payment in progress. Returns true once it is confirmed.
  const checkPayment = useCallback(async ({ manual = false } = {}) => {
    const reference = referenceRef.current;
    if (!reference || inFlightRef.current) return false;
    inFlightRef.current = true;
    if (manual) setChecking(true);
    try {
      const result = await verifyPayment(reference);
      if (referenceRef.current !== reference) return false; // closed or restarted meanwhile
      if (result.status === 'success') {
        referenceRef.current = null;
        lastReferenceRef.current = null;
        setPhase('success');
        return true;
      }
      if (result.status === 'failed') {
        referenceRef.current = null;
        lastReferenceRef.current = null;
        setMessage(result.message || 'The payment did not go through. You have not been charged.');
        setPhase('ready');
        return false;
      }
      if (manual) setMessage('We have not received your payment yet. If you just paid, give it a few seconds and check again.');
      return false;
    } catch (err) {
      if (manual) setMessage(err.message || 'Could not check the payment. Please try again.');
      return false; // while polling, a hiccup is simply tried again on the next tick
    } finally {
      inFlightRef.current = false;
      if (manual) setChecking(false);
    }
  }, []);

  // While the Paystack window is open, keep asking the server. Stops by itself after a few minutes.
  useEffect(() => {
    if (!open || phase !== 'awaiting') return undefined;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - startedAt > GIVE_UP_MS) {
        window.clearInterval(timer);
        referenceRef.current = null;
        setMessage('We did not receive a payment. If you were charged, contact support with your receipt.');
        setPhase('ready');
        return;
      }
      checkPayment();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [open, phase, checkPayment]);

  // Focus the first thing to act on.
  useEffect(() => {
    if (!open) return;
    if (phase === 'success') primaryRef.current?.focus();
    else if (phase === 'ready' && signedIn) nameRef.current?.focus();
    else if (phase === 'ready') primaryRef.current?.focus();
  }, [open, phase, signedIn]);

  // The checkout covers the whole screen, so the page behind it should not scroll.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const validate = () => {
    const next = {};
    const cleanName = name.trim().replace(/\s+/g, ' ');
    if (cleanName.length < 2) next.name = 'Enter the name of the person paying.';
    else if (cleanName.length > 100) next.name = 'That name is too long.';
    if (phone.trim() && !PHONE_RE.test(phone.trim())) next.phone = 'Enter a valid phone number, or leave it empty.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handlePay = async () => {
    if (busy) return;
    setMessage('');
    if (!validate()) return;
    setPhase('starting');
    try {
      if (lastReferenceRef.current) {
        try {
          const earlier = await verifyPayment(lastReferenceRef.current);
          if (earlier.status === 'success') {
            lastReferenceRef.current = null;
            setPhase('success');
            return;
          }
          if (earlier.status === 'failed') lastReferenceRef.current = null;
        } catch {
          /* could not check: carry on and start a new payment */
        }
      }
      const started = await startPayment({ name: name.trim().replace(/\s+/g, ' '), phone: phone.trim() });
      if (started.premium) {
        onPaidRef.current?.();
        return;
      }
      const Popup = await loadPaystack();
      referenceRef.current = started.reference;
      lastReferenceRef.current = started.reference;
      const popup = new Popup();
      popup.resumeTransaction(started.accessCode, {
        // The popup closing is only a hint to check sooner; the server's answer is what counts.
        onSuccess: () => checkPayment({ manual: false }),
        onCancel: async () => {
          const paid = await checkPayment();
          if (!paid && referenceRef.current) {
            referenceRef.current = null;
            setPhase('ready');
          }
        },
        onError: () => {
          referenceRef.current = null;
          setMessage('The payment window could not be opened. Please try again.');
          setPhase('ready');
        },
      });
      setPhase('awaiting');
    } catch (err) {
      referenceRef.current = null;
      setMessage(
        err.message === 'load' || err.message === 'missing'
          ? 'Could not load the payment window. Check your connection and try again.'
          : err.message || 'Something went wrong. Please try again.'
      );
      setPhase('ready');
    }
  };

  const close = () => {
    if (busy) return;
    referenceRef.current = null;
    onCloseRef.current?.();
  };

  if (!open) return null;

  const price = plan ? formatPrice(plan.amount, plan.currency) : '';
  // Paystack's window is limited to the card form when card is the only way to pay (see PAYMENT_CHANNELS on the server).
  const cardOnly = Array.isArray(plan?.channels) && plan.channels.length === 1 && plan.channels[0] === 'card';
  const showForm = signedIn && (phase === 'ready' || phase === 'starting');
  const securityNote = cardOnly
    ? 'Next, you type your card number, expiry date and CVV in Paystack’s secure window. They never reach RemoPDF.'
    : 'Next, you choose how to pay and enter your card or bank details in Paystack’s secure window. They never reach RemoPDF.';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          close();
        }
      }}
      style={{ fontFamily: FONT_STACK }}
      className="fixed inset-0 z-[90] flex flex-col overflow-y-auto bg-white text-slate-900 antialiased"
    >
      {/* header */}
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d9856b]/10 text-[#b9573d]">
              <LockIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 id="payment-title" className="truncate text-[15px] font-semibold leading-tight tracking-tight">
                Secure checkout
              </h2>
              <p className="truncate text-[12px] leading-tight text-slate-500">Unlock your PDF downloads</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <span className="hidden items-center gap-1.5 text-[12px] font-medium text-slate-500 sm:inline-flex">
              <ShieldIcon className="h-3.5 w-3.5 text-emerald-600" /> Payments secured by Paystack
            </span>
            <button
              type="button"
              onClick={close}
              disabled={busy}
              aria-label="Close checkout"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/10 disabled:opacity-40"
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2}>
                <path d="M6 6l12 12M18 6 6 18" />
              </Icon>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-8 sm:py-10 lg:py-12">
        {phase === 'success' ? (
          /* ------------------------------ step 3: done ------------------------------ */
          <div className="mx-auto max-w-sm">
            <Stepper current={3} />
            <div className="mt-8 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
                <CheckIcon className="h-7 w-7" />
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-tight sm:text-2xl">Payment received</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">
                Thank you{name.trim() ? `, ${name.trim().split(' ')[0]}` : ''}! Your PDF downloads are unlocked.
              </p>
              {plan && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left">
                  <div className="flex items-center justify-between gap-3 text-[14px]">
                    <span className="text-slate-600">{plan.name}</span>
                    <span className="font-semibold tabular-nums">{price}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-slate-500">{describeAccess(plan.days)}</p>
                </div>
              )}
              <button ref={primaryRef} type="button" onClick={() => onPaidRef.current?.()} className={`${primaryButton} mt-6`}>
                {doneLabel}
              </button>
            </div>
          </div>
        ) : !signedIn ? (
          /* ------------------------------ signed out ------------------------------ */
          <div className="mx-auto max-w-sm pt-4 text-center sm:pt-10">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <LockIcon className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-xl font-semibold tracking-tight">Sign in to continue</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">
              Create a free account or sign in first, so your payment is saved to you and works on every device.
            </p>
            <button ref={primaryRef} type="button" onClick={() => onSignIn?.()} className={`${primaryButton} mt-6`}>
              Sign in or create an account
            </button>
            <button
              type="button"
              onClick={close}
              className="mt-1.5 w-full rounded-xl px-5 py-2.5 text-[13px] font-semibold text-slate-500 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/10"
            >
              Not now
            </button>
          </div>
        ) : phase === 'loading' ? (
          <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-20 text-[14px] text-slate-500">
            <Spinner className="h-5 w-5" /> Getting things ready…
          </div>
        ) : phase === 'error' ? (
          <div className="mx-auto max-w-sm pt-4 text-center sm:pt-10">
            <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
              {message}
            </p>
            <button type="button" onClick={loadStatus} className={`${secondaryButton} mt-4`}>
              Try again
            </button>
          </div>
        ) : (
          /* ------------------------ steps 1 and 2: details, payment ------------------------ */
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
            {/* order summary: first on phones (price and plan on one row), on the right on larger screens */}
            <aside
              aria-label="Order summary"
              className="order-first self-start rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 lg:order-none lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24 lg:p-6"
            >
              <div className="flex items-center justify-between gap-4 lg:block">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold tracking-tight">{plan?.name}</h3>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500">{describeAccess(plan?.days)}</p>
                </div>
                <div className="shrink-0 text-right lg:mt-6 lg:text-left">
                  <p className="text-2xl font-semibold leading-none tracking-tight tabular-nums lg:text-[32px]">{price}</p>
                  <p className="mt-1.5 text-[12px] text-slate-500">Total today</p>
                </div>
              </div>

              <ul className="mt-6 hidden space-y-3 border-t border-slate-200 pt-5 text-[13px] leading-snug text-slate-600 lg:block">
                <li className="flex gap-2.5">
                  <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> Unlocked as soon as your payment is confirmed
                </li>
                <li className="flex gap-2.5">
                  <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> Saved to your account, works on every device
                </li>
              </ul>
            </aside>

            <div className="lg:col-start-1 lg:row-start-1">
              <Stepper current={step} />

              {phase === 'awaiting' ? (
                /* ---------------------- step 2: Paystack window open ---------------------- */
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-8">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <Spinner className="h-4 w-4" />
                  </span>
                  <p role="status" aria-live="polite" className="mt-4 text-base font-semibold tracking-tight">
                    Complete your payment in the Paystack window
                  </p>
                  <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-500">
                    {cardOnly ? 'Type your card number, expiry date and CVV there.' : 'Enter your card or bank details there.'} We will unlock your
                    download as soon as the payment is confirmed.
                  </p>
                  {message && (
                    <p role="alert" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
                      {message}
                    </p>
                  )}
                  <button type="button" onClick={() => checkPayment({ manual: true })} disabled={checking} className={`${secondaryButton} mt-5`}>
                    {checking ? 'Checking…' : 'I have paid. Check now'}
                  </button>
                </div>
              ) : (
                /* ---------------------------- step 1: details ---------------------------- */
                showForm && (
                  <>
                    <h3 className="mt-6 text-lg font-semibold tracking-tight sm:text-xl">Billing details</h3>
                    <p className="mt-1 text-[13px] text-slate-500">Confirm who is paying.</p>

                    <form
                      noValidate
                      onSubmit={(event) => {
                        event.preventDefault();
                        handlePay();
                      }}
                      className="mt-5"
                    >
                      <div className="space-y-4">
                        <Field id="pay-name" label="Full name" error={errors.name}>
                          <input
                            ref={nameRef}
                            id="pay-name"
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            autoComplete="name"
                            placeholder="Name on your receipt"
                            maxLength={100}
                            disabled={busy}
                            aria-invalid={Boolean(errors.name)}
                            aria-describedby={errors.name ? 'pay-name-error' : undefined}
                            className={inputClass(errors.name)}
                          />
                        </Field>

                        <Field id="pay-email" label="Email" hint="Receipt is sent here">
                          <div className="relative">
                            <input id="pay-email" type="email" value={user?.email || ''} readOnly tabIndex={-1} className={inputClass(false, true)} />
                            <LockIcon className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                          </div>
                        </Field>

                        <Field id="pay-phone" label="Phone" hint="Optional" error={errors.phone}>
                          <input
                            id="pay-phone"
                            type="tel"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            autoComplete="tel"
                            placeholder="+27 82 123 4567"
                            maxLength={20}
                            disabled={busy}
                            aria-invalid={Boolean(errors.phone)}
                            aria-describedby={errors.phone ? 'pay-phone-error' : undefined}
                            className={inputClass(errors.phone)}
                          />
                        </Field>
                      </div>

                      <div className="mt-5 flex gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 ring-1 ring-emerald-200/80">
                          <ShieldIcon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold">Payments are secured by Paystack</p>
                          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600">{securityNote}</p>
                        </div>
                      </div>

                      {testMode && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-900">
                          <p className="font-semibold">Test mode: no real money is charged.</p>
                          <p className="mt-0.5">Test card from Paystack’s docs: 4084 0840 8408 4081, any future expiry, CVV 408.</p>
                        </div>
                      )}

                      {message && (
                        <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12px] text-rose-700">
                          {message}
                        </p>
                      )}

                      <button ref={primaryRef} type="submit" disabled={busy} className={`${primaryButton} mt-5`}>
                        {phase === 'starting' ? (
                          <>
                            <Spinner className="h-3.5 w-3.5" tone="light" /> Opening secure checkout…
                          </>
                        ) : (
                          <>
                            <LockIcon className="h-3.5 w-3.5" /> Pay {price}
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={close}
                        disabled={busy}
                        className="mt-1.5 w-full rounded-xl px-5 py-2.5 text-[13px] font-semibold text-slate-500 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/10 disabled:opacity-50"
                      >
                        Not now
                      </button>
                    </form>
                  </>
                )
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-100 px-4 py-4 text-center text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <LockIcon className="h-3 w-3" /> Payments are processed and secured by Paystack
        </span>
      </footer>
    </div>
  );
}
