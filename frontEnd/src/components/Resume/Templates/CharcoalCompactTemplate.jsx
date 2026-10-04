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
 *   main     (left)  name, profession and contact details at the top, then Summary, Work
 *                    Experience on a timeline rail, Education, Projects, Hobbies, References
 *   sidebar  (right) Skills, Certificates, Languages, on a full-height tinted panel
 *
 * Reading order stays sensible for parsers: contact details first, then the main column,
 * then the sidebar. Everything is real text; the thin left rail is the only decoration.
 *
 * Both columns are paginated on their own with usePaginatedBlocks and the page count is
 * whichever needs more, so the sidebar panel runs the full height of every later page.
 * Gaps are padding (never margin), display fonts are inline on the atoms, and all body
 * margins are inline px, so the hidden measuring boxes match the real columns.
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
const SIDEBAR_KEYS = new Set(['skills', 'certificates', 'languages']);

// Geometry (px).
const RAIL_W = 8; // accent strip on the left edge
const SIDEBAR_W = 236;
const SIDE_PAD_X = 22;
const MAIN_PAD_L = 60;
const MAIN_PAD_R = 28;
const TOP = 44; // top padding of the name block and of every sidebar page
const MARGIN_TOP_FIRST = 28; // main column body on page 1, under the header
const MARGIN_TOP_NEXT = 44; // main column body on pages 2+
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
const MAIN_HEADING = `${HEADING_BASE} mb-3 text-[21px] before:w-8`;
const SIDE_HEADING = `${HEADING_BASE} mb-3 text-[18px] before:w-7`;

// Normalise any month/year in a string to "Jan 2025". Handles "08 2025", "08/2025", "2025-08",
// "2025-08-15", "August 2025" and "Sept, 2025". Plain years and words like "Present" are left alone.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAME_RE = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?,?\s+(\d{4})\b/gi;
const formatDates = (text, { numeric = true } = {}) => {
  if (!text) return text;
  const fromNumber = (all, m, y) => (+m >= 1 && +m <= 12 ? `${MONTHS[+m - 1]} ${y}` : all);
  let out = String(text);
  if (numeric) {
    out = out
      .replace(/\b(\d{4})[/.-](\d{1,2})(?:[/.-]\d{1,2})?\b/g, (all, y, m) => fromNumber(all, m, y))
      .replace(/\b(\d{1,2})[/.\s-]+(\d{4})\b/g, fromNumber);
  }
  return out.replace(MONTH_NAME_RE, (all, name, y) => `${MONTHS[MONTHS.findIndex((m) => m.toLowerCase() === name.slice(0, 3).toLowerCase())]} ${y}`);
};

// Run formatDates over the date fields (date, issueDate, expiryDate, startDate, year ...) of a list of entries,
// for sections whose shared renderer prints the raw value (Certificates, Projects).
const DATE_KEY_RE = /date|issued|expir|year/i;
const withFormattedDates = (items) => (Array.isArray(items) ? items.map((item) => {
  if (!item || typeof item !== 'object') return item;
  const next = { ...item };
  Object.keys(next).forEach((k) => {
    if (DATE_KEY_RE.test(k) && typeof next[k] === 'string') next[k] = formatDates(next[k]);
  });
  return next;
}) : items);


// A skill's level as 0-5 dots. Accepts 1-5, a 0-100 score, or a label such as "Expert".
const LEVEL_WORDS = { beginner: 1, novice: 1, basic: 1, elementary: 2, intermediate: 3, proficient: 4, advanced: 4, expert: 5, master: 5 };
const skillLevel = (skill) => {
  const raw = skill.level ?? skill.proficiency ?? skill.rating ?? skill.value;
  if (raw === undefined || raw === null || raw === '') return 0;
  const n = Number(raw);
  if (Number.isFinite(n)) return n > 5 ? Math.min(5, Math.max(1, Math.round(n / 20))) : Math.min(5, Math.max(0, Math.round(n)));
  return LEVEL_WORDS[String(raw).trim().toLowerCase()] || 0;
};

const contactLabel = (value) => {
  const t = String(value).trim().toLowerCase();
  if (t.includes('@')) return 'Email';
  if (t.includes('linkedin')) return 'LinkedIn';
  if (/^\+?[\d\s().-]{7,}$/.test(t)) return 'Phone';
  if (/^(https?:\/\/|www\.)/.test(t) || /\.(com|dev|io|net|org|co|me|app|site)(\/|$)/.test(t)) return 'Website';
  return 'Location';
};

const AtlasSidebarTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects: rawProjects, references, certificates: rawCertificates, isEmpty, sectionOrder, edit } = props;
  const projects = withFormattedDates(rawProjects);
  const certificates = withFormattedDates(rawCertificates);
  const accentColor = props.accentColor || DEFAULT_ACCENT['atlas-sidebar'] || DEFAULT_ACCENT.atlas || FALLBACK_ACCENT;
  const accentText = shade(accentColor, 0.3);
  const railColor = tint(accentColor, 0.78);
  const panelBg = tint(accentColor, 0.95);

  const headingStyle = { fontFamily: DISPLAY_FONT, color: INK, '--accent': accentColor };
  const heading = (key, text, cls) => <h3 key={`${key}-h`} className={cls} style={headingStyle}>{text}</h3>;

  // Main column: title with the dates in an outlined pill, employer / location under it.
  const mainHead = (title, date, primary, secondary) => (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-semibold leading-snug tracking-tight" style={{ fontFamily: DISPLAY_FONT, color: INK }}>{title}</p>
        {date && (
          <span
            className="mt-[1px] shrink-0 whitespace-nowrap rounded-full border px-2.5 py-[1px] text-[10.5px] tabular-nums text-slate-700"
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

  // Entries without a rail (Education in the main column, sidebar entries).
  const plainEntry = (id, head, bodyNodes, isLastEntry) => {
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
        mainHead(job.title, formatDates(jobDates(job)), job.employer, [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(', ')),
        richLines(job.achievements, `job-${job.id ?? i}-ach`),
        i === jobs.length - 1,
        i === 0,
      )),
    ]) : [],

    education: educations.length > 0 ? endGroup([
      heading('education', 'Education', MAIN_HEADING),
      ...educations.flatMap((ed, i) => {
        const title = [ed.degree, ed.field].filter(Boolean).join(', ') || ed.institution;
        const school = title === ed.institution ? '' : ed.institution;
        return plainEntry(
          `education-${ed.id ?? i}`,
          mainHead(title, formatDates(ed.date), school, ed.location),
          richLines(ed.achievements, `education-${ed.id ?? i}-ach`),
          i === educations.length - 1,
        );
      }),
    ]) : [],

    skills: namedSkills.length > 0 ? endGroup([
      heading('skills', 'Skills', SIDE_HEADING),
      <div key="skills-list" className="flex flex-col gap-2.5">
        {namedSkills.map((s, i) => {
          const level = skillLevel(s);
          return (
            <div key={`skill-${s.id ?? i}`}>
              <p className="text-[11.5px] font-medium leading-snug" style={{ color: INK }}>{s.text}</p>
              {level > 0 && (
                <span role="img" aria-label={`Level ${level} of 5`} className="mt-1 flex gap-[3px]">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className="h-[6px] w-[6px] rounded-full"
                      style={{ background: n <= level ? accentColor : tint(accentColor, 0.78) }}
                    />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>,
    ]) : [],
  };

  // Extras come from the shared helpers, called once per column so each gets that column's heading size.
  const mainExtras = renderExtraSections({ projects, languages, hobbies, references, headingClass: MAIN_HEADING, headingStyle, accentColor });
  const sideExtras = renderExtraSections({ projects, languages, hobbies, references, headingClass: SIDE_HEADING, headingStyle, accentColor });
  const sideCerts = renderCertificates({ certificates, headingClass: SIDE_HEADING, headingStyle });

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
  const nameSize = name.length > 24 ? 34 : name.length > 17 ? 40 : 48;
  const professionParts = (personal.profession || '').split('|').map((s) => s.trim()).filter(Boolean);
  const contacts = (contactList || []).filter((c) => typeof c === 'string' && c.trim()).map((c) => formatDates(c, { numeric: false }));

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
            {/* Left rail: CSS only, no text. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0" style={{ width: RAIL_W, background: accentColor }} />
            {index > 0 && (
              <p className="absolute text-[10.5px] font-medium text-slate-400" style={{ left: MAIN_PAD_L, top: 20, fontFamily: DISPLAY_FONT }}>{name}</p>
            )}

            <div className="flex min-h-0 flex-1">
              {/* Main column, on the left. Page 1 starts with the name block. */}
              <div className="flex min-w-0 flex-1 flex-col">
                {index === 0 && (
                  <div {...editAttrs(edit, 'personal')} className="shrink-0" style={{ paddingTop: TOP, paddingLeft: MAIN_PAD_L, paddingRight: MAIN_PAD_R }}>
                    <h1 className="break-words leading-[1.05] tracking-[-0.04em]" style={{ fontFamily: DISPLAY_FONT, fontSize: nameSize, color: INK }}>
                      <span className="font-light">{firstName}</span>
                      {restName && (<>{' '}<span className="font-semibold">{restName}</span></>)}
                    </h1>
                    {professionParts.length > 0 && (
                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[16px]" style={{ fontFamily: DISPLAY_FONT, color: accentText }}>
                        {professionParts.map((part, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <span aria-hidden="true" className="h-4 w-px" style={{ backgroundColor: tint(accentColor, 0.5) }} />}
                            <span>{part}</span>
                          </React.Fragment>
                        ))}
                      </p>
                    )}
                    {contacts.length > 0 && (
                      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-200 pt-4">
                        {contacts.map((c, i) => (
                          <div key={i} className="min-w-0">
                            <p className="text-[9.5px] font-medium leading-none tracking-[0.06em] text-slate-400">{contactLabel(c)}</p>
                            <p className="mt-1 text-[11.5px] leading-snug [overflow-wrap:anywhere]" style={{ color: INK }}>{c}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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

              {/* Sidebar, on the right: full height, flush to the top and right edges. */}
              <div
                className="relative flex shrink-0 flex-col"
                style={{ width: SIDEBAR_W, background: panelBg, borderLeft: `1px solid ${tint(accentColor, 0.82)}` }}
              >
                <div
                  ref={index === 0 ? side.firstBodyRef : undefined}
                  className="relative min-h-0 flex-1 overflow-hidden"
                  style={{ marginLeft: SIDE_PAD_X, marginRight: SIDE_PAD_X, marginTop: TOP, marginBottom: MARGIN_BOTTOM }}
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
