import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TEMPLATE_CARDS, DEFAULT_ACCENT, TemplateThumb, getTemplateProps, saveChoice, readColor } from './TemplateShowcase';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&display=swap');
.ts2-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; }
.ts2-stage { position: relative; isolation: isolate; background: var(--ts-accent); background: color-mix(in srgb, var(--ts-accent) 50%, #05080f); }
.ts2-stage::before {
  content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background: radial-gradient(ellipse 50% 70% at 72% 50%, rgba(255,255,255,.16), transparent 70%);
}
@keyframes ts2-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.ts2-fill { transform-origin: left; animation: ts2-fill var(--ts2-dur, 5500ms) linear forwards; }
/* Every slide stays mounted and stacked in one grid cell; only opacity/transform change. */
.ts2-layer { grid-area: 1 / 1; opacity: 0; visibility: hidden; }
.ts2-layer[data-live='true'] { will-change: transform, opacity; }
.ts2-layer[data-on='true'] { opacity: 1; visibility: visible; }
.ts2-paper { transform: translate3d(48px, 32px, 0) rotate(1.5deg); }
.ts2-paper[data-past='true'] { transform: translate3d(-48px, -24px, 0) rotate(-1.5deg); }
.ts2-copy { transform: translate3d(0, 16px, 0); }
.ts2-copy[data-past='true'] { transform: translate3d(0, -12px, 0); }
.ts2-layer[data-on='true'] { transform: translate3d(0, 0, 0) rotate(0deg); }
/* Motion tuning: raise --ts2-speed to slow everything down, lower it to speed up. */
.ts2-stage { --ts2-speed: 1; --ts2-ease: cubic-bezier(.45, .05, .2, 1); }
@media (prefers-reduced-motion: no-preference) {
  /* leaving: gentle fade while it drifts away, hidden once the move finishes */
  .ts2-layer {
    transition:
      opacity calc(.7s * var(--ts2-speed)) ease,
      transform calc(1.3s * var(--ts2-speed)) var(--ts2-ease),
      visibility 0s linear calc(1.3s * var(--ts2-speed));
  }
  /* entering: waits for the old slide to clear, then eases in */
  .ts2-layer[data-on='true'] {
    transition:
      opacity calc(1s * var(--ts2-speed)) ease calc(.3s * var(--ts2-speed)),
      transform calc(1.5s * var(--ts2-speed)) var(--ts2-ease) calc(.2s * var(--ts2-speed)),
      visibility 0s;
  }
  .ts2-stage { transition: background-color calc(1.5s * var(--ts2-speed)) ease; }
}
`;

const CTA =
  'inline-flex items-center justify-center rounded-full bg-[#d9856b] px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-[#e39478] active:scale-[.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';
const ICON_BTN =
  'flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition hover:bg-white/10 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white';

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
    <path d={d} />
  </svg>
);

/**
 * Auto-advancing slideshow of the resume templates.
 * Props: onUseTemplate({ template, color }) (optional, shows the CTA), color (hex | null; omit to follow the saved choice),
 *        interval (ms per slide), className.
 */
export default function TemplateSlideshow({ onUseTemplate, color, interval = 5500, className = '' }) {
  const n = TEMPLATE_CARDS.length;
  const rootRef = useRef(null);
  const touchX = useRef(null);
  const [pos, setPos] = useState({ index: 0, prev: -1 });
  const { index, prev } = pos;
  const [playing, setPlaying] = useState(
    () => typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(true);
  const [saved, setSaved] = useState(null);

  useEffect(() => { setSaved(readColor()); }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const go = useCallback(
    (i) => setPos((p) => { const next = ((i % n) + n) % n; return next === p.index ? p : { index: next, prev: p.index }; }),
    [n],
  );

  const card = TEMPLATE_CARDS[index];
  const choice = color !== undefined ? color : saved;
  const accent = choice || DEFAULT_ACCENT[card.id];
  const running = playing && inView && !hover && !focused;

  // There are ~30 layouts, so only the current, the one leaving and its two neighbours stay mounted.
  // Neighbours are pre-mounted so the next slide is ready before its transition starts.
  const live = new Set([index, prev, (index + 1) % n, (index - 1 + n) % n]);

  // Built once per colour choice, so hovering/pausing never re-renders the resumes, and a slide
  // is already mounted (off-screen) before it becomes the active one.
  const papers = useMemo(
    () =>
      TEMPLATE_CARDS.map((c) => {
        const { Template } = c;
        return (
          <TemplateThumb className="w-full rounded-[3px] shadow-[0_40px_80px_-24px_rgba(0,0,0,.65),0_8px_20px_-8px_rgba(0,0,0,.4)]">
            <Template {...getTemplateProps(choice || DEFAULT_ACCENT[c.id])} />
          </TemplateThumb>
        );
      }),
    [choice],
  );

  const use = () => {
    saveChoice(card.id, choice);
    onUseTemplate?.({ template: card.id, color: choice });
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') go(index + 1);
    else if (e.key === 'ArrowLeft') go(index - 1);
  };
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const d = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(d) > 50) go(index + (d < 0 ? 1 : -1));
  };

  return (
    <section ref={rootRef} aria-roledescription="carousel" aria-label="Resume layouts" className={`py-12 sm:py-20 ${className}`} onKeyDown={onKeyDown}>
      <style>{CSS}</style>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          className="ts2-stage grid overflow-hidden rounded-[28px] text-white lg:grid-cols-2"
          style={{ '--ts-accent': accent, '--ts2-dur': `${interval}ms` }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocus={(e) => { if (e.target.matches?.(':focus-visible')) setFocused(true); }}
          onBlur={() => setFocused(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex flex-col justify-between gap-12 p-7 sm:p-12 lg:min-h-[560px] lg:p-14">
            <div className="grid" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${n}`} aria-live={running ? 'off' : 'polite'}>
              {TEMPLATE_CARDS.map((c, i) => (
                <div key={c.id} className="ts2-layer ts2-copy" data-on={i === index} data-past={i < index} aria-hidden={i !== index}>
                  <h2 className="ts2-display text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">{c.label}</h2>
                  <p className="mt-4 max-w-sm text-lg leading-relaxed text-white/75">{c.note}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6">
              <div className="flex flex-wrap items-center gap-3">
                {onUseTemplate && (
                  <button type="button" onClick={use} className={CTA}>Start with this template</button>
                )}
                <div className="flex gap-2 sm:ml-auto">
                  <button type="button" onClick={() => go(index - 1)} aria-label="Previous layout" className={ICON_BTN}><Icon d="M15 5l-7 7 7 7" /></button>
                  <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause slideshow' : 'Play slideshow'} className={ICON_BTN}>
                    <Icon d={playing ? 'M8 5v14M16 5v14' : 'M8 5v14l11-7z'} />
                  </button>
                  <button type="button" onClick={() => go(index + 1)} aria-label="Next layout" className={ICON_BTN}><Icon d="M9 5l7 7-7 7" /></button>
                </div>
              </div>

              <div className="flex gap-3" role="group" aria-label="Choose a layout">
                {TEMPLATE_CARDS.map((c, i) => {
                  const active = i === index;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => go(i)}
                      aria-label={`Show ${c.label}`}
                      aria-current={active}
                      className="group flex-1 rounded-sm py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <span className="block h-1 overflow-hidden rounded-full bg-white/25">
                        <span
                          key={active ? 'on' : 'off'}
                          className={`block h-full bg-white ${active ? 'ts2-fill' : ''}`}
                          style={active ? { animationPlayState: running ? 'running' : 'paused' } : { transform: i < index ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: 'left' }}
                          onAnimationEnd={active ? () => go(index + 1) : undefined}
                        />
                      </span>
                      <span className={`mt-2 block text-sm font-semibold transition-colors ${active ? 'text-white' : 'text-white/60 group-hover:text-white/90'}`}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="relative min-h-[340px] sm:min-h-[420px] lg:min-h-0">
            <div className="absolute bottom-0 left-1/2 grid w-[min(78%,400px)] -translate-x-1/2 translate-y-[14%] rotate-[-2deg]">
              {TEMPLATE_CARDS.map((c, i) => (
                <div key={c.id} className="ts2-layer ts2-paper" data-on={i === index} data-live={live.has(i)} data-past={i < index} aria-hidden={i !== index}>
                  {live.has(i) && papers[i]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
