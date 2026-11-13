import React from 'react';

/*
  Full-screen loading screen for "Preview" in the resume builder.

    {previewLoading && <PreviewLoadingOverlay accent={accentColor} />}

  Opening the preview renders the whole resume, so on a slow phone the tap can seem to do nothing for a
  moment. The parent shows this first, lets the browser paint it, then mounts the preview, and removes it
  when the preview is on screen.

  It fades in only after a short delay (a CSS animation delay, which keeps running while the page is busy),
  so a preview that opens quickly never flashes a loading screen. It looks like the "Preparing your PDF"
  card in the preview so the two feel like one family.
*/

const STYLE = `
@keyframes pvl-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pvl-rise { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes pvl-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes pvl-fan-l { 0%, 100% { transform: rotate(-9deg) translateX(-13px); } 50% { transform: rotate(-14deg) translateX(-19px); } }
@keyframes pvl-fan-r { 0%, 100% { transform: rotate(9deg) translateX(13px); } 50% { transform: rotate(14deg) translateX(19px); } }
@keyframes pvl-write { 0% { transform: scaleX(0); opacity: 1; } 30%, 82% { transform: scaleX(1); opacity: 1; } 100% { transform: scaleX(1); opacity: 0; } }
@keyframes pvl-glow { 0%, 100% { opacity: .14; transform: scale(.92); } 50% { opacity: .28; transform: scale(1.06); } }
.pvl-overlay { opacity: 0; animation: pvl-fade .2s ease-out 140ms both; }
.pvl-card { animation: pvl-rise .26s cubic-bezier(.22,1,.36,1) 140ms both; }
.pvl-stack { position: relative; width: 120px; height: 100px; }
.pvl-glow {
  position: absolute; left: 50%; top: 50%; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 9999px;
  background: radial-gradient(circle, var(--pvl-accent, #2563eb) 0%, transparent 68%); filter: blur(10px);
  animation: pvl-glow 2.4s ease-in-out infinite;
}
.pvl-sheet {
  position: absolute; top: 9px; left: 50%; width: 60px; height: 80px; margin-left: -30px; display: block; overflow: hidden;
  border-radius: 9px; background: #fff; box-shadow: 0 0 0 1px rgba(15,23,42,.07), 0 8px 20px -6px rgba(15,23,42,.25);
}
.pvl-sheet-l { transform: rotate(-9deg) translateX(-13px); background: #f8fafc; animation: pvl-fan-l 2.4s ease-in-out infinite; }
.pvl-sheet-r { transform: rotate(9deg) translateX(13px); background: #f1f5f9; animation: pvl-fan-r 2.4s ease-in-out infinite; }
.pvl-sheet-front { animation: pvl-float 2.4s ease-in-out infinite; }
.pvl-head { display: flex; align-items: center; gap: 5px; height: 21px; padding: 0 7px; background-color: var(--pvl-accent, #2563eb); background-image: linear-gradient(135deg, var(--pvl-accent, #2563eb), color-mix(in srgb, var(--pvl-accent, #2563eb) 60%, #020617)); }
.pvl-avatar { flex: none; width: 10px; height: 10px; border-radius: 9999px; background: rgba(255,255,255,.85); }
.pvl-head-lines { display: flex; flex: 1; flex-direction: column; gap: 3px; }
.pvl-body { display: flex; flex-direction: column; gap: 4px; padding: 8px 7px; }
.pvl-line { display: block; height: 3px; border-radius: 9999px; background: #cbd5e1; transform-origin: left center; animation: pvl-write 2.4s cubic-bezier(.4,0,.2,1) infinite; animation-delay: calc(var(--i, 0) * .17s); }
.pvl-line.is-head { height: 2.5px; background: rgba(255,255,255,.8); }
.pvl-line.is-title { background: var(--pvl-accent, #2563eb); }
@media (prefers-reduced-motion: reduce) {
  .pvl-overlay, .pvl-card { animation: none; opacity: 1; }
  .pvl-glow, .pvl-sheet-l, .pvl-sheet-r, .pvl-sheet-front, .pvl-line { animation: none; }
}
`;

const PreviewLoadingOverlay = ({ accent = '#2563eb', title = 'Opening your preview', text = 'Laying out your pages. This only takes a moment.' }) => (
  <div
    className="pvl-overlay fixed inset-0 z-[70] flex cursor-wait items-center justify-center bg-slate-950/50 px-6 backdrop-blur-sm"
    aria-busy="true"
  >
    <style>{STYLE}</style>
    <div
      role="status"
      aria-live="polite"
      style={{ '--pvl-accent': accent }}
      className="pvl-card w-full max-w-[19rem] rounded-[28px] bg-white px-8 pb-8 pt-9 text-center shadow-[0_28px_70px_-14px_rgba(2,6,23,0.5)] ring-1 ring-slate-900/5"
    >
      <div className="pvl-stack mx-auto" aria-hidden="true">
        <span className="pvl-glow" />
        <span className="pvl-sheet pvl-sheet-l" />
        <span className="pvl-sheet pvl-sheet-r" />
        <span className="pvl-sheet pvl-sheet-front">
          <span className="pvl-head">
            <span className="pvl-avatar" />
            <span className="pvl-head-lines">
              <span className="pvl-line is-head" style={{ '--i': 0, width: '90%' }} />
              <span className="pvl-line is-head" style={{ '--i': 1, width: '60%' }} />
            </span>
          </span>
          <span className="pvl-body">
            <span className="pvl-line is-title" style={{ '--i': 2, width: '40%' }} />
            <span className="pvl-line" style={{ '--i': 3, width: '100%' }} />
            <span className="pvl-line" style={{ '--i': 4, width: '86%' }} />
            <span className="pvl-line" style={{ '--i': 5, width: '62%' }} />
            <span className="pvl-line is-title" style={{ '--i': 6, width: '40%' }} />
            <span className="pvl-line" style={{ '--i': 7, width: '94%' }} />
          </span>
        </span>
      </div>
      <p className="mt-6 text-[16px] font-semibold tracking-tight text-slate-900">{title}</p>
      <p className="mt-1.5 text-[13px] leading-snug text-slate-500">{text}</p>
    </div>
  </div>
);

export default PreviewLoadingOverlay;
