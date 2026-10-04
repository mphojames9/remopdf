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
 * Indigo Ledger (id: indigo-ledger). A single-column résumé with a dark banner and a "ledger" body.
 *
 *   banner   (page 1 only) name, profession and contact details, full-bleed, on deep navy with a thin
 *            accent strip under it
 *   body     one column in sectionOrder order. Section headings are a small accent square, the title
 *            and a hairline that runs to the right edge. Work Experience and Education put the dates
 *            in a left gutter with the details beside them; Skills is a three-column grid with level
 *            dots; Certificates, Languages, Projects, Hobbies and References come from the shared helpers.
 *            Skills and the helper sections sit in the same details column as the entries, under their heading.
 *
 * The name appears once, in the banner. Pages 2+ start straight into the body, with no repeated name.
 *
 * Everything is flat: every heading, row and line is its own direct node, so the paginator can break
 * between any two of them. Gaps are padding (never margin), display fonts are inline on the atoms and all
 * body margins are inline px, so the hidden measuring box matches the real column.
 *
 * Type: Outfit for display, Inter for body (both must be loaded by the app). Small coloured text uses a
 * darkened accent; the pure accent is used for shapes only. No shadows, no images.
 *
 * To register: add 'indigo-ledger' to DEFAULT_ACCENT (suggested #2F3E9E) and to your template list.
 * A missing key falls back to FALLBACK_ACCENT. Use a #rrggbb accent.
 */

const BODY_FONT = `'Inter', 'Segoe UI', system-ui, -apple-system, Arial, sans-serif`;
const DISPLAY_FONT = `'Outfit', 'Inter', 'Segoe UI', system-ui, -apple-system, Arial, sans-serif`;
const FALLBACK_ACCENT = '#2F3E9E';
const INK = '#0E1116';
const TEXT = '#3B4350';
const BANNER_BG = '#16243B'; // deep navy; the accent only draws the strip under it
const BANNER_SUB = '#BAC6D8'; // profession line on the banner

// Geometry (px).
const PAD_X = 48; // left and right page margin, for the banner and the body
const DATE_W = 92; // dates gutter in Experience / Education
const DATE_GAP = 18; // space between the gutter and the details
const INDENT = DATE_W + DATE_GAP; // body lines of an entry start here
const TOP = 40; // top padding of the banner
const MARGIN_TOP_FIRST = 26; // body on page 1, under the banner
const MARGIN_TOP_NEXT = 44; // body on pages 2+
const MARGIN_BOTTOM = 40;

const CONTENT_W = PAGE_WIDTH_PX - PAD_X * 2; // the hidden measuring box must match
const NEXT_PAGE_MAX_HEIGHT = PAGE_HEIGHT_PX - MARGIN_TOP_NEXT - MARGIN_BOTTOM; // pages 2+

// Darken a #rrggbb colour toward black (used for the banner and for small accent-coloured text).
const shade = (hex, amount) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0x1f3a5f;
  const f = 1 - amount;
  return `rgb(${Math.round(((n >> 16) & 255) * f)}, ${Math.round(((n >> 8) & 255) * f)}, ${Math.round((n & 255) * f)})`;
};

// Heading: accent square, title, then a hairline to the right edge. All CSS, so the heading stays plain text.
// The shared renderers receive the same class and style, so their headings match.
const HEADING =
  `mb-3.5 flex items-center gap-2.5 text-[18px] font-semibold tracking-tight before:h-2 before:w-2 before:shrink-0 before:rounded-[2px] before:bg-[var(--accent)] before:content-[''] after:h-px after:flex-1 after:bg-[var(--rule)] after:content-['']`;

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

// The shared renderers (Certificates, Projects) print whatever was stored, so "06 2020" can slip through. Walk what
// they return and rewrite every text node that is only a date, whichever field it came from: "06 2020" -> "Jun 2020".
const isDateOnly = (text) => {
  const t = String(text).trim();
  if (!t || t.length > 40 || !/\d{4}/.test(t)) return false;
  const rest = t.replace(MONTH_NAME_RE, '').replace(/present|current|now|ongoing/gi, '');
  return /^[\d\s/.,–—-]*$/.test(rest);
};
const unifyDates = (node) => {
  if (typeof node === 'string') return isDateOnly(node) ? formatDates(node) : node;
  if (Array.isArray(node)) return node.map((child) => unifyDates(child));
  if (!React.isValidElement(node) || node.props.children === undefined || node.props.children === null) return node;
  return React.cloneElement(node, undefined, React.Children.map(node.props.children, (child) => unifyDates(child)));
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

// Split a contact entry into a label and a value. "Born: 10 Sep 2026" -> Born / 10 Sep 2026, so personal details
// keep their own label. Email, phone, website and address entries without a "Label:" get a label from their shape.
const parseContact = (raw) => {
  const text = String(raw).trim();
  const t = text.toLowerCase();
  const labelled = /^(?!https?:)([^:\d,]{2,28}):\s*(.+)$/.exec(text);
  if (labelled) return { label: labelled[1].trim(), value: labelled[2].trim() };
  if (t.includes('@')) return { label: 'Email', value: text };
  if (t.includes('linkedin')) return { label: 'LinkedIn', value: text };
  if (/^\+?[\d\s().-]{7,}$/.test(t)) return { label: 'Phone', value: text };
  if (/^(https?:\/\/|www\.)/.test(t) || /\.(com|dev|io|net|org|co|me|app|site)(\/|$)/.test(t)) return { label: 'Website', value: text };
  if (/\d|,/.test(text)) return { label: 'Location', value: text };
  if (/licen[cs]e/i.test(text)) return { label: 'Licence', value: text };
  return { label: 'Other', value: text };
};

// "Aug 2025 – Present" -> two short lines for the dates gutter.
const dateLines = (date) => String(date || '').split(/\s+[–—-]\s+/).map((part) => part.trim()).filter(Boolean);

// The shared renderers (Certificates, Languages, Projects, Hobbies, References) draw flush left. Move everything
// except the heading into the details column so it lines up with Experience, Education and Skills.
const isHeading = (el) => React.isValidElement(el)
  && (el.type === 'h3' || String(el.props.className || '').includes('after:bg-[var(--rule)]'));
const indentBody = (name, blocks) => (Array.isArray(blocks) && blocks.length > 0
  ? endGroup(blocks.map((el, i) => (
    !React.isValidElement(el) || isHeading(el)
      ? el
      : <div key={`${name}-ix-${i}`} style={{ paddingLeft: INDENT }}>{unifyDates(el)}</div>
  )))
  : blocks);

const IndigoLedgerTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects: rawProjects, references, certificates: rawCertificates, isEmpty, sectionOrder, edit } = props;
  const projects = withFormattedDates(rawProjects);
  const certificates = withFormattedDates(rawCertificates);
  const accentColor = props.accentColor || DEFAULT_ACCENT['indigo-ledger'] || FALLBACK_ACCENT;
  const accentText = shade(accentColor, 0.3);

  const headingStyle = { fontFamily: DISPLAY_FONT, color: INK, '--accent': accentColor, '--rule': tint(accentColor, 0.78) };
  const heading = (key, text) => <h3 key={`${key}-h`} className={HEADING} style={headingStyle}>{text}</h3>;

  // Head of an entry: dates in the left gutter, title and employer / school beside them.
  const entryHead = (date, title, primary, secondary) => (
    <div className="flex items-start" style={{ gap: DATE_GAP }}>
      <div className="shrink-0 pt-[3px] text-[10.5px] leading-[1.45] tabular-nums text-slate-500" style={{ width: DATE_W }}>
        {dateLines(date).map((line, i) => <div key={i}>{i > 0 ? `– ${line}` : line}</div>)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-snug tracking-tight" style={{ fontFamily: DISPLAY_FONT, color: INK }}>{title}</p>
        {(primary || secondary) && (
          <p className="mt-0.5 text-[12.5px] leading-snug">
            {primary && <span className="font-medium" style={{ color: accentText }}>{primary}</span>}
            {secondary && <span className="text-slate-500">{primary ? ', ' : ''}{secondary}</span>}
          </p>
        )}
      </div>
    </div>
  );

  // One entry = the head plus one atom per body line. Body lines sit under the details, not under the dates.
  const entry = (id, head, bodyNodes, isLastEntry) => {
    const body = (bodyNodes || []).filter(Boolean);
    return [
      <div key={`${id}-0`} style={{ paddingBottom: body.length === 0 ? (isLastEntry ? 0 : 18) : 4 }}>{head}</div>,
      ...body.map((node, i) => (
        <div
          key={`${id}-${i + 1}`}
          style={{ paddingLeft: INDENT, paddingBottom: i === body.length - 1 ? (isLastEntry ? 0 : 18) : 3 }}
        >
          {node}
        </div>
      )),
    ];
  };

  const richLines = (text, prefix) => (
    text ? renderAchievements(text, prefix).map((el, i) => <div key={`${prefix}-w${i}`}>{el}</div>) : []
  );

  const sectionMap = {
    // Lead paragraph: larger and darker than the body. The overrides reach into whatever renderAchievements outputs.
    summary: summary ? endGroup([
      heading('summary', 'Professional Summary'),
      ...renderAchievements(summary, 'summary').map((el, i) => (
        <div key={`summary-w${i}`} className="[&_*]:!text-[12.5px] [&_*]:!leading-[1.65] [&_*]:!text-[#1F2937]">{el}</div>
      )),
    ]) : [],

    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Work Experience'),
      ...jobs.flatMap((job, i) => entry(
        `job-${job.id ?? i}`,
        entryHead(
          formatDates(jobDates(job)),
          job.title,
          job.employer,
          [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(', '),
        ),
        richLines(job.achievements, `job-${job.id ?? i}-ach`),
        i === jobs.length - 1,
      )),
    ]) : [],

    education: educations.length > 0 ? endGroup([
      heading('education', 'Education'),
      ...educations.flatMap((ed, i) => {
        const title = [ed.degree, ed.field].filter(Boolean).join(', ') || ed.institution;
        const school = title === ed.institution ? '' : ed.institution;
        return entry(
          `education-${ed.id ?? i}`,
          entryHead(formatDates(ed.date), title, school, ed.location),
          richLines(ed.achievements, `education-${ed.id ?? i}-ach`),
          i === educations.length - 1,
        );
      }),
    ]) : [],

    // Three-column grid, level dots under each name.
    skills: namedSkills.length > 0 ? endGroup([
      heading('skills', 'Skills'),
      <div key="skills-grid" className="grid grid-cols-3 gap-x-6 gap-y-3.5" style={{ paddingLeft: INDENT }}>
        {namedSkills.map((s, i) => {
          const level = skillLevel(s);
          return (
            <div key={`skill-${s.id ?? i}`} className="min-w-0">
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

  // Extras come from the shared helpers and take this template's heading.
  const extras = renderExtraSections({ projects, languages, hobbies, references, headingClass: HEADING, headingStyle, accentColor });
  const certs = renderCertificates({ certificates, headingClass: HEADING, headingStyle });

  const helperSections = Object.fromEntries(
    Object.entries({ ...extras, ...certs }).map(([key, value]) => [key, indentBody(key, value)]),
  );

  const blocks = sectionOrder.flatMap((key) => markSection(edit, key, sectionMap[key] || helperSections[key] || []));
  const body = usePaginatedBlocks(blocks, NEXT_PAGE_MAX_HEIGHT);
  const pageCount = Math.max(1, body.pages.length);

  // Banner pieces.
  const name = (fullName || 'Your Name').trim();
  const nameParts = name.split(/\s+/);
  const firstName = nameParts[0];
  const restName = nameParts.slice(1).join(' ');
  const nameSize = name.length > 24 ? 34 : name.length > 17 ? 40 : 48;
  const professionParts = (personal.profession || '').split('|').map((s) => s.trim()).filter(Boolean);
  const contacts = (contactList || [])
    .filter((c) => typeof c === 'string' && c.trim())
    .map((c) => formatDates(c, { numeric: false }));

  return (
    <>
      {/* Hidden copy of every atom, as wide as the real column body. */}
      <div
        ref={body.measureContainerRef}
        className="absolute pointer-events-none"
        style={{ top: -9999, left: -9999, width: CONTENT_W, fontFamily: BODY_FONT }}
      >
        {body.measureContent}
      </div>

      {Array.from({ length: pageCount }, (_, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pageCount}>
          <div
            className="relative flex h-full w-full flex-col overflow-hidden bg-white text-left antialiased"
            style={{ fontFamily: BODY_FONT, color: TEXT, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {/* Banner: page 1 only, so the name is never repeated on later pages. */}
            {index === 0 && (
              <div
                {...editAttrs(edit, 'personal')}
                className="shrink-0"
                style={{ background: BANNER_BG, borderBottom: `4px solid ${accentColor}`, padding: `${TOP}px ${PAD_X}px 26px` }}
              >
                <h1 className="break-words leading-[1.05] tracking-[-0.04em]" style={{ fontFamily: DISPLAY_FONT, fontSize: nameSize, color: '#FFFFFF' }}>
                  <span className="font-light">{firstName}</span>
                  {restName && (<>{' '}<span className="font-semibold">{restName}</span></>)}
                </h1>
                {professionParts.length > 0 && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[16px]" style={{ fontFamily: DISPLAY_FONT, color: BANNER_SUB }}>
                    {professionParts.map((part, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span aria-hidden="true" className="h-4 w-px" style={{ backgroundColor: 'rgba(255,255,255,0.35)' }} />}
                        <span>{part}</span>
                      </React.Fragment>
                    ))}
                  </p>
                )}
                {contacts.length > 0 && (
                  <div className="mt-5 grid grid-cols-3 gap-x-6 gap-y-3 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                    {contacts.map((c, i) => (
                      <div key={i} className="min-w-0">
                        <p className="text-[9.5px] font-medium leading-none tracking-[0.06em]" style={{ color: 'rgba(255,255,255,0.6)' }}>{parseContact(c).label}</p>
                        <p className="mt-1 text-[11.5px] leading-snug [overflow-wrap:anywhere]" style={{ color: '#FFFFFF' }}>{parseContact(c).value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div
              ref={index === 0 ? body.firstBodyRef : undefined}
              className="relative min-h-0 flex-1 overflow-hidden"
              style={{ marginLeft: PAD_X, marginRight: PAD_X, marginTop: index === 0 ? MARGIN_TOP_FIRST : MARGIN_TOP_NEXT, marginBottom: MARGIN_BOTTOM }}
            >
              {body.pages[index] || null}
              {isEmpty && index === 0 && (
                <p className="text-xs italic text-slate-400">Nothing entered yet — fill in a few steps to see them appear here.</p>
              )}
            </div>
          </div>
        </A4Page>
      ))}
    </>
  );
};

export default IndigoLedgerTemplate;
