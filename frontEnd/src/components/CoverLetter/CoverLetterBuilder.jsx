import React, { useEffect, useMemo, useRef, useState } from 'react';
import { downloadBlob } from '../../api/client';
import logo from '../../assets/logo1.webp'; // the logo for light bars (logo.webp is the white one for dark bars)
import { usePremiumAccess, useSignedIn, requestUpgrade, requestSignIn } from '../../hooks/premiumAccess';
import {
  TONES,
  MAX_BODY_CHARS,
  MAX_FIELD_CHARS,
  MAX_URL_CHARS,
  aiSignature,
  buildDraft,
  buildLetterModel,
  fullNameOf,
  joinList,
  loadLetter,
  saveLetter,
  todayIso,
} from '../../utils/coverLetter';
import { generateCoverLetterBody, readJobPosting } from '../../utils/coverLetterAI';
import {
  PAGE_W,
  PAGE_H,
  COVER_LETTER_WATERMARK,
  loadFontMetrics,
  layoutLetter,
  sanitizeModel,
  buildCoverLetterPdf,
} from '../../utils/coverLetterPdf';

/**
 * Full-screen cover letter page, opened from "Build cover letter" in the builder's sidebar.
 *
 * The page first asks for the link to the job advert. The server reads it (readJobPosting in
 * utils/coverLetterAI.js) and the position, company, address and what the job asks for fill in on the left; the AI
 * (Groq) then writes the letter so that it answers those requirements with what the resume says, and the address
 * goes into the letter's address block. When a site cannot be read by a server, a box to paste the job description
 * takes its place. Without a link, "Write with AI" writes a general letter from the resume alone
 * (AUTO_WRITE_WITHOUT_JOB below writes it as soon as the page opens, as this page used to).
 * The position, company, tone and requirements are used the next time the AI writes ("Rewrite with AI"); the page
 * says when they have changed since. People who are signed out or not on Premium, or when the AI cannot be reached,
 * start from a plain draft built from the resume (name, job titles, skills, qualification) instead. Either way the
 * person can edit the text; once they do, nothing replaces it without asking.
 * The preview is the real layout of the PDF (utils/coverLetterPdf.js), so the download matches it exactly.
 *
 * Props
 *  - resumeData:   the resume being built (same object the builder holds)
 *  - accentColor:  the resume's colour (#rrggbb); the letter's header line and bullets use it
 *  - storageKey:   one letter is kept per resume under this key (localStorage, on this device)
 *  - checkPremium: async () => boolean, asked at download time. Premium gets a clean page; others get a small label.
 *  - onClose:      () => void
 */

// false: opening the page asks for the job link first and writes nothing until there is a link (or the person
// chooses "Write with AI"). true: the AI writes a general letter the moment the page opens, link or no link.
const AUTO_WRITE_WITHOUT_JOB = false;

const PREVIEW_FONT = "Helvetica, Arial, 'Liberation Sans', sans-serif";
const ASCENT = 0.8465; // where Arial/Helvetica put the baseline inside a line box of height = font size

/* ------------------------------------------------------------------ icons */

const Svg = ({ className = 'h-4 w-4', children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {children}
  </svg>
);

const IconBack = ({ className }) => (
  <Svg className={className}>
    <path d="M15 18l-6-6 6-6" />
  </Svg>
);

const IconDownload = ({ className }) => (
  <Svg className={className}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M5 21h14" />
  </Svg>
);

const IconRefresh = ({ className }) => (
  <Svg className={className}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
    <path d="M21 4v5h-5" />
  </Svg>
);

const IconInfo = ({ className }) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </Svg>
);

const IconSparkle = ({ className }) => (
  <Svg className={className}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
  </Svg>
);

const IconCheck = ({ className }) => (
  <Svg className={className}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

const IconClose = ({ className }) => (
  <Svg className={className}>
    <path d="M18 6 6 18" />
    <path d="M6 6l12 12" />
  </Svg>
);

const IconSpinner = ({ className }) => (
  <Svg className={`${className} animate-spin`}>
    <path d="M21 12a9 9 0 1 1-6.2-8.55" />
  </Svg>
);

/* ------------------------------------------------------------------ form pieces */

const inputClass =
  'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[13.5px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#d9856b] focus:outline-none focus:ring-4 focus:ring-[#d9856b]/15';

const Field = ({ id, label, optional = false, note = '', children }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-[12.5px] font-medium text-slate-700">
      <span>{label}</span>
      {optional && <span className="text-[11px] font-normal text-slate-400">Optional</span>}
      {!optional && note && <span className="text-[11px] font-normal text-amber-700">{note}</span>}
    </label>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{children}</h2>
);

/* ------------------------------------------------------------------ preview */

const colorOf = (rgb) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

// One A4 page, drawn from the layout lines and scaled to the width of the screen.
const PreviewPage = ({ page, scale }) => (
  <div
    className="relative mx-auto mb-5 border border-slate-200 bg-white last:mb-0"
    style={{ width: PAGE_W * scale, height: PAGE_H * scale }}
  >
    <div style={{ position: 'absolute', left: 0, top: 0, width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
      {page.items.map((item, i) =>
        item.type === 'rect' ? (
          <div key={i} style={{ position: 'absolute', left: item.x, top: item.top, width: item.width, height: item.height, background: colorOf(item.color) }} />
        ) : (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: item.x,
              top: item.baseline - item.size * ASCENT,
              fontSize: item.size,
              lineHeight: 1,
              whiteSpace: 'pre',
              fontWeight: item.bold ? 700 : 400,
              color: colorOf(item.color),
              fontFamily: PREVIEW_FONT,
            }}
          >
            {item.text}
          </span>
        ),
      )}
    </div>
  </div>
);

/* ------------------------------------------------------------------ the page */

export default function CoverLetterBuilder({ resumeData, accentColor, storageKey, checkPremium, onClose }) {
  const [letter, setLetter] = useState(() => loadLetter(storageKey));
  const [view, setView] = useState('edit'); // small screens show one side at a time
  const [fonts, setFonts] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(''); // '' | 'reset' | 'regen': which "replace your edits?" question is showing
  const [ai, setAi] = useState({ state: 'idle', code: '' }); // state: idle | loading | done | blocked | error
  const aiStateRef = useRef('idle'); // the same state, readable inside effects and callbacks
  const [previewWidth, setPreviewWidth] = useState(0);
  const [posting, setPosting] = useState({ state: 'idle', code: '', message: '', found: null }); // state: idle | loading | done | error
  const postingStateRef = useRef('idle');
  const [pasteOpen, setPasteOpen] = useState(false); // the "paste the job description" box
  const [pasteText, setPasteText] = useState('');
  const letterRef = useRef(letter); // the latest letter, readable after an await
  letterRef.current = letter;

  const dialogRef = useRef(null);
  const previewRef = useRef(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // The letter is kept per resume as it is typed.
  useEffect(() => {
    saveLetter(storageKey, letter);
  }, [storageKey, letter]);

  // Text measurements for the preview (the same ones the PDF is written with).
  useEffect(() => {
    let cancelled = false;
    loadFontMetrics()
      .then((f) => {
        if (!cancelled) setFonts(f);
      })
      .catch(() => {
        if (!cancelled) setError('The preview could not be prepared. Please close this page and open it again.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Focus starts inside the page (once, when it opens).
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Escape closes the page. The latest onClose is kept in a ref so the listener is not re-added on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !downloading) onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [downloading]);

  // The preview is scaled to the room it has.
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return undefined;
    const measure = () => setPreviewWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const premium = usePremiumAccess();
  const signedIn = useSignedIn();
  const watermark = premium === true ? null : COVER_LETTER_WATERMARK;

  const draft = useMemo(
    () => buildDraft(resumeData, { tone: letter.tone, jobTitle: letter.jobTitle, company: letter.company }),
    [resumeData, letter.tone, letter.jobTitle, letter.company],
  );
  // The person's own text, else the AI's letter, else the plain draft.
  const body = letter.bodyEdited ? letter.body : letter.aiBody || draft;

  // What the AI letter is written from. When it stops matching, the page offers to write it again.
  const signature = useMemo(
    () => aiSignature(resumeData, { tone: letter.tone, jobTitle: letter.jobTitle, company: letter.company }),
    [resumeData, letter.tone, letter.jobTitle, letter.company],
  );

  const model = useMemo(() => buildLetterModel(resumeData, letter, body), [resumeData, letter, body]);
  const prepared = useMemo(() => (fonts ? sanitizeModel(model, fonts) : null), [fonts, model]);
  const layout = useMemo(
    () => (prepared ? layoutLetter(prepared.model, fonts, { accent: accentColor, watermark }) : null),
    [prepared, fonts, accentColor, watermark],
  );

  const fullName = fullNameOf(resumeData?.personal);
  const hasText = model.blocks.length > 0;

  const writing = ai.state === 'loading';
  const stale = !writing && !letter.bodyEdited && Boolean(letter.aiBody) && letter.aiFor !== signature;

  const setAiStatus = (state, code = '') => {
    aiStateRef.current = state;
    setAi({ state, code });
  };

  const setPostingStatus = (next) => {
    postingStateRef.current = next.state;
    setPosting({ state: 'idle', code: '', message: '', found: null, ...next });
  };

  // Asks the AI for the letter. The reply replaces whatever is shown (callers ask first when the person has edits).
  // details: position, company and requirements to use instead of the saved ones (an advert was just read, and the
  // page has not drawn the new values yet).
  const generate = async ({ fresh = false, details } = {}) => {
    if (aiStateRef.current === 'loading') return;
    setAiStatus('loading');
    setConfirm('');
    const target = { ...letterRef.current, ...(details || {}) };
    // A letter written for an advert must name the position. When the advert does not state one (a pasted job
    // description often has no title), ask for it instead of writing "the role you are offering".
    if ((target.requirements || []).length > 0 && !String(target.jobTitle || '').trim()) {
      setAiStatus('error', 'position');
      if (typeof document !== 'undefined') document.getElementById('cl-job')?.focus();
      return;
    }
    const wroteFor = aiSignature(resumeData, target);
    try {
      const text = await generateCoverLetterBody({
        resumeData,
        jobTitle: target.jobTitle,
        company: target.company,
        tone: target.tone,
        requirements: target.requirements,
        duties: target.duties,
        fresh,
      });
      if (!alive.current) return;
      setLetter((prev) => ({ ...prev, aiBody: text.slice(0, MAX_BODY_CHARS), aiFor: wroteFor, body: '', bodyEdited: false }));
      setAiStatus('done');
    } catch (err) {
      if (!alive.current) return;
      const code = err?.code || 'unavailable';
      if (code === 'signin' || code === 'premium') setAiStatus('blocked', code);
      else setAiStatus('error', code);
    }
  };

  // The automatic part. Nothing is asked when the person already has a letter (an AI one kept from before, or
  // their own), so reopening the page costs nothing and never overwrites anything.
  // Signed out, or no Premium: say so instead of asking. If either changes while the page is open (they sign in
  // or pay in the dialog on top), this runs again.
  // With no position or requirements to write for, the AI waits for the job link (see AUTO_WRITE_WITHOUT_JOB);
  // with them (the person read an advert on an earlier visit) the letter is written now.
  useEffect(() => {
    if (letter.bodyEdited || letter.aiBody) return;
    if (aiStateRef.current === 'loading' || aiStateRef.current === 'error') return;
    const hasTarget = letter.requirements.length > 0 || Boolean(letter.jobTitle.trim());
    if (signedIn === false) setAiStatus('blocked', 'signin');
    else if (premium === false) setAiStatus('blocked', 'premium');
    else if (AUTO_WRITE_WITHOUT_JOB || hasTarget) generate();
    else if (aiStateRef.current === 'blocked') setAiStatus('idle'); // they signed in or upgraded: the buttons come back
  }, [premium, signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const rewrite = () => {
    if (letter.bodyEdited) setConfirm('regen');
    else generate({ fresh: true });
  };

  // Reads the advert (the link, or the text pasted instead), fills in the position, company and address, keeps what
  // the job asks for, and has the AI write the letter from it (unless the person has written their own text).
  const readPosting = async () => {
    if (postingStateRef.current === 'loading') return;
    if (signedIn === false) {
      requestSignIn();
      return;
    }
    if (premium === false) {
      requestUpgrade();
      return;
    }

    const url = letter.jobUrl.trim();
    const text = pasteOpen ? pasteText.trim() : '';
    if (!url && !text) {
      setPostingStatus({ state: 'error', code: 'badlink', message: pasteOpen ? 'Paste the job description first.' : 'Paste the link to the job advert first.' });
      return;
    }

    setPostingStatus({ state: 'loading' });
    try {
      const found = await readJobPosting({ url, text });
      if (!alive.current) return;
      const current = letterRef.current;
      const details = {
        jobTitle: found.jobTitle || current.jobTitle,
        company: found.company || current.company,
        companyAddress: found.address || current.companyAddress,
        requirements: found.requirements,
        duties: found.duties,
      };
      setLetter((prev) => ({ ...prev, ...details }));
      setPostingStatus({
        state: 'done',
        found: { title: Boolean(found.jobTitle), company: Boolean(found.company), address: Boolean(found.address), count: found.requirements.length, source: found.source },
      });
      if (!current.bodyEdited) generate({ fresh: true, details });
    } catch (err) {
      if (!alive.current) return;
      const code = err?.code || 'unavailable';
      if (code === 'signin' || code === 'premium') {
        setAiStatus('blocked', code);
        setPostingStatus({ state: 'idle' });
        return;
      }
      const messages = {
        busy: 'Too many adverts in a short time. Please try again in a minute.',
        timeout: 'That took too long. Try again, or paste the job description instead.',
        offline: 'Could not reach the server. Check your connection and try again.',
      };
      const own = ['badlink', 'unreadable', 'nodetails'].includes(code) ? err.message : '';
      const message = messages[code] || own || 'The advert reader is unavailable right now. You can paste the job description instead.';
      // A page that cannot be read is the moment the paste box is useful.
      if (['unreadable', 'nodetails', 'timeout', 'unavailable'].includes(code)) setPasteOpen(true);
      setPostingStatus({ state: 'error', code, message });
    }
  };

  const removeRequirement = (index) => {
    setLetter((prev) => {
      const requirements = prev.requirements.filter((_, i) => i !== index);
      return { ...prev, requirements, duties: requirements.length > 0 ? prev.duties : [] };
    });
  };

  const clearPosting = () => {
    setLetter((prev) => ({ ...prev, jobUrl: '', requirements: [], duties: [] }));
    setPasteText('');
    setPasteOpen(false);
    setPostingStatus({ state: 'idle' });
  };

  const setJobUrl = (e) => {
    const value = e.target.value.slice(0, MAX_URL_CHARS);
    setLetter((prev) => ({ ...prev, jobUrl: value }));
  };

  const padding = previewWidth >= 640 ? 64 : 32;
  const scale = Math.max(0.3, Math.min(1.15, (previewWidth - padding) / PAGE_W));

  const setField = (name) => (e) => {
    const value = e.target.value.slice(0, MAX_FIELD_CHARS);
    setLetter((prev) => ({ ...prev, [name]: value }));
  };

  const setDate = (e) => {
    const value = e.target.value;
    setLetter((prev) => ({ ...prev, dateOverride: !value || value === todayIso() ? '' : value }));
  };

  const setBody = (e) => {
    const value = e.target.value.slice(0, MAX_BODY_CHARS);
    setLetter((prev) => ({ ...prev, body: value, bodyEdited: true }));
  };

  // Goes back to the last letter the AI wrote (or the plain draft when there is none).
  const resetToDraft = () => {
    setLetter((prev) => ({ ...prev, body: '', bodyEdited: false }));
    setConfirm('');
  };

  const download = async () => {
    if (downloading || !hasText) return;
    setDownloading(true);
    setError('');
    try {
      // Premium gets a clean PDF; everyone else gets the small "Created with RemoPDF" label on each page.
      const isPremium = typeof checkPremium === 'function' ? await checkPremium() : false;
      const baseName = (fullName ? `${fullName} - Cover Letter` : 'Cover Letter').replace(/[\\/:*?"<>|]/g, '').trim() || 'Cover Letter';
      const bytes = await buildCoverLetterPdf(model, {
        accent: accentColor,
        watermark: isPremium ? null : COVER_LETTER_WATERMARK,
        title: baseName,
      });
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${baseName}.pdf`);
    } catch (err) {
      console.error('Cover letter PDF export failed', err);
      if (alive.current) setError('Sorry, the PDF could not be created. Please try again.');
    } finally {
      if (alive.current) setDownloading(false);
    }
  };

  const readButtonClass =
    'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#1e3a8a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-blue-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e3a8a]/25 disabled:cursor-not-allowed disabled:opacity-60';

  const postingBusy = posting.state === 'loading';

  // The same pill as the resume builder's main buttons (Next, Download).
  const downloadButtonClass =
    'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#d9856b] px-5 text-xs font-bold text-white shadow-lg shadow-[#d9856b]/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#d9856b]/35 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#d9856b]/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none';

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-letter-title"
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex flex-col bg-slate-50 text-slate-900 focus:outline-none"
      style={{ fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* Top bar: the resume builder's header (white, thin border, the RemoPDF logo), with this page's own controls */}
      <header className="relative z-20 flex shrink-0 items-center gap-3 border-b border-slate-200/70 bg-white px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:gap-4 sm:px-6 lg:px-12 lg:py-3 lg:pt-3">
        <img src={logo} alt="RemoPDF" draggable={false} className="h-8 w-auto max-w-[40vw] shrink-0 select-none object-contain object-left sm:h-9" />
        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-slate-200" />

        <button
          type="button"
          onClick={onClose}
          disabled={downloading}
          className="group -ml-1 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full pl-2 pr-3.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60 disabled:opacity-40"
        >
          <IconBack className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transform-none" />
          <span className="hidden sm:inline">Back to resume</span>
          <span className="sm:hidden">Back</span>
        </button>

        <div className="hidden min-w-0 items-center gap-2.5 sm:flex">
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accentColor || '#1e3a8a' }} />
          <h1 id="cover-letter-title" className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
            Cover letter
          </h1>
        </div>

        <button type="button" onClick={download} disabled={!hasText || downloading || writing} className={`${downloadButtonClass} ml-auto`}>
          <IconDownload className="h-4 w-4" />
          {downloading ? 'Preparing PDF…' : 'Download PDF'}
        </button>
      </header>

      {/* Small screens: switch between the form and the preview */}
      <div className="flex shrink-0 gap-1 border-b border-slate-200 bg-white px-4 py-2 lg:hidden" role="tablist" aria-label="Cover letter views">
        {[
          ['edit', 'Edit'],
          ['preview', 'Preview'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`h-8 flex-1 rounded-full text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60 ${
              view === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Form */}
        <div className={`${view === 'edit' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col bg-white lg:flex lg:w-[27rem] lg:flex-none lg:border-r lg:border-slate-200`}>
          <div className="pro-scroll flex-1 space-y-8 overflow-y-auto px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
            {!fullName && (
              <div role="status" className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] leading-snug text-amber-800">
                <IconInfo className="mt-px h-4 w-4 shrink-0" />
                <span>Add your name in the Heading step of your resume. It appears at the top of the letter and in the signature.</span>
              </div>
            )}

            <section>
              <SectionTitle>Job advert</SectionTitle>
              <div className="space-y-3">
                <Field id="cl-link" label="Link to the job you are applying for" optional>
                  <div className="flex gap-2">
                    <input
                      id="cl-link"
                      type="text"
                      inputMode="url"
                      value={letter.jobUrl}
                      onChange={setJobUrl}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          readPosting();
                        }
                      }}
                      placeholder="Paste the link to the advert"
                      className={`${inputClass} min-w-0 flex-1`}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                    <button type="button" onClick={readPosting} disabled={postingBusy} className={readButtonClass}>
                      {postingBusy ? <IconSpinner className="h-4 w-4" /> : null}
                      {postingBusy ? 'Reading…' : 'Read advert'}
                    </button>
                  </div>
                </Field>
                <p className="text-[12px] leading-relaxed text-slate-400">
                  We read the position, company, address and what the job asks for, then write the letter to answer those requirements with what is on your resume.
                </p>

                <div role="status" aria-live="polite">
                  {postingBusy && (
                    <div className="flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12.5px] leading-snug text-slate-600">
                      <IconSpinner className="mt-px h-4 w-4 shrink-0 text-[#d9856b]" />
                      <span>Reading the advert. The first one can take up to a minute while the server wakes up.</span>
                    </div>
                  )}

                  {!postingBusy && posting.state === 'error' && (
                    <div className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] leading-snug text-amber-800">
                      <IconInfo className="mt-px h-4 w-4 shrink-0" />
                      <span>{posting.message}</span>
                    </div>
                  )}

                  {!postingBusy && posting.state === 'done' && posting.found && (
                    <div className="flex items-start gap-2.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[12.5px] leading-snug text-emerald-900">
                      <IconCheck className="mt-px h-4 w-4 shrink-0" />
                      <span>
                        {`Found ${posting.found.count} ${posting.found.count === 1 ? 'requirement' : 'requirements'}${posting.found.source === 'text' ? ' in the text you pasted' : ''}`}
                        {(() => {
                          const filled = [posting.found.title && 'position', posting.found.company && 'company', posting.found.address && 'address'].filter(Boolean);
                          return filled.length > 0 ? `, and filled in the ${joinList(filled)} below. Check them before you send the letter.` : '. Check the details below.';
                        })()}
                        {!posting.found.title && ' The advert does not state the position, so type it under “Position you are applying for”: the letter names it in its first sentence.'}
                        {!posting.found.address && ' The advert gives no address, so add one under Company address if you want it on the letter.'}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setPasteOpen((open) => !open)}
                  aria-expanded={pasteOpen}
                  aria-controls="cl-paste-box"
                  className="rounded text-[12.5px] font-medium text-[#a64a30] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60"
                >
                  {pasteOpen ? 'Hide the paste box' : 'Link not working? Paste the job description instead'}
                </button>

                {pasteOpen && (
                  <div id="cl-paste-box">
                    <label htmlFor="cl-paste" className="sr-only">
                      Job description
                    </label>
                    <textarea
                      id="cl-paste"
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value.slice(0, 20000))}
                      rows={6}
                      placeholder="Paste the whole advert here, including the requirements."
                      className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[13.5px] leading-relaxed text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#d9856b] focus:outline-none focus:ring-4 focus:ring-[#d9856b]/15"
                    />
                    <p className="mt-2 text-[12px] leading-relaxed text-slate-400">“Read advert” uses this text instead of the link while the box is open.</p>
                  </div>
                )}

                {letter.requirements.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="text-[12.5px] font-medium text-slate-700">The letter will answer these</h3>
                      <button
                        type="button"
                        onClick={clearPosting}
                        className="rounded-full px-2.5 py-1 text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60"
                      >
                        Clear
                      </button>
                    </div>
                    <ul className="space-y-1.5">
                      {letter.requirements.map((item, i) => (
                        <li key={`${i}-${item}`} className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-2.5 pr-1 text-[12.5px] leading-snug text-slate-700">
                          <span className="min-w-0 flex-1 py-0.5">{item}</span>
                          <button
                            type="button"
                            onClick={() => removeRequirement(i)}
                            aria-label={`Remove: ${item}`}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60"
                          >
                            <IconClose className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
                      Remove any that don’t apply to you. The letter only claims what your resume supports: a requirement your resume doesn’t cover is left out, never made up.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section>
              <SectionTitle>Who is it for</SectionTitle>
              <div className="space-y-4">
                <Field id="cl-job" label="Position you are applying for" note={letter.requirements.length > 0 && !letter.jobTitle.trim() ? 'Needed for the letter' : ''}>
                  <input id="cl-job" type="text" value={letter.jobTitle} onChange={setField('jobTitle')} placeholder="e.g. Front-End Developer" className={inputClass} autoComplete="off" />
                </Field>
                <Field id="cl-company" label="Company">
                  <input id="cl-company" type="text" value={letter.company} onChange={setField('company')} placeholder="e.g. Takealot" className={inputClass} autoComplete="off" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <Field id="cl-manager" label="Hiring manager" optional>
                    <input id="cl-manager" type="text" value={letter.hiringManager} onChange={setField('hiringManager')} placeholder="e.g. Ms Dlamini" className={inputClass} autoComplete="off" />
                  </Field>
                  <Field id="cl-date" label="Date">
                    <input id="cl-date" type="date" value={letter.dateOverride || todayIso()} onChange={setDate} className={inputClass} />
                  </Field>
                </div>
                <Field id="cl-address" label="Company address" optional>
                  <input id="cl-address" type="text" value={letter.companyAddress} onChange={setField('companyAddress')} placeholder="e.g. 12 Rivonia Road, Sandton" className={inputClass} autoComplete="off" />
                </Field>
              </div>
            </section>

            <section>
              <SectionTitle>Tone</SectionTitle>
              <div className="grid grid-cols-3 gap-1 rounded-full border border-slate-200 bg-slate-50 p-1" role="radiogroup" aria-label="Tone of the letter">
                {TONES.map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    role="radio"
                    aria-checked={letter.tone === tone.id}
                    onClick={() => setLetter((prev) => ({ ...prev, tone: tone.id }))}
                    className={`h-8 rounded-full text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60 ${
                      letter.tone === tone.id ? 'bg-white text-slate-900 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
                {letter.bodyEdited
                  ? 'You are using your own wording, so changing the tone no longer rewrites the letter. Use “Reset to draft” to start from a new draft.'
                  : letter.aiBody
                    ? 'The AI uses the tone the next time it writes the letter. Choose “Rewrite with AI” after changing it.'
                    : 'Changes the wording of the starter draft below.'}
              </p>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Letter</h2>
                {confirm ? (
                  <span className="flex items-center gap-1.5 text-[12px]">
                    <span className="text-slate-500">{confirm === 'regen' ? 'Replace your edits?' : 'Discard your edits?'}</span>
                    <button
                      type="button"
                      onClick={confirm === 'regen' ? () => generate({ fresh: true }) : resetToDraft}
                      className="rounded-full px-2.5 py-1 font-semibold text-[#a64a30] hover:bg-[#d9856b]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60"
                    >
                      {confirm === 'regen' ? 'Yes, rewrite' : 'Yes, reset'}
                    </button>
                    <button type="button" onClick={() => setConfirm('')} className="rounded-full px-2.5 py-1 font-medium text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60">
                      Cancel
                    </button>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    {letter.bodyEdited && (
                      <button
                        type="button"
                        onClick={() => setConfirm('reset')}
                        disabled={writing}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60 disabled:opacity-50"
                      >
                        <IconRefresh className="h-3.5 w-3.5" />
                        Reset to draft
                      </button>
                    )}
                    {ai.state !== 'blocked' && (
                      <button
                        type="button"
                        onClick={rewrite}
                        disabled={writing}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold text-[#a64a30] transition-colors hover:bg-[#d9856b]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60 disabled:opacity-60"
                      >
                        <IconSparkle className={`h-3.5 w-3.5 ${writing ? 'animate-pulse' : ''}`} />
                        {writing ? 'Writing…' : letter.aiBody ? 'Rewrite with AI' : 'Write with AI'}
                      </button>
                    )}
                  </span>
                )}
              </div>

              {/* What the AI is doing, or why it is not */}
              <div role="status" aria-live="polite">
                {writing && (
                  <div className="mb-3 flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12.5px] leading-snug text-slate-600">
                    <IconSpinner className="mt-px h-4 w-4 shrink-0 text-[#d9856b]" />
                    <span>
                      {letter.requirements.length > 0 ? 'Writing your letter from your resume and what the job asks for.' : 'Writing your letter from your resume.'} The first one can take up to a minute while the server wakes up.
                    </span>
                  </div>
                )}

                {!writing && ai.state === 'blocked' && (
                  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12.5px] leading-snug text-slate-600">
                    <IconInfo className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1">
                      {ai.code === 'signin'
                        ? 'Sign in to have AI write this letter from your resume. Until then, here is a starter draft you can edit.'
                        : 'AI-written letters are a Premium feature. Here is a starter draft you can edit.'}
                    </span>
                    <button
                      type="button"
                      onClick={ai.code === 'signin' ? requestSignIn : requestUpgrade}
                      className="shrink-0 rounded-full bg-[#1e3a8a] px-3 py-1 text-[12px] font-semibold text-white transition-colors hover:bg-blue-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e3a8a]/25"
                    >
                      {ai.code === 'signin' ? 'Sign in' : 'Upgrade'}
                    </button>
                  </div>
                )}

                {!writing && ai.state === 'error' && (
                  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] leading-snug text-amber-800">
                    <IconInfo className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      {{
                        busy: 'You asked for several letters in a short time. Please try again in a minute.',
                        timeout: 'The AI took too long to answer. A starter draft is shown below.',
                        offline: 'Could not reach the AI service. Check your connection. A starter draft is shown below.',
                        empty: 'Add your experience, skills or education to the resume and the AI can write the letter from them.',
                        position: 'Type the position you are applying for under “Who is it for” (for example CRM Lead). The letter names it in its first sentence.',
                      }[ai.code] || 'The AI writer is unavailable right now. A starter draft is shown below.'}
                    </span>
                    {ai.code !== 'empty' && (
                      <button
                        type="button"
                        onClick={() => generate({ fresh: true })}
                        className="shrink-0 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-amber-900 ring-1 ring-amber-300 transition-colors hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      >
                        {ai.code === 'position' ? 'Write letter' : 'Try again'}
                      </button>
                    )}
                  </div>
                )}

                {!writing && !postingBusy && ai.state === 'idle' && !letter.aiBody && !letter.bodyEdited && (
                  <div className="mb-3 flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12.5px] leading-snug text-slate-600">
                    <IconInfo className="mt-px h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      Paste the link to the job advert above for a letter that answers what the job asks for. Or choose “Write with AI” for a general letter from your resume. Until then, this is a starter draft.
                    </span>
                  </div>
                )}

                {stale && ai.state !== 'blocked' && (
                  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12.5px] leading-snug text-slate-600">
                    <IconInfo className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1">The position, company, tone, job requirements or resume changed since this letter was written.</span>
                    <button
                      type="button"
                      onClick={() => generate({ fresh: true })}
                      className="shrink-0 rounded-full bg-[#1e3a8a] px-3 py-1 text-[12px] font-semibold text-white transition-colors hover:bg-blue-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e3a8a]/25"
                    >
                      Rewrite with AI
                    </button>
                  </div>
                )}
              </div>

              <label htmlFor="cl-body" className="sr-only">
                Letter text
              </label>
              <textarea
                id="cl-body"
                value={body}
                onChange={setBody}
                readOnly={writing}
                aria-busy={writing}
                rows={16}
                spellCheck
                className={`w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[13.5px] leading-relaxed text-slate-900 transition-colors focus:border-[#d9856b] focus:outline-none focus:ring-4 focus:ring-[#d9856b]/15 ${writing ? 'opacity-60' : ''}`}
              />
              <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
                {letter.bodyEdited
                  ? 'Leave a blank line between paragraphs. Start a line with “- ” for a bullet.'
                  : letter.aiBody
                    ? 'Written by AI from your resume. Read it through and change anything that isn’t right before you send it. Leave a blank line between paragraphs and start a line with “- ” for a bullet.'
                    : 'This starter draft is written from your resume and follows the details above until you edit it. Leave a blank line between paragraphs and start a line with “- ” for a bullet.'}
              </p>
            </section>

            {prepared?.lost && (
              <div role="status" className="flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12.5px] leading-snug text-slate-600">
                <IconInfo className="mt-px h-4 w-4 shrink-0 text-slate-400" />
                <span>Some characters, such as emoji, can’t be used in a PDF letter and are left out.</span>
              </div>
            )}

            {premium !== true && (
              <p className="text-[12px] leading-relaxed text-slate-400">
                Free downloads carry a small “Created with RemoPDF” line at the bottom of each page. Premium removes it.
              </p>
            )}
          </div>
        </div>

        {/* Preview */}
        <div
          ref={previewRef}
          className={`${view === 'preview' ? 'block' : 'hidden'} pro-scroll min-h-0 flex-1 overflow-y-auto bg-slate-100 px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-8 lg:block`}
          aria-label="Cover letter preview"
        >
          {layout ? (
            layout.pages.map((page, i) => <PreviewPage key={i} page={page} scale={scale} />)
          ) : (
            <p className="py-20 text-center text-[13px] text-slate-400">{error || 'Preparing preview…'}</p>
          )}
        </div>
      </div>

      {/* A failed download shows as a small message at the bottom of the page. */}
      {error && layout && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 flex justify-center px-4">
          <div role="alert" className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-red-200 bg-white py-2.5 pl-3.5 pr-2.5 text-[13px] text-slate-800">
            <p className="min-w-0 flex-1 leading-snug">{error}</p>
            <button
              type="button"
              onClick={() => setError('')}
              className="rounded-full px-3 py-1 text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
