/* -------------------------------------------------------------------------- */
/*  Reads a resume file in the browser and returns "blocks" for the parser:   */
/*    { text, bullet, bold, italic, links: [{ text, href }] }                 */
/*                                                                            */
/*  .docx : unzipped with the browser's built-in DecompressionStream, so no   */
/*          extra package is needed. Bold, italic, bullets and hyperlinks are */
/*          kept, which is what lets the parser tell headings from content.   */
/*  .pdf  : read with pdf.js (npm i pdfjs-dist), loaded only when needed.     */
/*  .doc  : not readable here, the caller falls back to the API.              */
/* -------------------------------------------------------------------------- */

import { textToBlocks, clean } from './resumeTextParser.js';

/* --------------------------------- DOCX ------------------------------------ */

const utf8 = new TextDecoder('utf-8');

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot unzip files.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Minimal ZIP reader: finds every entry through the central directory. */
function zipEntries(buffer) {
  const view = new DataView(buffer);
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 22 - 65535); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a valid .docx file.');
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const entries = {};
  for (let n = 0; n < count; n += 1) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = utf8.decode(new Uint8Array(buffer, p + 46, nameLen));
    entries[name] = { method, compSize, localOffset };
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readEntry(buffer, entry) {
  const view = new DataView(buffer);
  const nameLen = view.getUint16(entry.localOffset + 26, true);
  const extraLen = view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + 30 + nameLen + extraLen;
  const data = new Uint8Array(buffer, start, entry.compSize);
  if (entry.method === 0) return utf8.decode(data);
  if (entry.method === 8) return utf8.decode(await inflateRaw(data));
  throw new Error('Unsupported compression in .docx file.');
}

const decodeXml = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

// <w:b/> means on, <w:b w:val="0"/> means off. <w:bCs/> is a different tag and never matches.
const flagOn = (rPr, tag) => {
  const m = rPr.match(new RegExp(`<w:${tag}(?:\\s+[^>]*)?/>`));
  if (!m) return false;
  const val = m[0].match(/w:val="([^"]*)"/);
  return !val || !/^(0|false|off|none)$/i.test(val[1]);
};

function parseRelationships(xml) {
  const map = {};
  for (const tag of xml.match(/<Relationship\b[^>]*>/g) || []) {
    const id = tag.match(/\bId="([^"]+)"/);
    const target = tag.match(/\bTarget="([^"]*)"/);
    if (id && target && /\/hyperlink"/.test(tag)) map[id[1]] = decodeXml(target[1]);
  }
  return map;
}

const PARAGRAPH_RE = /<w:p(?:\s[^>]*[^/>])?>[\s\S]*?<\/w:p>/g;
const TOKEN_RE = /<w:hyperlink\b[^>]*>|<\/w:hyperlink>|<w:r(?:\s[^>]*[^/>])?>[\s\S]*?<\/w:r>/g;
const RUN_PART_RE = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\b[^>]*\/>|<w:noBreakHyphen\s*\/>/g;

function paragraphToBlocks(pXml, rels) {
  const pPr = (pXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
  const styled = pPr.match(/<w:pStyle\s+w:val="([^"]*)"/);
  const style = styled ? styled[1] : '';
  const bullet = (/<w:numPr>/.test(pPr) && !/<w:numId\s+w:val="0"\s*\/>/.test(pPr)) || /^(ListParagraph|ListBullet|ListNumber)/i.test(style);

  const segments = [];
  const links = [];
  let activeLink = null;

  for (const token of pXml.match(TOKEN_RE) || []) {
    if (token.startsWith('<w:hyperlink')) {
      const rid = token.match(/r:id="([^"]+)"/);
      activeLink = { href: rid ? rels[rid[1]] || '' : '', text: '' };
      links.push(activeLink);
      continue;
    }
    if (token === '</w:hyperlink>') {
      activeLink = null;
      continue;
    }
    const rPr = (token.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
    const bold = flagOn(rPr, 'b') || /<w:rStyle\s+w:val="Strong"/.test(rPr);
    const italic = flagOn(rPr, 'i') || /<w:rStyle\s+w:val="Emphasis"/.test(rPr);
    let text = '';
    for (const part of token.matchAll(RUN_PART_RE)) {
      if (part[1] !== undefined) text += decodeXml(part[1]);
      else if (part[0].startsWith('<w:tab')) text += ' ';
      else if (part[0].startsWith('<w:br')) text += '\n';
      else text += '-';
    }
    if (!text) continue;
    segments.push({ text, bold, italic });
    if (activeLink) activeLink.text += text;
  }

  const full = segments.map((s) => s.text).join('');
  if (!clean(full)) return [];

  const visible = segments.filter((s) => clean(s.text));
  const bold = visible.length > 0 && visible.every((s) => s.bold) || /^(Heading\d|Title)/i.test(style);
  const italic = visible.length > 0 && visible.every((s) => s.italic);
  const keptLinks = links.filter((l) => l.href && !/^mailto:|^tel:/i.test(l.href));

  // A soft line break inside a bullet is just wrapping; elsewhere it separates lines.
  const lines = bullet ? [full.replace(/\n/g, ' ')] : full.split('\n');
  return lines
    .map((line, i) => ({ text: clean(line), bullet: bullet && i === 0, bold, italic, links: i === 0 ? keptLinks : [] }))
    .filter((b) => b.text);
}

export async function docxToBlocks(buffer) {
  const entries = zipEntries(buffer);
  const docName = Object.keys(entries).find((n) => /^word\/document\d*\.xml$/.test(n));
  if (!docName) throw new Error('This .docx file has no document body.');
  const xml = await readEntry(buffer, entries[docName]);

  const relName = docName.replace('word/', 'word/_rels/') + '.rels';
  const rels = entries[relName] ? parseRelationships(await readEntry(buffer, entries[relName])) : {};

  const blocks = [];
  for (const p of xml.match(PARAGRAPH_RE) || []) blocks.push(...paragraphToBlocks(p, rels));
  return blocks;
}

/* ---------------------------------- PDF ------------------------------------ */

const MAX_PDF_PAGES = 6;
const GAP_RATIO = 0.65; // a gap wider than this many text-heights starts a new column ("a | b")
const PAGE_FOOTER_RE = /^page\s+\d+(?:\s*(?:of|\/)\s*\d+)?$/i;
const STRONG_MARKER = /^[•●▪■◦○·‣⁃\uE000-\uF8FF]$/; // a bullet for sure
const DASH_MARKER = /^[-–—]$/; // a bullet only when it sits at the left margin

const pieceText = (col) => col.pieces.map((p) => (p.sp ? ' ' : '') + p.str).join('').trim();

/**
 * Turns the text items of ONE pdf.js page ({ str, transform, width, height, hasEOL }) into lines:
 *   { text, cols, bullet, x, textX, h }
 * - items on the same baseline form a line; a wide gap splits the line into columns, which is how
 *   "email | phone | address", skill chips and "Title ........ dates" stay apart
 * - a bullet marker is recognised by its position, so a wrapped line that merely starts with a dash
 *   is not turned into a bullet
 * - "Page 1 of 3" footers are dropped
 */
export function itemsToLines(items) {
  const raw = [];
  let line = null;
  const flush = () => {
    if (line) raw.push(line);
    line = null;
  };

  for (const item of items) {
    if (!item || typeof item.str !== 'string') continue;
    const x = item.transform[4];
    const y = item.transform[5];
    const h = item.height || Math.abs(item.transform[3]) || 10;
    const width = item.width || 0;
    if (!item.str.trim()) {
      if (item.hasEOL) flush();
      continue;
    }
    if (line && Math.abs(y - line.y) <= h * 0.5) {
      const gap = x - line.endX;
      if (gap > h * GAP_RATIO) {
        line.cols.push({ pieces: [{ str: item.str, x, sp: false }] });
      } else {
        const col = line.cols[line.cols.length - 1];
        const sp = gap > h * 0.12 && !item.str.startsWith(' ') && !col.pieces[col.pieces.length - 1].str.endsWith(' ');
        col.pieces.push({ str: item.str, x, sp });
      }
      line.endX = x + width - (item.str.endsWith(' ') ? h * 0.25 : 0);
    } else {
      flush();
      line = { y, h, x, endX: x + width - (item.str.endsWith(' ') ? h * 0.25 : 0), cols: [{ pieces: [{ str: item.str, x, sp: false }] }] };
    }
    if (item.hasEOL) flush();
  }
  flush();

  const margin = raw.length ? Math.min(...raw.map((l) => l.x)) : 0;
  const out = [];

  for (const l of raw) {
    let bullet = false;
    let textX = l.x;
    const first = l.cols[0].pieces[0];
    const lone = first.str.trim();
    const hasMore = l.cols[0].pieces.length > 1 || l.cols.length > 1;

    if (hasMore && (STRONG_MARKER.test(lone) || DASH_MARKER.test(lone))) {
      // The marker is an item of its own, followed by the text.
      bullet = STRONG_MARKER.test(lone) || l.x <= margin + l.h * 0.6;
      if (bullet) {
        l.cols[0].pieces.shift();
        if (l.cols[0].pieces.length === 0) l.cols.shift();
        const next = l.cols[0].pieces[0];
        textX = next.x;
        next.sp = false;
      }
    } else {
      // The marker shares an item with the text: "• Built things".
      const m = first.str.match(/^([•●▪■◦○·‣⁃\uE000-\uF8FF]|[-–—])\s+(.+)$/);
      if (m && (STRONG_MARKER.test(m[1]) || l.x <= margin + l.h * 0.6)) {
        bullet = true;
        first.str = m[2];
        textX = l.x + l.h * 1.2;
      }
    }

    const cols = l.cols.map(pieceText).filter(Boolean);
    const text = cols.join(' ');
    if (!text || PAGE_FOOTER_RE.test(text)) continue;
    out.push({ text, cols: cols.length > 1 ? cols : undefined, bullet, x: l.x, textX, h: l.h });
  }
  return out;
}

export async function pdfToBlocks(buffer) {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const lines = [];
  try {
    const pages = Math.min(doc.numPages, MAX_PDF_PAGES);
    for (let n = 1; n <= pages; n += 1) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      lines.push(...itemsToLines(content.items));
      page.cleanup();
    }
  } finally {
    doc.destroy();
  }
  return textToBlocks(lines);
}

/* --------------------------------- entry ----------------------------------- */

/** Resolves with parser blocks, or rejects when this file type cannot be read locally. */
export async function fileToBlocks(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const buffer = await file.arrayBuffer();
  if (ext === 'docx') return docxToBlocks(buffer);
  if (ext === 'pdf') return pdfToBlocks(buffer);
  throw new Error(`No local reader for .${ext} files.`);
}
