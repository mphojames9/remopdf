import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { scoreResume, scoreLabel } from './atsScore';
import { isQualification } from './skillFilter';

/*
  The live ATS match for the job the person is applying to.

    <JobTargetBar target={resumeData.jobTarget} data={resumeData} onEdit={() => ...} />
    <JobTargetBar sheet target={...} data={...} onEdit={...} onSheetClose={() => ...} />   // only the panel, opened by the parent

  With `sheet` there is no card and no dock: the panel opens straight away and the score is counted only then, so
  the parent can keep the score out of the page until the person asks for it (the phone's "Finish Resume").

  It never sits on top of the form. On every screen size it is a small round button at the bottom right that
  shows the score: on a desktop it opens a floating panel, on a phone the same panel comes up as a bottom sheet.
  `dockClassName` sets its `bottom-*` offset (a phone's action bar is taller than a desktop's, so the parent
  lifts it above the bar). `card` adds the old in-page card; it is off by default.

  The score is counted on the device from the resume as it is right now (see atsScore.js), so it moves as the
  person types and never waits for the server. The panel shows where the points come from, which of the job's
  keywords the resume already has, and which are still missing, with qualifications kept apart from skills because
  a qualification is only worth adding when the person really holds it.

  Look: Outfit throughout (the panel is portalled to <body>, so it sets the font itself instead of inheriting the
  builder's). The one memorable element is the score numeral over a threshold meter whose four segments are the
  real score bands (0-44, 45-69, 70-84, 85+), so the person sees how far the next band is. Everything else stays
  quiet: hairline lists, plain chips, one tinted "next move" block.
*/

const ACCENT = '#d9856b';
const ACCENT_SOFT = '#f6c3b2';
const ACCENT_DEEP = '#b8573b';
const EMERALD = '#34d399';
const INK = '#0b1220';
const FONT = "'Outfit', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';
const DARK = 'linear-gradient(160deg,#0b1220,#1c2742)';
const EASE = 'cubic-bezier(.22,1,.36,1)';

// The same four bands scoreLabel() uses in atsScore.js.
const TIERS = [
  { name: 'Just starting', from: 0, to: 45 },
  { name: 'Getting there', from: 45, to: 70 },
  { name: 'Strong', from: 70, to: 85 },
  { name: 'Excellent', from: 85, to: 100 },
];
const tierIndex = (score) => (score >= 85 ? 3 : score >= 70 ? 2 : score >= 45 ? 1 : 0);
const tierTone = (index) => (index >= 2 ? EMERALD : ACCENT);

const STYLE = `
@keyframes jm-in-right{from{opacity:0;transform:translateX(28px) scale(.985)}to{opacity:1;transform:none}}
@keyframes jm-in-up{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
@keyframes jm-fade{from{opacity:0}to{opacity:1}}
@keyframes jm-delta{0%{opacity:0;transform:translateY(8px) scale(.85)}15%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}
.jm-panel{animation:jm-in-up .45s ${EASE} both}
@media (min-width:1024px){.jm-panel{animation-name:jm-in-right}}
.jm-fade{animation:jm-fade .25s ease both}
.jm-delta{animation:jm-delta 2.2s ease both}
.jm-root{font-family:${FONT};letter-spacing:0;-webkit-font-smoothing:antialiased}
.jm-root *{font-family:inherit}
@media (prefers-reduced-motion:reduce){.jm-panel,.jm-fade,.jm-delta{animation:none}}
`;

/* -------------------------------------------------------------------------- */
/*                                   helpers                                  */
/* -------------------------------------------------------------------------- */

const reducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia) && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Outfit is already loaded by the builder; this only covers a mount that happens before it, and never loads it twice.
const useOutfit = () => {
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('outfit-font-link')) return;
    const link = document.createElement('link');
    link.id = 'outfit-font-link';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);
};

// A number that counts up (or down) to its target instead of jumping.
const useCountUp = (target, { ms = 800, initial = target } = {}) => {
  const [value, setValue] = useState(initial);
  const shown = useRef(initial);
  useEffect(() => {
    if (reducedMotion() || shown.current === target) {
      shown.current = target;
      setValue(target);
      return undefined;
    }
    const begin = shown.current;
    const startedAt = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - startedAt) / ms);
      const next = Math.round(begin + (target - begin) * (1 - (1 - t) ** 3));
      shown.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
};

// False for the first painted frame, then true: lets bars start empty and grow once, when the panel opens.
const useReveal = () => {
  const [ready, setReady] = useState(reducedMotion());
  useEffect(() => {
    if (ready) return undefined;
    let inner;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [ready]);
  return ready;
};

// A qualification (degree, diploma, a field of study the advert names) is not a skill the person can "work in".
const isQual = (kw) => kw.kind === 'credential' || isQualification(kw.term);

const byImportance = (a, b) => Number(Boolean(b.must)) - Number(Boolean(a.must));

// { title, term?, text }: the one thing worth doing next, written for the person.
const insight = (result, short = false) => {
  const { score, keywords, parts } = result;
  const skills = keywords.missing.filter((k) => !isQual(k)).sort(byImportance);
  const complete = parts.find((p) => p.id === 'complete');
  if (score >= 85) {
    return {
      title: 'Ready to send',
      text: short ? 'Strong match. Check every line is true.' : 'Your resume speaks this job’s language. Read it through once more to be sure every line is true.',
    };
  }
  if (skills.length && skills[0].must) {
    return {
      title: 'Biggest gap:',
      term: skills[0].term,
      text: short ? '' : 'Add it where it’s true for you, in your work history or summary.',
    };
  }
  if (skills.length) {
    return {
      title: `${skills.length} skill${skills.length === 1 ? '' : 's'} still missing`,
      text: short ? '' : `${skills.length === 1 ? 'It is' : 'They are'} in the job advert but not on your resume yet. Add only what you really do.`,
    };
  }
  if (complete && complete.value < 1) {
    return { title: 'Finish the missing sections', text: short ? '' : 'So a scan can read your whole story.' };
  }
  return {
    title: 'Keywords covered',
    text: short ? 'Add real figures to lift it.' : 'Real figures in your achievements, where you have them, will lift this further.',
  };
};

const TIPS = {
  keywords: 'Work a keyword in only where it is true for you.',
  title: 'Use the job’s title only if it really describes you.',
  results: 'Add real figures where you have them: team size, volumes, targets. Never round up.',
};

/* -------------------------------------------------------------------------- */
/*                                    pieces                                  */
/* -------------------------------------------------------------------------- */

// pct is 0..1. A soft salmon arc on a faint track, drawn in a 100 x 100 box so it scales to any size.
const Ring = ({ pct, size, stroke = 9, animate = true, children }) => {
  const id = `jm${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const radius = 50 - stroke / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute inset-0" viewBox="0 0 100 100" aria-hidden="true" style={{ filter: 'drop-shadow(0 0 6px rgba(217,133,107,.45))' }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={ACCENT_SOFT} />
            <stop offset="1" stopColor={ACCENT} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={stroke} />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform="rotate(-90 50 50)"
          style={animate && !reducedMotion() ? { transition: `stroke-dashoffset .7s ${EASE}` } : undefined}
        />
      </svg>
      {children}
    </span>
  );
};

const Icon = ({ d, className = 'h-4 w-4', stroke = 1.8 }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const ICON = {
  close: 'M5 5l10 10M15 5L5 15',
  check: 'M4.5 10.5l3.5 3.5 7.5-8',
  chevron: 'M8 5l5 5-5 5',
  pencil: 'M12.5 4.5l3 3L7 16H4v-3l8.5-8.5z',
  bulb: 'M7.5 15.5h5M8 18h4M10 2.5a5 5 0 0 0-2.9 9.1c.5.4.9 1 .9 1.7v.7h4v-.7c0-.7.4-1.3.9-1.7A5 5 0 0 0 10 2.5z',
  shield: 'M10 2.5l6 2.2v4.6c0 3.6-2.5 6.3-6 7.7-3.5-1.4-6-4.1-6-7.7V4.7l6-2.2zM7.5 10l2 2 3.5-4',
};

// A score that rose pops a small "+N" next to the dock for a moment: the feedback that a change counted.
const useScoreGain = (score) => {
  const previous = useRef(score);
  const [gain, setGain] = useState(null);
  useEffect(() => {
    const diff = score - previous.current;
    previous.current = score;
    if (diff <= 0) return undefined;
    setGain({ diff, key: Date.now() });
    const timer = setTimeout(() => setGain(null), 2200);
    return () => clearTimeout(timer);
  }, [score]);
  return gain;
};

const Dock = ({ result, onOpen, className = 'bottom-24' }) => {
  const gain = useScoreGain(result.score);
  const shown = useCountUp(result.score, { ms: 500 });
  return (
    <div className={`fixed right-4 z-30 sm:right-5 ${className}`} style={{ fontFamily: FONT }}>
      {gain && (
        <span key={gain.key} className="jm-delta pointer-events-none absolute -top-9 right-1 rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-[#b8573b] shadow-lg ring-1 ring-slate-200">
          +{gain.diff}
        </span>
      )}
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={`Job match ${result.score} out of 100. Open details`}
        className={`group flex items-center rounded-full p-1.5 text-white ring-1 ring-white/10 backdrop-blur transition-[padding,transform] duration-300 hover:-translate-y-0.5 hover:pr-5 focus-visible:pr-5 motion-reduce:transition-none ${FOCUS}`}
        style={{ background: 'linear-gradient(160deg,rgba(11,18,32,.96),rgba(28,39,66,.96))', boxShadow: '0 16px 36px -10px rgba(11,18,32,.55), inset 0 1px 0 rgba(255,255,255,.08)' }}
      >
        <Ring pct={result.score / 100} size={50} stroke={10}>
          <span className="text-[15px] font-semibold tabular-nums">{shown}</span>
        </Ring>
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-left opacity-0 transition-all duration-300 group-hover:ml-3 group-hover:max-w-[150px] group-hover:opacity-100 group-focus-visible:ml-3 group-focus-visible:max-w-[150px] group-focus-visible:opacity-100 motion-reduce:transition-none">
          <span className="block text-[14px] font-semibold leading-tight">Job match</span>
          <span className="block text-xs leading-tight text-white/60">{scoreLabel(result.score)}</span>
        </span>
      </button>
    </div>
  );
};

const Card = ({ result, target, onOpen }) => {
  const left = result.keywords.missing.length;
  return (
    <section aria-label="Job match" className="mb-5 lg:hidden" style={{ fontFamily: FONT }}>
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className={`flex w-full items-center gap-4 rounded-3xl px-4 py-3.5 text-left text-white ring-1 ring-white/10 ${FOCUS}`}
        style={{ background: DARK, boxShadow: '0 14px 30px -14px rgba(11,18,32,.6)' }}
      >
        <Ring pct={result.score / 100} size={52} stroke={10}>
          <span className="text-[15px] font-semibold tabular-nums">{result.score}</span>
        </Ring>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{target.title || 'Your target job'}</span>
          <span className="mt-0.5 block truncate text-[13px] text-white/65">
            {scoreLabel(result.score)}, {left === 0 ? 'every keyword found' : `${left} keyword${left === 1 ? '' : 's'} to go`}
          </span>
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80">
          <Icon d={ICON.chevron} className="h-4 w-4" stroke={2.2} />
        </span>
      </button>
    </section>
  );
};

// The hero's meter: four segments sized like the score bands, filled up to the score. Salmon for the first two
// bands, green once the score reaches Strong. The numbers under it are where each band starts.
const TierMeter = ({ score, ready }) => (
  <div role="img" aria-label={`Score ${score} out of 100, ${scoreLabel(score)}`}>
    <div className="flex gap-1">
      {TIERS.map((tier, i) => {
        const fill = Math.max(0, Math.min(1, (score - tier.from) / (tier.to - tier.from)));
        const last = i === TIERS.length - 1;
        const tone = tierTone(i);
        return (
          <div key={tier.name} className="min-w-0" style={{ flex: `${tier.to - tier.from} 1 0%` }}>
            <div className="h-2 overflow-hidden rounded-full bg-white/[.12]">
              <div
                className="h-full rounded-full"
                style={{
                  width: ready ? `${fill * 100}%` : '0%',
                  background: i >= 2 ? 'linear-gradient(90deg,#a7f3d0,#34d399)' : `linear-gradient(90deg,${ACCENT_SOFT},${tone})`,
                  transition: reducedMotion() ? 'none' : `width .9s ${EASE} ${180 + i * 140}ms`,
                }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] font-medium tabular-nums text-white/45">
              <span>{tier.from}</span>
              {last && <span>100</span>}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const Chip = ({ children, tone }) => {
  const look = {
    found: 'border-emerald-100 bg-emerald-50 text-emerald-900',
    must: 'border-[#d9856b]/30 bg-[#fdece5] text-[#8c3d27]',
    missing: 'border-dashed border-slate-300 bg-white text-slate-600',
    qual: 'border-transparent bg-slate-100 text-slate-600',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium leading-none ${look}`}>
      {tone === 'found' && <Icon d={ICON.check} className="h-3 w-3 shrink-0 text-emerald-600" stroke={2.6} />}
      {tone === 'must' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#d9856b]" aria-hidden="true" />}
      {children}
    </span>
  );
};

const Group = ({ title, note, shortNote, count = 0, aside, children }) => (
  <div className="mt-5 first:mt-0 sm:mt-7 sm:first:mt-0">
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
        {title}
        {count > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-500">{count}</span>}
      </h3>
      {aside}
    </div>
    {shortNote && <p className="mt-1 text-[13px] leading-snug text-slate-500 sm:hidden">{shortNote}</p>}
    {note && <p className="mt-1 hidden text-[13px] leading-relaxed text-slate-500 sm:block">{note}</p>}
    <div className="mt-3 flex flex-wrap gap-2">{children}</div>
  </div>
);

const MAX_CHIPS = 18;

// One row per scoring check: label and points, a bar that grows when the panel opens, then the hint.
const Breakdown = ({ parts, ready }) => (
  <ul className="divide-y divide-slate-100">
    {parts.map((part, i) => {
      const pct = Math.round(part.value * 100);
      const done = part.value >= 1;
      return (
        <li key={part.id} className="py-3.5 first:pt-1 last:pb-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[14px] font-medium text-slate-800">
              {part.label}
              {done && <Icon d={ICON.check} className="h-3.5 w-3.5 text-emerald-600" stroke={2.6} />}
            </span>
            <span className="text-[13px] tabular-nums text-slate-500">
              <span className="text-[15px] font-semibold text-slate-900">{Math.round(part.value * part.weight)}</span>
              <span className="mx-1 text-slate-300">/</span>
              {part.weight}
            </span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${part.label}: ${pct}%`}>
            <div
              className="h-full rounded-full"
              style={{
                width: ready ? `${pct}%` : '0%',
                background: done ? 'linear-gradient(90deg,#6ee7b7,#10b981)' : `linear-gradient(90deg,#f0b6a3,${ACCENT})`,
                transition: reducedMotion() ? 'none' : `width .9s ${EASE} ${240 + i * 90}ms`,
              }}
            />
          </div>
          <p className="mt-2 hidden text-[13px] leading-snug text-slate-500 sm:block">{part.hint}</p>
          {TIPS[part.id] && part.value < 1 && <p className="mt-0.5 hidden text-[13px] leading-snug text-[#8c3d27]/80 sm:block">{TIPS[part.id]}</p>}
        </li>
      );
    })}
  </ul>
);

const NextMove = ({ move }) => (
  <div className="flex gap-3.5 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,#fff3ed,#fff9f6)', boxShadow: 'inset 0 0 0 1px rgba(217,133,107,.22)' }}>
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: `linear-gradient(135deg,${ACCENT},${ACCENT_DEEP})` }}>
      <Icon d={ICON.bulb} className="h-[18px] w-[18px]" />
    </span>
    <div className="min-w-0">
      <p className="text-[15px] font-semibold leading-snug text-slate-900">
        {move.title}
        {move.term && (
          <>
            {' '}
            <span className="rounded-md bg-[#d9856b]/15 px-1.5 py-0.5 text-[#8c3d27]">“{move.term}”</span>
          </>
        )}
      </p>
      {move.text && <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600">{move.text}</p>}
    </div>
  </div>
);

const Panel = ({ result, target, onClose, onEdit }) => {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const shown = useCountUp(result.score, { ms: 1000, initial: 0 });
  const ready = useReveal();
  const titleId = useId();
  useOutfit();

  // Focus moves into the panel, Tab stays inside it, Escape closes it, and focus goes back to where it was.
  useEffect(() => {
    const before = document.activeElement;
    closeRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      } else if (event.key === 'Tab' && panelRef.current) {
        const items = panelRef.current.querySelectorAll('button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])');
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (before && before.focus) before.focus();
    };
  }, [onClose]);

  const { covered, missing } = result.keywords;
  const missingSkills = missing.filter((k) => !isQual(k)).sort(byImportance);
  const missingQuals = missing.filter(isQual);
  const index = tierIndex(result.score);
  const next = TIERS[index + 1];
  const tone = tierTone(index);
  const hasMust = missingSkills.some((k) => k.must);

  return createPortal(
    <div className="jm-root fixed inset-0 z-[58]" style={{ fontFamily: FONT }}>
      <style>{STYLE}</style>
      <div className="jm-fade absolute inset-0 bg-slate-950/50 backdrop-blur-[3px]" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="jm-panel absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl lg:inset-x-auto lg:bottom-3 lg:right-3 lg:top-3 lg:max-h-none lg:w-[450px] lg:rounded-[28px]"
      >
        {/* Header: the dark half. The score is the one loud thing here. */}
        <div className="relative shrink-0 overflow-hidden px-5 pb-4 pt-5 text-white sm:px-6 sm:pb-6 sm:pt-6" style={{ background: 'linear-gradient(165deg,#0b1220 0%,#16213a 58%,#222f4d 100%)' }}>
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: ACCENT }} aria-hidden="true" />
          <span className="pointer-events-none absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/25 lg:hidden" aria-hidden="true" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-white/55">Job match</p>
              <h2 id={titleId} className="mt-0.5 truncate text-xl font-semibold leading-snug sm:text-[22px]">{target.title || 'Your target job'}</h2>
              {target.company && <p className="truncate text-sm text-white/60">{target.company}</p>}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <Icon d={ICON.close} className="h-[18px] w-[18px]" />
            </button>
          </div>

          <div className="relative mt-4 flex items-end justify-between gap-4 sm:mt-7">
            <p className="flex items-baseline leading-none" aria-hidden="true">
              <span className="text-[52px] font-semibold tabular-nums tracking-[-0.04em] sm:text-[76px]">{shown}</span>
              <span className="ml-1.5 text-base font-medium text-white/45 sm:text-lg">/100</span>
            </p>
            <div className="pb-1 text-right">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-3 pr-3.5 text-sm font-medium ring-1 ring-white/10">
                <span className="h-2 w-2 rounded-full" style={{ background: tone, boxShadow: `0 0 10px ${tone}` }} aria-hidden="true" />
                {scoreLabel(result.score)}
              </p>
              <p className="mt-2 text-[13px] text-white/60">
                {next ? `${next.from - result.score} point${next.from - result.score === 1 ? '' : 's'} to ${next.name}` : 'Top band reached'}
              </p>
            </div>
          </div>

          <div className="relative mt-4 sm:mt-6">
            <TierMeter score={result.score} ready={ready} />
          </div>
        </div>

        {/* Body */}
        <div className="pro-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5 sm:px-6 sm:pb-7 sm:pt-6">
          <NextMove move={insight(result, false)} />

          <div className="mt-7">
            <Group title="Where your points come from">
              <div className="w-full">
                <Breakdown parts={result.parts} ready={ready} />
              </div>
            </Group>
          </div>

          <div className="mt-7 border-t border-slate-100 pt-7">
            {covered.length > 0 && (
              <Group title="Already on your resume" count={covered.length}>
                {covered.slice(0, MAX_CHIPS).map((kw) => (
                  <Chip key={kw.term} tone="found">{kw.term}</Chip>
                ))}
                {covered.length > MAX_CHIPS && <span className="px-1 py-1.5 text-[13px] text-slate-500">+{covered.length - MAX_CHIPS} more</span>}
              </Group>
            )}

            {missingSkills.length > 0 && (
              <Group
                title="Still missing"
                count={missingSkills.length}
                note="Work them in only where they’re true for you."
                shortNote="Work them in only where they’re true for you."
                aside={
                  hasMust ? (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#d9856b]" aria-hidden="true" />
                      Must-have for this job
                    </span>
                  ) : null
                }
              >
                {missingSkills.slice(0, MAX_CHIPS).map((kw) => (
                  <Chip key={kw.term} tone={kw.must ? 'must' : 'missing'}>{kw.term}</Chip>
                ))}
                {missingSkills.length > MAX_CHIPS && <span className="px-1 py-1.5 text-[13px] text-slate-500">+{missingSkills.length - MAX_CHIPS} more</span>}
              </Group>
            )}

            {missingQuals.length > 0 && (
              <Group title="Qualifications the job lists" count={missingQuals.length} note="These count only if you hold them. If you do, add them under Education." shortNote="Add under Education only if you hold them.">
                {missingQuals.map((kw) => (
                  <Chip key={kw.term} tone="qual">{kw.term}</Chip>
                ))}
              </Group>
            )}

            {missing.length === 0 && <p className="text-sm text-slate-700">Every keyword from the job is on your resume.</p>}
          </div>

          <p className="mt-8 hidden items-start gap-2 text-[13px] leading-relaxed text-slate-500 sm:flex">
            <Icon d={ICON.shield} className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            Scored on your device as you type. Keywords are worth 70 points, the other three checks 10 each.
          </p>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 bg-white/90 px-5 py-3.5 backdrop-blur sm:px-6 sm:py-4" style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit();
            }}
            className={`flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 ${FOCUS}`}
          >
            <Icon d={ICON.pencil} className="h-4 w-4" />
            Edit job
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`ml-auto rounded-full px-7 py-2.5 text-sm font-semibold text-white transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] motion-reduce:transition-none ${FOCUS}`}
            style={{ background: INK, boxShadow: '0 10px 24px -10px rgba(11,18,32,.7)' }}
          >
            Keep writing
          </button>
        </div>
      </aside>
    </div>,
    document.body
  );
};

/* -------------------------------------------------------------------------- */
/*                                    the bar                                 */
/* -------------------------------------------------------------------------- */

const JobTargetBar = ({ target, data, onEdit, sheet = false, onSheetClose, card = false, dockClassName }) => {
  const [open, setOpen] = useState(false);
  const result = useMemo(() => scoreResume(target, data), [target, data]);
  const close = useCallback(() => setOpen(false), []);
  const show = useCallback(() => setOpen(true), []);
  if (!result) return null;

  // Sheet only: the parent decides when to open it (it mounts this when it wants the score).
  if (sheet) return <Panel result={result} target={target} onClose={onSheetClose || close} onEdit={onEdit} />;

  return (
    <>
      {card && <Card result={result} target={target} onOpen={show} />}
      <Dock result={result} onOpen={show} className={dockClassName} />
      {open && <Panel result={result} target={target} onClose={close} onEdit={onEdit} />}
    </>
  );
};

export default JobTargetBar;
