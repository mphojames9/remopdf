import React, { useCallback, useEffect, useRef, useState } from 'react';

/*
  Best-effort protection for the resume preview of people who are NOT Premium.

  A browser cannot truly block developer tools or screenshots, so this adds friction instead of a wall:
    - developer tools detected   -> the whole preview is unmounted (the templates are not in the page at all)
    - screenshot shortcuts, Win key, PrintScreen, window losing focus -> the preview is hidden instantly
    - right click, copy, drag, Ctrl+S / Ctrl+U / Ctrl+P / F12 / Ctrl+Shift+I|J|C -> blocked
    - a tiled "remopdf.site" watermark covers the pages; if it is removed or hidden the preview resets
  Premium users are never affected, and neither is `npm run dev`.

  Real protection is on the server: the clean PDF is only produced for Premium (see the note in the reply).
*/

const SHIELD_ID = 'rp-shield';
const STYLE_ID = 'rp-guard-style';
const HIDE_ATTR = 'data-rp-hide';
const POLL_MS = 900;
const MIN_LOCK_MS = 1500;
const HIDE_ON_BLUR = true; // hide the preview whenever the window loses focus (snipping tools, other windows)

const GUARD_CSS = `
html[${HIDE_ATTR}] .rp-protected { opacity: 0 !important; pointer-events: none !important; }
.rp-protected #resume-preview-content,
.rp-protected #resume-preview-content * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
.rp-protected img { -webkit-user-drag: none; user-drag: none; }
@media print { .rp-protected { display: none !important; } }
`;

const isEditable = (el) =>
  !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || ''));

// Docked developer tools shrink the page along one axis only. Browser zoom shrinks both, so it is ignored.
const looksDocked = () => {
  try {
    if (!window.matchMedia('(pointer: fine)').matches) return false; // phones, tablets and the Android app
    const dw = window.outerWidth - window.innerWidth;
    const dh = window.outerHeight - window.innerHeight;
    return (dw > 300 && dh < 160) || (dh > 300 && dw < 60);
  } catch {
    return false;
  }
};

// The console only reads this property when it is open and rendering the logged value.
const consoleOpen = () => {
  let open = false;
  try {
    const probe = new Image();
    Object.defineProperty(probe, 'id', { get() { open = true; return ''; } });
    // eslint-disable-next-line no-console
    console.debug(probe);
  } catch { /* ignore */ }
  return open;
};

// A `debugger` statement is free when developer tools are closed and pauses the page when they are open.
const pausedByDebugger = () => {
  try {
    const t0 = performance.now();
    new Function('debugger')(); // eslint-disable-line no-new-func
    return performance.now() - t0 > 120;
  } catch {
    return false;
  }
};

const devtoolsOpen = () => looksDocked() || consoleOpen() || pausedByDebugger();

const shieldIsIntact = () => {
  const el = document.getElementById(SHIELD_ID);
  if (!el || !el.isConnected) return false;
  const cs = window.getComputedStyle(el);
  return cs.display !== 'none' && cs.visibility === 'visible' && parseFloat(cs.opacity) >= 0.9 && el.offsetWidth > 0 && el.offsetHeight > 0;
};

export function usePreviewGuard(active) {
  const enabled = active && !import.meta.env?.DEV;
  const [locked, setLocked] = useState(false);
  const lockedAtRef = useRef(0);
  const shieldSeenRef = useRef(false);

  const lock = useCallback(() => {
    lockedAtRef.current = Date.now();
    setLocked(true);
  }, []);

  // Style rules, shortcuts and instant hiding.
  useEffect(() => {
    if (!enabled) return undefined;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = GUARD_CSS;
    document.head.appendChild(style);

    const root = document.documentElement;
    let timer = 0;
    const hide = (ms) => {
      root.setAttribute(HIDE_ATTR, '');
      window.clearTimeout(timer);
      if (ms) timer = window.setTimeout(show, ms);
    };
    const show = () => {
      window.clearTimeout(timer);
      if (document.hasFocus() && !document.hidden) root.removeAttribute(HIDE_ATTR);
    };

    const onKeyDown = (e) => {
      const k = String(e.key || '').toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      const devtoolsKey =
        e.key === 'F12' ||
        (mod && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) ||
        (mod && e.altKey && ['i', 'j', 'c', 'u'].includes(k));
      const pageKey = mod && !e.shiftKey && !e.altKey && ['u', 's', 'p'].includes(k);
      if (devtoolsKey || pageKey) {
        e.preventDefault();
        e.stopPropagation();
      }
      // Windows snipping (Win+Shift+S), the Windows key on its own, macOS Cmd+Shift+3/4/5.
      const macShot = e.metaKey && e.shiftKey && ['Digit3', 'Digit4', 'Digit5'].includes(e.code);
      const winSnip = e.metaKey && e.shiftKey && k === 's';
      if (k === 'meta' || k === 'printscreen' || macShot || winSnip) hide(2500);
    };
    const onKeyUp = (e) => {
      if (e.key === 'PrintScreen') {
        hide(2500);
        try { navigator.clipboard?.writeText('RemoPDF preview is protected'); } catch { /* ignore */ }
      }
    };
    const onContextMenu = (e) => { if (!isEditable(e.target)) e.preventDefault(); };
    const onCopy = (e) => {
      if (!isEditable(e.target) && e.target?.closest?.('.rp-protected')) e.preventDefault();
    };
    const onDragStart = (e) => { if (e.target?.closest?.('.rp-protected')) e.preventDefault(); };
    const onBlur = () => { if (HIDE_ON_BLUR) hide(0); };
    const onFocus = () => show();
    const onVisibility = () => (document.hidden ? hide(0) : show());

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('contextmenu', onContextMenu, true);
    window.addEventListener('copy', onCopy, true);
    window.addEventListener('cut', onCopy, true);
    window.addEventListener('dragstart', onDragStart, true);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearTimeout(timer);
      root.removeAttribute(HIDE_ATTR);
      style.remove();
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('contextmenu', onContextMenu, true);
      window.removeEventListener('copy', onCopy, true);
      window.removeEventListener('cut', onCopy, true);
      window.removeEventListener('dragstart', onDragStart, true);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);

  // Developer tools and watermark tampering. While locked the preview is not mounted, so only the
  // developer-tools check decides when it comes back (with a fresh, intact watermark).
  useEffect(() => {
    if (!enabled) {
      setLocked(false);
      return undefined;
    }
    const tick = () => {
      if (devtoolsOpen()) {
        shieldSeenRef.current = false;
        if (!locked) lock();
        else lockedAtRef.current = Date.now();
        return;
      }
      if (locked) {
        if (Date.now() - lockedAtRef.current >= MIN_LOCK_MS) setLocked(false);
        return;
      }
      if (document.getElementById(SHIELD_ID)) shieldSeenRef.current = true;
      if (shieldSeenRef.current && !shieldIsIntact()) {
        shieldSeenRef.current = false;
        lock();
      }
    };
    tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, locked, lock]);

  return { enabled, locked: enabled && locked };
}

const SHIELD_TILE = (() => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="200">' +
    '<text x="140" y="104" text-anchor="middle" transform="rotate(-28 140 100)" ' +
    'font-family="Arial,Helvetica,sans-serif" font-size="17" font-weight="700" fill="#0f172a" fill-opacity="0.11">' +
    'remopdf.site \u00b7 preview</text></svg>';
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

// Tiled watermark over the preview pages. It sits beside the pages, not inside them, so it is not in the PDF.
export const PreviewShield = () => (
  <div
    id={SHIELD_ID}
    aria-hidden="true"
    style={{
      position: 'absolute',
      inset: 0,
      zIndex: 20,
      pointerEvents: 'none',
      backgroundImage: SHIELD_TILE,
      backgroundSize: '280px 200px',
    }}
  />
);

export const PreviewLockScreen = ({ onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950 px-6 text-center">
    <div className="max-w-sm">
      <p className="text-lg font-semibold text-white">Preview paused</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        Close the browser developer tools to keep previewing your resume. It comes back by itself in a moment.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-6 rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none"
      >
        Close preview
      </button>
    </div>
  </div>
);
