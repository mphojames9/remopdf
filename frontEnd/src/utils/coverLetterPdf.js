/*
  Cover letter layout and PDF.

  layoutLetter() turns a letter model (see buildLetterModel in utils/coverLetter.js) into positioned lines on A4
  pages. The on-screen preview draws those lines as text and buildCoverLetterPdf() draws the very same lines with
  pdf-lib, so what the person sees is what they download (same line breaks, same page breaks).

  The PDF holds real text (Helvetica, selectable and readable by applicant-tracking systems), not a picture.
  All units are PDF points, measured from the top-left corner of the page.
*/

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const PAGE_W = 595.28;
export const PAGE_H = 841.89;

const MARGIN_X = 58;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 64;

const BODY_SIZE = 10.5;
const BODY_LEADING = 16;
const PARA_GAP = 10;
const BULLET_INDENT = 16;

export const COVER_LETTER_WATERMARK = 'Created with RemoPDF \u00b7 remopdf.site';

const INK = [15, 23, 42];
const MUTED = [71, 85, 105];
const FAINT = [148, 163, 184];
const DEFAULT_ACCENT = [30, 58, 138];

/* ------------------------------------------------------------------ fonts */

// pdf-lib's built-in Helvetica fonts. Their measurements are available without any download, so the browser can
// lay the letter out for the preview with exactly the widths the PDF will use.
let metricsPromise = null;
export function loadFontMetrics() {
  if (!metricsPromise) {
    metricsPromise = (async () => {
      const doc = await PDFDocument.create();
      return {
        regular: await doc.embedFont(StandardFonts.Helvetica),
        bold: await doc.embedFont(StandardFonts.HelveticaBold),
      };
    })().catch((err) => {
      metricsPromise = null; // a failed start is tried again next time
      throw err;
    });
  }
  return metricsPromise;
}

// Standard PDF fonts only hold Western European characters. Anything else is simplified (ā -> a) or left out
// instead of making the whole PDF fail.
const makeSafe = (value, supported) => {
  let out = '';
  let lost = false;
  for (const ch of String(value ?? '')) {
    const cp = ch.codePointAt(0);
    if (supported.has(cp)) {
      out += ch;
      continue;
    }
    if (/\s/.test(ch)) {
      out += ' ';
      continue;
    }
    const base = ch.normalize('NFD').charAt(0);
    if (base && supported.has(base.codePointAt(0))) {
      out += base;
      continue;
    }
    lost = true;
  }
  return { text: out, lost };
};

/**
 * Every string of the model made safe for the PDF fonts.
 * Returns { model, lost } where lost is true when some character had to be left out completely.
 */
export function sanitizeModel(model, fonts) {
  const supported = new Set(fonts.regular.getCharacterSet());
  let lost = false;
  const fix = (value) => {
    const result = makeSafe(value, supported);
    if (result.lost) lost = true;
    return result.text.replace(/ {2,}/g, ' ').trim();
  };
  const safe = {
    name: fix(model.name),
    profession: fix(model.profession),
    contacts: model.contacts.map(fix).filter(Boolean),
    dateText: fix(model.dateText),
    recipient: model.recipient.map(fix).filter(Boolean),
    salutation: fix(model.salutation),
    blocks: model.blocks
      .map((block) =>
        block.type === 'bullets'
          ? { type: 'bullets', items: block.items.map(fix).filter(Boolean) }
          : { type: 'p', text: fix(block.text) },
      )
      .filter((block) => (block.type === 'bullets' ? block.items.length > 0 : block.text)),
    closing: fix(model.closing),
    signName: fix(model.signName),
  };
  return { model: safe, lost };
}

/* ------------------------------------------------------------------ line breaking */

// Splits text into lines no wider than maxWidth. A word wider than a whole line is broken by characters.
function wrapText(text, font, size, maxWidth) {
  const width = (t) => font.widthOfTextAtSize(t, size);
  const words = String(text).split(' ').filter(Boolean);
  const lines = [];
  let line = '';

  const pushWord = (word) => {
    if (width(word) <= maxWidth) {
      line = word;
      return;
    }
    let chunk = '';
    for (const ch of word) {
      if (width(chunk + ch) > maxWidth && chunk) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    line = chunk;
  };

  words.forEach((word) => {
    if (!line) {
      pushWord(word);
      return;
    }
    const candidate = `${line} ${word}`;
    if (width(candidate) <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = '';
      pushWord(word);
    }
  });
  if (line) lines.push(line);
  return lines;
}

// "a@x.com · 071 000 0000 · Pretoria" broken into lines at the separators, never in the middle of an item.
function wrapContacts(parts, font, size, maxWidth) {
  const separator = '  \u00b7  ';
  const lines = [];
  let line = '';
  parts.forEach((part) => {
    const candidate = line ? `${line}${separator}${part}` : part;
    if (!line || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = part;
    }
  });
  if (line) lines.push(line);
  return lines;
}

/* ------------------------------------------------------------------ layout */

export const hexToRgb = (hex) => {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!match) return DEFAULT_ACCENT;
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * Lays the model out on A4 pages.
 *   fonts:   { regular, bold } from loadFontMetrics() (or the fonts of the document being written)
 *   options: { accent: '#rrggbb', watermark: string | null }
 * Returns { pages: [{ items }] }. An item is
 *   { type: 'text', x, baseline, text, size, bold, color: [r,g,b] }   baseline = distance from the top of the page
 *   { type: 'rect', x, top, width, height, color: [r,g,b] }
 */
export function layoutLetter(model, fonts, { accent, watermark = null } = {}) {
  const accentRgb = hexToRgb(accent);
  const contentW = PAGE_W - MARGIN_X * 2;
  const bottomLimit = PAGE_H - MARGIN_BOTTOM;

  const pages = [];
  let page = null;
  let y = MARGIN_TOP;

  const newPage = () => {
    page = { items: [] };
    pages.push(page);
    y = MARGIN_TOP;
  };
  // Starts a new page when `height` more points would run into the bottom margin.
  const need = (height) => {
    if (y + height > bottomLimit) newPage();
  };

  const baselineFor = (top, size, leading) => top + (leading - size) / 2 + size * 0.82;

  // One line of text that takes `leading` points of height.
  const line = (text, { size = BODY_SIZE, leading = BODY_LEADING, bold = false, color = INK, x = MARGIN_X } = {}) => {
    page.items.push({ type: 'text', x, baseline: baselineFor(y, size, leading), text, size, bold, color });
    y += leading;
  };

  // Puts a paragraph's lines on the page, moving to the next page when needed. A paragraph is never split so that
  // a single line is left alone at the bottom of one page or the top of the next.
  const flow = (lines, draw) => {
    let index = 0;
    while (index < lines.length) {
      const left = lines.length - index;
      let fit = Math.floor((bottomLimit - y) / BODY_LEADING);
      if (fit >= left) fit = left;
      else {
        if (left - fit < 2) fit = left - 2;
        if (fit < 2) {
          newPage();
          continue;
        }
      }
      for (let i = 0; i < fit; i += 1) draw(lines[index + i], index + i);
      index += fit;
      if (index < lines.length) newPage();
    }
  };

  newPage();

  /* Letterhead: name, profession, contact details, a thin line in the resume's colour. */
  let hasHeader = false;
  if (model.name) {
    wrapText(model.name, fonts.bold, 22, contentW).forEach((t) => line(t, { size: 22, leading: 27, bold: true }));
    hasHeader = true;
  }
  if (model.profession) {
    wrapText(model.profession, fonts.regular, 11.5, contentW).forEach((t) => line(t, { size: 11.5, leading: 17, color: accentRgb }));
    hasHeader = true;
  }
  if (model.contacts.length > 0) {
    y += model.name || model.profession ? 3 : 0;
    wrapContacts(model.contacts, fonts.regular, 9.5, contentW).forEach((t) => line(t, { size: 9.5, leading: 14, color: MUTED }));
    hasHeader = true;
  }
  if (hasHeader) {
    y += 9;
    page.items.push({ type: 'rect', x: MARGIN_X, top: y, width: contentW, height: 1.4, color: accentRgb });
    y += 1.4 + 28;
  }

  /* Date and recipient. */
  if (model.dateText) {
    line(model.dateText);
    y += 14;
  }
  if (model.recipient.length > 0) {
    model.recipient.forEach((t) => wrapText(t, fonts.regular, BODY_SIZE, contentW).forEach((l) => line(l)));
    y += 14;
  }

  /* Salutation. */
  line(model.salutation, { bold: false });
  y += PARA_GAP;

  /* Body. */
  model.blocks.forEach((block) => {
    if (block.type === 'p') {
      flow(wrapText(block.text, fonts.regular, BODY_SIZE, contentW), (t) => line(t));
      y += PARA_GAP;
      return;
    }
    block.items.forEach((item) => {
      flow(wrapText(item, fonts.regular, BODY_SIZE, contentW - BULLET_INDENT), (t, i) => {
        if (i === 0) {
          page.items.push({ type: 'text', x: MARGIN_X + 3, baseline: baselineFor(y, BODY_SIZE, BODY_LEADING), text: '\u2022', size: BODY_SIZE, bold: false, color: accentRgb });
        }
        line(t, { x: MARGIN_X + BULLET_INDENT });
      });
      y += 3;
    });
    y += PARA_GAP - 3;
  });

  /* Closing and signature stay together. */
  if (model.closing || model.signName) {
    const signatureHeight = (model.closing ? BODY_LEADING + 30 : 0) + (model.signName ? BODY_LEADING : 0);
    need(signatureHeight);
    if (model.closing) {
      line(model.closing);
      y += 30;
    }
    if (model.signName) line(model.signName, { bold: true });
  }

  /* Footer on every page: the free-version label, and page numbers when there is more than one page. */
  pages.forEach((p, index) => {
    const baseline = PAGE_H - 30;
    if (watermark) {
      const w = fonts.regular.widthOfTextAtSize(watermark, 8);
      p.items.push({ type: 'text', x: (PAGE_W - w) / 2, baseline, text: watermark, size: 8, bold: false, color: FAINT });
    }
    if (pages.length > 1) {
      const label = `${index + 1} / ${pages.length}`;
      const w = fonts.regular.widthOfTextAtSize(label, 8);
      p.items.push({ type: 'text', x: PAGE_W - MARGIN_X - w, baseline, text: label, size: 8, bold: false, color: FAINT });
    }
  });

  return { pages };
}

/* ------------------------------------------------------------------ the PDF file */

const toColor = ([r, g, b]) => rgb(r / 255, g / 255, b / 255);

/**
 * The letter as PDF bytes.
 *   model:   from buildLetterModel()
 *   options: { accent: '#rrggbb', watermark: string | null, title: string }
 */
export async function buildCoverLetterPdf(model, { accent, watermark = null, title = 'Cover letter' } = {}) {
  const doc = await PDFDocument.create();
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const { model: safe } = sanitizeModel(model, fonts);
  const { pages } = layoutLetter(safe, fonts, { accent, watermark });

  doc.setTitle(title);
  if (safe.name) doc.setAuthor(safe.name);
  doc.setCreator('RemoPDF');
  doc.setProducer('RemoPDF');

  pages.forEach((p) => {
    const pdfPage = doc.addPage([PAGE_W, PAGE_H]);
    p.items.forEach((item) => {
      if (item.type === 'rect') {
        pdfPage.drawRectangle({
          x: item.x,
          y: PAGE_H - item.top - item.height,
          width: item.width,
          height: item.height,
          color: toColor(item.color),
        });
        return;
      }
      if (!item.text) return;
      pdfPage.drawText(item.text, {
        x: item.x,
        y: PAGE_H - item.baseline,
        size: item.size,
        font: item.bold ? fonts.bold : fonts.regular,
        color: toColor(item.color),
      });
    });
  });

  return doc.save();
}
