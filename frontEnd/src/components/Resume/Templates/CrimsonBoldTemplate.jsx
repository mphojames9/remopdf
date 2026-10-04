import React from 'react';
import { renderAchievements } from '../Sections/richText';
import renderCertificates from '../Sections/renderCertificates';
import {
  PAGE_WIDTH_PX,
  PAGE_HEIGHT_PX,
  tint,
  jobDates,
  DEFAULT_ACCENT,
  usePaginatedBlocks,
  A4Page,
  endGroup,
  editAttrs,
  markSection,
  renderExtraSections,
} from './templateShared';

/**
 * Atlas Sidebar (id: atlas-sidebar). The Atlas look with a right-hand sidebar.
 *
 *   header   oversized name, profession and a spec-style contact row, across the full width
 *   main     (left)  Summary, Work Experience on a timeline rail, Projects, Hobbies, References
 *   sidebar  (right) Skills, Education, Certificates, Languages, on a tinted panel
 *
 * Reading order stays sensible for parsers: contact details first, then the main column,
 * then the sidebar. Everything is real text; the circles, rail and dot grid are CSS only.
 *
 * Both columns are paginated on their own with usePaginatedBlocks and the page count is
 * whichever needs more, so the sidebar panel runs the full height of every later page.
 * Gaps are padding (never margin), display fonts are inline on the atoms, and all body
 * margins are inline px, so the hidden measuring boxes match the real columns.
 *
 * Skills and languages are a vertical list of plain text items with a small accent dot (no chips, backgrounds or borders).
 *
 * Type: Outfit for display, Inter for body (both must be loaded by the app). Small
 * coloured text uses a darkened accent; the pure accent is used for shapes only.
 *
 * To register: add 'atlas-sidebar' to DEFAULT_ACCENT (suggested #F26A21) and to your
 * template list. A missing key falls back to the 'atlas' accent, then FALLBACK_ACCENT.
 * Use a #rrggbb accent.
 */

const BODY_FONT = `'Inter', 'Segoe UI', system-ui, -apple-system, Arial, sans-serif`;
const DISPLAY_FONT = `'Outfit', 'Inter', 'Segoe UI', system-ui, -apple-system, Arial, sans-serif`;
const FALLBACK_ACCENT = '#F26A21';
const INK = '#0E1116';
const TEXT = '#3B4350';

// Which sections live in the sidebar. Everything else goes in the main column, in sectionOrder order.
const SIDEBAR_KEYS = new Set(['skills', 'education', 'certificates', 'languages']);

// Geometry (px).
const RAIL_W = 8; // accent strip on the left edge
const SIDEBAR_W = 236;
const SIDE_PAD_X = 22;
const MAIN_PAD_L = 60;
const MAIN_PAD_R = 28;
const MARGIN_TOP_FIRST = 24; // page 1, under the header
const MARGIN_TOP_NEXT = 44; // pages 2+
const MARGIN_BOTTOM = 40;

const SIDE_CONTENT_W = SIDEBAR_W - SIDE_PAD_X * 2; // the hidden sidebar measuring box must match
const MAIN_CONTENT_W = PAGE_WIDTH_PX - MAIN_PAD_L - MAIN_PAD_R - SIDEBAR_W; // the hidden main measuring box must match
const NEXT_PAGE_MAX_HEIGHT = PAGE_HEIGHT_PX - MARGIN_TOP_NEXT - MARGIN_BOTTOM; // pages 2+, both columns

// Darken a #rrggbb colour toward black (used for small accent-coloured text).
const shade = (hex, amount) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0x1f3a5f;
  const f = 1 - amount;
  return `rgb(${Math.round(((n >> 16) & 255) * f)}, ${Math.round(((n >> 8) & 255) * f)}, ${Math.round((n & 255) * f)})`;
};

// Heading: a short accent bar above the title. The bar is CSS only, so the heading stays plain text.
const HEADING_BASE =
  `font-semibold tracking-tight before:mb-2 before:block before:h-[3px] before:rounded-full before:bg-[var(--accent)] before:content-['']`;
const MAIN_HEADING = `${HEADING_BASE} mb-3 text-[17px] before:w-7`;
const SIDE_HEADING = `${HEADING_BASE} mb-2.5 text-[15px] before:w-6`;

// The outlined pill around a date. Experience, education and certificates all use it.
const DATE_PILL = 'shrink-0 whitespace-nowrap rounded-full border px-2.5 py-[1px] text-[10.5px] tabular-nums text-slate-700';

// Splits a contact entry into a small label and its value.
// "Nationality: South African" -> Nationality / South African. Otherwise the label is guessed from the value.
const splitContact = (raw) => {
  const text = String(raw).trim();
  const own = /^([^:/@\d][^:/@]{1,23}):\s*(?!\/\/)(.+)$/.exec(text);
  if (own) return { label: own[1].trim(), value: own[2].trim() };
  const t = text.toLowerCase();
  if (t.includes('@')) return { label: 'Email', value: text };
  if (t.includes('linkedin')) return { label: 'LinkedIn', value: text };
  if (/^\+?[\d\s().-]{7,}$/.test(t)) return { label: 'Phone', value: text };
  if (/^(https?:\/\/|www\.)/.test(t) || /\.(com|dev|io|net|org|co|me|app|site)(\/|$)/.test(t)) return { label: 'Website', value: text };
  if (/licen[sc]e/.test(t)) return { label: 'Licence', value: text };
  return { label: 'Location', value: text };
};

// First non-empty string among the given keys of an object (languages can store their fields under different names).
const pick = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
};

// Dates: "05 2026", "2026-05", "May 2026", "14/05/2026" ... all become "May 2026". Anything unrecognised is left as typed.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (n, year) => (n >= 1 && n <= 12 ? `${MONTHS[n - 1]} ${year}` : null);
const RANGE_SEP = /\s+[–—-]\s+|\s*[–—]\s*|\s+to\s+/i;
const OPEN_ENDED = /^(present|current|now|ongoing)$/i;

// "May 2026" for a recognised date, otherwise null.
const parseDate = (raw) => {
  const t = String(raw ?? '').trim();
  if (!t) return null;
  let m = /^(\d{4})[\s/.-]+(\d{1,2})(?:[\s/.-]+\d{1,2})?(?:T.*)?$/.exec(t); // 2026-05, 2026-05-14, 2026/5
  if (m) return monthLabel(+m[2], m[1]);
  m = /^(\d{1,2})[\s/.-]+(\d{4})$/.exec(t); // 05 2026, 5/2026
  if (m) return monthLabel(+m[1], m[2]);
  m = /^(\d{1,2})[\s/.-]+(\d{1,2})[\s/.-]+(\d{4})$/.exec(t); // 14/05/2026 (day first unless the second number can't be a month)
  if (m) return monthLabel(+m[2] > 12 ? +m[1] : +m[2], m[3]);
  m = /^([A-Za-z]{3,9})\.?,?\s+(\d{4})$/.exec(t); // May 2026, September 2026, Sept 2026
  if (m) {
    const i = MONTHS.findIndex((x) => x.toLowerCase() === m[1].slice(0, 3).toLowerCase());
    if (i >= 0) return `${MONTHS[i]} ${m[2]}`;
  }
  return null;
};

const formatDate = (raw) => {
  const t = String(raw ?? '').trim();
  return parseDate(t) ?? t;
};

// A range such as "05 2026 – Present": each side is formatted, the separator is kept as an en dash.
const formatRange = (raw) => {
  const t = String(raw ?? '').trim();
  if (!t) return '';
  return t.split(RANGE_SEP).map(formatDate).join(' – ');
};

// Same, but only when the whole text is a date or a date range, so ordinary sentences are never touched.
const formatDateText = (raw) => {
  const t = String(raw ?? '').trim();
  if (!t) return raw;
  const parts = t.split(RANGE_SEP);
  if (!parts.every((p) => parseDate(p) !== null || OPEN_ENDED.test(p.trim()))) return raw;
  return parts.map(formatDate).join(' – ');
};

// Formats every date in one entry (a certificate or project): date-named fields, separate month fields ("10" -> "Oct"),
// and any other field whose whole value is a date.
const formatEntryDates = (item) => {
  if (!item || typeof item !== 'object') return item;
  const out = { ...item };
  Object.keys(out).forEach((k) => {
    const v = out[k];
    if (typeof v !== 'string' && typeof v !== 'number') return;
    if (/date|issued|expir|valid/i.test(k) && typeof v === 'string') out[k] = formatRange(v);
    else if (/month/i.test(k) && /^\s*\d{1,2}\s*$/.test(String(v)) && +v >= 1 && +v <= 12) out[k] = MONTHS[+v - 1];
    else if (typeof v === 'string') out[k] = formatDateText(v);
  });
  return out;
};

// Certificates and projects arrive as { enabled, items: [...] } (a plain array also works).
const withFormattedDates = (data) => {
  if (Array.isArray(data)) return data.map(formatEntryDates);
  if (data && typeof data === 'object' && Array.isArray(data.items)) return { ...data, items: data.items.map(formatEntryDates) };
  return data;
};

// `languages` is not always an array (it can be an object or a string), so normalise it before mapping.
const toList = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return v.split(/[\n;]+/).map((x) => x.trim()).filter(Boolean);
  if (v && typeof v === 'object') {
    for (const k of ['items', 'list', 'entries', 'languages']) if (Array.isArray(v[k])) return v[k];
    const vals = Object.values(v);
    if (vals.length && vals.every((x) => x && typeof x === 'object')) return vals;
    if (vals.length && vals.every((x) => typeof x === 'string')) return Object.entries(v).map(([name, level]) => ({ name, level }));
  }
  return [];
};

const AtlasSidebarTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder, edit } = props;
  const accentColor = props.accentColor || DEFAULT_ACCENT['atlas-sidebar'] || DEFAULT_ACCENT.atlas || FALLBACK_ACCENT;
  const accentText = shade(accentColor, 0.3);
  const railColor = tint(accentColor, 0.78);
  const panelBg = tint(accentColor, 0.95);

  const headingStyle = { fontFamily: DISPLAY_FONT, color: INK, '--accent': accentColor };
  const heading = (key, text, cls) => <h3 key={`${key}-h`} className={cls} style={headingStyle}>{text}</h3>;

  // Items are plain text; the dot before each one is a CSS shape, so the text stays clean.
  const itemList = (key, items) => (
    <div key={key} className="flex flex-col gap-1.5" style={{ '--accent': accentColor }}>
      {items.map((it, i) => (
        <span
          key={`${key}-${it.id ?? i}`}
          className="relative pl-3 text-[11px] font-medium leading-snug before:absolute before:left-0 before:top-[0.5em] before:h-1 before:w-1 before:rounded-full before:bg-[var(--accent)] before:content-['']"
          style={{ color: INK }}
        >
          {it.text}
          {it.note && <span className="font-normal text-slate-500"> ({it.note})</span>}
        </span>
      ))}
    </div>
  );

  // Main column: title with the dates in an outlined pill, employer / location under it.
  const mainHead = (title, date, primary, secondary) => (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-semibold leading-snug tracking-tight" style={{ fontFamily: DISPLAY_FONT, color: INK }}>{title}</p>
        {date && (
          <span
            className={`mt-[1px] ${DATE_PILL}`}
            style={{ borderColor: tint(accentColor, 0.55) }}
          >
            {date}
          </span>
        )}
      </div>
      {(primary || secondary) && (
        <p className="mt-0.5 text-[12.5px] leading-snug">
          {primary && <span className="font-medium" style={{ color: accentText }}>{primary}</span>}
          {secondary && <span className="text-slate-500">{primary ? ', ' : ''}{secondary}</span>}
        </p>
      )}
    </div>
  );

  // Timeline rail for Experience: every atom carries the rail's left border, the head also carries the node.
  // The gap between entries is padding, so the rail stays unbroken between atoms and across a page break.
  const railEntry = (id, head, bodyNodes, isLastEntry, isFirstEntry) => {
    const list = [head, ...bodyNodes].filter(Boolean);
    return list.map((node, i) => (
      <div
        key={`${id}-${i}`}
        className={`relative ml-[5px] border-l-2 pl-5 ${i === list.length - 1 && !isLastEntry ? 'pb-6' : 'pb-1'}`}
        style={{ borderColor: railColor }}
      >
        {i === 0 && (
          <span
            className="absolute -left-[7px] top-[5px] h-3 w-3 rounded-full border-2"
            style={{
              borderColor: accentColor,
              background: isFirstEntry ? accentColor : '#fff',
              boxShadow: isFirstEntry ? `0 0 0 4px ${tint(accentColor, 0.85)}` : 'none',
            }}
          />
        )}
        {node}
      </div>
    ));
  };

  // Sidebar entries are compact and have no rail.
  const sideEntry = (id, head, bodyNodes, isLastEntry) => {
    const list = [head, ...bodyNodes].filter(Boolean);
    return list.map((node, i) => (
      <div key={`${id}-${i}`} style={{ paddingBottom: i === list.length - 1 ? (isLastEntry ? 0 : 14) : 3 }}>{node}</div>
    ));
  };

  const richLines = (text, prefix) => (
    text ? renderAchievements(text, prefix).map((el, i) => <div key={`${prefix}-w${i}`}>{el}</div>) : []
  );

  const sectionMap = {
    // Lead paragraph: larger and darker than the body. The overrides reach into whatever renderAchievements outputs.
    summary: summary ? endGroup([
      heading('summary', 'Professional Summary', MAIN_HEADING),
      ...renderAchievements(summary, 'summary').map((el, i) => (
        <div key={`summary-w${i}`} className="[&_*]:!text-[13px] [&_*]:!leading-[1.65] [&_*]:!text-[#1F2937]">{el}</div>
      )),
    ]) : [],

    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Work Experience', MAIN_HEADING),
      ...jobs.flatMap((job, i) => railEntry(
        `job-${job.id ?? i}`,
        mainHead(job.title, formatRange(jobDates(job)), job.employer, [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(', ')),
        richLines(job.achievements, `job-${job.id ?? i}-ach`),
        i === jobs.length - 1,
        i === 0,
      )),
    ]) : [],

    education: educations.length > 0 ? endGroup([
      heading('education', 'Education', SIDE_HEADING),
      ...educations.flatMap((ed, i) => {
        const title = [ed.degree, ed.field].filter(Boolean).join(', ') || ed.institution;
        const school = title === ed.institution ? '' : ed.institution;
        const meta = [formatRange(ed.date), ed.location].filter(Boolean).join(', ');
        return sideEntry(
          `education-${ed.id ?? i}`,
          (
            <div>
              <p className="text-[12.5px] font-semibold leading-snug" style={{ fontFamily: DISPLAY_FONT, color: INK }}>{title}</p>
              {school && <p className="text-[11.5px] font-medium leading-snug" style={{ color: accentText }}>{school}</p>}
              {meta && <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">{meta}</p>}
            </div>
          ),
          richLines(ed.achievements, `education-${ed.id ?? i}-ach`),
          i === educations.length - 1,
        );
      }),
    ]) : [],

    skills: namedSkills.length > 0 ? endGroup([
      heading('skills', 'Skills', SIDE_HEADING),
      itemList('skills-list', namedSkills.map((sk) => ({ id: sk.id, text: sk.text }))),
    ]) : [],
  };

  // Extras come from the shared helpers, called once per column so each gets that column's heading size.
  const projectList = withFormattedDates(projects);
  const certList = withFormattedDates(certificates);
  const mainExtras = renderExtraSections({ projects: projectList, languages, hobbies, references, headingClass: MAIN_HEADING, headingStyle, accentColor });
  const sideExtras = renderExtraSections({ projects: projectList, languages, hobbies, references, headingClass: SIDE_HEADING, headingStyle, accentColor });
  const sideCerts = renderCertificates({ certificates: certList, headingClass: SIDE_HEADING, headingStyle, dateClass: DATE_PILL, dateStyle: { borderColor: tint(accentColor, 0.55) } });

  // Languages are shown like skills (plain items). If no name can be read, the shared renderer's output is kept.
  const languageItems = toList(languages)
    .map((l, i) => (typeof l === 'string'
      ? { id: i, text: l.trim(), note: '' }
      : { id: l?.id ?? i, text: pick(l, ['name', 'language', 'lang', 'text', 'label']), note: pick(l, ['level', 'proficiency', 'fluency']) }))
    .filter((l) => l.text);
  if ('languages' in sideExtras && languageItems.length > 0) {
    sideExtras.languages = endGroup([heading('languages', 'Languages', SIDE_HEADING), itemList('languages-list', languageItems)]);
  }

  const mainKeys = sectionOrder.filter((key) => !SIDEBAR_KEYS.has(key));
  const sideKeys = sectionOrder.filter((key) => SIDEBAR_KEYS.has(key));
  const mainBlocks = mainKeys.flatMap((key) => markSection(edit, key, sectionMap[key] || mainExtras[key] || []));
  const sideBlocks = sideKeys.flatMap((key) => markSection(edit, key, sectionMap[key] || sideExtras[key] || sideCerts[key] || []));

  const main = usePaginatedBlocks(mainBlocks, NEXT_PAGE_MAX_HEIGHT);
  const side = usePaginatedBlocks(sideBlocks, NEXT_PAGE_MAX_HEIGHT);
  const pageCount = Math.max(1, main.pages.length, side.pages.length);

  // Header pieces.
  const name = (fullName || 'Your Name').trim();
  const nameParts = name.split(/\s+/);
  const firstName = nameParts[0];
  const restName = nameParts.slice(1).join(' ');
  const nameSize = name.length > 22 ? 42 : name.length > 16 ? 50 : 60;
  const professionParts = (personal.profession || '').split('|').map((s) => s.trim()).filter(Boolean);
  const contacts = (contactList || []).filter((c) => typeof c === 'string' && c.trim());

  return (
    <>
      {/* Hidden copies of every atom, one box per column, as wide as the real column body. */}
      <div
        ref={main.measureContainerRef}
        className="absolute pointer-events-none"
        style={{ top: -9999, left: -9999, width: MAIN_CONTENT_W, fontFamily: BODY_FONT }}
      >
        {main.measureContent}
      </div>
      <div
        ref={side.measureContainerRef}
        className="absolute pointer-events-none"
        style={{ top: -9999, left: -9999 - SIDEBAR_W, width: SIDE_CONTENT_W, fontFamily: BODY_FONT }}
      >
        {side.measureContent}
      </div>

      {Array.from({ length: pageCount }, (_, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pageCount}>
          <div
            className="relative flex h-full w-full flex-col overflow-hidden bg-white text-left antialiased"
            style={{ fontFamily: BODY_FONT, color: TEXT, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {/* Decorative shapes: CSS only, no text. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0"
              style={{ width: RAIL_W, background: index === 0 ? `linear-gradient(to bottom, ${INK} 0, ${INK} 150px, ${accentColor} 150px)` : accentColor }}
            />
            {index === 0 ? (
              <>
                <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-[360px] w-[360px] rounded-full" style={{ background: `radial-gradient(circle at 30% 30%, ${tint(accentColor, 0.84)}, ${tint(accentColor, 0.95)})` }} />
                <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 h-[240px] w-[240px] rounded-full border" style={{ borderColor: tint(accentColor, 0.6) }} />
                <div aria-hidden="true" className="pointer-events-none absolute right-[48px] top-[44px] h-[84px] w-[132px]" style={{ backgroundImage: `radial-gradient(${accentColor} 1.3px, transparent 1.5px)`, backgroundSize: '12px 12px', opacity: 0.5 }} />
              </>
            ) : (
              <p className="absolute text-[10.5px] font-medium text-slate-400" style={{ left: MAIN_PAD_L, top: 20, fontFamily: DISPLAY_FONT }}>{name}</p>
            )}

            {index === 0 && (
              <div {...editAttrs(edit, 'personal')} className="relative shrink-0 pt-12" style={{ paddingLeft: MAIN_PAD_L, paddingRight: 36, paddingBottom: 14 }}>
                <h1 className="break-words leading-[1.02] tracking-[-0.045em]" style={{ fontFamily: DISPLAY_FONT, fontSize: nameSize, color: INK }}>
                  <span className="font-light">{firstName}</span>
                  {restName && (<>{' '}<span className="font-semibold">{restName}</span></>)}
                </h1>
                {professionParts.length > 0 && (
                  <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[17px]" style={{ fontFamily: DISPLAY_FONT, color: accentText }}>
                    {professionParts.map((part, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span aria-hidden="true" className="h-4 w-px" style={{ backgroundColor: tint(accentColor, 0.5) }} />}
                        <span>{part}</span>
                      </React.Fragment>
                    ))}
                  </p>
                )}
                {contacts.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-y-3">
                    {contacts.map((c, i) => (
                      <div key={i} className="mr-5 border-r border-slate-200 pr-5 last:mr-0 last:border-r-0 last:pr-0">
                        <p className="text-[9.5px] font-medium leading-none tracking-[0.06em] text-slate-400">{splitContact(c).label}</p>
                        <p className="mt-1 text-[11.5px] leading-snug [overflow-wrap:anywhere]" style={{ color: INK }}>{splitContact(c).value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex min-h-0 flex-1">
              {/* Main column, on the left. */}
              <div className="flex min-w-0 flex-1 flex-col">
                <div
                  ref={index === 0 ? main.firstBodyRef : undefined}
                  className="relative min-h-0 flex-1 overflow-hidden"
                  style={{ marginLeft: MAIN_PAD_L, marginRight: MAIN_PAD_R, marginTop: index === 0 ? MARGIN_TOP_FIRST : MARGIN_TOP_NEXT, marginBottom: MARGIN_BOTTOM }}
                >
                  {main.pages[index] || null}
                  {isEmpty && index === 0 && (
                    <p className="text-xs italic text-slate-400">Nothing entered yet — fill in a few steps to see them appear here.</p>
                  )}
                </div>
              </div>

              {/* Sidebar, on the right. Positioned so its tint paints over the header circle where they meet. */}
              <div
                className="relative flex shrink-0 flex-col"
                style={{ width: SIDEBAR_W, background: panelBg, borderLeft: `1px solid ${tint(accentColor, 0.82)}` }}
              >
                <div
                  ref={index === 0 ? side.firstBodyRef : undefined}
                  className="relative min-h-0 flex-1 overflow-hidden"
                  style={{ marginLeft: SIDE_PAD_X, marginRight: SIDE_PAD_X, marginTop: index === 0 ? MARGIN_TOP_FIRST : MARGIN_TOP_NEXT, marginBottom: MARGIN_BOTTOM }}
                >
                  {side.pages[index] || null}
                </div>
              </div>
            </div>
          </div>
        </A4Page>
      ))}
    </>
  );
};

export default AtlasSidebarTemplate;
