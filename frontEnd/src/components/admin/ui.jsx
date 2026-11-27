import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/*
  Small pieces shared by every screen of the admin panel (pages/Admin.jsx and the files next to this one):
  formatting helpers, button and field styles, badges, avatars, alerts, toasts, confirmation windows and loading placeholders.
  The look follows the rest of RemoPDF: black, white, orange and red, thin headings, borders instead of shadows.
*/

export const FONT = { fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif" };
export const DAY_MS = 24 * 60 * 60 * 1000;

/* ------------------------------ formatting ------------------------------ */

export const fullName = (u) => [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
export const initialOf = (u) => (u.firstName || u.email || '?').trim().charAt(0).toUpperCase();
export const number = (value) => Number(value || 0).toLocaleString('en-ZA');
export const authLost = (err) => err?.status === 401 || err?.status === 403;

export const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never';

// Short enough for a small tile: "27 Nov", or "27 Nov 2025" when it is not this year.
export const fmtDateShort = (value) => {
  if (!value) return 'Never';
  const date = new Date(value);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en-ZA', sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Never';

// "Today", "Yesterday", "5 days ago", then the date once it is more than a month old.
export const ago = (value) => {
  if (!value) return 'Never';
  const days = Math.floor((Date.now() - new Date(value).getTime()) / DAY_MS);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return fmtDate(value);
};

export const money = (amount, currency) => {
  const value = (Number(amount) || 0) / 100; // the server stores the smallest unit (cents)
  try {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: currency || 'ZAR' }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency || ''}`.trim();
  }
};

const PLAN_NAMES = { '7d': '7 days', '14d': '14 days', '30d': '30 days' };
export const planLabel = (plan) => PLAN_NAMES[plan] || (plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Premium');

/* ------------------------------ styles ------------------------------ */

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';
export const buttonDark = `${buttonBase} border-neutral-900 bg-neutral-900 text-white hover:bg-black`;
export const buttonLight = `${buttonBase} border-neutral-300 bg-white text-neutral-800 hover:border-neutral-900`;
export const buttonDanger = `${buttonBase} border-red-300 bg-white text-red-600 hover:border-red-600 hover:bg-red-50`;
export const buttonDangerSolid = `${buttonBase} border-red-600 bg-red-600 text-white hover:bg-red-700`;
export const inputClass =
  'w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900';
export const fieldLabel = 'mb-1.5 block text-xs font-medium text-neutral-700';

// The few animations the panel uses. Switched off for people who ask their device for less motion.
const CSS = `
@keyframes adm-fade{from{opacity:0}to{opacity:1}}
@keyframes adm-pop{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
@keyframes adm-slide{from{transform:translateX(100%)}to{transform:none}}
@keyframes adm-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.adm-fade{animation:adm-fade .18s ease-out both}
.adm-pop{animation:adm-pop .22s cubic-bezier(.2,.8,.2,1) both}
.adm-slide{animation:adm-slide .3s cubic-bezier(.2,.8,.2,1) both}
.adm-rise{animation:adm-rise .4s cubic-bezier(.2,.8,.2,1) both}
@media (prefers-reduced-motion:reduce){.adm-fade,.adm-pop,.adm-slide,.adm-rise{animation:none}}
`;
export const AdminStyles = () => <style>{CSS}</style>;

/* ------------------------------ badges and avatars ------------------------------ */

const TONES = {
  gray: 'border-neutral-200 bg-white text-neutral-600',
  black: 'border-neutral-900 bg-neutral-900 text-white',
  orange: 'border-orange-300 bg-orange-50 text-orange-700',
  red: 'border-red-300 bg-red-50 text-red-700',
};

export const Badge = ({ tone = 'gray', children }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONES[tone]}`}>{children}</span>
);

export const UserBadges = ({ user }) => (
  <>
    {user.role === 'admin' && (
      <Badge tone="black">
        <i className="fa-solid fa-user-shield text-[9px]" aria-hidden="true"></i>Admin
      </Badge>
    )}
    {user.disabled && (
      <Badge tone="red">
        <i className="fa-solid fa-ban text-[9px]" aria-hidden="true"></i>Suspended
      </Badge>
    )}
  </>
);

export const PlanBadge = ({ user }) =>
  user.premium ? (
    <Badge tone="orange">
      <i className="fa-solid fa-crown text-[9px]" aria-hidden="true"></i>Premium · {user.daysLeft}d
    </Badge>
  ) : (
    <Badge>Free</Badge>
  );

// Each person gets one of four looks, always the same one, so a list is easier to scan.
const AVATAR_TONES = [
  'border-neutral-900 bg-neutral-900 text-white',
  'border-orange-200 bg-orange-100 text-orange-700',
  'border-red-200 bg-red-50 text-red-600',
  'border-neutral-200 bg-neutral-100 text-neutral-700',
];
const hashOf = (text) => {
  let hash = 0;
  for (const char of String(text)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
};
const AVATAR_SIZES = { sm: 'h-9 w-9 text-sm', md: 'h-11 w-11 text-base', lg: 'h-16 w-16 text-2xl' };

export const Avatar = ({ user, size = 'sm' }) => (
  <span className={`grid shrink-0 place-items-center rounded-full border font-medium ${AVATAR_TONES[hashOf(user.email) % AVATAR_TONES.length]} ${AVATAR_SIZES[size]}`}>
    {initialOf(user)}
  </span>
);

/* ------------------------------ placeholders ------------------------------ */

export const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded-lg bg-neutral-200/70 ${className}`} aria-hidden="true" />;

export function EmptyState({ icon = 'fa-inbox', title, children, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-neutral-200 bg-neutral-50 text-xl text-neutral-400">
        <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
      </span>
      <p className="text-base font-medium text-neutral-900">{title}</p>
      {children && <p className="mt-1 max-w-xs text-sm text-neutral-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------ alerts ------------------------------ */

// A message inside the page: "error" for something that went wrong, "warning" for something to read twice, "info" for a hint.
export function Alert({ tone = 'error', className = '', children }) {
  const style = {
    error: 'border-red-200 bg-red-50 text-red-700',
    warning: 'border-orange-200 bg-orange-50 text-orange-800',
    info: 'border-neutral-200 bg-neutral-50 text-neutral-700',
  }[tone];
  const icon = { error: 'fa-circle-exclamation', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'note'} className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed ${style} ${className}`}>
      <i className={`fa-solid ${icon} mt-0.5 shrink-0`} aria-hidden="true"></i>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// The little message at the bottom of the screen after something was done (or failed).
export function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.tone === 'error';
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex justify-center px-4 lg:bottom-6" style={FONT}>
      <div
        role={isError ? 'alert' : 'status'}
        className={`adm-rise pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 text-sm text-white ${
          isError ? 'border-red-600 bg-red-600' : 'border-neutral-900 bg-neutral-900'
        }`}
      >
        <i className={`fa-solid ${isError ? 'fa-circle-exclamation' : 'fa-circle-check text-orange-400'} mt-0.5 shrink-0`} aria-hidden="true"></i>
        <p className="min-w-0 flex-1 leading-relaxed">{toast.message}</p>
        <button type="button" onClick={onClose} aria-label="Dismiss" className="shrink-0 text-white/70 transition-colors hover:text-white">
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------ confirmation windows ------------------------------ */

const ICON_TONES = {
  dark: 'border-neutral-900 bg-neutral-900 text-white',
  red: 'border-red-200 bg-red-50 text-red-600',
  orange: 'border-orange-200 bg-orange-50 text-orange-600',
};

/*
  A real confirmation window, used instead of the browser's own confirm() pop-up. It sits over the page, takes focus,
  closes on Escape or a click outside (not while it is working), and Enter confirms. Put anything it needs to ask for
  (a reason, an access code) inside it as children; give the field that should be focused first a data-autofocus attribute.
*/
export function Dialog({ title, icon = 'fa-circle-question', iconTone = 'dark', confirmLabel, busyLabel = 'Working…', confirmClass = buttonDark, busy = false, disabled = false, error = '', onConfirm, onCancel, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const panel = panelRef.current;
    (panel?.querySelector('[data-autofocus]') || panel?.querySelector('[data-cancel]'))?.focus();
    return () => previous?.focus?.();
  }, []);

  // Escape closes this window only. It is caught first (capture) so the account panel behind it stays open.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      if (!busy) onCancel();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [busy, onCancel]);

  return createPortal(
    <div
      className="adm-fade fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <form
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled && !busy) onConfirm();
        }}
        className="adm-pop max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-6"
        style={FONT}
      >
        <div className="flex items-center gap-4">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border text-base ${ICON_TONES[iconTone]}`}>
            <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
          </span>
          <h2 className="min-w-0 text-xl font-light tracking-tight text-neutral-900">{title}</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-600">{children}</div>
        {error && <Alert className="mt-4">{error}</Alert>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" data-cancel className={buttonLight} disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className={confirmClass} disabled={disabled || busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

// A Dialog whose confirm button runs an async action: it shows "working", and keeps the window open with the error if it fails.
export function ConfirmDialog({ onConfirm, onCancel, children, ...props }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const go = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm(); // the caller closes the window when it succeeds
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  return (
    <Dialog {...props} busy={busy} error={error} onConfirm={go} onCancel={onCancel}>
      {children}
    </Dialog>
  );
}
