import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { scoreLabel, norm, labelFor, isLicenceTerm } from './atsScore';
import { scoreMatch } from './scoreMatch';
import { reviewResume } from './resumeReview';
import { isQualification } from './skillFilter';
import { analyseRequirements, formatMonths } from './qualificationCheck';

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

  The panel has four pages under the score, so nothing is a long scroll: Overview (the next move, three numbers that open the
  other pages, where the points come from), To fix (the written review as a closed to-do list), Keywords (still missing, then
  found) and Requirements. Each fact lives on one page only.

  On the Requirements page every years-of-experience and education-level requirement of the advert gets a card:
  what the job asks for, what the resume shows, how far short it is, and what to do (qualificationCheck.js). The years are
  counted from the dates in the work history and the level is read from the Education step, so the cards work whether or
  not the advert reader tagged the line as a qualification.

  Premium also gets a written review in the panel (resumeReview.js): what is missing big time and what needs improving,
  each with the reason it matters for this job and what to do about it, plus what already works. It is worked out on
  the device from the same resume, so it never disagrees with the score above it.

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
.jm-tabs{scrollbar-width:none}
.jm-tabs::-webkit-scrollbar{display:none}
.jm-root summary{list-style:none}
.jm-root summary::-webkit-details-marker{display:none}
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

// Adverts often shout the title ("PRODUCTION MANAGER / PLANT MANAGER"). On screen it reads as normal words; short acronyms stay.
const SMALL_WORDS = new Set(['and', 'or', 'of', 'the', 'for', 'to', 'in', 'at', 'a', 'an']);
const tidyTitle = (title) => {
  const t = String(title || '').trim();
  if (!t || t !== t.toUpperCase() || !/[A-Z]/.test(t)) return t;
  return t.replace(/[A-Za-z][A-Za-z'’]*/g, (word, offset) => {
    if (word.length <= 3 && word.length > 1 && !SMALL_WORDS.has(word.toLowerCase())) return word;
    const lower = word.toLowerCase();
    return offset > 0 && SMALL_WORDS.has(lower) ? lower : lower[0].toUpperCase() + lower.slice(1);
  });
};

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
      term: labelFor(skills[0].term),
      text: short
        ? ''
        : skills[0].partial
          ? 'You list Microsoft Office, but the job names this one. Name it where it’s true for you, in your work history or skills.'
          : 'Add it where it’s true for you, in your work history or summary.',
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
const Ring = ({ pct, size, stroke = 9, animate = true, className = '', children }) => {
  const id = `jm${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const radius = 50 - stroke / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${className}`} style={size ? { width: size, height: size } : undefined}>
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
        className={`group flex items-center rounded-full p-1 text-white ring-1 ring-white/10 backdrop-blur transition-[padding,transform] duration-300 hover:-translate-y-0.5 hover:pr-5 focus-visible:pr-5 motion-reduce:transition-none sm:p-1.5 ${FOCUS}`}
        style={{ background: 'linear-gradient(160deg,rgba(11,18,32,.96),rgba(28,39,66,.96))', boxShadow: '0 16px 36px -10px rgba(11,18,32,.55), inset 0 1px 0 rgba(255,255,255,.08)' }}
      >
        <Ring pct={result.score / 100} stroke={10} className="h-10 w-10 sm:h-[50px] sm:w-[50px]">
          <span className="text-[13px] font-semibold tabular-nums sm:text-[15px]">{shown}</span>
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

// A keyword tag. 5px corners, a hairline border and one marker that says what it is: a tick when the resume has it, a solid
// square for a must-have that is missing, a hollow square for a nice-to-have that is missing.
const Square = ({ hollow, className = '' }) => (
  <span
    className={`inline-block h-[7px] w-[7px] shrink-0 ${hollow ? 'border border-slate-400' : 'bg-[#d9856b]'} ${className}`}
    aria-hidden="true"
  />
);

const Chip = ({ children, tone }) => {
  const look = {
    found: 'border-slate-200 bg-white text-slate-800',
    must: 'border-[#e6b8a7] bg-[#fff6f2] text-[#7a3320]',
    missing: 'border-slate-300 bg-white text-slate-600',
    qual: 'border-slate-200 bg-slate-50 text-slate-600',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-2 rounded-[5px] border px-2.5 py-[7px] text-[13px] font-medium leading-none ${look}`}>
      {tone === 'found' && <Icon d={ICON.check} className="h-3 w-3 shrink-0 text-emerald-600" stroke={2.8} />}
      {tone === 'must' && <Square />}
      {tone === 'missing' && <Square hollow />}
      {children}
    </span>
  );
};

const REQ_TONE = {
  met: { pill: 'bg-emerald-50 text-emerald-800', ring: 'rgba(15,23,42,.09)', bar: 'linear-gradient(90deg,#6ee7b7,#10b981)' },
  gap: { pill: 'bg-[#fdece5] text-[#8c3d27]', ring: 'rgba(217,133,107,.38)', bar: `linear-gradient(90deg,#f0b6a3,${ACCENT})` },
  soft: { pill: 'bg-slate-100 text-slate-600', ring: 'rgba(15,23,42,.09)', bar: 'linear-gradient(90deg,#cbd5e1,#94a3b8)' },
};

// One job the years were counted from. The name gets the whole line; what was done with it is said underneath.
const JobLine = ({ job, field }) => {
  const why = !job.dated
    ? 'No dates, so it cannot be counted'
    : job.counted
      ? `${formatMonths(job.months, true)} \u00B7 counted${job.via === 'title' ? ', the title matches' : job.via === 'lines' ? ', its lines mention it' : ''}`
      : `${formatMonths(job.months, true)} \u00B7 not counted${field ? `, no mention of ${field}` : ''}`;
  return (
    <li className="flex items-start gap-2.5">
      <span className={`mt-[7px] inline-block h-[7px] w-[7px] shrink-0 ${job.counted ? 'bg-emerald-600' : 'border border-slate-400'}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-[13px] leading-snug text-slate-800">{job.name}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{why}</p>
      </div>
    </li>
  );
};

// One requirement of the advert (a length of experience or an education level) against the resume. Only the facts are here;
// the explanation and the advice are in the "To fix" list, one tap away.
const RequirementCard = ({ item, ready, index, onFix }) => {
  const tone = REQ_TONE[item.tone] || REQ_TONE.soft;
  const pct = Math.round((item.ratio || 0) * 100);
  return (
    <li className="rounded-2xl bg-white p-4" style={{ boxShadow: `inset 0 0 0 1px ${tone.ring}` }}>
      <div className="flex items-start justify-between gap-3">
        <p className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {item.kind === 'experience' ? 'Experience' : 'Education'}
          {item.must && (
            <span className="flex items-center gap-1.5 normal-case tracking-normal text-[#8c3d27]">
              <Square />
              Must-have
            </span>
          )}
        </p>
        <span className={`-mt-0.5 shrink-0 whitespace-nowrap rounded-[5px] px-2 py-1 text-xs font-semibold ${tone.pill}`}>{item.pill}</span>
      </div>
      <p className="mt-1.5 break-words text-[16px] font-semibold leading-snug text-slate-900">{item.title}</p>

      {item.kind === 'experience' && item.bar ? (
        <div className="mt-3.5">
          <div className="h-1.5 overflow-hidden rounded-[2px] bg-slate-100" role="img" aria-label={`${pct}% of the time the job asks for`}>
            <div
              className="h-full"
              style={{ width: ready ? `${pct}%` : '0%', background: item.tone === 'met' ? '#059669' : ACCENT, transition: reducedMotion() ? 'none' : `width .9s ${EASE} ${240 + index * 90}ms` }}
            />
          </div>
          <p className="mt-2 flex items-baseline justify-between gap-3 text-[13px] text-slate-500">
            <span>
              You have <span className="font-semibold text-slate-900">{item.bar.have}</span>
            </span>
            <span className="text-right">
              Job needs <span className="font-semibold text-slate-900">{item.bar.need}</span>
            </span>
          </p>
        </div>
      ) : (
        <dl className="mt-3.5 grid grid-cols-2 gap-x-4 border-t border-slate-100 pt-3 text-[13px]">
          <div className="min-w-0">
            <dt className="text-slate-500">Job asks for</dt>
            <dd className="mt-0.5 break-words font-semibold leading-snug text-slate-900">{item.need}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-slate-500">Your resume shows</dt>
            <dd className="mt-0.5 break-words font-semibold leading-snug text-slate-900">{item.have}</dd>
          </div>
        </dl>
      )}

      {item.jobs && item.jobs.length > 0 && item.status !== 'empty' && (
        <details className="group mt-3.5 border-t border-slate-100 pt-1">
          <summary className={`flex cursor-pointer items-center justify-between gap-2 rounded-md py-2 text-[13px] font-medium text-slate-600 ${FOCUS}`}>
            Jobs checked ({item.jobs.length})
            <Icon d={ICON.chevron} className="h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none" stroke={2.2} />
          </summary>
          <ul className="mt-1 space-y-3 pb-1" aria-label="Jobs checked">
            {item.jobs.map((job, i) => (
              <JobLine key={`${job.name}-${i}`} job={job} field={item.field} />
            ))}
          </ul>
        </details>
      )}

      {onFix && item.status !== 'met' && (
        <button
          type="button"
          onClick={onFix}
          className={`mt-3.5 flex w-full items-center justify-between rounded-[5px] bg-[#fff6f2] px-3.5 py-2.5 text-[13.5px] font-semibold text-[#8c3d27] transition-colors hover:bg-[#fdece5] ${FOCUS}`}
          style={{ boxShadow: 'inset 0 0 0 1px rgba(217,133,107,.28)' }}
        >
          How to fix this
          <Icon d={ICON.chevron} className="h-4 w-4" stroke={2.4} />
        </button>
      )}
    </li>
  );
};

// The "Requirements" tab: a card for every years-of-experience and education-level requirement, then plain chips for any
// other qualification the advert names (a licence, a registration) that the cards do not cover.
const RequirementsTab = ({ check, leftovers, ready, onFix }) => {
  const met = check.items.filter((item) => item.status === 'met').length;
  return (
    <div>
      {check.items.length > 0 && (
        <>
          <p className="text-[15px] font-semibold text-slate-900">
            {met} of {check.items.length} met
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-slate-500">Checked against your work history and Education step. They count only if you really hold them.</p>
          <ul className="mt-4 space-y-3">
            {check.items.map((item, i) => (
              <RequirementCard key={item.id} item={item} ready={ready} index={i} onFix={onFix ? () => onFix(item) : undefined} />
            ))}
          </ul>
        </>
      )}

      {leftovers.length > 0 && (
        <div className={check.items.length > 0 ? 'mt-7' : ''}>
          <h3 className="text-[15px] font-semibold text-slate-900">Also listed</h3>
          {/* A driver's licence is a personal detail; every other qualification goes under Education or Certificates. */}
          {leftovers.some((kw) => !isLicenceTerm(kw.term)) && (
            <>
              <p className="mt-0.5 text-[13px] leading-snug text-slate-500">If you hold one, add it under Education or Certificates.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {leftovers.filter((kw) => !isLicenceTerm(kw.term)).map((kw) => (
                  <Chip key={kw.term} tone="qual">{kw.term}</Chip>
                ))}
              </div>
            </>
          )}
          {leftovers.some((kw) => isLicenceTerm(kw.term)) && (
            <>
              <p className="mt-3 text-[13px] leading-snug text-slate-500">If you hold a driver’s licence, switch it on under your personal details in the Heading step. It does not go under Education.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {leftovers.filter((kw) => isLicenceTerm(kw.term)).map((kw) => (
                  <Chip key={kw.term} tone="qual">{kw.term}</Chip>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};


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

/* -------------------------------------------------------------------------- */
/*                               the written review                           */
/* -------------------------------------------------------------------------- */

const fmtPoints = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// One finding: the title row is always shown, the explanation opens under it.
const FindingCard = ({ item, number, open, onToggle, register }) => {
  const bodyId = useId();
  const big = item.level === 'missing';
  return (
    <li ref={register} className="overflow-hidden rounded-2xl bg-white scroll-mt-16" style={{ boxShadow: `inset 0 0 0 1px ${big ? 'rgba(217,133,107,.38)' : 'rgba(15,23,42,.09)'}` }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={open ? bodyId : undefined}
        className={`flex w-full items-start gap-3 px-4 py-3.5 text-left ${FOCUS}`}
      >
        <span
          className={`mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] text-[12px] font-semibold tabular-nums ${big ? 'bg-[#d9856b] text-white' : 'bg-slate-100 text-slate-600'}`}
          aria-hidden="true"
        >
          {number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold leading-snug text-slate-900">{item.title}</span>
          <span className="mt-0.5 block text-xs text-slate-500">{item.where}</span>
        </span>
        {item.points > 0 && (
          <span className="mt-0.5 shrink-0 rounded-[5px] bg-emerald-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-800" title="Points you can still win">
            +{fmtPoints(item.points)}
          </span>
        )}
        <Icon d={ICON.chevron} className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`} stroke={2.2} />
      </button>

      {open && (
        <div id={bodyId} className="border-t border-slate-100 px-4 pb-4 pt-3.5">
          <p className="text-[13.5px] leading-relaxed text-slate-700">{item.body}</p>

          {item.terms && item.terms.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.terms.map((t) => (
                <Chip key={t.term} tone={t.must ? 'must' : 'missing'}>{t.term}</Chip>
              ))}
            </div>
          )}

          {item.examples && item.examples.length > 0 && (
            <ul className="mt-3 space-y-2">
              {item.examples.map((example) => (
                <li key={example.line} className="rounded-xl bg-slate-50 px-3 py-2.5 text-[13px] leading-snug">
                  <span className="block text-slate-700">“{example.line}”</span>
                  {example.note && <span className="mt-1 block font-medium text-[#8c3d27]">{example.note}</span>}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3.5 rounded-xl px-3.5 py-3" style={{ background: '#fff6f2', boxShadow: 'inset 0 0 0 1px rgba(217,133,107,.2)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8c3d27]">How to fix it</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-slate-700">{item.fix}</p>
          </div>
        </div>
      )}
    </li>
  );
};

const ReviewGroup = ({ title, note, items, offset, openIds, onToggle, register }) =>
  items.length === 0 ? null : (
    <div className="mt-5 first:mt-0">
      <h4 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
        {title}
        <span className="rounded-[5px] bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-500">{items.length}</span>
      </h4>
      <p className="mt-1 text-[13px] leading-snug text-slate-500">{note}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <FindingCard key={item.id} item={item} number={offset + i + 1} open={openIds.has(item.id)} onToggle={() => onToggle(item.id)} register={(el) => register(item.id, el)} />
        ))}
      </ul>
    </div>
  );

// The "To fix" tab: the written review as a to-do list. Every row is closed (title, step and points only) until it is tapped;
// `focusId` opens one and scrolls to it, which is what "How to fix this" on a requirement card does.
const FixList = ({ review, focusId, onFocused }) => {
  const all = useMemo(() => [...review.missing, ...review.improve], [review]);
  const [openIds, setOpenIds] = useState(() => new Set());
  const [showGood, setShowGood] = useState(false);
  const rows = useRef({});
  const register = useCallback((id, el) => {
    if (el) rows.current[id] = el;
    else delete rows.current[id];
  }, []);
  const toggle = useCallback((id) => {
    setOpenIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const allOpen = all.length > 0 && all.every((f) => openIds.has(f.id));

  useEffect(() => {
    if (!focusId) return undefined;
    setOpenIds((previous) => new Set(previous).add(focusId));
    const frame = requestAnimationFrame(() => {
      const row = rows.current[focusId];
      if (row) row.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
      if (onFocused) onFocused();
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  return (
    <section aria-label="Written review">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-[13.5px] leading-snug text-slate-600">
          {review.missing.length ? `${review.missing.length} big gap${review.missing.length === 1 ? '' : 's'} to fix first` : 'No big gaps'}
          {review.improve.length ? `, ${review.improve.length} to improve` : ''}
        </p>
        {all.length > 1 && (
          <button
            type="button"
            onClick={() => setOpenIds(allOpen ? new Set() : new Set(all.map((f) => f.id)))}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 ${FOCUS}`}
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>

      <div className="mt-4">
        <ReviewGroup title="Fix first" note="These hold your resume back the most." items={review.missing} offset={0} openIds={openIds} onToggle={toggle} register={register} />
        <ReviewGroup title="Then improve" note="A recruiter or a scan will notice these." items={review.improve} offset={review.missing.length} openIds={openIds} onToggle={toggle} register={register} />
      </div>

      {review.good.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setShowGood((v) => !v)}
            aria-expanded={showGood}
            className={`flex w-full items-center justify-between gap-2 rounded-lg py-1 text-left text-[15px] font-semibold text-slate-900 ${FOCUS}`}
          >
            <span className="flex items-center gap-2">
              Already working
              <span className="rounded-[5px] bg-emerald-50 px-2 py-0.5 text-xs font-medium tabular-nums text-emerald-800">{review.good.length}</span>
            </span>
            <Icon d={ICON.chevron} className={`h-4 w-4 text-slate-400 transition-transform duration-200 motion-reduce:transition-none ${showGood ? 'rotate-90' : ''}`} stroke={2.2} />
          </button>
          {showGood && (
            <ul className="mt-2.5 space-y-2">
              {review.good.map((line) => (
                <li key={line} className="flex items-start gap-2 text-[13px] leading-snug text-slate-600">
                  <Icon d={ICON.check} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" stroke={2.6} />
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-5 text-[12.5px] leading-relaxed text-slate-500">Everything here is something you can fix in the builder, and none of it needs you to claim anything that is not true.</p>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                               tabs and their pages                         */
/* -------------------------------------------------------------------------- */

// Four tabs that fit a phone: the label only, and a small square marker where something needs attention (the numbers are on
// the Overview). If the row is ever wider than the screen it scrolls, fades at the edge, and keeps the open tab in view.
const Tabs = ({ tabs, value, onChange }) => {
  const refs = useRef({});
  const listRef = useRef(null);
  const [more, setMore] = useState(false);
  const measure = useCallback(() => {
    const list = listRef.current;
    if (list) setMore(list.scrollLeft + list.clientWidth < list.scrollWidth - 2);
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, tabs.length]);
  useEffect(() => {
    const open = refs.current[value];
    if (open && open.scrollIntoView) open.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [value]);

  const onKey = (event) => {
    const at = tabs.findIndex((t) => t.id === value);
    let next = null;
    if (event.key === 'ArrowRight') next = tabs[(at + 1) % tabs.length];
    else if (event.key === 'ArrowLeft') next = tabs[(at - 1 + tabs.length) % tabs.length];
    else if (event.key === 'Home') next = tabs[0];
    else if (event.key === 'End') next = tabs[tabs.length - 1];
    if (!next) return;
    event.preventDefault();
    onChange(next.id);
    if (refs.current[next.id]) refs.current[next.id].focus();
  };
  const fade = more ? 'linear-gradient(to right,#000 calc(100% - 28px),transparent)' : undefined;
  return (
    <div className="border-b border-slate-200 bg-white">
      <div
        ref={listRef}
        role="tablist"
        aria-label="Job match sections"
        onKeyDown={onKey}
        onScroll={measure}
        className="jm-tabs flex overflow-x-auto px-1 sm:px-3"
        style={{ WebkitMaskImage: fade, maskImage: fade }}
      >
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[tab.id] = el;
              }}
              id={`jm-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls="jm-tabpanel"
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={`relative shrink-0 px-2 py-3.5 text-[13px] font-semibold transition-colors min-[400px]:px-3 min-[400px]:text-[14px] ${FOCUS} ${active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {tab.label}
              {tab.alert && <span className="absolute right-0.5 top-3 h-[6px] w-[6px] bg-[#d9856b]" aria-hidden="true" />}
              {tab.badge != null && <span className="sr-only">, {tab.badge} to look at</span>}
              {active && <span className="absolute inset-x-2 bottom-0 h-0.5 min-[400px]:inset-x-3" style={{ background: ACCENT }} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// A number you can tap: it opens the tab that explains it.
const Tile = ({ value, label, alert, onClick }) => (
  <button type="button" onClick={onClick} className={`flex flex-col items-start rounded-2xl bg-slate-50 px-3.5 py-3 text-left transition-colors hover:bg-slate-100 ${FOCUS}`}>
    <span className={`text-[22px] font-semibold leading-none tabular-nums ${alert ? 'text-[#8c3d27]' : 'text-slate-900'}`}>{value}</span>
    <span className="mt-1.5 text-[12.5px] leading-snug text-slate-500">{label}</span>
  </button>
);

const OverviewTab = ({ result, review, tiles, ready }) => (
  <div className="space-y-6">
    <NextMove move={insight(result, false)} />
    {review && review.summary && <p className="text-[14px] leading-relaxed text-slate-600">{review.summary}</p>}
    <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
      {tiles.map((tile) => (
        <Tile key={tile.label} {...tile} />
      ))}
    </div>
    <section>
      <h3 className="text-[15px] font-semibold text-slate-900">Where your points come from</h3>
      <div className="mt-3">
        <Breakdown parts={result.parts} ready={ready} />
      </div>
    </section>
    <p className="hidden items-start gap-2 text-[13px] leading-relaxed text-slate-500 sm:flex">
      <Icon d={ICON.shield} className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      Scored on your device as you type. Keywords are worth 70 points, the other three checks 10 each.
    </p>
  </div>
);

const CHIP_LIMIT = 12;

const ChipGroup = ({ title, items, tone, aside, note }) => {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, CHIP_LIMIT);
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
          {title}
          <span className="rounded-[5px] bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-500">{items.length}</span>
        </h3>
        {aside}
      </div>
      {note && <p className="mt-1 text-[13px] leading-snug text-slate-500">{note}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {shown.map((kw) => (
          <Chip key={kw.term} tone={tone(kw)}>
            {kw.term}
            {kw.partial && <span className="font-normal text-slate-400">via Office</span>}
          </Chip>
        ))}
      </div>
      {items.length > CHIP_LIMIT && (
        <button type="button" onClick={() => setAll((v) => !v)} className={`mt-2.5 rounded-md text-[13px] font-semibold text-slate-600 hover:text-slate-900 ${FOCUS}`}>
          {all ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
};

const KeywordsTab = ({ covered, missingSkills, hasMust, total }) => {
  const pct = total ? Math.round((covered.length / total) * 100) : 0;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13.5px] leading-snug text-slate-600">
          <span className="font-semibold text-slate-900">{covered.length} of {total}</span> keywords from the job are on your resume.
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${pct}% of the job's keywords found`}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg,#f0b6a3,${ACCENT})` }} />
        </div>
      </div>

      {missingSkills.length > 0 && (
        <ChipGroup
          title="Still missing"
          items={missingSkills}
          tone={(kw) => (kw.must ? 'must' : 'missing')}
          note="Work them in only where they’re true for you."
          aside={
            hasMust ? (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Square />
                Must-have
              </span>
            ) : null
          }
        />
      )}
      {covered.length > 0 && <ChipGroup title="On your resume" items={covered} tone={() => 'found'} />}
      {missingSkills.length === 0 && <p className="text-sm text-slate-700">No skill or tool from the job is missing.</p>}
    </div>
  );
};

const Panel = ({ result, target, data, onClose, onEdit }) => {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const shown = useCountUp(result.score, { ms: 1000, initial: 0 });
  const ready = useReveal();
  const titleId = useId();
  useOutfit();

  // The panel has four pages instead of one long scroll: Overview, To fix, Keywords, Requirements.
  const [tab, setTab] = useState('overview');
  const [focusId, setFocusId] = useState(null); // a finding the To fix page should open and scroll to
  const bodyRef = useRef(null);
  const heroRef = useRef(null);
  // A new tab starts at its top, just under the tabs; if the header is still showing it stays where it is.
  const openTab = useCallback((id) => {
    setTab(id);
    const body = bodyRef.current;
    if (body) body.scrollTop = Math.min(body.scrollTop, heroRef.current ? heroRef.current.offsetHeight : 0);
  }, []);

  // The dark score header is the top of the scrolling page, so on every tab it scrolls away like any other content and the tabs
  // stay at the top. A tab with little in it is padded to the height of the window (panelMin), so the header can always be
  // scrolled completely out of sight, whichever tab is open.
  const tabsRef = useRef(null);
  const [panelMin, setPanelMin] = useState(0);
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return undefined;
    const measure = () => setPanelMin(Math.max(0, body.clientHeight - (tabsRef.current ? tabsRef.current.offsetHeight : 0)));
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (observer) {
      observer.observe(body);
      if (tabsRef.current) observer.observe(tabsRef.current);
    }
    window.addEventListener('resize', measure);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Focus moves into the panel, Tab stays inside it, Escape closes it, and focus goes back to where it was.
  useEffect(() => {
    const before = document.activeElement;
    closeRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      } else if (event.key === 'Tab' && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll('button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])')).filter((el) => !el.closest('[inert]'));
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
  // Years of experience and education level get a card each (qualificationCheck.js); only qualifications the cards do not
  // read (a licence, a registration) stay as chips.
  const check = useMemo(() => analyseRequirements(target, data), [target, data]);
  const missingQuals = missing.filter(isQual).filter((kw) => !check.handled.has(norm(kw.term)));
  const index = tierIndex(result.score);
  const next = TIERS[index + 1];
  const tone = tierTone(index);
  const hasMust = missingSkills.some((k) => k.must);
  const review = useMemo(() => reviewResume(target, data, result), [target, data, result]);

  const totalKeywords = covered.length + missing.length;
  const unmet = check.items.filter((item) => item.status !== 'met').length;
  const hasRequirements = check.items.length > 0 || missingQuals.length > 0;
  const fixCount = review ? review.missing.length + review.improve.length : 0;
  const tabs = [
    { id: 'overview', label: 'Overview' },
    ...(review ? [{ id: 'fix', label: 'To fix', badge: fixCount || null, alert: review.missing.length > 0 }] : []),
    { id: 'keywords', label: 'Keywords', badge: missingSkills.length || null, alert: hasMust },
    ...(hasRequirements ? [{ id: 'requirements', label: 'Requirements', badge: unmet || null, alert: unmet > 0 }] : []),
  ];
  const page = tabs.some((t) => t.id === tab) ? tab : 'overview';
  const tiles = [
    { value: `${covered.length}/${totalKeywords}`, label: 'keywords found', onClick: () => openTab('keywords') },
    ...(review ? [{ value: fixCount, label: fixCount === 1 ? 'thing to fix' : 'things to fix', alert: review.missing.length > 0, onClick: () => openTab('fix') }] : []),
    ...(check.items.length > 0 ? [{ value: `${check.items.length - unmet}/${check.items.length}`, label: 'requirements met', alert: unmet > 0, onClick: () => openTab('requirements') }] : []),
  ];

  // "How to fix this" on a requirement card: the To fix page, with that finding open.
  const fixFor = (item) => {
    if (!review) return;
    const ids = new Set([...review.missing, ...review.improve].map((f) => f.id));
    const id = [`req-${item.id}`, item.kind === 'education' ? 'education' : 'work-empty'].find((candidate) => ids.has(candidate));
    if (!id) return;
    setFocusId(id);
    openTab('fix');
  };

  return createPortal(
    <div className="jm-root fixed inset-0 z-[58]" style={{ fontFamily: FONT }}>
      <style>{STYLE}</style>
      <div className="jm-fade absolute inset-0 bg-slate-950/50 backdrop-blur-[3px]" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="jm-panel absolute inset-x-0 bottom-0 flex h-[90vh] max-h-[90vh] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl lg:inset-x-auto lg:bottom-3 lg:right-3 lg:top-3 lg:h-auto lg:max-h-none lg:w-[450px] lg:rounded-[28px]"
      >
        {/* Header: the dark half. The score is the one loud thing here. It is the top of the scrolling page. */}
        <div ref={bodyRef} className="pro-scroll min-h-0 flex-1 overflow-y-auto">
        <div ref={heroRef} className="relative overflow-hidden px-5 pb-3.5 pt-4 text-white sm:px-6 sm:pb-6 sm:pt-6" style={{ background: 'linear-gradient(165deg,#0b1220 0%,#16213a 58%,#222f4d 100%)' }}>
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: ACCENT }} aria-hidden="true" />
          <span className="pointer-events-none absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/25 lg:hidden" aria-hidden="true" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-white/55">
                Job match{target.company ? <span className="font-normal text-white/45"> {'\u00B7'} {target.company}</span> : null}
              </p>
              <h2 id={titleId} className="mt-0.5 line-clamp-2 text-lg font-semibold leading-snug sm:text-[22px]">{tidyTitle(target.title) || 'Your target job'}</h2>
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

          <div className="relative mt-3 flex items-end justify-between gap-4 sm:mt-7">
            <p className="flex items-baseline leading-none" aria-hidden="true">
              <span className="text-[44px] font-semibold tabular-nums tracking-[-0.04em] sm:text-[76px]">{shown}</span>
              <span className="ml-1.5 text-base font-medium text-white/45 sm:text-lg">/100</span>
            </p>
            <div className="pb-1 text-right">
              <p className="inline-flex items-center gap-2 rounded-[5px] bg-white/10 py-1.5 pl-3 pr-3.5 text-sm font-medium ring-1 ring-white/10">
                <span className="h-2 w-2" style={{ background: tone }} aria-hidden="true" />
                {scoreLabel(result.score)}
              </p>
              <p className="mt-2 text-[13px] text-white/60">
                {next ? `${next.from - result.score} point${next.from - result.score === 1 ? '' : 's'} to ${next.name}` : 'Top band reached'}
              </p>
            </div>
          </div>

          <div className="relative mt-3 sm:mt-6">
            <TierMeter score={result.score} ready={ready} />
          </div>
        </div>

        <div ref={tabsRef} className="sticky top-0 z-10">
          <Tabs tabs={tabs} value={page} onChange={openTab} />
        </div>
        <div
          role="tabpanel"
          id="jm-tabpanel"
          aria-labelledby={`jm-tab-${page}`}
          className="px-5 pb-5 pt-5 sm:px-6 sm:pb-7 sm:pt-6"
          style={{ minHeight: panelMin }}
        >
          {page === 'overview' && <OverviewTab result={result} review={review} tiles={tiles} ready={ready} />}
          {page === 'fix' && review && <FixList review={review} focusId={focusId} onFocused={() => setFocusId(null)} />}
          {page === 'keywords' && <KeywordsTab covered={covered} missingSkills={missingSkills} hasMust={hasMust} total={totalKeywords} />}
          {page === 'requirements' && <RequirementsTab check={check} leftovers={missingQuals} ready={ready} onFix={review ? fixFor : undefined} />}
        </div>
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
  const result = useMemo(() => scoreMatch(target, data), [target, data]);
  const close = useCallback(() => setOpen(false), []);
  const show = useCallback(() => setOpen(true), []);
  if (!result) return null;

  // Sheet only: the parent decides when to open it (it mounts this when it wants the score).
  if (sheet) return <Panel result={result} target={target} data={data} onClose={onSheetClose || close} onEdit={onEdit} />;

  return (
    <>
      {card && <Card result={result} target={target} onOpen={show} />}
      <Dock result={result} onOpen={show} className={dockClassName} />
      {open && <Panel result={result} target={target} data={data} onClose={close} onEdit={onEdit} />}
    </>
  );
};

export default JobTargetBar;
