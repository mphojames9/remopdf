import React, { useEffect, useRef, useState } from 'react';
import { analyzeWriting, MIN_CHARS } from './writingAI';
import { usePremiumAccess, requestUpgrade, setPremiumAccess } from '../../../hooks/premiumAccess';

// AI writing assistant. Same props and the same place in the page as the old offline panel, so
// Summary.jsx, ExperienceField.jsx, EducationField.jsx and AdditionalSections.jsx keep working.
//
//   <SpellCheckPanel text={value} onChange={setValue} field="summary" jobTitle="Site Manager" />
//
//   field     'summary' | 'experience' | 'education' | 'other'  (tells the AI what it is reading)
//   jobTitle  optional; lets the AI judge wording against the role
//
// A moment after the last keystroke the text is sent to POST /api/writing/analyze (Groq, through
// the FastAPI backend, see writingAI.js). The AI answers with 3 whole-text versions from different
// angles (achievement-led, concise & ATS-friendly, leadership-focused...). Every version already has
// the spelling and grammar fixed, and one tap on "Use this version" puts it in the text box.
//
// AI suggestions are a Premium feature. Without Premium the panel shows an upgrade note and sends nothing
// (the server refuses and never uses its AI key either way). Premium status comes from the builder through
// hooks/premiumAccess.js: false = locked, true = on, null = not known yet (the server decides).
//
// The panel can be hidden: tapping its header collapses it to a single line that still shows how
// many versions are ready. That choice is remembered and shared by every panel on the page.

const OPEN_KEY = 'resumeBuilder:writingAssistantOpen'; // same key as before, so the saved choice carries over
const TYPING_PAUSE_MS = 1400; // review this long after the last keystroke

const ERROR_TEXT = {
  busy: 'That was a lot of reviews in a minute. Give it a moment, then try again.',
  timeout: 'The AI took too long to answer. The server may be waking up, so try again in a few seconds.',
  offline: 'Couldn’t reach the AI service. Check your connection and try again.',
  unavailable: 'AI review is unavailable right now. You can keep writing and try again later.',
  signin: 'Your session has expired. Sign in again to use AI suggestions.',
};

/* -------------------------------------------------------------------------- */
/*                     Hide / show, shared by every panel                      */
/* -------------------------------------------------------------------------- */

const readOpen = () => {
  try {
    const saved = localStorage.getItem(OPEN_KEY);
    if (saved === '1') return true;
    if (saved === '0') return false;
  } catch {
    /* storage unavailable: fall through to the screen-size default */
  }
  // Nothing saved yet: open on larger screens, collapsed on phones so it does not crowd the form.
  try {
    return window.matchMedia('(min-width: 640px)').matches;
  } catch {
    return true;
  }
};

const saveOpen = (open) => {
  try {
    localStorage.setItem(OPEN_KEY, open ? '1' : '0');
  } catch {
    /* storage unavailable: the choice still holds for this session */
  }
};

// A tiny shared store, so hiding one panel hides them all straight away.
const createStore = (initial, persist) => {
  let value = initial;
  const listeners = new Set();
  return {
    get: () => value,
    set: (next) => {
      value = next;
      persist(next);
      listeners.forEach((listener) => listener(next));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

const openStore = createStore(readOpen(), saveOpen);

const useStore = (store) => {
  const [value, setValue] = useState(() => store.get());
  useEffect(() => {
    setValue(store.get());
    return store.subscribe(setValue);
  }, [store]);
  return value;
};

let panelCount = 0;

/* -------------------------------------------------------------------------- */
/*                                 Small pieces                               */
/* -------------------------------------------------------------------------- */

const FOCUS = 'focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d9856b]';
// 36px tall on phones so a thumb can hit it; compact again from the sm breakpoint up.
const PRIMARY_BUTTON = `min-h-[36px] sm:min-h-[28px] px-3 text-xs font-semibold rounded bg-[#d9856b] text-white hover:bg-[#c97558] active:bg-[#bd6b4f] transition-colors ${FOCUS}`;

const Chevron = ({ open }) => (
  <svg
    className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
  </svg>
);

const Spinner = () => (
  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const Lock = () => (
  <svg
    className="w-3.5 h-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const Sparkle = () => (
  <svg className="w-3.5 h-3.5 text-[#d9856b]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7 11l.9 2.6 2.6.9-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9L19 13z" />
  </svg>
);

// Three placeholder cards while the first review is on its way.
const Skeleton = () => (
  <div className="px-3 py-3 flex flex-col gap-2.5 animate-pulse" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex flex-col gap-2 rounded-md border border-slate-100 px-3 py-2.5">
        <div className="h-3 w-1/3 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-4/5 rounded bg-slate-100" />
      </div>
    ))}
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                   Panel                                    */
/* -------------------------------------------------------------------------- */

const SpellCheckPanel = ({ text, onChange, field = 'other', jobTitle = '' }) => {
  const value = typeof text === 'string' ? text : '';
  const open = useStore(openStore);
  const premium = usePremiumAccess();
  const locked = premium === false; // known to be without Premium: nothing is sent to the AI
  const [state, setState] = useState({ status: 'idle', result: null, error: null });
  const [applied, setApplied] = useState(false); // a version was just chosen and nothing has changed since
  const [recheck, setRecheck] = useState(0);
  const analyzedRef = useRef(null); // the exact text the current result was made for
  const abortRef = useRef(null);
  const immediateRef = useRef(false); // true right after "Try again": no typing pause
  const bodyId = useRef(null);
  if (bodyId.current === null) {
    panelCount += 1;
    bodyId.current = `writing-assistant-${panelCount}`;
  }

  // Review the text a moment after the last keystroke. Typing again cancels a review in flight.
  useEffect(() => {
    if (locked) {
      // No Premium: no review, and nothing from an earlier one stays on screen. Paying flips `locked` and this runs again.
      analyzedRef.current = null;
      setApplied(false);
      setState((s) => (s.status === 'idle' && !s.result && !s.error ? s : { status: 'idle', result: null, error: null }));
      return undefined;
    }
    if (value.trim().length < MIN_CHARS) {
      analyzedRef.current = null;
      setApplied(false);
      setState((s) => (s.status === 'idle' && !s.result && !s.error ? s : { status: 'idle', result: null, error: null }));
      return undefined;
    }
    if (analyzedRef.current === value) {
      // Nothing new to review (a version was just chosen). Clear a stale "reviewing" state.
      setState((s) => (s.status === 'loading' ? { ...s, status: s.result ? 'ready' : 'idle' } : s));
      return undefined;
    }

    setApplied(false);
    const delay = immediateRef.current ? 0 : TYPING_PAUSE_MS;
    const timer = setTimeout(() => {
      immediateRef.current = false;
      const controller = new AbortController();
      abortRef.current = controller;
      setState((s) => ({ ...s, status: 'loading', error: null }));
      analyzeWriting({ text: value, field, jobTitle, signal: controller.signal })
        .then((result) => {
          analyzedRef.current = value;
          setState({ status: 'ready', result: { ...result, forText: value }, error: null });
        })
        .catch((err) => {
          if (err && err.name === 'AbortError') return; // the text changed again: a newer review follows
          if (err && err.code === 'premium') setPremiumAccess(false); // the server says no Premium: lock every panel
          setState((s) => ({ status: 'error', result: s.result, error: err }));
        });
    }, delay);

    return () => {
      clearTimeout(timer);
      if (abortRef.current) abortRef.current.abort();
    };
    // field and jobTitle are read when the review starts; changing them alone does not re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, recheck, locked]);

  const checkAgain = () => {
    analyzedRef.current = null;
    immediateRef.current = true;
    setRecheck((n) => n + 1);
  };

  const toggleOpen = () => openStore.set(!openStore.get());

  const takeRewrite = (rewrite) => {
    if (!onChange) return;
    analyzedRef.current = rewrite; // the chosen text is final: no new review until it is edited
    setApplied(true);
    onChange(rewrite);
  };

  const result = state.result;
  const hasText = value.trim().length >= MIN_CHARS;
  const loading = state.status === 'loading';

  // The versions describe the text as it was reviewed: once it changes they are hidden until the next review.
  const rewrites = !locked && result && result.forText === value
    ? (result.rewrites || []).filter((r) => r.text.trim() !== value.trim())
    : [];

  let message = null;
  if (!hasText) message = 'Write a sentence or two and the AI will suggest three polished versions to choose from.';
  else if (applied) message = 'Version applied. Edit the text any time and new versions will appear.';
  else if (state.status === 'ready' && rewrites.length === 0) message = 'Nicely written. No changes needed.';
  if (locked) message = null; // the upgrade note below takes its place

  return (
    <div role="region" aria-label="Writing assistant" className="border border-slate-200 rounded-md bg-white overflow-hidden">
      {/* The whole header is the hide/show button, so it is an easy target on a phone. */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-controls={bodyId.current}
        className={`w-full min-h-[44px] px-3 py-2 flex items-center gap-2.5 text-left bg-slate-50 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#d9856b] ${open ? 'border-b border-slate-200' : ''}`}
      >
        <Sparkle />
        <span className="truncate text-xs font-semibold text-slate-700 uppercase tracking-wide">Writing assistant</span>
        {/* Phones get icons only (a count badge, a spinner, a chevron); the words come back from the sm
            breakpoint up and stay in the page for screen readers. */}
        <span aria-live="polite" className="shrink-0">
          {loading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
              <Spinner />
              <span className="sr-only sm:not-sr-only">Reviewing…</span>
            </span>
          )}
          {!loading && rewrites.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#d9856b]/15 text-[#8f4631] text-[11px] font-bold">
                {rewrites.length}
              </span>
              <span className="sr-only sm:not-sr-only">{rewrites.length === 1 ? 'version ready' : 'versions ready'}</span>
            </span>
          )}
          {locked && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#8f4631] whitespace-nowrap">
              <Lock />
              <span className="sr-only sm:not-sr-only">Premium</span>
            </span>
          )}
          {!locked && !loading && state.status === 'error' && (
            <span className="text-xs text-amber-700 whitespace-nowrap">
              <span className="sr-only sm:not-sr-only">Unavailable</span>
              <span className="sm:hidden" aria-hidden="true">!</span>
            </span>
          )}
        </span>
        <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
          <span className="sr-only sm:not-sr-only">{open ? 'Hide' : 'Show'}</span>
          <Chevron open={open} />
        </span>
      </button>

      {open && (
        <div id={bodyId.current}>
          {locked && (
            <div className="px-3 py-3 flex flex-col gap-2">
              <p className="text-xs leading-relaxed text-slate-600">
                AI suggestions are a Premium feature. Upgrade to get three polished versions of your text to choose from.
              </p>
              <div>
                <button type="button" onClick={requestUpgrade} className={PRIMARY_BUTTON}>
                  Upgrade to Premium
                </button>
              </div>
            </div>
          )}

          {message && <p className="px-3 py-2.5 text-xs text-slate-500">{message}</p>}

          {hasText && loading && rewrites.length === 0 && <Skeleton />}

          {state.status === 'error' && !locked && (
            <div className="px-3 py-3 flex flex-col gap-2 border-b border-slate-100">
              <p className="text-xs leading-relaxed text-amber-700">
                {ERROR_TEXT[state.error && state.error.code] || ERROR_TEXT.unavailable}
              </p>
              {/* An expired sign-in cannot be fixed by retrying: the message says to sign in again. */}
              {!(state.error && state.error.code === 'signin') && (
                <div>
                  <button type="button" onClick={checkAgain} className={PRIMARY_BUTTON}>
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}

          {rewrites.length > 0 && (
            <div className={`px-3 py-3 bg-[#d9856b]/5 flex flex-col gap-2.5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
              {rewrites.map((r, i) => (
                <div key={r.id} className="flex flex-col gap-2 bg-white border border-[#d9856b]/25 rounded-md px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 min-w-0 text-xs font-semibold text-[#8f4631]">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#d9856b]/15 text-[11px] shrink-0">
                        {i + 1}
                      </span>
                      <span className="truncate">{r.label}</span>
                    </span>
                    <button type="button" onClick={() => takeRewrite(r.text)} className={`shrink-0 ${PRIMARY_BUTTON}`}>
                      Use this version
                    </button>
                  </div>
                  <p className="text-sm leading-snug text-slate-700 whitespace-pre-wrap break-words">{r.text}</p>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default SpellCheckPanel;
