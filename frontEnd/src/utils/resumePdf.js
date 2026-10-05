// Builds a real, downloadable PDF from the resume's rendered A4 pages.
//
// Each page is drawn exactly as it looks in the preview (so every template, colour,
// photo and page number matches), then an invisible text layer is laid over it so the
// PDF stays searchable / selectable and ATS parsers can read the words.
//
// No window.print() is involved, so it works in the Android WebView.
//
//   npm i html2canvas-pro
//   (html2canvas-pro is a drop-in fork of html2canvas that also understands modern CSS
//    colours such as oklch(), which Tailwind v4 uses. pdf-lib is already in the project.)

import html2canvas from 'html2canvas-pro';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const A4_W = 595.28; // PDF points
const A4_H = 841.89;

// Characters Helvetica can't encode are mapped or dropped (the invisible text layer only).
const CHAR_MAP = {
  '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"',
  '\u2013': '-', '\u2014': '-', '\u2022': '-', '\u2026': '...',
};
const toLatin1 = (text) => text
  .replace(/[\u2018\u2019\u201C\u201D\u2013\u2014\u2022\u2026]/g, (ch) => CHAR_MAP[ch])
  .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');

// Invisible words placed exactly where the real words are on the page.
function addTextLayer(page, root, font, pxToPt) {
  const rootRect = root.getBoundingClientRect();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(parent.tagName)) continue;
    const cs = window.getComputedStyle(parent);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const upper = cs.textTransform === 'uppercase';

    const re = /\S+/g;
    const value = node.nodeValue || '';
    let match;
    while ((match = re.exec(value))) {
      try {
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const r = range.getBoundingClientRect();
        if (!r.width || !r.height) continue;

        const word = toLatin1(upper ? match[0].toUpperCase() : match[0]);
        if (!word) continue;

        page.drawText(`${word} `, {
          x: (r.left - rootRect.left) * pxToPt,
          y: A4_H - (r.top - rootRect.top + r.height * 0.82) * pxToPt,
          size: Math.max(1, r.height * pxToPt * 0.8),
          font,
          opacity: 0,
        });
      } catch {
        // skip a word that can't be placed; the page image is still complete
      }
    }
  }
}

/**
 * @param {HTMLElement[]} pageNodes  the `.a4-page` elements of the preview, in order
 * @param {{ pageWidthPx: number, title?: string }} options
 * @returns {Promise<Uint8Array>} the PDF bytes
 */
export async function buildResumePdf(pageNodes, { pageWidthPx, title = 'Resume' }) {
  const pageHeightPx = Math.round((pageWidthPx * A4_H) / A4_W);
  const pxToPt = A4_W / pageWidthPx;

  if (document.fonts && document.fonts.ready) {
    await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 2000))]);
  }

  // Off-screen, unscaled copy of the pages: the preview is shown through a CSS scale()
  // (and may be clipped by its scroll area), so it can't be captured directly.
  const stage = document.createElement('div');
  stage.setAttribute('data-pdf-stage', '');
  stage.setAttribute('aria-hidden', 'true');
  stage.style.cssText = `position:fixed;left:-100000px;top:0;width:${pageWidthPx}px;pointer-events:none;`;
  // Edit-mode controls (the bin icons) must not end up in the PDF.
  const hideEditUi = document.createElement('style');
  hideEditUi.textContent = '.edit-ui{display:none !important}';
  stage.appendChild(hideEditUi);
  document.body.appendChild(stage);

  try {
    const pdf = await PDFDocument.create();
    pdf.setTitle(title);
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    for (const node of pageNodes) {
      const el = node.cloneNode(true);
      Object.assign(el.style, {
        width: `${pageWidthPx}px`,
        height: `${pageHeightPx}px`,
        minHeight: '0',
        maxHeight: 'none',
        overflow: 'hidden',
        margin: '0',
        boxShadow: 'none',
        transform: 'none',
      });
      stage.appendChild(el);

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: pageWidthPx,
        height: pageHeightPx,
        windowWidth: pageWidthPx,
        // html2canvas renders a clone of the document; bring the stage on-screen in that clone.
        onclone: (doc) => {
          const s = doc.querySelector('[data-pdf-stage]');
          if (s) {
            s.style.position = 'absolute';
            s.style.left = '0';
            s.style.top = '0';
          }
        },
      });

      const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (!jpeg) throw new Error('Could not encode the page image');
      const image = await pdf.embedJpg(new Uint8Array(await jpeg.arrayBuffer()));
      canvas.width = 0; // free the bitmap before the next page (matters on phones)
      canvas.height = 0;

      const page = pdf.addPage([A4_W, A4_H]);
      page.drawImage(image, { x: 0, y: 0, width: A4_W, height: A4_H });
      addTextLayer(page, el, font, pxToPt); // `el` is still laid out inside the stage

      stage.removeChild(el);
    }

    return await pdf.save();
  } finally {
    stage.remove();
  }
}
