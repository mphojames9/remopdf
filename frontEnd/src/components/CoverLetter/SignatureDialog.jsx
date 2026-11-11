import React, { useCallback, useEffect, useRef, useState } from 'react';
import { signatureFromCanvas, SignatureError, SIGNATURE_ERRORS } from '../../utils/letterSignature';

/**
 * "Draw your signature": a pad to sign on with a finger, a pen or the mouse.
 *
 * The strokes are kept as fractions of the pad's width and height, so the drawing survives the pad being resized
 * (rotating a phone) and is redrawn sharply, at a fixed large size, for the picture that goes on the letter.
 * The picture is trimmed to the ink and has a transparent background (see signatureFromCanvas in
 * utils/letterSignature.js).
 *
 * Props
 *  - onSave:  (signature) => void   { dataUrl, aspect, source: 'drawn' }
 *  - onClose: () => void
 */

const INK = '#111a45'; // a deep blue-black, like a good pen
const PAD_ASPECT = 2.6; // width : height of the drawing area
const EXPORT_WIDTH = 1500; // px; the drawing is redrawn this wide for the picture
const PEN = 0.0055; // pen width as a share of the pad's width

const clamp01 = (n) => Math.min(1, Math.max(0, n));

function drawStrokes(ctx, strokes, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, width * PEN);
  strokes.forEach((stroke) => {
    if (stroke.length === 1) {
      ctx.beginPath();
      ctx.arc(stroke[0].x * width, stroke[0].y * height, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(stroke[0].x * width, stroke[0].y * height);
    // Smooth curve through the midpoints of the recorded points, so a quick stroke does not look jagged.
    for (let i = 1; i < stroke.length - 1; i += 1) {
      const midX = ((stroke[i].x + stroke[i + 1].x) / 2) * width;
      const midY = ((stroke[i].y + stroke[i + 1].y) / 2) * height;
      ctx.quadraticCurveTo(stroke[i].x * width, stroke[i].y * height, midX, midY);
    }
    const last = stroke[stroke.length - 1];
    ctx.lineTo(last.x * width, last.y * height);
    ctx.stroke();
  });
}

const buttonBase =
  'inline-flex h-10 items-center justify-center rounded-full px-4 text-[13px] font-semibold transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-[#d9856b]/30 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none';
const primaryButton = `${buttonBase} bg-gradient-to-r from-[#e0906f] to-[#d9856b] px-5 font-bold text-white shadow-md shadow-[#d9856b]/30 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:shadow-none`;
const quietButton = `${buttonBase} text-slate-600 hover:bg-slate-100 hover:text-slate-900`;

export default function SignatureDialog({ onSave, onClose }) {
  const panelRef = useRef(null);
  const canvasRef = useRef(null);
  const strokes = useRef([]); // [[{ x, y }]], x and y as fractions of the pad
  const current = useRef(null); // the stroke being drawn
  const [inked, setInked] = useState(false);
  const [error, setError] = useState('');

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    drawStrokes(canvas.getContext('2d'), strokes.current, width, height);
  }, []);

  // Draw the empty pad at the right size, and again whenever it changes size.
  useEffect(() => {
    paint();
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paint]);

  // Focus starts inside the dialog; Escape closes it (and only it: the page behind ignores Escape while it is open).
  useEffect(() => {
    panelRef.current?.focus();
  }, []);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Tab stays inside the dialog.
  const keepFocus = (e) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll('button:not([disabled])'));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const pointOf = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: clamp01((e.clientX - rect.left) / rect.width), y: clamp01((e.clientY - rect.top) / rect.height) };
  };

  const onDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    current.current = [pointOf(e)];
    strokes.current.push(current.current);
    setInked(true);
    setError('');
    paint();
  };

  const onMove = (e) => {
    if (!current.current) return;
    const events = typeof e.nativeEvent.getCoalescedEvents === 'function' ? e.nativeEvent.getCoalescedEvents() : [];
    (events.length > 0 ? events : [e]).forEach((p) => current.current.push(pointOf(p)));
    paint();
  };

  const onUp = () => {
    current.current = null;
  };

  const undo = () => {
    strokes.current.pop();
    setInked(strokes.current.length > 0);
    paint();
  };

  const clear = () => {
    strokes.current = [];
    setInked(false);
    paint();
  };

  const save = () => {
    if (strokes.current.length === 0) {
      setError(SIGNATURE_ERRORS.empty);
      return;
    }
    try {
      // Redrawn large, so the picture is sharp however small the pad was on this screen.
      const out = document.createElement('canvas');
      out.width = EXPORT_WIDTH;
      out.height = Math.round(EXPORT_WIDTH / PAD_ASPECT);
      drawStrokes(out.getContext('2d'), strokes.current, out.width, out.height);
      onSave(signatureFromCanvas(out, 'drawn'));
    } catch (err) {
      setError(err instanceof SignatureError ? SIGNATURE_ERRORS[err.code] : 'The signature could not be saved. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-3 sm:items-center sm:p-6">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cl-sign-title"
        tabIndex={-1}
        onKeyDown={keepFocus}
        className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.5)] focus:outline-none sm:p-5"
      >
        <h2 id="cl-sign-title" className="m-0 text-[15px] font-semibold tracking-tight text-slate-900">
          Draw your signature
        </h2>
        <p className="mt-0.5 text-[12px] leading-snug text-slate-500">Sign with your finger, a pen or the mouse. It goes above your name on the letter.</p>

        <div className="relative mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50" style={{ aspectRatio: `${PAD_ASPECT} / 1` }}>
          <canvas
            ref={canvasRef}
            aria-label="Signature pad"
            className="absolute inset-0 h-full w-full cursor-crosshair"
            style={{ touchAction: 'none' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
          {!inked && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center text-[13px] text-slate-300">
              Sign here
            </span>
          )}
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 bottom-[22%] h-px bg-slate-300/80" />
        </div>

        {error && (
          <p role="alert" className="mt-2 text-[12px] leading-snug text-red-600">
            {error}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={undo} disabled={!inked} className={quietButton}>
            Undo
          </button>
          <button type="button" onClick={clear} disabled={!inked} className={quietButton}>
            Clear
          </button>
          <span className="flex-1" />
          <button type="button" onClick={onClose} className={quietButton}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={!inked} className={primaryButton}>
            Use signature
          </button>
        </div>
      </div>
    </div>
  );
}
