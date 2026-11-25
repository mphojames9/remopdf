import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPaymentStatus } from '../../api/payments';
import { LIST_PLANS, PLAN_COPY, bestValueId, dayWord } from '../Payment/planCopy';

/* -------------------------------------------------------------------------- */
/*  Pricing modal (home page)                                                 */
/*                                                                            */
/*  One compact picker: Free, or Premium for 7, 14 or 30 days. Pick one, see  */
/*  what it gives, press one button. On a phone it is a bottom sheet with the */
/*  four choices in a single row and the button pinned at the bottom; from md */
/*  up it is a centred dialog with the choices on the left and the detail on  */
/*  the right.                                                                */
/*                                                                            */
/*  Every length of Premium gives the same thing: only the number of days and */
/*  the price differ. Premium is paid once and never renews on its own.       */
/*  The words come from Payment/planCopy.js, so this and the checkout never   */
/*  disagree. It only explains and routes: choosing a length hands over to    */
/*  the parent, which signs the person in if needed and opens the Paystack    */
/*  checkout.                                                                 */
/*                                                                            */
/*  Prices: when the person is signed in they come from the server            */
/*  (GET /api/payments/status), exactly what checkout charges. A signed-out   */
/*  visitor cannot ask the server, so LIST_PLANS in Payment/planCopy.js is    */
/*  shown instead. Keep it equal to PLAN_DEFS in server/lib/plans.js (and to  */
/*  any PLAN_*_AMOUNT you set in server/.env).                                */
/*                                                                            */
/*  Props                                                                     */
/*    open       boolean                                                      */
/*    user       the signed-in person, or null                                */
/*    onClose    () => void                                                   */
/*    onChoose   (planId: '7d' | '14d' | '30d') => void                       */
/* -------------------------------------------------------------------------- */

const FIRST_PICK = '30d'; // what is selected when the modal opens
const DEFAULT_MAX_BANKED = 90; // the server tells the real number in /status

// Same rule as PaymentModal: 3900 becomes R39.
const formatPrice = (amount, currency) => {
  const value = Number(amount) / 100;
  if (currency === 'ZAR') return `R${Number.isInteger(value) ? value : value.toFixed(2)}`;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : '';
};

const ICONS = {
  check: ['m5 12.5 4.5 4.5L19 7.5'],
  close: ['M6 6l12 12M18 6 6 18'],
  dash: ['M6 12h12'],
  shield: ['M12 3.5 5 6v5.2c0 4.4 2.9 7.5 7 9.3 4.1-1.8 7-4.9 7-9.3V6l-7-2.5Z', 'm9.2 12.3 1.9 1.9 3.7-3.9'],
};

function Icon({ name, className = 'h-4 w-4', strokeWidth = 1.8 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e1726]';

export default function PricingModal({ open, user, onClose, onChoose }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const groupRef = useRef(null);
  const [selected, setSelected] = useState(FIRST_PICK); // 'free' | '7d' | '14d' | '30d'
  const [status, setStatus] = useState(null); // the answer of /api/payments/status, once a signed-in person is known
  const signedIn = Boolean(user);

  // Every opening starts fresh on the longest length, the best value.
  useEffect(() => {
    if (!open) return;
    setSelected(FIRST_PICK);
  }, [open]);

  // Signed in: ask the server what the account has and what Premium costs. Signed out, or if the server cannot be
  // reached, the list prices stay and the button still leads to sign-in or checkout, which check again.
  useEffect(() => {
    if (!open) return undefined;
    if (!signedIn) {
      setStatus(null);
      return undefined;
    }
    let cancelled = false;
    getPaymentStatus()
      .then((answer) => {
        if (!cancelled) setStatus(answer);
      })
      .catch(() => {
        /* keep the list prices */
      });
    return () => {
      cancelled = true;
    };
  }, [open, signedIn]);

  // Focus and scrolling: focus moves in and returns to what opened the modal; the page behind stays put.
  // Both <html> and <body> are locked because the Navbar's mobile menu also resets body's overflow.
  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const html = document.documentElement;
    const before = { html: html.style.overflow, body: document.body.style.overflow };
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      html.style.overflow = before.html;
      document.body.style.overflow = before.body;
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  const live = Array.isArray(status?.plans) && status.plans.length > 0 ? status.plans : LIST_PLANS;
  const currency = live[0]?.currency || 'ZAR';
  const bestId = bestValueId(live);
  const known = signedIn && Boolean(status);
  const hasPremium = known && Boolean(status.premium);
  const daysLeft = hasPremium ? Math.max(0, Number(status.daysLeft) || 0) : 0;
  const maxBanked = Number(status?.maxBankedDays) || DEFAULT_MAX_BANKED;
  const endsOn = hasPremium ? formatDate(status.expiresAt) : '';

  const options = ['free', ...live.map((p) => p.id)];
  const rank = (id) => options.indexOf(id);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !panelRef.current) return;
    const items = [...panelRef.current.querySelectorAll('a[href], button:not([disabled]):not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // Arrow keys move through the choices like a radio group.
  const onPlanKeyDown = (event) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = options[(rank(selected) + step + options.length) % options.length];
    setSelected(next);
    groupRef.current?.querySelector(`[data-plan="${next}"]`)?.focus();
  };

  const isFree = selected === 'free';
  const plan = isFree ? null : live.find((p) => p.id === selected) || live[live.length - 1];
  const copy = isFree ? PLAN_COPY.free : PLAN_COPY.premium;
  const priceText = formatPrice(isFree ? 0 : plan.amount, currency);
  // The meter line below says "60 AI actions a day", so the list skips that one.
  const features = copy.features.filter((feature) => !/AI actions a day/i.test(feature));
  const tooMany = Boolean(plan) && hasPremium && daysLeft + plan.days > maxBanked;

  const buttonBase = 'inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-[0.9375rem] font-medium leading-tight transition-colors sm:w-auto sm:min-w-[13rem]';
  let action;
  if (isFree) {
    action = (
      <Link to="/ResumeBuilder" onClick={onClose} className={`${buttonBase} bg-[#0e1726] text-white hover:bg-[#1b2a42] ${FOCUS}`}>
        {signedIn ? 'Open the resume builder' : 'Start for free'}
      </Link>
    );
  } else if (tooMany) {
    action = (
      <button type="button" disabled className={`${buttonBase} cursor-default bg-[#0e1726]/[0.06] text-slate-500`}>
        You already have {dayWord(daysLeft)}
      </button>
    );
  } else {
    action = (
      <button type="button" onClick={() => onChoose(plan.id)} className={`${buttonBase} bg-[#d9856b] text-[#0e1726] hover:bg-[#e29a83] ${FOCUS}`}>
        {hasPremium ? `Add ${dayWord(plan.days)} of Premium` : `Get Premium for ${dayWord(plan.days)}`}
      </button>
    );
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="pricing-title" onKeyDown={onKeyDown} className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes pm-fade { from { opacity: 0; } }
          @keyframes pm-pop { from { opacity: 0; transform: translateY(32px); } }
          @keyframes pm-swap { from { opacity: 0; transform: translateY(6px); } }
          .pm-backdrop { animation: pm-fade .2s ease-out both; }
          .pm-panel { animation: pm-pop .35s cubic-bezier(.16,1,.3,1) both; }
          .pm-swap { animation: pm-swap .25s ease-out both; }
        }
      `}</style>

      <div aria-hidden="true" onClick={onClose} className="pm-backdrop absolute inset-0 bg-[#0e1726]/[0.55]" />

      <div
        ref={panelRef}
        className="pm-panel relative flex h-full w-full flex-col overflow-hidden rounded-none bg-white sm:h-auto sm:max-h-[90dvh] sm:max-w-[50rem] sm:rounded-3xl sm:shadow-[0_30px_90px_-24px_rgba(14,23,38,0.55)]"
      >
        {/* Header: solid, always visible, never overlapping the content. */}
        <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
          <div>
            <h2 id="pricing-title" className="font-display text-xl font-light tracking-tight sm:text-2xl">
              Choose your plan
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {hasPremium
                ? `You have Premium${endsOn ? ` until ${endsOn}` : ''} (${dayWord(daysLeft)} left). Paying again adds days after these.`
                : 'Premium is paid once for 7, 14 or 30 days. Nothing renews on its own.'}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close pricing"
            className={`-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0e1726]/[0.06] text-[#0e1726] transition-colors hover:bg-[#0e1726]/[0.12] ${FOCUS}`}
          >
            <Icon name="close" className="h-[1.05rem] w-[1.05rem]" strokeWidth={2} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-5 pt-4 sm:px-6 md:grid md:grid-cols-[16rem_minmax(0,1fr)] md:items-stretch md:gap-5">
          {/* The choices: one row of four tiles on a phone, a list on larger screens. */}
          <div ref={groupRef} role="radiogroup" aria-label="Plans" onKeyDown={onPlanKeyDown} className="grid shrink-0 grid-cols-4 gap-2 md:grid-cols-1">
            {options.map((id) => {
              const entry = id === 'free' ? null : live.find((p) => p.id === id);
              const isSelected = id === selected;
              const marker = id === 'free' ? (known && !hasPremium ? 'Your plan' : null) : id === bestId ? 'Best value' : null;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  data-plan={id}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setSelected(id)}
                  className={`relative flex flex-col items-start rounded-xl px-3 py-2.5 text-left transition-colors md:flex-row md:items-center md:justify-between md:gap-3 md:px-4 md:py-3 ${FOCUS} ${
                    isSelected ? 'bg-[#0e1726]/[0.04] ring-2 ring-[#0e1726]' : 'ring-1 ring-[#0e1726]/[0.14] hover:ring-[#0e1726]/[0.35]'
                  }`}
                >
                  {marker && (
                    <span
                      className={`pointer-events-none absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-[3px] text-[10px] font-medium leading-none ring-2 ring-white sm:px-2 sm:text-[11px] md:left-auto md:right-3 md:translate-x-0 ${
                        id === 'free' ? 'bg-[#f3dbd1] text-[#0e1726]' : 'bg-[#d9856b] text-[#0e1726]'
                      }`}
                    >
                      {marker}
                    </span>
                  )}
                  <span className="flex items-center gap-3">
                    <span aria-hidden="true" className={`hidden h-4 w-4 shrink-0 place-items-center rounded-full border-2 md:grid ${isSelected ? 'border-[#0e1726]' : 'border-[#0e1726]/[0.3]'}`}>
                      {isSelected && <span className="h-2 w-2 rounded-full bg-[#d9856b]" />}
                    </span>
                    <span>
                      <span className="block font-display text-[0.95rem] font-medium leading-tight">{id === 'free' ? 'Free' : dayWord(entry.days)}</span>
                      <span className="hidden text-xs text-slate-500 md:block">{id === 'free' ? 'Build and download' : 'Premium'}</span>
                    </span>
                  </span>
                  <span className="mt-0.5 font-display text-sm font-normal tracking-tight text-slate-600 md:mt-0 md:text-base md:text-[#0e1726]">
                    {formatPrice(entry ? entry.amount : 0, currency)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* What the selected choice gives. */}
          <section aria-live="polite" className="mt-4 rounded-2xl bg-[#0e1726] p-5 text-white md:mt-0 md:p-6">
            <div key={selected} className="pm-swap">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-2xl font-light leading-none tracking-tight">{copy.name}</h3>
                  <p className="mt-1.5 text-sm text-slate-300">{copy.quality}</p>
                </div>
                <p className="text-right">
                  <span className="font-display text-3xl font-light leading-none tracking-[-0.03em]">{priceText}</span>
                  <span className="mt-1 block text-xs text-slate-300">{isFree ? 'no payment needed' : `once, for ${dayWord(plan.days)}`}</span>
                </p>
              </div>

              {!isFree && <p className="mt-5 text-sm font-medium">{copy.aiPerDay} AI actions a day</p>}

              <ul className="mt-5 space-y-2.5">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm leading-snug text-slate-200">
                    <Icon name="check" strokeWidth={2.2} className="mt-0.5 h-4 w-4 shrink-0 text-[#d9856b]" />
                    <span>{feature}</span>
                  </li>
                ))}
                {isFree &&
                  copy.notIncluded.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm leading-snug text-slate-400">
                      <Icon name="dash" strokeWidth={2.2} className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                      <span>No {feature.charAt(0).toLowerCase() + feature.slice(1)}</span>
                    </li>
                  ))}
              </ul>

              {!isFree && <p className="mt-5 text-xs leading-snug text-slate-300">Every length gives you all of this. Paid once, so there is nothing to cancel.</p>}
            </div>
          </section>
        </div>

        {/* The one button, pinned. */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-[#0e1726]/[0.08] bg-white px-5 pt-3 sm:flex-row-reverse sm:items-center sm:justify-between sm:gap-4 sm:px-6" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          {action}
          <p className="flex items-center justify-center gap-1.5 text-xs leading-snug text-slate-500 sm:justify-start">
            <Icon name="shield" className="h-3.5 w-3.5 shrink-0" />
            <span>Card details go to Paystack, never to RemoPDF.{currency === 'ZAR' ? '' : ` Prices are in ${currency}.`}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
