import React, { useEffect, useRef, useState } from 'react';
import ResumePhoto, {
  PHOTO_ACCEPT,
  PHOTO_BORDERS,
  PHOTO_DEFAULTS,
  PHOTO_SHAPES,
  PHOTO_SIZES,
  PHOTO_ZOOM_MAX,
  PHOTO_ZOOM_MIN,
  normalizePhotoStyle,
  readPhotoFile,
} from './ResumePhoto';

/* -------------------------------------------------------------------------- */
/*  Profile photo section.                                                    */
/*  Drop-in replacement for the old PhotoSection in PersonalInfo.jsx; same    */
/*  props, same saved data (photo, photoStyle).                               */
/*                                                                            */
/*  Framing is done by dragging the photo itself (or arrow keys), so the two  */
/*  "move" sliders are gone. Shape, size and border are picked from tiles     */
/*  that show what they look like.                                            */
/* -------------------------------------------------------------------------- */

const ACCENT = '#d9856b';
const PREVIEW_SCALE = 1.7; // preview is drawn larger than the resume version
const STAGE_HEIGHT = 248;
const PAN_EPSILON = 0.02;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const RANGE_CSS = `
.pf-range{-webkit-appearance:none;appearance:none;width:100%;height:20px;background:transparent;cursor:pointer}
.pf-range::-webkit-slider-runnable-track{height:4px;border-radius:999px;background:linear-gradient(to right,${ACCENT} var(--pf-fill),#e2e8f0 var(--pf-fill))}
.pf-range::-moz-range-track{height:4px;border-radius:999px;background:#e2e8f0}
.pf-range::-moz-range-progress{height:4px;border-radius:999px;background:${ACCENT}}
.pf-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;box-sizing:border-box;width:18px;height:18px;margin-top:-7px;border-radius:50%;background:#fff;border:2px solid ${ACCENT};box-shadow:0 1px 2px rgba(15,23,42,.25)}
.pf-range::-moz-range-thumb{box-sizing:border-box;width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid ${ACCENT}}
.pf-range:focus-visible{outline:2px solid rgba(217,133,107,.55);outline-offset:3px;border-radius:999px}
`;

/* --------------------------------- Icons ---------------------------------- */

const Icon = ({ d, className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
);

const ICONS = {
  camera:
    'M6.8 6.2a2.3 2.3 0 01-1.6 1c-.4.1-.8.1-1.1.2C3 7.6 2.3 8.5 2.3 9.6V18a2.3 2.3 0 002.2 2.3h15a2.3 2.3 0 002.2-2.3V9.6c0-1.1-.7-2-1.8-2.2l-1.1-.2a2.3 2.3 0 01-1.6-1l-.8-1.3a2.2 2.2 0 00-1.8-1 49 49 0 00-5.2 0 2.2 2.2 0 00-1.8 1l-.8 1.3zM16.5 12.8a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  swap: 'M7 7h11l-3-3M17 17H6l3 3',
  trash: 'M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6',
  reset: 'M4 12a8 8 0 108-8H7M7 4L4 7l3 3',
};

/* ------------------------------ Small controls ----------------------------- */

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60';

const ControlLabel = ({ children }) => (
  <div className="mb-2 text-xs font-semibold text-slate-800">{children}</div>
);

const OptionTile = ({ label, selected, onClick, children }) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border px-1 py-2.5 text-[11px] font-semibold transition-colors ${focusRing} ${
      selected
        ? 'border-[#d9856b] bg-[#d9856b]/10 text-[#8f442b]'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
    }`}
  >
    <span className="flex h-7 items-center justify-center">{children}</span>
    {label}
  </button>
);

const ShapeGlyph = ({ radius, selected }) => (
  <span
    className="block h-6 w-6"
    style={{ borderRadius: radius, background: selected ? ACCENT : '#cbd5e1' }}
  />
);

const BorderGlyph = ({ option, selected }) => {
  const line = selected ? ACCENT : '#94a3b8';
  const base = {
    display: 'block',
    boxSizing: 'border-box',
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: selected ? '#f2c9bb' : '#e2e8f0',
  };
  if (option.value === 'ring') {
    return <span style={{ ...base, outline: `2px solid ${line}`, outlineOffset: 2 }} />;
  }
  return <span style={{ ...base, border: option.px ? `${option.px}px solid ${line}` : 'none' }} />;
};

const RoundIconButton = ({ label, onClick, disabled, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-[#d9856b] hover:text-[#8f442b] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600 ${focusRing}`}
  >
    {children}
  </button>
);

/* ---------------------------------- Main ---------------------------------- */

const PhotoSection = ({ photo, photoStyle, updateData }) => {
  const inputRef = useRef(null);
  const drag = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [draft, setDraft] = useState(null); // {x, y} while the photo is being dragged
  const [aspect, setAspect] = useState(1); // width / height of the uploaded photo

  const look = normalizePhotoStyle(photoStyle);
  const view = draft ? { ...look, ...draft } : look;

  const setLook = (patch) => updateData('personal', 'photoStyle', { ...look, ...patch });

  // The drag maths needs the photo's proportions (see panGain below)
  useEffect(() => {
    if (!photo) return undefined;
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (alive && img.naturalWidth && img.naturalHeight) setAspect(img.naturalWidth / img.naturalHeight);
    };
    img.src = photo;
    return () => {
      alive = false;
    };
  }, [photo]);

  /* ----------------------------- File handling ----------------------------- */

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const dataUrl = await readPhotoFile(file);
      updateData('personal', 'photo', dataUrl);
      updateData('personal', 'photoStyle', { ...look, zoom: PHOTO_DEFAULTS.zoom, x: PHOTO_DEFAULTS.x, y: PHOTO_DEFAULTS.y });
    } catch (err) {
      setError(err && err.message ? err.message : "We couldn't use that file. Please try a different photo.");
    } finally {
      setBusy(false);
    }
  };

  const openPicker = () => inputRef.current && inputRef.current.click();
  const onPick = (e) => {
    handleFile(e.target.files && e.target.files[0]);
    e.target.value = '';
  };
  const removePhoto = () => {
    updateData('personal', 'photo', '');
    setError('');
  };

  const dropProps = {
    onDragOver: (e) => {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
      e.preventDefault();
      setDropping(true);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDropping(false);
    },
    onDrop: (e) => {
      e.preventDefault();
      setDropping(false);
      handleFile(e.dataTransfer.files && e.dataTransfer.files[0]);
    },
  };

  /* ------------------------------- Framing --------------------------------- */

  const sizeOption = PHOTO_SIZES.find((s) => s.value === look.size) || PHOTO_SIZES[1];
  const previewPx = Math.round(sizeOption.px * PREVIEW_SCALE);
  const radius = (PHOTO_SHAPES.find((s) => s.value === look.shape) || PHOTO_SHAPES[0]).radius;

  // How far the focus point (0-100) moves per box-width of drag. Derived from
  // how ResumePhoto draws the image: object-position + scale about the focus.
  // Zero means there is nothing to pan on that axis yet.
  const panGain = {
    x: Math.max(aspect, 1) * look.zoom - 1,
    y: Math.max(1 / aspect, 1) * look.zoom - 1,
  };
  const canPan = panGain.x > PAN_EPSILON || panGain.y > PAN_EPSILON;
  const isDefaultFraming = look.zoom === PHOTO_DEFAULTS.zoom && look.x === PHOTO_DEFAULTS.x && look.y === PHOTO_DEFAULTS.y;

  const setZoom = (z) => setLook({ zoom: clamp(Math.round(z * 100) / 100, PHOTO_ZOOM_MIN, PHOTO_ZOOM_MAX) });
  const resetFraming = () => setLook({ zoom: PHOTO_DEFAULTS.zoom, x: PHOTO_DEFAULTS.x, y: PHOTO_DEFAULTS.y });

  const onPointerDown = (e) => {
    if (!canPan || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, bx: look.x, by: look.y, last: { x: look.x, y: look.y } };
    setDraft({ x: look.x, y: look.y });
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = (e.clientX - d.sx) / previewPx;
    const dy = (e.clientY - d.sy) / previewPx;
    d.last = {
      x: panGain.x > PAN_EPSILON ? clamp(d.bx - (dx * 100) / panGain.x, 0, 100) : d.bx,
      y: panGain.y > PAN_EPSILON ? clamp(d.by - (dy * 100) / panGain.y, 0, 100) : d.by,
    };
    setDraft(d.last);
  };

  const endDrag = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDraft(null);
    setLook({ x: Math.round(d.last.x * 10) / 10, y: Math.round(d.last.y * 10) / 10 });
  };

  const onKeyDown = (e) => {
    const step = e.shiftKey ? 8 : 2;
    const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key] && canPan) {
      e.preventDefault();
      const [mx, my] = moves[e.key];
      setLook({ x: clamp(look.x + mx, 0, 100), y: clamp(look.y + my, 0, 100) });
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      setZoom(look.zoom + 0.25);
    } else if (e.key === '-') {
      e.preventDefault();
      setZoom(look.zoom - 0.25);
    }
  };

  const zoomFill = `${((look.zoom - PHOTO_ZOOM_MIN) / (PHOTO_ZOOM_MAX - PHOTO_ZOOM_MIN)) * 100}%`;
  const dragging = !!draft;

  /* -------------------------------- Render --------------------------------- */

  return (
    <div {...dropProps} className="relative mb-4 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
      <style>{RANGE_CSS}</style>
      <input ref={inputRef} type="file" accept={PHOTO_ACCEPT} onChange={onPick} className="hidden" tabIndex={-1} aria-hidden="true" />

      {!photo ? (
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400">
            <Icon d={ICONS.camera} className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Add a photo</p>
            <p className="mt-0.5 text-xs text-slate-500">Drop an image here or browse. JPG, PNG or WebP, up to 15 MB.</p>
          </div>
          <button
            type="button"
            onClick={openPicker}
            disabled={busy}
            className={`h-10 shrink-0 rounded-full bg-[#d9856b] px-5 text-xs font-bold text-white transition-colors hover:bg-[#cc7658] disabled:opacity-60 ${focusRing}`}
          >
            {busy ? 'Preparing photo…' : 'Choose photo'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row">
          {/* Stage: drag to frame, zoom underneath */}
          <div className="flex shrink-0 flex-col gap-3 lg:w-[260px]">
            <div className="flex items-center justify-center rounded-2xl bg-[#f4efe9]" style={{ height: STAGE_HEIGHT }}>
              <div
                role="group"
                tabIndex={0}
                aria-label="Photo framing"
                aria-describedby="pf-hint"
                onKeyDown={onKeyDown}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className={`relative select-none touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b] focus-visible:ring-offset-[10px] focus-visible:ring-offset-[#f4efe9] ${
                  canPan ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
                }`}
                style={{ width: previewPx, height: previewPx, borderRadius: radius }}
              >
                <ResumePhoto src={photo} style={view} sizePx={previewPx} />
                {/* Thirds guide, only while dragging */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 3 3"
                  preserveAspectRatio="none"
                  className={`pointer-events-none absolute inset-0 h-full w-full overflow-hidden transition-opacity motion-reduce:transition-none ${dragging ? 'opacity-100' : 'opacity-0'}`}
                  style={{ borderRadius: radius }}
                >
                  <path d="M1 0V3M2 0V3M0 1H3M0 2H3" stroke="#fff" strokeOpacity="0.75" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <RoundIconButton label="Zoom out" onClick={() => setZoom(look.zoom - 0.25)} disabled={look.zoom <= PHOTO_ZOOM_MIN}>
                <Icon d={ICONS.minus} className="h-3.5 w-3.5" />
              </RoundIconButton>
              <input
                type="range"
                aria-label="Zoom"
                className="pf-range"
                min={PHOTO_ZOOM_MIN}
                max={PHOTO_ZOOM_MAX}
                step={0.05}
                value={look.zoom}
                style={{ '--pf-fill': zoomFill }}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
              <RoundIconButton label="Zoom in" onClick={() => setZoom(look.zoom + 0.25)} disabled={look.zoom >= PHOTO_ZOOM_MAX}>
                <Icon d={ICONS.plus} className="h-3.5 w-3.5" />
              </RoundIconButton>
              <span className="w-10 shrink-0 text-right text-[11px] font-medium tabular-nums text-slate-500">{Math.round(look.zoom * 100)}%</span>
            </div>

            <div className="flex items-center justify-between gap-2 px-1">
              <p id="pf-hint" className="text-[11px] text-slate-500">
                {canPan ? 'Drag the photo to reposition it.' : 'Zoom in to reposition the photo.'}
              </p>
              <button
                type="button"
                onClick={resetFraming}
                disabled={isDefaultFraming}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:text-[#8f442b] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-slate-600 ${focusRing}`}
              >
                <Icon d={ICONS.reset} className="h-3 w-3" />
                Reset
              </button>
            </div>
          </div>

          {/* Style controls */}
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <div>
              <ControlLabel>Shape</ControlLabel>
              <div className="grid grid-cols-5 gap-2" role="group" aria-label="Shape">
                {PHOTO_SHAPES.map((o) => (
                  <OptionTile key={o.value} label={o.label} selected={look.shape === o.value} onClick={() => setLook({ shape: o.value })}>
                    <ShapeGlyph radius={o.radius} selected={look.shape === o.value} />
                  </OptionTile>
                ))}
              </div>
            </div>

            <div>
              <ControlLabel>Size</ControlLabel>
              <div className="flex rounded-full bg-slate-100 p-1" role="group" aria-label="Size">
                {PHOTO_SIZES.map((o) => {
                  const on = look.size === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setLook({ size: o.value })}
                      className={`inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-full text-xs font-semibold transition-colors ${focusRing} ${
                        on ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span className="block rounded-full bg-current opacity-50" style={{ width: o.px / 8, height: o.px / 8 }} />
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <ControlLabel>Border</ControlLabel>
              <div className="grid grid-cols-4 gap-2" role="group" aria-label="Border">
                {PHOTO_BORDERS.map((o) => (
                  <OptionTile key={o.value} label={o.label} selected={look.border === o.value} onClick={() => setLook({ border: o.value })}>
                    <BorderGlyph option={o} selected={look.border === o.value} />
                  </OptionTile>
                ))}
              </div>
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={openPicker}
                disabled={busy}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:border-[#d9856b] hover:text-[#8f442b] disabled:opacity-60 ${focusRing}`}
              >
                <Icon d={ICONS.swap} className="h-3.5 w-3.5" />
                {busy ? 'Preparing photo…' : 'Replace photo'}
              </button>
              <button
                type="button"
                onClick={removePhoto}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 ${focusRing}`}
              >
                <Icon d={ICONS.trash} className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      )}

      {dropping && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-3xl border-2 border-dashed border-[#d9856b] bg-white/90 text-sm font-semibold text-[#8f442b]">
          {photo ? 'Drop to replace your photo' : 'Drop to add your photo'}
        </div>
      )}
    </div>
  );
};

export default PhotoSection;
