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
@media (prefers-reduced-motion: no-preference) {
  @keyframes ts2-paper { from { opacity: 0; transform: translate(40px, 30px) rotate(1.5deg); } to { opacity: 1; transform: none; } }
  @keyframes ts2-copy { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
  .ts2-paper { animation: ts2-paper .7s cubic-bezier(.2,.8,.2,1) both; }
  .ts2-copy { animation: ts2-copy .5s cubic-bezier(.2,.8,.2,1) both; }
  .ts2-stage { transition: background-color .8s ease; }
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
  const [index, setIndex] = useState(0);
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

  const go = useCallback((i) => setIndex(((i % n) + n) % n), [n]);

  const card = TEMPLATE_CARDS[index];
  const { Template } = card;
  const choice = color !== undefined ? color : saved;
  const accent = choice || DEFAULT_ACCENT[card.id];
  const props = useMemo(() => getTemplateProps(accent), [accent]);
  const running = playing && inView && !hover && !focused;

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
            <div key={card.id} className="ts2-copy" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${n}`} aria-live={running ? 'off' : 'polite'}>
              <h2 className="ts2-display text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">{card.label}</h2>
              <p className="mt-4 max-w-sm text-lg leading-relaxed text-white/75">{card.note}</p>
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
            <div className="absolute bottom-0 left-1/2 w-[min(78%,400px)] -translate-x-1/2 translate-y-[14%] rotate-[-2deg]">
              <div key={card.id} className="ts2-paper">
                <TemplateThumb className="w-full rounded-[3px] shadow-[0_40px_80px_-24px_rgba(0,0,0,.65),0_8px_20px_-8px_rgba(0,0,0,.4)]">
                  <Template {...props} />
                </TemplateThumb>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
