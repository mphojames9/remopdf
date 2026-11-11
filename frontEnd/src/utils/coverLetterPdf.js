/*
  Cover letter layout and PDF.

  layoutLetter() turns a letter model (see buildLetterModel in utils/coverLetter.js) into positioned lines on A4
  pages. The on-screen preview draws those lines as text and buildCoverLetterPdf() draws the very same lines with
  pdf-lib, so what the person sees is what they download (same line breaks, same page breaks).

  The PDF holds real text (Helvetica, plus Times for the name and signature in the Banner design, selectable and
  readable by applicant-tracking systems), not a picture.
  All units are PDF points, measured from the top-left corner of the page.

  Two designs (options.template): 'banner' (the default: a tinted banner with the name set large in a serif, a thin
  divider and the contact details beside it, then an airy letter) and 'classic' (the plain letterhead with a thin
  line). The tint, divider and signature take their colour from the resume's colour.
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

// The designs. `marginX` is the left and right margin of the whole letter; `ink` is the colour of the letter's text.
export const DEFAULT_TEMPLATE = 'banner';
const STYLES = {
  classic: { marginX: MARGIN_X, size: BODY_SIZE, leading: BODY_LEADING, paraGap: PARA_GAP, ink: INK },
  banner: { marginX: 54, size: BODY_SIZE, leading: 16.5, paraGap: 11, ink: [46, 44, 40] },
};

// Banner design measurements.
const BANNER_TOP = 38;
const BANNER_PAD_X = 30;
const BANNER_PAD_Y = 28;
const BANNER_MIN_H = 126;
const BANNER_BASE = [245, 238, 220]; // the warm ivory the resume's colour is stirred into

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
        serif: await doc.embedFont(StandardFonts.TimesRoman),
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
// Hyphen-like characters (the AI likes U+2011, the non-breaking hyphen) have no glyph in Helvetica and used to be left
// out, so "high-gloss" printed as "highgloss". They become a plain hyphen; invisible characters disappear.
const LOOKALIKES = new Map([
  ['\u2010', '-'],
  ['\u2011', '-'],
  ['\u2012', '-'],
  ['\u2015', '-'],
  ['\u2043', '-'],
  ['\u2212', '-'],
  ['\u00ad', ''],
  ['\u200b', ''],
  ['\u200c', ''],
  ['\u200d', ''],
  ['\ufeff', ''],
]);

const makeSafe = (value, supported) => {
  let out = '';
  let lost = false;
  for (const original of String(value ?? '')) {
    const ch = LOOKALIKES.has(original) ? LOOKALIKES.get(original) : original;
    if (ch === '') continue;
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

// `amount` (0 to 1) of colour b stirred into colour a.
const mix = (a, b, amount) => a.map((v, i) => Math.round(v * (1 - amount) + b[i] * amount));

// "Mpho James Matli" -> ["Mpho James", "Matli"]: the surname goes on its own line, as large names are set.
const splitName = (name) => {
  const words = String(name || '').split(' ').filter(Boolean);
  if (words.length < 2) return words;
  return [words.slice(0, -1).join(' '), words[words.length - 1]];
};

export const hexToRgb = (hex) => {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!match) return DEFAULT_ACCENT;
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * Lays the model out on A4 pages.
 *   fonts:   { regular, bold, serif } from loadFontMetrics() (or the fonts of the document being written)
 *   options: { accent: '#rrggbb', watermark: string | null, template: 'banner' | 'classic' }
 * Returns { pages: [{ items }] }. An item is
 *   { type: 'text', x, baseline, text, size, bold, serif?, color: [r,g,b] }   baseline = distance from the top of the page
 *   { type: 'rect', x, top, width, height, color: [r,g,b] }
 */
export function layoutLetter(model, fonts, { accent, watermark = null, template = DEFAULT_TEMPLATE } = {}) {
  const design = STYLES[template] ? template : DEFAULT_TEMPLATE;
  const style = STYLES[design];
  const MX = style.marginX;
  const BODY = style.size;
  const LEADING = style.leading;
  const GAP = style.paraGap;
  const INK_COLOR = style.ink;

  const accentRgb = hexToRgb(accent);
  const contentW = PAGE_W - MX * 2;
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
  const line = (text, { size = BODY, leading = LEADING, bold = false, serif = false, color = INK_COLOR, x = MX } = {}) => {
    page.items.push({ type: 'text', x, baseline: baselineFor(y, size, leading), text, size, bold, ...(serif ? { serif: true } : {}), color });
    y += leading;
  };

  // Puts a paragraph's lines on the page, moving to the next page when needed. A paragraph is never split so that
  // a single line is left alone at the bottom of one page or the top of the next.
  const flow = (lines, draw) => {
    let index = 0;
    while (index < lines.length) {
      const left = lines.length - index;
      let fit = Math.floor((bottomLimit - y) / LEADING);
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

  /* Letterhead. */
  const hasName = Boolean(model.name);
  const hasProfession = Boolean(model.profession);
  const hasContacts = model.contacts.length > 0;
  const hasHeader = hasName || hasProfession || hasContacts;

  if (design === 'classic') {
    /* Name, profession, contact details, a thin line in the resume's colour. */
    if (hasName) wrapText(model.name, fonts.bold, 22, contentW).forEach((t) => line(t, { size: 22, leading: 27, bold: true }));
    if (hasProfession) wrapText(model.profession, fonts.regular, 11.5, contentW).forEach((t) => line(t, { size: 11.5, leading: 17, color: accentRgb }));
    if (hasContacts) {
      y += hasName || hasProfession ? 3 : 0;
      wrapContacts(model.contacts, fonts.regular, 9.5, contentW).forEach((t) => line(t, { size: 9.5, leading: 14, color: MUTED }));
    }
    if (hasHeader) {
      y += 9;
      page.items.push({ type: 'rect', x: MX, top: y, width: contentW, height: 1.4, color: accentRgb });
      y += 1.4 + 28;
    }
  } else if (hasHeader) {
    /* Banner: a tinted block. The name is set large in a serif on the left (surname on its own line, the
       profession under it), a thin divider, and the contact details one per line on the right. */
    const deep = mix(accentRgb, [0, 0, 0], 0.55); // name, divider and signature
    const tint = mix(BANNER_BASE, accentRgb, 0.07); // the banner's colour
    const soft = mix(deep, tint, 0.1); // the profession
    const WARM = [58, 55, 50]; // contact details

    const leftExists = hasName || hasProfession;
    const sideBySide = leftExists && hasContacts;
    const innerW = contentW - BANNER_PAD_X * 2;
    const leftW = sideBySide ? contentW * 0.6 - BANNER_PAD_X - 16 : innerW;
    const dividerX = MX + contentW * 0.6;
    const rightX = dividerX + 22;
    const rightW = MX + contentW - 18 - rightX;

    // Left block: the name as large as fits, then the profession.
    let nameLines = splitName(model.name);
    let nameSize = 40;
    const widest = (size) => Math.max(0, ...nameLines.map((t) => fonts.serif.widthOfTextAtSize(t, size)));
    while (nameSize > 22 && widest(nameSize) > leftW) nameSize -= 1;
    nameLines = nameLines.flatMap((t) => wrapText(t, fonts.serif, nameSize, leftW));
    const nameLead = nameSize * 1.07;
    const professionLines = hasProfession ? wrapText(model.profession, fonts.regular, 10.5, leftW) : [];
    const professionLead = 15;
    const leftH = nameLines.length * nameLead + (professionLines.length > 0 ? (nameLines.length > 0 ? 11 : 0) + professionLines.length * professionLead : 0);

    // Right block: each contact detail on its own line (long ones wrap inside the column).
    const contactWidth = sideBySide ? rightW : innerW;
    const contactGroups = model.contacts.map((c) => wrapText(c, fonts.regular, 9.5, contactWidth));
    const CONTACT_LEAD = 14.5;
    const CONTACT_GAP = 4;
    const rightH = contactGroups.reduce((sum, g) => sum + g.length * CONTACT_LEAD, 0) + Math.max(0, contactGroups.length - 1) * CONTACT_GAP;

    // Without a name or profession the contact details take the left side on their own.
    const blockH = sideBySide ? Math.max(leftH, rightH) : leftExists ? leftH : rightH;
    const bannerH = Math.max(BANNER_MIN_H, blockH + BANNER_PAD_Y * 2);
    const bannerTop = BANNER_TOP;

    page.items.push({ type: 'rect', x: MX, top: bannerTop, width: contentW, height: bannerH, color: tint });
    if (sideBySide) page.items.push({ type: 'rect', x: dividerX, top: bannerTop, width: 1.4, height: bannerH, color: deep });

    if (leftExists) {
      let top = bannerTop + (bannerH - leftH) / 2;
      nameLines.forEach((t) => {
        page.items.push({ type: 'text', x: MX + BANNER_PAD_X, baseline: baselineFor(top, nameSize, nameLead), text: t, size: nameSize, bold: false, serif: true, color: deep });
        top += nameLead;
      });
      if (professionLines.length > 0) {
        top += nameLines.length > 0 ? 11 : 0;
        professionLines.forEach((t) => {
          page.items.push({ type: 'text', x: MX + BANNER_PAD_X, baseline: baselineFor(top, 10.5, professionLead), text: t, size: 10.5, bold: false, color: soft });
          top += professionLead;
        });
      }
    }
    if (hasContacts) {
      let top = bannerTop + (bannerH - rightH) / 2;
      const x = sideBySide ? rightX : MX + BANNER_PAD_X;
      contactGroups.forEach((group) => {
        group.forEach((t) => {
          page.items.push({ type: 'text', x, baseline: baselineFor(top, 9.5, CONTACT_LEAD), text: t, size: 9.5, bold: false, color: WARM });
          top += CONTACT_LEAD;
        });
        top += CONTACT_GAP;
      });
    }
    y = bannerTop + bannerH + 36;
  }

  /* Date and recipient. */
  const airy = design === 'banner';
  if (model.dateText) {
    line(model.dateText);
    y += airy ? 22 : 14;
  }
  if (model.recipient.length > 0) {
    let first = true;
    model.recipient.forEach((t) => {
      wrapText(t, fonts.regular, BODY, contentW).forEach((l) => line(l, { bold: airy && first }));
      first = false;
    });
    y += airy ? 22 : 14;
  }

  /* Salutation. */
  line(model.salutation, { bold: airy });
  y += airy ? 12 : GAP;

  /* Body. */
  model.blocks.forEach((block) => {
    if (block.type === 'p') {
      flow(wrapText(block.text, fonts.regular, BODY, contentW), (t) => line(t));
      y += GAP;
      return;
    }
    block.items.forEach((item) => {
      flow(wrapText(item, fonts.regular, BODY, contentW - BULLET_INDENT), (t, i) => {
        if (i === 0) {
          page.items.push({ type: 'text', x: MX + 3, baseline: baselineFor(y, BODY, LEADING), text: '\u2022', size: BODY, bold: false, color: airy ? mix(accentRgb, [0, 0, 0], 0.55) : accentRgb });
        }
        line(t, { x: MX + BULLET_INDENT });
      });
      y += 3;
    });
    y += GAP - 3;
  });

  /* Closing and signature stay together. The banner design signs in the serif of its heading. */
  if (model.closing || model.signName) {
    const signSize = airy ? 16 : BODY;
    const signLead = airy ? 22 : LEADING;
    const signatureHeight = (model.closing ? LEADING + 30 : 0) + (model.signName ? signLead : 0);
    need(signatureHeight);
    if (model.closing) {
      line(model.closing);
      y += 30;
    }
    if (model.signName) {
      if (airy) line(model.signName, { size: signSize, leading: signLead, serif: true, color: mix(accentRgb, [0, 0, 0], 0.55) });
      else line(model.signName, { bold: true });
    }
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
      p.items.push({ type: 'text', x: PAGE_W - MX - w, baseline, text: label, size: 8, bold: false, color: FAINT });
    }
  });

  return { pages };
}

/* ------------------------------------------------------------------ the PDF file */

const toColor = ([r, g, b]) => rgb(r / 255, g / 255, b / 255);

/**
 * The letter as PDF bytes.
 *   model:   from buildLetterModel()
 *   options: { accent: '#rrggbb', watermark: string | null, title: string, template: 'banner' | 'classic' }
 */
export async function buildCoverLetterPdf(model, { accent, watermark = null, title = 'Cover letter', template = DEFAULT_TEMPLATE } = {}) {
  const doc = await PDFDocument.create();
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    serif: await doc.embedFont(StandardFonts.TimesRoman),
  };

  const { model: safe } = sanitizeModel(model, fonts);
  const { pages } = layoutLetter(safe, fonts, { accent, watermark, template });

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
        font: item.serif ? fonts.serif : item.bold ? fonts.bold : fonts.regular,
        color: toColor(item.color),
      });
    });
  });

  return doc.save();
}
