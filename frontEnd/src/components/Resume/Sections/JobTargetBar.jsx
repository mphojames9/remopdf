import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { scoreResume, scoreLabel } from './atsScore';
import { isQualification } from './skillFilter';

/*
  The live ATS match for the job the person is applying to.

    <JobTargetBar target={resumeData.jobTarget} data={resumeData} onEdit={() => ...} />

  It never sits on top of the form. On a desktop it is a small dock at the edge of the screen that shows the score
  and opens a slide-over panel; on a phone it is a card in the flow of the page (it scrolls away with the form)
  that opens the same panel as a bottom sheet. Nothing is pinned above the fields, so nothing is hidden.

  The score is counted on the device from the resume as it is right now (see atsScore.js), so it moves as the
  person types and never waits for the server. The panel shows where the points come from, which of the job's
  keywords the resume already has, and which are still missing, with qualifications kept apart from skills because
  a qualification is only worth adding when the person really holds it.
*/

const ACCENT = '#d9856b';
const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/70';
const DARK = 'linear-gradient(160deg,#0b1220,#1c2742)';

const STYLE = `
@keyframes jm-in-right{from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:none}}
@keyframes jm-in-up{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:none}}
@keyframes jm-fade{from{opacity:0}to{opacity:1}}
@keyframes jm-chip{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:none}}
@keyframes jm-delta{0%{opacity:0;transform:translateY(8px) scale(.85)}15%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}
.jm-panel{animation:jm-in-up .34s cubic-bezier(.2,.8,.2,1) both}
@media (min-width:1024px){.jm-panel{animation-name:jm-in-right}}
.jm-fade{animation:jm-fade .22s ease both}
.jm-chip{animation:jm-chip .4s cubic-bezier(.2,.8,.2,1) both}
.jm-delta{animation:jm-delta 2.2s ease both}
@media (prefers-reduced-motion:reduce){.jm-panel,.jm-fade,.jm-chip,.jm-delta{animation:none}}
`;

/* -------------------------------------------------------------------------- */
/*                                   helpers                                  */
/* -------------------------------------------------------------------------- */

const reducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia) && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

// A qualification (degree, diploma, a field of study the advert names) is not a skill the person can "work in".
const isQual = (kw) => kw.kind === 'credential' || isQualification(kw.term);

const byImportance = (a, b) => Number(Boolean(b.must)) - Number(Boolean(a.must));

const insight = (result, short = false) => {
  const { score, keywords, parts } = result;
  const skills = keywords.missing.filter((k) => !isQual(k)).sort(byImportance);
  const complete = parts.find((p) => p.id === 'complete');
  if (short) {
    if (score >= 85) return 'Strong match. Check every line is true.';
    if (skills.length && skills[0].must) return `Biggest gap: “${skills[0].term}”.`;
    if (skills.length) return `${skills.length} skill${skills.length === 1 ? '' : 's'} still missing.`;
    if (complete && complete.value < 1) return 'Finish the missing sections.';
    return 'Keywords covered. Add real figures to lift it.';
  }
  if (score >= 85) return 'Your resume speaks this job’s language. Read it through once more to be sure every line is true.';
  if (skills.length && skills[0].must) return `Biggest gap: “${skills[0].term}”. Add it where it’s true for you, in your work history or summary.`;
  if (skills.length) return `${skills.length} of the job’s skills ${skills.length === 1 ? 'is' : 'are'} not on your resume yet. Add only what you really do.`;
  if (complete && complete.value < 1) return 'Finish the missing sections so a scan can read your whole story.';
  return 'Your keywords are covered. Real figures in your achievements, where you have them, will lift this further.';
};

const TIPS = {
  keywords: 'Work a keyword in only where it is true for you.',
  title: 'Use the job’s title only if it really describes you.',
  results: 'Add real figures where you have them: team size, volumes, targets. Never round up.',
};

/* -------------------------------------------------------------------------- */
/*                                    pieces                                  */
/* -------------------------------------------------------------------------- */

// pct is 0..1. The arc is a soft salmon gradient on a faint track, drawn in a 100 x 100 box so it scales to any size.
const Ring = ({ pct, size, stroke = 9, animate = true, children }) => {
  const id = `jm${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const radius = 50 - stroke / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute inset-0" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6c3b2" />
            <stop offset="1" stopColor={ACCENT} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,.13)" strokeWidth={stroke} />
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
          style={animate && !reducedMotion() ? { transition: 'stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1)' } : undefined}
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

const Dock = ({ result, onOpen }) => {
  const gain = useScoreGain(result.score);
  const shown = useCountUp(result.score, { ms: 500 });
  return (
    <div className="fixed bottom-24 right-5 z-30 hidden lg:block">
      {gain && (
        <span key={gain.key} className="jm-delta pointer-events-none absolute -top-8 right-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#b8573b] shadow-md ring-1 ring-slate-200">
          +{gain.diff}
        </span>
      )}
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={`Job match ${result.score} out of 100. Open details`}
        className={`group flex items-center rounded-full p-1.5 text-white ring-1 ring-white/10 transition-[padding,transform] duration-300 hover:-translate-y-0.5 hover:pr-4 focus-visible:pr-4 motion-reduce:transition-none ${FOCUS}`}
        style={{ background: DARK, boxShadow: '0 10px 30px -6px rgba(11,18,32,.45)' }}
      >
        <Ring pct={result.score / 100} size={46} stroke={10}>
          <span className="text-[13px] font-bold tabular-nums">{shown}</span>
        </Ring>
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold tracking-wide opacity-0 transition-all duration-300 group-hover:ml-2.5 group-hover:max-w-[120px] group-hover:opacity-100 group-focus-visible:ml-2.5 group-focus-visible:max-w-[120px] group-focus-visible:opacity-100 motion-reduce:transition-none">
          Job match
        </span>
      </button>
    </div>
  );
};

const Card = ({ result, target, onOpen }) => {
  const left = result.keywords.missing.length;
  return (
    <section aria-label="Job match" className="mb-5 lg:hidden">
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className={`flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left text-white ring-1 ring-white/10 ${FOCUS}`}
        style={{ background: DARK, boxShadow: '0 12px 28px -12px rgba(11,18,32,.55)' }}
      >
        <Ring pct={result.score / 100} size={48} stroke={10}>
          <span className="text-sm font-bold tabular-nums">{result.score}</span>
        </Ring>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{target.title || 'Your target job'}</span>
          <span className="block truncate text-xs text-white/65">
            {scoreLabel(result.score)} · {left === 0 ? 'every keyword found' : `${left} keyword${left === 1 ? '' : 's'} to go`}
          </span>
        </span>
        <Icon d={ICON.chevron} className="h-5 w-5 shrink-0 text-white/50" />
      </button>
    </section>
  );
};

const Chip = ({ children, tone, delay = 0 }) => {
  const look = {
    found: 'border-slate-200 bg-white text-slate-700',
    must: 'border-[#d9856b]/45 bg-[#d9856b]/10 text-[#7a3b28]',
    missing: 'border-dashed border-slate-300 bg-slate-50 text-slate-600',
    qual: 'border-slate-200 bg-slate-100 text-slate-600',
  }[tone];
  return (
    <span className={`jm-chip inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${look}`} style={{ animationDelay: `${Math.min(delay, 12) * 28}ms` }}>
      {tone === 'found' && <Icon d={ICON.check} className="h-3 w-3 shrink-0 text-[#b8573b]" stroke={2.4} />}
      {tone === 'must' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#d9856b]" aria-hidden="true" />}
      {children}
    </span>
  );
};

const Group = ({ title, note, shortNote, count = 0, children }) => (
  <div className="mt-4 first:mt-0 sm:mt-6 sm:first:mt-0">
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {count > 0 && <span className="text-xs tabular-nums text-slate-400">{count}</span>}
    </div>
    {shortNote && <p className="mt-0.5 text-xs leading-snug text-slate-500 sm:hidden">{shortNote}</p>}
    {note && <p className="mt-0.5 hidden text-xs leading-relaxed text-slate-500 sm:block">{note}</p>}
    <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3">{children}</div>
  </div>
);

const MAX_CHIPS = 18;

const Panel = ({ result, target, onClose, onEdit }) => {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const shown = useCountUp(result.score, { ms: 900, initial: 0 });
  const titleId = useId();

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

  return createPortal(
    <div className="fixed inset-0 z-[58]">
      <style>{STYLE}</style>
      <div className="jm-fade absolute inset-0 bg-slate-950/45" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="jm-panel absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col overflow-hidden rounded-none bg-white shadow-2xl lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[430px]"
      >
        {/* Header: the dark half, with the score as the hero */}
        <div className="relative shrink-0 overflow-hidden px-4 pb-4 pt-4 text-white sm:px-5 sm:pb-6 sm:pt-5" style={{ background: 'linear-gradient(165deg,#0b1220 0%,#16213a 58%,#222f4d 100%)' }}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-30 blur-3xl" style={{ background: ACCENT }} aria-hidden="true" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50 sm:block">Job match</p>
              <h2 id={titleId} className="truncate text-base font-semibold leading-snug sm:mt-1 sm:text-lg">{target.title || 'Your target job'}</h2>
              {target.company && <p className="truncate text-xs text-white/60 sm:text-sm">{target.company}</p>}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={`-mr-1.5 -mt-1 flex h-8 w-8 shrink-0 sm:h-9 sm:w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white ${FOCUS}`}
            >
              <Icon d={ICON.close} className="h-5 w-5" />
            </button>
          </div>

          <div className="relative mt-3 flex items-center gap-3 sm:mt-6 sm:gap-5">
            <div className="h-[68px] w-[68px] shrink-0 sm:h-[116px] sm:w-[116px]">
              <Ring pct={shown / 100} size="100%" stroke={8} animate={false}>
                <span className="flex flex-col items-center leading-none">
                  <span className="text-xl font-semibold tabular-nums tracking-tight sm:text-4xl">{shown}</span>
                  <span className="mt-0.5 text-[8px] font-medium uppercase tracking-[0.1em] text-white/45 sm:mt-1 sm:text-[10px] sm:tracking-[0.14em]">of 100</span>
                </span>
              </Ring>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold sm:text-base">{scoreLabel(result.score)}</p>
              <p className="mt-0.5 text-xs leading-snug text-white/70 sm:hidden">{insight(result, true)}</p>
              <p className="mt-1.5 hidden text-[13px] leading-relaxed text-white/70 sm:block">{insight(result)}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="pro-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-5 sm:pb-6 sm:pt-6">
          <Group title="Where your points come from">
            <ul className="w-full space-y-3 sm:space-y-4">
              {result.parts.map((part) => {
                const pct = Math.round(part.value * 100);
                return (
                  <li key={part.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] font-semibold text-slate-800">{part.label}</span>
                      <span className="text-xs tabular-nums text-slate-500">
                        {Math.round(part.value * part.weight)} <span className="text-slate-300">/</span> {part.weight}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${part.label}: ${pct}%`}>
                      <div
                        className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg,#f0b6a3,${ACCENT})` }}
                      />
                    </div>
                    <p className="mt-1.5 hidden text-xs leading-snug text-slate-500 sm:block">{part.hint}</p>
                    {TIPS[part.id] && part.value < 1 && <p className="mt-0.5 hidden text-xs leading-snug text-slate-400 sm:block">{TIPS[part.id]}</p>}
                  </li>
                );
              })}
            </ul>
          </Group>

          <div className="mt-5 border-t border-slate-100 pt-5 sm:mt-8 sm:pt-7">
            {covered.length > 0 && (
              <Group title="Already on your resume" count={covered.length}>
                {covered.slice(0, MAX_CHIPS).map((kw, i) => (
                  <Chip key={kw.term} tone="found" delay={i}>{kw.term}</Chip>
                ))}
                {covered.length > MAX_CHIPS && <span className="px-1 py-1 text-xs text-slate-400">+{covered.length - MAX_CHIPS} more</span>}
              </Group>
            )}

            {missingSkills.length > 0 && (
              <Group title="Still missing" count={missingSkills.length} note="Work them in only where they’re true for you. Chips with a dot are must-haves for this job." shortNote="Dotted chips are must-haves.">
                {missingSkills.slice(0, MAX_CHIPS).map((kw, i) => (
                  <Chip key={kw.term} tone={kw.must ? 'must' : 'missing'} delay={i}>{kw.term}</Chip>
                ))}
                {missingSkills.length > MAX_CHIPS && <span className="px-1 py-1 text-xs text-slate-400">+{missingSkills.length - MAX_CHIPS} more</span>}
              </Group>
            )}

            {missingQuals.length > 0 && (
              <Group title="Qualifications the job lists" count={missingQuals.length} note="These count only if you hold them. If you do, add them under Education." shortNote="Add under Education only if you hold them.">
                {missingQuals.map((kw, i) => (
                  <Chip key={kw.term} tone="qual" delay={i}>{kw.term}</Chip>
                ))}
              </Group>
            )}

            {missing.length === 0 && <p className="text-sm text-slate-700">Every keyword from the job is on your resume.</p>}
          </div>

          <p className="mt-8 hidden text-xs leading-relaxed text-slate-400 sm:block">Scored on your device as you type. Keywords are worth 70 points, the other three checks 10 each.</p>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-2.5 border-t border-slate-100 bg-white px-4 py-3 sm:px-5 sm:py-3.5" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit();
            }}
            className={`flex items-center gap-1.5 rounded-full border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 ${FOCUS}`}
          >
            <Icon d={ICON.pencil} className="h-3.5 w-3.5" />
            Edit job
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`ml-auto rounded-full px-6 py-2 text-xs font-bold text-white transition-transform hover:-translate-y-0.5 motion-reduce:transition-none ${FOCUS}`}
            style={{ background: ACCENT, boxShadow: '0 8px 20px -8px rgba(217,133,107,.8)' }}
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

const JobTargetBar = ({ target, data, onEdit }) => {
  const [open, setOpen] = useState(false);
  const result = useMemo(() => scoreResume(target, data), [target, data]);
  const close = useCallback(() => setOpen(false), []);
  const show = useCallback(() => setOpen(true), []);
  if (!result) return null;

  return (
    <>
      <Card result={result} target={target} onOpen={show} />
      <Dock result={result} onOpen={show} />
      {open && <Panel result={result} target={target} onClose={close} onEdit={onEdit} />}
    </>
  );
};

export default JobTargetBar;
