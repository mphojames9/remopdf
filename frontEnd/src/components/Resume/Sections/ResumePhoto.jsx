import React from 'react';

/* -------------------------------------------------------------------------- */
/*  Profile photo: options, renderer and file reader.                         */
/*  Used by the Personal info form (live preview) and by every resume         */
/*  template, so the photo looks the same everywhere.                         */
/*                                                                            */
/*  Every export from the previous version is kept with the same shape, so    */
/*  existing imports and saved resumes keep working. New options (squircle,   */
/*  arch, ring) appear automatically wherever the form maps over the lists.   */
/* -------------------------------------------------------------------------- */

export const PHOTO_SHAPES = [
  { value: 'circle', label: 'Circle', radius: '50%' },
  // Softer, app-icon style corners
  { value: 'squircle', label: 'Squircle', radius: '28%' },
  { value: 'rounded', label: 'Rounded', radius: '12%' },
  // Round top, nearly square bottom
  { value: 'arch', label: 'Arch', radius: '50% 50% 8% 8%' },
  { value: 'square', label: 'Square', radius: '2px' },
];

export const PHOTO_SIZES = [
  { value: 'small', label: 'Small', px: 72 },
  { value: 'medium', label: 'Medium', px: 96 },
  { value: 'large', label: 'Large', px: 128 },
];

export const PHOTO_BORDERS = [
  { value: 'none', label: 'None', px: 0 },
  { value: 'thin', label: 'Thin', px: 1 },
  { value: 'thick', label: 'Thick', px: 3 },
  // A thin line floating just outside the photo, with a gap between
  { value: 'ring', label: 'Ring', px: 2 },
];

export const PHOTO_ZOOM_MIN = 1;
export const PHOTO_ZOOM_MAX = 3;

export const PHOTO_DEFAULTS = {
  shape: 'circle',
  size: 'medium',
  border: 'none',
  zoom: 1, // 1 = the whole photo, 3 = zoomed in 3x
  x: 50, // focus point, 0 = left edge, 100 = right edge
  y: 50, // focus point, 0 = top edge, 100 = bottom edge
};

const RING_GAP_PX = 3;

const clampNumber = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const findOption = (list, value, fallback) =>
  list.find((o) => o.value === value) || list.find((o) => o.value === fallback);

// Accepts anything (missing, partial, or hand-edited saved data) and returns a
// complete, valid style object.
export const normalizePhotoStyle = (style) => {
  const s = style && typeof style === 'object' ? style : {};
  return {
    shape: findOption(PHOTO_SHAPES, s.shape, PHOTO_DEFAULTS.shape).value,
    size: findOption(PHOTO_SIZES, s.size, PHOTO_DEFAULTS.size).value,
    border: findOption(PHOTO_BORDERS, s.border, PHOTO_DEFAULTS.border).value,
    zoom: clampNumber(s.zoom, PHOTO_ZOOM_MIN, PHOTO_ZOOM_MAX, PHOTO_DEFAULTS.zoom),
    x: clampNumber(s.x, 0, 100, PHOTO_DEFAULTS.x),
    y: clampNumber(s.y, 0, 100, PHOTO_DEFAULTS.y),
  };
};

/**
 * Draws the photo. Renders nothing when there is no photo.
 *   src          data URL of the photo
 *   style        the saved photo style (see PHOTO_DEFAULTS)
 *   borderColor  colour used when the border is not "none"
 *   sizePx       optional override of the size in pixels
 */
const ResumePhoto = ({ src, style, borderColor = '#334155', sizePx, className = '' }) => {
  if (!src) return null;

  const look = normalizePhotoStyle(style);
  const size = sizePx || findOption(PHOTO_SIZES, look.size, PHOTO_DEFAULTS.size).px;
  const radius = findOption(PHOTO_SHAPES, look.shape, PHOTO_DEFAULTS.shape).radius;
  const borderPx = findOption(PHOTO_BORDERS, look.border, PHOTO_DEFAULTS.border).px;
  const focus = `${look.x}% ${look.y}%`;
  const isRing = look.border === 'ring';

  // "Ring" is drawn as an outline so the photo keeps its full size and the
  // gap shows whatever colour sits behind it (works on any template).
  const edgeStyle = isRing
    ? { outline: `${borderPx}px solid ${borderColor}`, outlineOffset: RING_GAP_PX }
    : { border: borderPx ? `${borderPx}px solid ${borderColor}` : 'none' };

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-slate-100 ${className}`.trim()}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        boxSizing: 'border-box',
        ...edgeStyle,
      }}
    >
      <img
        src={src}
        alt="Profile photo"
        draggable={false}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: focus,
          transform: `scale(${look.zoom})`,
          transformOrigin: focus,
        }}
      />
      {/* Hairline inner edge keeps light or white-background photos crisp */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.08)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default ResumePhoto;

/* -------------------------------------------------------------------------- */
/*  Reading the uploaded file                                                 */
/* -------------------------------------------------------------------------- */

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_ACCEPT = ACCEPTED_TYPES.join(',');
const MAX_FILE_BYTES = 15 * 1024 * 1024; // refuse absurdly large originals
const MAX_EDGE_PX = 800; // longest side after resizing
const JPEG_QUALITY = 0.85;

/**
 * Reads an image file and returns a resized JPEG data URL (about 50-150 KB).
 * The whole resume is kept in localStorage, so a full-size phone photo (several
 * MB) would stop everything from saving. Rejects with a readable message.
 */
export const readPhotoFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file || !ACCEPTED_TYPES.includes(file.type)) {
      reject(new Error('Please choose a JPG, PNG or WebP image.'));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error('That photo is too large. Please choose one under 15 MB.'));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const longest = Math.max(img.naturalWidth, img.naturalHeight) || 1;
        const ratio = Math.min(1, MAX_EDGE_PX / longest);
        const width = Math.max(1, Math.round(img.naturalWidth * ratio));
        const height = Math.max(1, Math.round(img.naturalHeight * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; // JPEG has no transparency
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      } catch {
        reject(new Error("We couldn't process that photo. Please try a different one."));
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("We couldn't read that file as an image. Please try a JPG or PNG."));
    };

    img.src = url;
  });
