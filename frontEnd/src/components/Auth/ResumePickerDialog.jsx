import React, { useEffect, useRef, useState } from 'react';
import logo from '../../assets/logo.webp';
import logoMobile from '../../assets/logo1.webp';

/**
 * One full-screen page to pick and manage saved resumes. Shown after someone signs in. Every resume is a card
 * whose thumbnail is the real resume drawn with its own template. Hover (or tap, on a phone) a card to rename,
 * copy or delete it.
 *
 * Props
 *  - open:           whether the dialog is shown
 *  - resumes:        the account's resumes, [{ id, title, name, profession, template, updatedAt }]. The list never
 *                    carries the resumes themselves, so each thumbnail's data comes from `loadPayload`.
 *  - activeId:       id of the resume that is open in the builder right now
 *  - activePayload:  the open resume's live payload (so its thumbnail always matches what is on screen)
 *  - limit:          most resumes an account may hold (New resume and Duplicate are disabled once reached)
 *  - userName:       first name for the greeting (optional)
 *  - premium:        whether the account has an active Premium payment (shows the Premium card)
 *  - daysLeft:       days of Premium left, shown in the Premium card (optional)
 *  - onUpgrade:      (optional) () => void, opens the upgrade dialog. A free account that has reached its limit
 *                    gets an "Upgrade to Premium" badge on the New resume tile that calls it.
 *  - renderPreview:  (payload, id) => node, draws the resume with its template
 *  - loadPayload:    async (id, resume) => payload, fetches one saved resume for its thumbnail. It is called when the
 *                    card scrolls into view, at most three at a time. (The open resume uses `activePayload`.)
 *  - onSelect:       async (id) => { ok }, opens that resume
 *  - onCreate:       async () => { ok }, starts a blank resume
 *  - onRename:       (optional) async (id, title) => { ok }
 *  - onDuplicate:    (optional) async (id) => { ok }
 *  - onDelete:       (optional) async (id) => { ok }
 *  - onClose:        () => void
 * Rename, Copy and Delete are on every resume. One whose handler is not passed is disabled.
 */

const A4_RATIO = 'aspect-[210/297]';
const FALLBACK_ERROR = 'That didn’t work. Please try again.';
const TITLE_MAX = 60;
const MAX_PARALLEL = 3;
const GUTTER = 'pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:px-10';

const BUSY_LABEL = {
  open: 'Opening',
  duplicate: 'Duplicating',
  delete: 'Deleting',
  new: 'Creating',
};

const PICKER_CSS = `
  @keyframes rp-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rp-pop { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  @keyframes rp-in { from { opacity: 0; transform: translateY(18px) scale(.975); } to { opacity: 1; transform: none; } }
  @keyframes rp-drift { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(28px, -20px, 0); } }
  @keyframes rp-sheen { from { background-position: 160% 0; } to { background-position: -60% 0; } }
  @keyframes rp-toast { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }

  .rp-overlay { animation: rp-fade .25s ease-out; }
  .rp-panel { animation: rp-pop .45s cubic-bezier(.22, 1, .36, 1); }
  .rp-in { animation: rp-in .6s cubic-bezier(.22, 1, .36, 1) both; animation-delay: calc(var(--i, 0) * 60ms + 120ms); }
  .rp-blob { animation: rp-drift 18s ease-in-out infinite; }
  .rp-toast { animation: rp-toast .35s cubic-bezier(.22, 1, .36, 1) both; }
  .rp-shimmer {
    background-image: linear-gradient(100deg, transparent 25%, rgba(255, 255, 255, .75) 50%, transparent 75%);
    background-size: 220% 100%;
    animation: rp-sheen 1.7s linear infinite;
  }

  /* The sheet of paper: a hairline edge and a soft shadow that deepens on hover. */
  .rp-lift { transition: transform .4s cubic-bezier(.22, 1, .36, 1); }
  .rp-paper {
    box-shadow: 0 0 0 1px rgba(15, 23, 42, .07), 0 1px 2px rgba(15, 23, 42, .06), 0 10px 28px -14px rgba(15, 23, 42, .28);
    transition: box-shadow .4s ease;
  }
  .rp-paper:focus-visible { outline: 2px solid #d9856b; outline-offset: 3px; }
  .rp-paper-active {
    box-shadow: 0 0 0 2px #d9856b, 0 2px 4px rgba(217, 133, 107, .18), 0 22px 44px -18px rgba(217, 133, 107, .65);
  }

  /* Hover layer on a thumbnail: a soft dark veil and the Open button. */
  .rp-veil { opacity: 0; transition: opacity .3s ease; }
  .rp-open-pill { opacity: 0; transform: translateY(8px); transition: opacity .25s ease, transform .35s cubic-bezier(.22, 1, .36, 1); }
  .rp-thumb:focus-visible .rp-veil, .rp-thumb:focus-visible .rp-open-pill { opacity: 1; transform: none; }

  /* Rename / Copy / Delete: always there on touch screens, revealed on hover or focus with a mouse. */
  .rp-actions { opacity: 1; }
  @media (hover: hover) {
    .rp-actions { opacity: 0; transform: translateY(-6px); transition: opacity .2s ease, transform .35s cubic-bezier(.22, 1, .36, 1); }
    .rp-group:hover .rp-actions, .rp-group:focus-within .rp-actions { opacity: 1; transform: none; }
    .rp-group:hover .rp-veil, .rp-group:hover .rp-open-pill { opacity: 1; transform: none; }
    .rp-group:hover .rp-paper { box-shadow: 0 0 0 1px rgba(217, 133, 107, .45), 0 2px 4px rgba(15, 23, 42, .06), 0 28px 50px -20px rgba(15, 23, 42, .4); }
    .rp-group:hover .rp-paper-active { box-shadow: 0 0 0 2px #d9856b, 0 2px 4px rgba(217, 133, 107, .2), 0 30px 56px -18px rgba(217, 133, 107, .8); }
  }
  @media (hover: hover) and (prefers-reduced-motion: no-preference) { .rp-group:hover .rp-lift { transform: translateY(-6px); } }
  @media (prefers-reduced-motion: reduce) {
    .rp-overlay, .rp-panel, .rp-in, .rp-blob, .rp-toast, .rp-shimmer { animation: none; }
  }
`;

const Svg = ({ children, className = 'h-5 w-5', strokeWidth = 2 }) => (
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

const IconPlus = ({ className, strokeWidth }) => (
  <Svg className={className} strokeWidth={strokeWidth}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);

const IconPencil = ({ className }) => (
  <Svg className={className}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Svg>
);

const IconCopy = ({ className }) => (
  <Svg className={className}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </Svg>
);

const IconTrash = ({ className }) => (
  <Svg className={className}>
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </Svg>
);

const IconDocument = ({ className }) => (
  <Svg className={className} strokeWidth={1.5}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="13" y2="17" />
  </Svg>
);

const IconArrow = ({ className }) => (
  <Svg className={className} strokeWidth={2.25}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="13 6 19 12 13 18" />
  </Svg>
);

const IconAlert = ({ className }) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="12.5" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </Svg>
);

const Spinner = ({ className = 'h-5 w-5' }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const SparkIcon = ({ className = 'h-3.5 w-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
  </svg>
);

// The RemoPDF logo on a transparent background: logo.webp from md up, logo1.webp on phones (same as the sign-in modal).
const BrandLogo = () => (
  <picture>
    <source media="(min-width: 768px)" srcSet={logo} />
    <img src={logoMobile} alt="RemoPDF" draggable={false} className="h-7 w-auto max-w-[9rem] select-none object-contain md:h-8" />
  </picture>
);

const DAY_MS = 24 * 60 * 60 * 1000;

// "Edited just now", "Edited 3 hours ago", "Edited yesterday", "Edited 4 days ago", then the date.
const formatUpdated = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return '';
  const diff = Date.now() - ms;
  if (diff < 60 * 1000) return 'Edited just now';
  if (diff < 60 * 60 * 1000) return `Edited ${Math.floor(diff / 60000)} min ago`;
  if (diff < DAY_MS) {
    const hours = Math.floor(diff / 3600000);
    return `Edited ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(date)) / DAY_MS);
  if (days === 1) return 'Edited yesterday';
  if (days > 1 && days < 7) return `Edited ${days} days ago`;
  return `Edited ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

// The exact date, for the tooltip on the "Edited …" line.
const formatExact = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return `Updated ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

// True once the element has been on screen (or close to it). A thumbnail is a whole template, so a long
// list only draws the ones that are scrolled into view instead of all of them at once.
const useSeen = () => {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (seen) return undefined;
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [seen]);
  return [ref, seen];
};

const onActivate = (handler) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handler();
  }
};

/* ------------------------------------------------------------------ top of the page: the numbers */

// Two small, flat chips: the Premium plan (with the days left) and how many of the allowed resumes are used.
const HeroStats = ({ count, limit, premium, daysLeft }) => {
  const hasLimit = Number.isFinite(limit) && limit > 0;
  const used = hasLimit ? Math.min(count, limit) : count;
  return (
    <div className="rp-in flex flex-wrap items-center gap-2" style={{ '--i': 2 }}>
      {premium && (
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#d9856b]/10 px-3 text-[12.5px] font-medium text-[#a64a30] ring-1 ring-[#d9856b]/25">
          <SparkIcon className="h-3 w-3 text-[#d9856b]" />
          Premium
          {daysLeft > 0 && (
            <span className="font-normal text-[#a64a30]/75">
              · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
            </span>
          )}
        </span>
      )}
      <span className="inline-flex h-8 items-center gap-2.5 rounded-full bg-white/70 px-3 text-[12.5px] text-slate-600 ring-1 ring-slate-200">
        <span>
          <span className="font-medium tabular-nums text-slate-900">{count}</span>
          {hasLimit && <> of {limit}</>} {count === 1 ? 'resume' : 'resumes'}
        </span>
        {hasLimit && (
          <span
            className="hidden h-1 w-12 overflow-hidden rounded-full bg-slate-200 sm:block"
            role="progressbar"
            aria-label="Resumes used"
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-valuenow={used}
          >
            <span className="block h-full rounded-full bg-gradient-to-r from-[#e8a38c] to-[#d9856b] transition-[width] duration-700" style={{ width: `${(used / limit) * 100}%` }} />
          </span>
        )}
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ cards */

// One round icon button in the Rename | Copy | Delete cluster on a resume. `label` / `hint` are the tooltip and
// the screen-reader name, since the button itself shows only the icon.
const ActionButton = ({ label, hint, onClick, disabled, danger, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={hint || label}
    title={hint || label}
    className={`grid h-9 w-9 place-items-center rounded-lg text-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/70 disabled:cursor-not-allowed disabled:opacity-35 md:h-8 md:w-8 ${
      danger ? 'hover:bg-red-50 hover:text-red-600 active:bg-red-100' : 'hover:bg-slate-900/5 hover:text-slate-900 active:bg-slate-900/10'
    }`}
  >
    {children}
  </button>
);

// A resume-shaped skeleton while the thumbnail loads, a quiet message if it cannot.
const ThumbPlaceholder = ({ status }) => {
  if (status === 'loading') {
    return (
      <div className={`relative ${A4_RATIO} w-full overflow-hidden bg-slate-50`} aria-busy="true">
        <div className="absolute inset-0 flex flex-col gap-3 p-[9%]">
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 shrink-0 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <span className="block h-2.5 w-3/4 rounded bg-slate-200" />
              <span className="block h-2 w-1/2 rounded bg-slate-200/70" />
            </div>
          </div>
          <span className="mt-1 block h-px bg-slate-200" />
          {['w-full', 'w-11/12', 'w-4/5', 'w-full', 'w-2/3', 'w-5/6', 'w-3/4'].map((width, i) => (
            <span key={i} className={`block h-1.5 rounded bg-slate-200/80 ${width}`} />
          ))}
        </div>
        <div className="rp-shimmer absolute inset-0" />
      </div>
    );
  }
  return (
    <div className={`flex ${A4_RATIO} w-full flex-col items-center justify-center gap-2 bg-slate-50 px-3 text-center text-slate-400`}>
      <IconDocument className="h-7 w-7" />
      <span className="text-[11.5px] font-medium">{status === 'error' ? 'Couldn’t load preview' : 'Preview unavailable'}</span>
    </div>
  );
};

// The resume's name turns into a field while it is being renamed: Enter or leaving the field saves, Escape cancels.
const TitleEditor = ({ initial, busy, onCommit, onCancel }) => {
  const [draft, setDraft] = useState(initial);
  const inputRef = useRef(null);
  const finished = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    if (finished.current) return;
    finished.current = true;
    const next = draft.trim();
    if (!next || next === initial) onCancel();
    else onCommit(next);
  };

  return (
    <input
      ref={inputRef}
      value={draft}
      maxLength={TITLE_MAX}
      disabled={busy}
      aria-label="Resume name"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          finished.current = true;
          onCancel();
        }
      }}
      className="w-full rounded-lg border border-[#d9856b]/60 bg-white px-2.5 py-1.5 text-[16px] font-medium text-slate-900 shadow-[0_0_0_4px_rgba(217,133,107,0.12)] outline-none transition-colors focus:border-[#d9856b] disabled:opacity-60 md:py-1 md:text-[13.5px]"
    />
  );
};

const ResumeCard = ({
  index, resume, payload, status, active, busyKind, locked, confirming, renaming, atLimit,
  renderPreview, onNeedPayload, onOpen, onRename, onDuplicate, onDelete,
  onStartRename, onCommitRename, onCancelRename, onAskDelete, onCancelDelete, onConfirmDelete,
}) => {
  const [ref, seen] = useSeen();
  useEffect(() => {
    if (seen && !payload) onNeedPayload(resume);
  }, [seen, Boolean(payload)]); // eslint-disable-line react-hooks/exhaustive-deps
  const title = resume.title || 'Untitled resume';
  const stamp = resume.updatedAt || resume.updated_at;
  const updated = formatUpdated(stamp);
  const interactive = !locked && !confirming && !renaming;
  const open = () => {
    if (interactive) onOpen(resume.id);
  };

  return (
    <div className={`rp-in rp-group group relative transition-opacity ${locked && !busyKind ? 'opacity-50' : ''}`} style={{ '--i': index + 2 }}>
      <div className="rp-lift relative">
        <div
          ref={ref}
          role="button"
          tabIndex={interactive ? 0 : -1}
          aria-disabled={!interactive || undefined}
          aria-label={`Open ${title}`}
          onClick={open}
          onKeyDown={onActivate(open)}
          className={`rp-thumb rp-paper ${active ? 'rp-paper-active' : ''} relative block overflow-hidden rounded-md ${
            seen && payload ? 'bg-white' : 'bg-slate-50'
          } ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
        >
          {seen && payload ? (
            <div className="pointer-events-none select-none" aria-hidden="true">
              {renderPreview(payload, resume.id)}
            </div>
          ) : (
            <ThumbPlaceholder status={seen ? status : 'loading'} />
          )}

          {interactive && (
            <>
              <span aria-hidden="true" className="rp-veil pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/5 to-transparent" />
              <span className="rp-open-pill pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white py-2 pl-4 pr-3.5 text-[12.5px] font-medium text-slate-900 shadow-[0_10px_28px_-10px_rgba(0,0,0,0.55)]">
                  {active ? 'Continue editing' : 'Open'}
                  <IconArrow className="h-3.5 w-3.5 text-[#d9856b]" />
                </span>
              </span>
            </>
          )}
        </div>

        {!confirming && (
          <div className="rp-actions absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-xl bg-white/90 p-1 shadow-sm ring-1 ring-slate-900/10 backdrop-blur-xl">
            <ActionButton
              label="Rename"
              hint={onRename ? 'Rename' : 'Rename is not connected'}
              onClick={() => onStartRename(resume.id)}
              disabled={!onRename || locked}
            >
              <IconPencil className="h-[17px] w-[17px]" />
            </ActionButton>
            <ActionButton
              label="Copy"
              hint={!onDuplicate ? 'Copy is not connected' : atLimit ? 'Resume limit reached' : 'Make a copy'}
              onClick={() => onDuplicate(resume.id)}
              disabled={!onDuplicate || locked || atLimit}
            >
              <IconCopy className="h-[17px] w-[17px]" />
            </ActionButton>
            <ActionButton
              label="Delete"
              hint={onDelete ? 'Delete' : 'Delete is not connected'}
              danger
              onClick={() => onAskDelete(resume.id)}
              disabled={!onDelete || locked || renaming}
            >
              <IconTrash className="h-[17px] w-[17px]" />
            </ActionButton>
          </div>
        )}

        {busyKind && BUSY_LABEL[busyKind] && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 rounded-md bg-white/85 text-slate-700 backdrop-blur-[3px]">
            <Spinner className="h-5 w-5 text-[#d9856b]" />
            <span className="text-[12px] font-medium text-slate-600">{BUSY_LABEL[busyKind]}…</span>
          </div>
        )}

        {confirming && busyKind !== 'delete' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-md bg-white/95 px-3 text-center ring-1 ring-red-200 backdrop-blur-md">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-100">
              <IconTrash className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-[13px] font-medium text-slate-900">Delete this resume?</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">It can’t be recovered.</p>
            </div>
            <div className="flex w-full flex-col gap-1.5">
              <button
                type="button"
                onClick={onConfirmDelete}
                className="rounded-lg bg-red-500 py-2 text-[12px] font-medium text-white shadow-[0_8px_18px_-8px_rgba(239,68,68,0.7)] transition-colors hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                Delete
              </button>
              <button
                type="button"
                autoFocus
                onClick={onCancelDelete}
                className="rounded-lg border border-slate-200 bg-white py-2 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60"
              >
                Keep it
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3.5 min-w-0 px-0.5">
        {renaming ? (
          <TitleEditor
            initial={resume.title || ''}
            busy={busyKind === 'rename'}
            onCommit={(next) => onCommitRename(resume.id, next)}
            onCancel={onCancelRename}
          />
        ) : (
          <div className="flex items-center gap-2">
            <p
              className="min-w-0 flex-1 truncate text-[14px] font-medium tracking-[-0.005em] text-slate-900"
              title={title}
              onDoubleClick={onRename && !locked && !confirming ? () => onStartRename(resume.id) : undefined}
            >
              {title}
            </p>
            {active && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#d9856b]/10 py-0.5 pl-1.5 pr-2 text-[10.5px] font-medium text-[#a64a30] ring-1 ring-[#d9856b]/25">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#d9856b] opacity-60 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#d9856b]" />
                </span>
                Active
              </span>
            )}
          </div>
        )}
        <p className="mt-0.5 truncate text-[12px] text-slate-500" title={formatExact(stamp)}>{updated || '\u00A0'}</p>
      </div>
    </div>
  );
};

const NewResumeCard = ({ index, busy, locked, atLimit, limit, premium, onCreate, onUpgrade }) => {
  // A free account that is full is pointed to Premium instead of just being refused.
  const upsell = atLimit && !premium && typeof onUpgrade === 'function';
  const disabled = locked || (atLimit && !upsell);
  const activate = () => {
    if (locked) return;
    if (upsell) onUpgrade();
    else if (!atLimit) onCreate();
  };
  return (
    <div className="rp-in" style={{ '--i': index + 2 }}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-label={upsell ? 'Upgrade to Premium to save more resumes' : 'Start a new resume'}
        onClick={activate}
        onKeyDown={onActivate(activate)}
        className={`group relative flex ${A4_RATIO} w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-md border-[1.5px] border-dashed border-[#d9856b]/40 bg-gradient-to-b from-white/80 to-[#d9856b]/[0.07] px-4 text-center transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 ${
          disabled
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:-translate-y-1.5 hover:border-[#d9856b]/80 hover:from-white hover:to-[#d9856b]/[0.14] motion-reduce:hover:translate-y-0'
        }`}
      >
        <span
          className={`grid h-14 w-14 place-items-center rounded-full bg-white text-[#d9856b] shadow-sm ring-1 ring-[#d9856b]/25 transition duration-500 ${
            disabled || upsell ? '' : 'group-hover:rotate-90 group-hover:bg-[#d9856b] group-hover:text-white group-hover:ring-[#d9856b]'
          }`}
        >
          {busy ? <Spinner className="h-5 w-5" /> : <IconPlus className="h-6 w-6" strokeWidth={1.75} />}
        </span>
        <span className="text-[14px] font-medium text-slate-900">New resume</span>
        {upsell ? (
          <>
            <span className="text-[12px] leading-snug text-slate-500">{limit ? `Free plan limit of ${limit} reached` : 'Free plan limit reached'}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d9856b]/10 px-3 py-1.5 text-[11.5px] font-medium text-[#a64a30] ring-1 ring-[#d9856b]/30 transition-colors group-hover:bg-[#d9856b]/20">
              <SparkIcon className="h-3 w-3 text-[#d9856b]" />
              Upgrade to Premium
            </span>
          </>
        ) : (
          <span className="text-[12px] leading-snug text-slate-500">
            {atLimit ? (limit ? `Limit of ${limit} reached` : 'Limit reached') : 'Start from a blank page'}
          </span>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ the page */

export default function ResumePickerDialog({
  open,
  resumes = [],
  activeId,
  activePayload,
  limit,
  userName,
  premium = false,
  daysLeft = 0,
  onUpgrade,
  renderPreview,
  loadPayload,
  onSelect,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
  onClose,
}) {
  // Payloads fetched for resumes that did not carry one: id -> payload, or 'error'.
  const [fetched, setFetched] = useState({});
  const [pending, setPending] = useState(null); // { id, kind } while an action is running
  const [error, setError] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [scrolled, setScrolled] = useState(false); // the top bar gains a glass background once the page scrolls
  const dialogRef = useRef(null);
  const requested = useRef(new Set());
  const queue = useRef([]);
  const running = useRef(0);
  const working = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (open && (!onRename || !onDuplicate || !onDelete)) {
      // eslint-disable-next-line no-console
      console.warn('ResumePickerDialog: pass onRename, onDuplicate and onDelete from ResumeBuilder to switch on Rename, Copy and Delete.');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) {
      setPending(null);
      setError('');
      setRenamingId(null);
      setConfirmId(null);
      setScrolled(false);
    } else {
      requested.current = new Set();
      queue.current = [];
      setFetched({});
    }
  }, [open]);

  // Escape backs out one step at a time: a delete confirmation first, then the dialog.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' || pending) return;
      if (confirmId) setConfirmId(null);
      else if (!renamingId) onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, pending, confirmId, renamingId, onClose]);

  // The page behind does not scroll while the dialog is open (matters on phones).
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Move focus into the dialog while it is open, and give it back afterwards.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [open]);

  if (!open) return null;

  // Each saved resume is fetched once, only when its card is on screen, and at most three at a time (a
  // resume can carry a photo of several MB). Failures are remembered so a card shows a message, not a spinner.
  const pump = () => {
    while (running.current < MAX_PARALLEL && queue.current.length > 0) {
      const next = queue.current.shift();
      running.current += 1;
      Promise.resolve()
        .then(() => loadPayload(next.id, next))
        .then((payload) => {
          if (alive.current) setFetched((prev) => ({ ...prev, [next.id]: payload || 'error' }));
        })
        .catch(() => {
          if (alive.current) setFetched((prev) => ({ ...prev, [next.id]: 'error' }));
        })
        .finally(() => {
          running.current -= 1;
          pump();
        });
    }
  };

  const requestPayload = (resume) => {
    if (typeof loadPayload !== 'function' || resume.id === activeId || requested.current.has(resume.id)) return;
    requested.current.add(resume.id);
    queue.current.push(resume);
    pump();
  };

  const payloadFor = (resume) => {
    if (resume.id === activeId && activePayload) return activePayload;
    const got = fetched[resume.id];
    return got && got !== 'error' ? got : null;
  };

  const statusFor = (resume) => {
    if (payloadFor(resume)) return 'ready';
    if (fetched[resume.id] === 'error') return 'error';
    return typeof loadPayload === 'function' ? 'loading' : 'unavailable';
  };

  // Runs one action at a time. Returns true when it worked.
  const run = async (id, kind, action, { closeOnOk = false } = {}) => {
    if (working.current) return false;
    working.current = true;
    setPending({ id, kind });
    setError('');
    try {
      const result = await action();
      if (result && result.ok === false) {
        if (alive.current) setError(result.message || result.error || FALLBACK_ERROR);
        return false;
      }
      if (closeOnOk) onClose?.();
      return true;
    } catch (err) {
      if (alive.current) setError((err && err.message) || FALLBACK_ERROR);
      return false;
    } finally {
      working.current = false;
      if (alive.current) setPending(null);
    }
  };

  const commitRename = async (id, title) => {
    await run(id, 'rename', () => onRename(id, title));
    if (alive.current) setRenamingId(null);
  };

  const confirmDelete = async (id) => {
    await run(id, 'delete', () => onDelete(id));
    if (alive.current) setConfirmId(null);
  };

  const atLimit = Number.isFinite(limit) && limit > 0 && resumes.length >= limit;
  const locked = pending !== null;
  const activeTitle = resumes.find((r) => r.id === activeId)?.title;
  const closeLabel = activeTitle ? 'Keep current resume' : 'Not now';
  const subtitle = resumes.length > 0 ? 'Pick up where you left off, or start something new.' : 'Start your first resume. It only takes a few minutes.';

  return (
    <div className="rp-overlay fixed inset-0 z-[70] bg-slate-50">
      <style>{PICKER_CSS}</style>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-picker-title"
        tabIndex={-1}
        className="rp-panel relative flex h-[100dvh] w-full flex-col overflow-hidden text-slate-900 focus:outline-none"
      >
        {/* Soft colour behind the page, and a hairline highlight along the top edge. */}
        <div aria-hidden="true" className="rp-blob pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-[#d9856b]/15 blur-3xl" />
        <div aria-hidden="true" className="rp-blob pointer-events-none absolute -bottom-40 -left-28 h-[26rem] w-[26rem] rounded-full bg-sky-200/50 blur-3xl" style={{ animationDelay: '-9s' }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#d9856b]/30 to-transparent" />

        <header
          className={`relative z-20 shrink-0 border-b pt-[env(safe-area-inset-top)] transition-[background-color,border-color,backdrop-filter] duration-300 ${
            scrolled ? 'border-slate-200/80 bg-white/75 backdrop-blur-xl' : 'border-transparent bg-transparent'
          }`}
        >
          <div className={`mx-auto flex h-14 w-full max-w-[96rem] items-center justify-between gap-4 ${GUTTER}`}>
            <div className="flex min-w-0 items-center gap-3.5">
              <BrandLogo />
              <span aria-hidden="true" className={`hidden h-4 w-px bg-slate-300 transition-opacity duration-300 sm:block ${scrolled ? 'opacity-100' : 'opacity-0'}`} />
              <span
                aria-hidden="true"
                className={`hidden truncate text-[13.5px] font-medium text-slate-600 transition-all duration-300 sm:block ${scrolled ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}
              >
                Your resumes
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={locked}
              aria-label={closeLabel}
              className="group inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white/80 pl-2 pr-2 text-[12.5px] font-medium text-slate-700 shadow-sm backdrop-blur transition hover:border-slate-300 hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60 disabled:opacity-40 sm:pl-3.5"
            >
              <span className="hidden sm:inline">{closeLabel}</span>
              <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-400 md:inline">Esc</kbd>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-slate-500 transition-colors group-hover:bg-slate-200 group-hover:text-slate-900">
                <IconClose className="h-3.5 w-3.5" />
              </span>
            </button>
          </div>
        </header>

        <div
          className="pro-scroll relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
          onScroll={(e) => {
            const next = e.currentTarget.scrollTop > 8;
            setScrolled((prev) => (prev === next ? prev : next));
          }}
        >
          <div className={`mx-auto w-full max-w-[96rem] pb-[max(2.5rem,env(safe-area-inset-bottom))] ${GUTTER}`}>
            <section className="flex flex-col gap-5 pb-8 pt-5 md:flex-row md:items-end md:justify-between md:gap-10 md:pb-10 md:pt-12">
              <div className="min-w-0 max-w-2xl">
                <p className="rp-in mb-3.5 inline-flex items-center gap-2.5 text-[11.5px] font-medium uppercase tracking-[0.16em] text-[#a64a30]/80" style={{ '--i': 0 }}>
                  <span aria-hidden="true" className="h-px w-6 bg-[#d9856b]/60" />
                  Resume library
                </p>
                <h1
                  id="resume-picker-title"
                  className="rp-in text-[length:clamp(1.9rem,4.4vw,2.9rem)] font-semibold leading-[1.1] tracking-[-0.025em] text-slate-900"
                  style={{ '--i': 1 }}
                >
                  {userName ? (
                    <>
                      Welcome back,{' '}
                      <span className="bg-gradient-to-r from-[#a64a30] via-[#d9856b] to-[#eaa892] bg-clip-text text-transparent">{userName}</span>
                    </>
                  ) : (
                    'Your resumes'
                  )}
                </h1>
                <p className="rp-in mt-3 max-w-lg text-[14.5px] leading-relaxed text-slate-500" style={{ '--i': 2 }}>
                  {subtitle}
                </p>
              </div>
              <HeroStats count={resumes.length} limit={limit} premium={premium} daysLeft={daysLeft} />
            </section>

            <section aria-labelledby="resume-picker-all">
              <div className="mb-6 flex items-center justify-between gap-4 border-t border-slate-200/80 pt-5">
                <h2 id="resume-picker-all" className="flex items-center gap-2 text-[13.5px] font-medium text-slate-900">
                  All resumes
                  <span className="rounded-full bg-slate-900/[0.06] px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">{resumes.length}</span>
                </h2>
                <p className="hidden text-[12px] text-slate-400 md:block">Click a resume to open it</p>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                <NewResumeCard
                  index={0}
                  busy={pending?.kind === 'new'}
                  locked={locked}
                  atLimit={atLimit}
                  limit={limit}
                  premium={premium}
                  onUpgrade={onUpgrade}
                  onCreate={() => run('new', 'new', () => onCreate(), { closeOnOk: true })}
                />
                {resumes.map((resume, i) => (
                  <ResumeCard
                    key={resume.id}
                    index={i + 1}
                    resume={resume}
                    payload={payloadFor(resume)}
                    status={statusFor(resume)}
                    active={resume.id === activeId}
                    busyKind={pending && pending.id === resume.id ? pending.kind : null}
                    locked={locked}
                    confirming={confirmId === resume.id}
                    renaming={renamingId === resume.id}
                    atLimit={atLimit}
                    renderPreview={renderPreview}
                    onNeedPayload={requestPayload}
                    onOpen={(id) => run(id, 'open', () => onSelect(id), { closeOnOk: true })}
                    onRename={onRename}
                    onDuplicate={onDuplicate && ((id) => run(id, 'duplicate', () => onDuplicate(id)))}
                    onDelete={onDelete}
                    onStartRename={(id) => { setConfirmId(null); setRenamingId(id); }}
                    onCommitRename={commitRename}
                    onCancelRename={() => setRenamingId(null)}
                    onAskDelete={(id) => { setRenamingId(null); setConfirmId(id); }}
                    onCancelDelete={() => setConfirmId(null)}
                    onConfirmDelete={() => confirmDelete(resume.id)}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* A failed action shows as a small message at the bottom of the page. */}
        {error && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex justify-center px-4">
            <div
              role="alert"
              className="rp-toast pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-red-200 bg-white/95 py-2.5 pl-3 pr-2.5 text-[13px] text-slate-800 shadow-[0_18px_44px_-14px_rgba(15,23,42,0.4)] backdrop-blur-xl"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-50 text-red-500">
                <IconAlert className="h-4 w-4" />
              </span>
              <p className="min-w-0 flex-1 leading-snug">{error}</p>
              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Dismiss"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60"
              >
                <IconClose className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
