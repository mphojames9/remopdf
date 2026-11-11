/*
  The signature on a cover letter.

  The person draws it (components/CoverLetter/SignatureDialog.jsx) or uploads a photo or scan of one. Either way it
  ends up as a small transparent PNG of ink only, trimmed to the ink, so it sits in the gap above the typed name and
  the preview and the PDF draw the very same picture:

      { dataUrl: 'data:image/png;base64,...', aspect: width / height, source: 'drawn' | 'uploaded' }

  It is kept with the letter on this device (utils/coverLetter.js), never sent anywhere: the PDF is made in the browser.

  The pixel work (removing the paper from a photo, finding the ink) is plain functions over RGBA bytes so it can be
  tested without a browser; only signatureFromCanvas() and signatureFromFile() at the bottom use the DOM.
*/

export const SIGNATURE_PREFIX = 'data:image/png;base64,';
export const MAX_SIGNATURE_CHARS = 250000; // the whole data URL; keeps the saved letter small
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// How big the signature is drawn on the page, in PDF points: at most this wide and this tall, in its own proportions.
export const SIGN_MAX_W = 140;
export const SIGN_MAX_H = 40;

// Widths to try when exporting, widest first (140 pt is about 580 px at print quality).
const EXPORT_WIDTHS = [640, 480, 360];

/* ------------------------------------------------------------------ the saved value */

/** Anything read back from storage (or handed to the layout) becomes a valid signature, or null. */
export function normalizeSignature(value) {
  if (!value || typeof value !== 'object') return null;
  const { dataUrl, aspect, source } = value;
  if (typeof dataUrl !== 'string' || dataUrl.length > MAX_SIGNATURE_CHARS || !dataUrl.startsWith(SIGNATURE_PREFIX)) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dataUrl.slice(SIGNATURE_PREFIX.length))) return null;
  const ratio = Number(aspect);
  if (!Number.isFinite(ratio) || ratio < 0.5 || ratio > 15) return null;
  return { dataUrl, aspect: Math.round(ratio * 1000) / 1000, source: source === 'uploaded' ? 'uploaded' : 'drawn' };
}

/** The size on the page, in points. */
export function signatureSize(aspect) {
  const height = Math.min(SIGN_MAX_H, SIGN_MAX_W / aspect);
  return { width: height * aspect, height };
}

/* ------------------------------------------------------------------ pixels (RGBA bytes, no DOM) */

/**
 * Turns a photo or scan of ink on paper into ink on a transparent background, in place.
 * The paper's own brightness is measured (so grey or yellowish paper still works), pixels that are as bright as the
 * paper become transparent, and darker ones become ink. A picture that already has a transparent background is left
 * alone. Returns { changed, inkShare }: whether anything was done, and the share of the picture that is now ink.
 */
export function removePaper(data) {
  const pixels = data.length / 4;
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 200) clear += 1;
  if (clear > pixels * 0.02) return { changed: false, inkShare: 0 };

  const luma = new Float32Array(pixels);
  const histogram = new Uint32Array(256);
  for (let p = 0; p < pixels; p += 1) {
    const l = 0.299 * data[p * 4] + 0.587 * data[p * 4 + 1] + 0.114 * data[p * 4 + 2];
    luma[p] = l;
    histogram[Math.min(255, Math.round(l))] += 1;
  }
  // The paper is the bright majority: its level is the 80th percentile of brightness.
  let seen = 0;
  let paper = 255;
  for (let level = 0; level < 256; level += 1) {
    seen += histogram[level];
    if (seen >= pixels * 0.8) {
      paper = Math.max(level, 60);
      break;
    }
  }

  let ink = 0;
  for (let p = 0; p < pixels; p += 1) {
    const coverage = (paper - luma[p]) / paper; // 0 = paper, 1 = black
    const alpha = Math.min(1, Math.max(0, (coverage - 0.12) / 0.4));
    const i = p * 4;
    if (alpha < 0.02) {
      data[i + 3] = 0;
      continue;
    }
    // Ink keeps its own hue (blue pen stays blue) but a little darker, so it reads as ink and not as a faded scan.
    data[i] = Math.round(data[i] * 0.7);
    data[i + 1] = Math.round(data[i + 1] * 0.7);
    data[i + 2] = Math.round(data[i + 2] * 0.7);
    data[i + 3] = Math.round(alpha * 255);
    if (alpha > 0.5) ink += 1;
  }
  return { changed: true, inkShare: ink / pixels };
}

/**
 * The smallest box around the ink, with a little room, or null when there is none.
 * A row or column counts only if at least two of its pixels are inked, so one speck of dust does not stretch the box.
 */
export function inkBounds(data, width, height, minAlpha = 24) {
  const rows = new Uint32Array(height);
  const cols = new Uint32Array(width);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] >= minAlpha) {
        rows[y] += 1;
        cols[x] += 1;
      }
    }
  }
  const first = (counts) => counts.findIndex((n) => n >= 2);
  const last = (counts) => {
    for (let i = counts.length - 1; i >= 0; i -= 1) if (counts[i] >= 2) return i;
    return -1;
  };
  const top = first(rows);
  const bottom = last(rows);
  const left = first(cols);
  const right = last(cols);
  if (top < 0 || left < 0 || bottom < top || right < left) return null;
  const pad = Math.max(2, Math.round(Math.max(right - left, bottom - top) * 0.03));
  const x = Math.max(0, left - pad);
  const y = Math.max(0, top - pad);
  return { x, y, width: Math.min(width, right + pad + 1) - x, height: Math.min(height, bottom + pad + 1) - y };
}

/* ------------------------------------------------------------------ the browser parts */

export class SignatureError extends Error {
  // code: 'empty' (no ink found) | 'type' | 'size' (file too big) | 'unreadable' | 'dark' (not ink on a light background)
  constructor(code) {
    super(code);
    this.name = 'SignatureError';
    this.code = code;
  }
}

export const SIGNATURE_ERRORS = {
  empty: 'We could not find any ink there. Draw your signature, or use a clear photo of it on plain paper.',
  type: 'Please choose a PNG, JPG or WebP picture.',
  size: 'That picture is too large. Please choose one under 8 MB.',
  unreadable: 'That picture could not be opened. Please try another one.',
  dark: 'That does not look like a signature on light paper. Try a photo of your signature in good light, on plain white paper.',
};

const ctxOf = (canvas) => canvas.getContext('2d', { willReadFrequently: true });

/** A canvas holding ink on a transparent background -> a trimmed signature. Throws SignatureError('empty'). */
export function signatureFromCanvas(canvas, source = 'drawn') {
  const { width, height } = canvas;
  const box = inkBounds(ctxOf(canvas).getImageData(0, 0, width, height).data, width, height);
  if (!box) throw new SignatureError('empty');
  for (const target of EXPORT_WIDTHS) {
    const scale = Math.min(1, target / box.width);
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(box.width * scale));
    out.height = Math.max(1, Math.round(box.height * scale));
    out.getContext('2d').drawImage(canvas, box.x, box.y, box.width, box.height, 0, 0, out.width, out.height);
    const signature = normalizeSignature({ dataUrl: out.toDataURL('image/png'), aspect: out.width / out.height, source });
    if (signature) return signature;
  }
  throw new SignatureError('size');
}

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new SignatureError('unreadable'));
    };
    img.src = url;
  });

/** A photo, scan or PNG of a signature -> a trimmed signature on a transparent background. Throws SignatureError. */
export async function signatureFromFile(file) {
  if (!file || !/^image\/(png|jpe?g|webp)$/i.test(file.type || '')) throw new SignatureError('type');
  if (file.size > MAX_UPLOAD_BYTES) throw new SignatureError('size');
  const img = await loadImage(file);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  if (!longest) throw new SignatureError('unreadable');
  const scale = Math.min(1, 1400 / longest);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = ctxOf(canvas);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { changed, inkShare } = removePaper(pixels.data);
  if (changed && inkShare > 0.45) throw new SignatureError('dark');
  ctx.putImageData(pixels, 0, 0);
  return signatureFromCanvas(canvas, 'uploaded');
}
