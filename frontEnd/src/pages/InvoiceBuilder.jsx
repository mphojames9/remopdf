import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import navLogo from '../assets/logo.png';

const uid = () => Math.random().toString(36).slice(2, 9);
const emptyItem = () => ({ id: uid(), description: '', qty: 1, rate: 0 });

const STORAGE_KEY = 'invoice-builder:draft';

// A4 sheet, in CSS pixels (96 per inch): 210mm x 297mm = 793.7 x 1122.5. Everything
// drawn on the preview sheet is sized in pt, like the PDF, so what you see is what downloads.
const A4_W_PX = (595.28 * 4) / 3;
const A4_H_PX = (841.89 * 4) / 3;
const PAGE_MARGIN_PT = 50; // same margin the PDF uses
const PAGE_BOTTOM_RESERVE_PT = 90; // the PDF starts a new page 90pt above the bottom edge
const PAGE_CONTENT_H_PX = ((841.89 - PAGE_MARGIN_PT - PAGE_BOTTOM_RESERVE_PT) * 4) / 3;
const SHEET_FONT = 'Helvetica, Arial, "Liberation Sans", sans-serif'; // the PDF is set in Helvetica too
const INK = '#0f172a';
const GREY = '#6b7380';
const RULE = '#e3e6eb';
const AMBER = '#fabf24';
const ITEM_COLS = '1fr 50pt 80pt 90pt'; // description | qty | rate | amount

const loadDraft = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to load saved invoice draft:', err);
    return null;
  }
};

export default function InvoiceBuilder() {
  const today = new Date().toISOString().slice(0, 10);
  const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const saved = loadDraft();

  const [businessName, setBusinessName] = useState(saved?.businessName ?? '');
  const [businessAddress, setBusinessAddress] = useState(saved?.businessAddress ?? '');
  const [businessEmail, setBusinessEmail] = useState(saved?.businessEmail ?? '');
  const [businessPhone, setBusinessPhone] = useState(saved?.businessPhone ?? '');

  const [clientName, setClientName] = useState(saved?.clientName ?? '');
  const [clientAddress, setClientAddress] = useState(saved?.clientAddress ?? '');
  const [clientEmail, setClientEmail] = useState(saved?.clientEmail ?? '');

  const [invoiceNumber, setInvoiceNumber] = useState(saved?.invoiceNumber ?? `INV-${Date.now().toString().slice(-6)}`);
  const [invoiceDate, setInvoiceDate] = useState(saved?.invoiceDate ?? today);
  const [dueDate, setDueDate] = useState(saved?.dueDate ?? inTwoWeeks);
  const [currency, setCurrency] = useState(saved?.currency ?? '$');

  const [items, setItems] = useState(saved?.items?.length ? saved.items : [emptyItem()]);
  const [taxRate, setTaxRate] = useState(saved?.taxRate ?? 0);
  const [discountRate, setDiscountRate] = useState(saved?.discountRate ?? 0);
  const [notes, setNotes] = useState(saved?.notes ?? 'Thank you for your business.');

  const [isGenerating, setIsGenerating] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(saved?.logoDataUrl ?? null);
  const [showPreview, setShowPreview] = useState(false);

  // Persist every field to localStorage whenever any of them change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const draft = {
        businessName, businessAddress, businessEmail, businessPhone,
        clientName, clientAddress, clientEmail,
        invoiceNumber, invoiceDate, dueDate, currency,
        items, taxRate, discountRate, notes, logoDataUrl,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (err) {
      console.error('Failed to save invoice draft:', err);
    }
  }, [
    businessName, businessAddress, businessEmail, businessPhone,
    clientName, clientAddress, clientEmail,
    invoiceNumber, invoiceDate, dueDate, currency,
    items, taxRate, discountRate, notes, logoDataUrl,
  ]);

  // Close the preview with Escape, and lock page scroll while it's open
  useEffect(() => {
    if (!showPreview) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowPreview(false);
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [showPreview]);

  // --- A4 preview: pagination + fit-to-screen ---------------------------------
  // The invoice is cut into blocks (header, parties, table head, one per item,
  // totals, notes). They are measured off-screen, then dealt onto A4 sheets the way
  // the PDF does it: a block that doesn't fit moves to the next sheet.
  const [pages, setPages] = useState([]); // [[blockKey, ...], ...]
  const [previewScale, setPreviewScale] = useState(1);
  const previewScrollRef = useRef(null);
  const measureRef = useRef(null);

  useEffect(() => {
    if (!showPreview) return undefined;
    const el = previewScrollRef.current;
    if (!el) return undefined;
    const update = () => setPreviewScale(Math.max(0.2, Math.min(1, (el.clientWidth - 32) / A4_W_PX)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showPreview]);

  useLayoutEffect(() => {
    if (!showPreview) return;
    const root = measureRef.current;
    if (!root) return;
    const measured = Array.from(root.children).map((el) => ({
      key: el.dataset.key,
      h: el.offsetHeight,
      keepWithNext: el.dataset.keep === '1',
    }));
    const out = [[]];
    let used = 0;
    measured.forEach((b, i) => {
      const need = b.h + (b.keepWithNext && measured[i + 1] ? measured[i + 1].h : 0);
      if (used > 0 && used + need > PAGE_CONTENT_H_PX) {
        out.push([]);
        used = 0;
      }
      out[out.length - 1].push(b.key);
      used += b.h;
    });
    setPages(out);
  }, [
    showPreview,
    businessName, businessAddress, businessEmail, businessPhone,
    clientName, clientAddress, clientEmail,
    invoiceNumber, invoiceDate, dueDate, currency,
    items, taxRate, discountRate, notes, logoDataUrl,
  ]);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      window.alert('Please upload a PNG or JPG image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result);
    reader.readAsDataURL(file);
    e.target.value = ''; // allow re-selecting the same file to replace it
  };
  const removeLogo = () => setLogoDataUrl(null);

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, [field]: value } : it)));
  };
  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (id) => setItems(prev => (prev.length > 1 ? prev.filter(it => it.id !== id) : prev));

  const subtotal = items.reduce((sum, it) => sum + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), 0);
  const discountAmount = subtotal * ((parseFloat(discountRate) || 0) / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * ((parseFloat(taxRate) || 0) / 100);
  const total = taxableAmount + taxAmount;

  const fmt = (n) => `${currency}${(Number.isFinite(n) ? n : 0).toFixed(2)}`;

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const pageSize = [595.28, 841.89]; // A4
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage(pageSize);
      const { width, height } = page.getSize();
      const margin = 50;
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Embed the company logo, if one was uploaded
      let logoImage = null;
      let logoDims = null;
      if (logoDataUrl) {
        try {
          const match = /^data:(image\/(?:png|jpe?g));base64,(.*)$/.exec(logoDataUrl);
          if (match) {
            const [, mime, base64] = match;
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            logoImage = mime === 'image/png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
            const maxW = 110, maxH = 32;
            const scale = Math.min(maxW / logoImage.width, maxH / logoImage.height, 1);
            logoDims = { width: logoImage.width * scale, height: logoImage.height * scale };
          }
        } catch (err) {
          console.error('Failed to embed logo:', err);
        }
      }

      const dark = rgb(0.06, 0.09, 0.16);
      const grey = rgb(0.42, 0.45, 0.5);
      const lightGrey = rgb(0.89, 0.9, 0.92);
      const amber = rgb(0.98, 0.75, 0.14);

      const rightEdge = width - margin;
      const amountColX = rightEdge;
      const rateColX = rightEdge - 90;
      const qtyColX = rightEdge - 170;
      const descColX = margin;
      const descMaxWidth = qtyColX - descColX - 20;

      let y = height - margin;

      const newPageIfNeeded = (needed = 24) => {
        if (y - needed < margin + 40) {
          page = pdfDoc.addPage(pageSize);
          y = height - margin;
        }
      };
      const drawRight = (text, x, yy, size, font, color) => {
        const w = font.widthOfTextAtSize(text, size);
        page.drawText(text, { x: x - w, y: yy, size, font, color });
      };

      // Header
      let headerTextX = margin;
      if (logoImage && logoDims) {
        const logoY = y + 20 - logoDims.height; // align roughly with the INVOICE text's cap height
        page.drawImage(logoImage, { x: margin, y: logoY, width: logoDims.width, height: logoDims.height });
        headerTextX = margin + logoDims.width + 14;
      }
      page.drawText('INVOICE', { x: headerTextX, y, size: 26, font: fontBold, color: dark });
      drawRight(`#${invoiceNumber || '—'}`, rightEdge, y + 4, 11, fontRegular, grey);
      y -= 10;
      page.drawRectangle({ x: margin, y, width: rightEdge - margin, height: 3, color: amber });
      y -= 26;

      const dateLine = `Issued ${invoiceDate || '—'}   ·   Due ${dueDate || '—'}`;
      drawRight(dateLine, rightEdge, y, 10, fontRegular, grey);
      y -= 40;

      // From / Bill To
      const colWidth = (rightEdge - margin - 20) / 2;
      const toX = margin + colWidth + 20;

      page.drawText('FROM', { x: margin, y, size: 9, font: fontBold, color: grey });
      page.drawText('BILL TO', { x: toX, y, size: 9, font: fontBold, color: grey });
      y -= 16;

      const fromLines = [businessName, businessAddress, businessEmail, businessPhone].filter(Boolean);
      const toLines = [clientName, clientAddress, clientEmail].filter(Boolean);
      fromLines.forEach((line, i) => {
        page.drawText(line, { x: margin, y: y - i * 14, size: 11, font: i === 0 ? fontBold : fontRegular, color: dark, maxWidth: colWidth });
      });
      toLines.forEach((line, i) => {
        page.drawText(line, { x: toX, y: y - i * 14, size: 11, font: i === 0 ? fontBold : fontRegular, color: dark, maxWidth: colWidth });
      });
      y -= Math.max(fromLines.length, toLines.length, 1) * 14 + 30;

      // Table header
      newPageIfNeeded(40);
      page.drawText('DESCRIPTION', { x: descColX, y, size: 9, font: fontBold, color: grey });
      drawRight('QTY', qtyColX, y, 9, fontBold, grey);
      drawRight('RATE', rateColX, y, 9, fontBold, grey);
      drawRight('AMOUNT', amountColX, y, 9, fontBold, grey);
      y -= 10;
      page.drawRectangle({ x: margin, y, width: rightEdge - margin, height: 1, color: lightGrey });
      y -= 20;

      items.forEach((it) => {
        const qty = parseFloat(it.qty) || 0;
        const rate = parseFloat(it.rate) || 0;
        const amount = qty * rate;
        const desc = it.description || 'Untitled item';
        const descWidth = fontRegular.widthOfTextAtSize(desc, 10.5);
        const lines = Math.max(1, Math.ceil(descWidth / descMaxWidth));
        const rowHeight = lines * 14 + 8;
        newPageIfNeeded(rowHeight + 10);

        page.drawText(desc, { x: descColX, y, size: 10.5, font: fontRegular, color: dark, maxWidth: descMaxWidth, lineHeight: 14 });
        drawRight(String(qty), qtyColX, y, 10.5, fontRegular, dark);
        drawRight(fmt(rate), rateColX, y, 10.5, fontRegular, dark);
        drawRight(fmt(amount), amountColX, y, 10.5, fontRegular, dark);
        y -= rowHeight;
      });

      y -= 4;
      page.drawRectangle({ x: margin, y, width: rightEdge - margin, height: 1, color: lightGrey });
      y -= 26;

      // Totals
      newPageIfNeeded(110);
      const totalsLabelX = rightEdge - 220;
      const totalsRows = [
        ['Subtotal', fmt(subtotal)],
        ...(discountAmount > 0 ? [[`Discount (${discountRate}%)`, `-${fmt(discountAmount)}`]] : []),
        ...(taxAmount > 0 ? [[`Tax (${taxRate}%)`, fmt(taxAmount)]] : []),
      ];
      totalsRows.forEach(([label, value]) => {
        page.drawText(label, { x: totalsLabelX, y, size: 10.5, font: fontRegular, color: grey });
        drawRight(value, amountColX, y, 10.5, fontRegular, dark);
        y -= 18;
      });
      y -= 2;
      page.drawRectangle({ x: totalsLabelX, y: y + 10, width: rightEdge - totalsLabelX, height: 1, color: lightGrey });
      y -= 8;
      page.drawText('Total due', { x: totalsLabelX, y, size: 13, font: fontBold, color: dark });
      drawRight(fmt(total), amountColX, y, 13, fontBold, dark);
      y -= 44;

      // Notes
      if (notes) {
        newPageIfNeeded(60);
        page.drawText('NOTES', { x: margin, y, size: 9, font: fontBold, color: grey });
        y -= 16;
        page.drawText(notes, { x: margin, y, size: 10, font: fontRegular, color: grey, maxWidth: rightEdge - margin, lineHeight: 14 });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoiceNumber || 'draft'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Invoice PDF generation failed:', err);
      window.alert('Something went wrong generating the PDF. Please check your entries and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors';
  const labelClass = 'block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5';
  const cardClass = 'bg-white rounded-[2rem] border border-slate-100 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.12)] p-6';

  // The invoice as A4 blocks, laid out like generatePDF draws it. Each block carries
  // its own bottom spacing so its measured height is the room it really takes.
  const sheetLabel = { fontSize: '9pt', fontWeight: 700, color: GREY, letterSpacing: '0.05em', lineHeight: '12pt' };
  const wrap = { overflowWrap: 'anywhere', whiteSpace: 'pre-line' };
  const invoiceBlocks = !showPreview ? [] : [
    {
      key: 'header',
      node: (
        <div style={{ paddingBottom: '28pt' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '32pt', gap: '12pt' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14pt', minWidth: 0 }}>
              {logoDataUrl && (
                <img src={logoDataUrl} alt="Company logo" style={{ maxWidth: '110pt', maxHeight: '32pt', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }} />
              )}
              <span style={{ fontSize: '26pt', fontWeight: 700, lineHeight: 1, color: INK }}>INVOICE</span>
            </div>
            <span style={{ fontSize: '11pt', lineHeight: 1, color: GREY, paddingBottom: '4pt', ...wrap }}>#{invoiceNumber || '—'}</span>
          </div>
          <div style={{ height: '3pt', background: AMBER, marginTop: '10pt' }} />
          <div style={{ textAlign: 'right', fontSize: '10pt', color: GREY, marginTop: '14pt' }}>
            {`Issued ${invoiceDate || '—'}\u00A0\u00A0\u00A0·\u00A0\u00A0\u00A0Due ${dueDate || '—'}`}
          </div>
        </div>
      ),
    },
    {
      key: 'parties',
      node: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '20pt', paddingBottom: '30pt' }}>
          {[
            ['FROM', [businessName, businessAddress, businessEmail, businessPhone]],
            ['BILL TO', [clientName, clientAddress, clientEmail]],
          ].map(([label, lines]) => (
            <div key={label} style={{ minWidth: 0 }}>
              <div style={{ ...sheetLabel, paddingBottom: '4pt' }}>{label}</div>
              {lines.filter(Boolean).map((line, i) => (
                <div key={i} style={{ fontSize: '11pt', lineHeight: '14pt', fontWeight: i === 0 ? 700 : 400, color: INK, ...wrap }}>{line}</div>
              ))}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'table-head',
      keepWithNext: true,
      node: (
        <div style={{ paddingBottom: '14pt' }}>
          <div style={{ display: 'grid', gridTemplateColumns: ITEM_COLS, ...sheetLabel, paddingBottom: '8pt', borderBottom: `1px solid ${RULE}` }}>
            <span>DESCRIPTION</span>
            <span style={{ textAlign: 'right' }}>QTY</span>
            <span style={{ textAlign: 'right' }}>RATE</span>
            <span style={{ textAlign: 'right' }}>AMOUNT</span>
          </div>
        </div>
      ),
    },
    ...items.map((it) => {
      const qty = parseFloat(it.qty) || 0;
      const rate = parseFloat(it.rate) || 0;
      return {
        key: `row-${it.id}`,
        node: (
          <div style={{ display: 'grid', gridTemplateColumns: ITEM_COLS, fontSize: '10.5pt', lineHeight: '14pt', color: INK, paddingBottom: '8pt' }}>
            <span style={{ minWidth: 0, paddingRight: '12pt', ...wrap }}>{it.description || 'Untitled item'}</span>
            <span style={{ textAlign: 'right' }}>{qty}</span>
            <span style={{ textAlign: 'right' }}>{fmt(rate)}</span>
            <span style={{ textAlign: 'right' }}>{fmt(qty * rate)}</span>
          </div>
        ),
      };
    }),
    {
      key: 'totals',
      node: (
        <div style={{ paddingBottom: '36pt' }}>
          <div style={{ borderTop: `1px solid ${RULE}`, paddingTop: '22pt' }}>
            <div style={{ marginLeft: 'auto', width: '220pt', fontSize: '10.5pt', lineHeight: '18pt' }}>
              {[
                ['Subtotal', fmt(subtotal)],
                ...(discountAmount > 0 ? [[`Discount (${discountRate}%)`, `-${fmt(discountAmount)}`]] : []),
                ...(taxAmount > 0 ? [[`Tax (${taxRate}%)`, fmt(taxAmount)]] : []),
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: GREY }}>{label}</span>
                  <span style={{ color: INK }}>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6pt', paddingTop: '8pt', borderTop: `1px solid ${RULE}`, fontSize: '13pt', fontWeight: 700, color: INK }}>
                <span>Total due</span>
                <span>{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    ...(notes
      ? [{
          key: 'notes',
          node: (
            <div>
              <div style={{ ...sheetLabel, paddingBottom: '4pt' }}>NOTES</div>
              <div style={{ fontSize: '10pt', lineHeight: '14pt', color: GREY, ...wrap }}>{notes}</div>
            </div>
          ),
        }]
      : []),
  ];
  const blockByKey = Object.fromEntries(invoiceBlocks.map((b) => [b.key, b]));

  return (
    <div style={{ fontFamily: '"Outfit", sans-serif' }} className="min-h-screen bg-slate-50/50 pb-24">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand: the logo goes home, followed by the page title */}
          <div className="flex items-center gap-4 min-w-0">
            <Link
              to="/"
              aria-label="RemoPDF home"
              className="group shrink-0 flex items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
            >
              <img
                src={navLogo}
                alt="RemoPDF"
                draggable={false}
                className="h-8 w-auto block transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            </Link>
            <span aria-hidden="true" className="hidden sm:block h-6 w-px bg-white/15" />
            <h1 className="sr-only sm:not-sr-only truncate text-sm font-semibold tracking-tight text-white/90">Invoice Builder</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setShowPreview(true)}
              aria-label="Preview invoice"
              className="flex items-center justify-center gap-2 h-10 px-3.5 sm:px-5 rounded-full border border-white/15 bg-white/5 text-white/90 text-xs font-semibold hover:bg-white/10 hover:border-white/30 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <i className="fa-solid fa-eye text-slate-300"></i>
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              onClick={generatePDF}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 h-10 px-4 sm:px-5 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 text-slate-900 text-xs font-bold hover:from-amber-200 hover:to-amber-300 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
            >
              {isGenerating ? (
                <>
                  <i className="fa-solid fa-circle-notch animate-spin"></i>
                  <span className="hidden sm:inline">Generating…</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-download"></i>
                  <span>Download<span className="hidden sm:inline"> PDF</span></span>
                </>
              )}
            </button>
          </div>
        </div>
        {/* Fine amber hairline along the bottom edge */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 animate-in fade-in duration-700 ease-out">
        {/* From / Bill To */}
        <div className="grid sm:grid-cols-2 gap-5 mb-5">
          <div className={cardClass}>
            <p className={labelClass}>From</p>

            <div className="flex items-center gap-4 mt-3 mb-4">
              <label
                htmlFor="logo-upload"
                className="relative w-16 h-16 shrink-0 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 hover:border-amber-400 hover:bg-amber-50/50 transition-colors cursor-pointer flex items-center justify-center overflow-hidden group"
              >
                {logoDataUrl ? (
                  <img src={logoDataUrl} alt="Company logo" className="w-full h-full object-contain p-1.5" />
                ) : (
                  <i className="fa-solid fa-image text-slate-300 group-hover:text-amber-400 text-lg transition-colors"></i>
                )}
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700">{logoDataUrl ? 'Logo added' : 'Company logo'}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-1.5">PNG or JPG · shown on your invoice PDF</p>
                {logoDataUrl && (
                  <button onClick={removeLogo} className="text-[11px] font-bold text-rose-500 hover:text-rose-600 transition-colors">
                    Remove logo
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3 mt-3">
              <input className={inputClass} placeholder="Your business name" value={businessName} onChange={e => setBusinessName(e.target.value)} />
              <input className={inputClass} placeholder="Address" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input className={inputClass} placeholder="Email" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} />
                <input className={inputClass} placeholder="Phone" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} />
              </div>
            </div>
          </div>
          <div className={cardClass}>
            <p className={labelClass}>Bill to</p>
            <div className="space-y-3 mt-3">
              <input className={inputClass} placeholder="Client name" value={clientName} onChange={e => setClientName(e.target.value)} />
              <input className={inputClass} placeholder="Address" value={clientAddress} onChange={e => setClientAddress(e.target.value)} />
              <input className={inputClass} placeholder="Email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className={`${cardClass} mb-5 grid sm:grid-cols-4 gap-4`}>
          <div>
            <p className={labelClass}>Invoice #</p>
            <input className={inputClass} value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
          </div>
          <div>
            <p className={labelClass}>Currency</p>
            <input className={inputClass} value={currency} onChange={e => setCurrency(e.target.value)} maxLength={3} />
          </div>
          <div>
            <p className={labelClass}>Issued</p>
            <input type="date" className={inputClass} value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
          </div>
          <div>
            <p className={labelClass}>Due</p>
            <input type="date" className={inputClass} value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>

        {/* Items */}
        <div className={`${cardClass} mb-5`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`${labelClass} mb-0`}>Line items</p>
            <button onClick={addItem} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors">
              <i className="fa-solid fa-circle-plus text-amber-400"></i>
              Add item
            </button>
          </div>

          <div className="hidden sm:grid grid-cols-[1fr_80px_110px_110px_36px] gap-3 px-1 pb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <span>Description</span><span>Qty</span><span>Rate</span><span>Amount</span><span></span>
          </div>

          <div className="space-y-2">
            {items.map(it => {
              const amount = (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0);
              return (
                <div key={it.id} className="grid sm:grid-cols-[1fr_80px_110px_110px_36px] gap-3 items-center">
                  <input className={inputClass} placeholder="Item description" value={it.description} onChange={e => updateItem(it.id, 'description', e.target.value)} />
                  <input type="number" min="0" className={inputClass} value={it.qty} onChange={e => updateItem(it.id, 'qty', e.target.value)} />
                  <input type="number" min="0" step="0.01" className={inputClass} value={it.rate} onChange={e => updateItem(it.id, 'rate', e.target.value)} />
                  <div className="text-sm font-semibold text-slate-700 px-1">{fmt(amount)}</div>
                  <button onClick={() => removeItem(it.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors" aria-label="Remove item">
                    <i className="fa-solid fa-trash text-sm"></i>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Notes */}
          <div className={cardClass}>
            <p className={labelClass}>Notes</p>
            <textarea className={`${inputClass} min-h-[110px] resize-none mt-1`} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {/* Totals */}
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-3">
              <p className={`${labelClass} mb-0`}>Discount %</p>
              <input type="number" min="0" max="100" className="w-20 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1 text-sm text-right" value={discountRate} onChange={e => setDiscountRate(e.target.value)} />
            </div>
            <div className="flex items-center justify-between mb-4">
              <p className={`${labelClass} mb-0`}>Tax %</p>
              <input type="number" min="0" max="100" className="w-20 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1 text-sm text-right" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
            </div>
            <div className="space-y-2 pt-3 border-t border-slate-100 text-sm">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between text-slate-500"><span>Discount</span><span>-{fmt(discountAmount)}</span></div>}
              {taxAmount > 0 && <div className="flex justify-between text-slate-500"><span>Tax</span><span>{fmt(taxAmount)}</span></div>}
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
                <span>Total due</span><span>{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice preview modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="relative bg-white shadow-2xl w-full h-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Slim title bar */}
            <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-slate-100 shrink-0 bg-white">
              <h2 className="text-sm font-bold text-slate-900">Invoice preview</h2>
              <span className="text-[11px] font-semibold text-slate-400">
                A4 · 210 × 297 mm{pages.length > 1 ? ` · ${pages.length} pages` : ''}
              </span>
            </div>

            {/* Off-screen copy of the blocks, only here to be measured for pagination */}
            <div
              ref={measureRef}
              aria-hidden="true"
              className="pointer-events-none"
              style={{ position: 'absolute', left: '-99999px', top: 0, visibility: 'hidden', width: `calc(210mm - ${PAGE_MARGIN_PT * 2}pt)`, fontFamily: SHEET_FONT, color: INK }}
            >
              {invoiceBlocks.map((b) => (
                <div key={b.key} data-key={b.key} data-keep={b.keepWithNext ? '1' : '0'}>{b.node}</div>
              ))}
            </div>

            {/* A4 sheets, scaled down to fit narrow screens */}
            <div ref={previewScrollRef} className="flex-1 min-h-0 overflow-y-auto bg-slate-200/70 px-4 py-6">
              <div className="mx-auto" style={{ width: A4_W_PX * previewScale }}>
                {pages.map((keys, pageIndex) => (
                  <div key={pageIndex} className="mb-6 last:mb-0">
                    <div style={{ width: A4_W_PX * previewScale, height: A4_H_PX * previewScale }}>
                      <div
                        className="border border-slate-300/70"
                        style={{
                          width: '210mm',
                          height: '297mm',
                          boxSizing: 'border-box',
                          padding: `${PAGE_MARGIN_PT}pt ${PAGE_MARGIN_PT}pt 0`,
                          background: '#fff',
                          overflow: 'hidden',
                          fontFamily: SHEET_FONT,
                          color: INK,
                          transform: `scale(${previewScale})`,
                          transformOrigin: 'top left',
                        }}
                      >
                        {keys.map((k) => (
                          <div key={k}>{blockByKey[k]?.node}</div>
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-center text-[11px] font-semibold text-slate-500">
                      Page {pageIndex + 1} of {pages.length}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0 bg-white">
              <button
                onClick={() => setShowPreview(false)}
                className="h-10 px-5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={generatePDF}
                disabled={isGenerating}
                className="flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-white text-xs font-bold shadow-[0_10px_30px_-10px_rgba(15,23,42,0.5)] hover:shadow-[0_10px_30px_-5px_rgba(15,23,42,0.7)] transition-all duration-300 disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <i className="fa-solid fa-circle-notch animate-spin text-amber-400"></i>
                    Generating…
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-download text-amber-400"></i>
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
