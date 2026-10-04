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
 * Slate Split (id: slate-split). A single-column résumé with a split header and bar-marked headings.
 *
 *   header   (page 1 only) left: the name on two lines, the profession, then personal details (Born,
 *            Nationality, Gender ...) on a ruled strip. Right: a full-height slate panel holding Email,
 *            Phone, Website, Location.
 *   body     one column in sectionOrder order. Section headings carry a thick accent bar on their left.
 *            Experience and Education put the title and the dates on one line (dates right-aligned),
 *            the employer or school under it. Skills is a two-column table: the name on the left and
 *            five level dots on the right.
 *   strip    a thin accent strip runs along the top of every page; pages 2+ carry no name.
 *
 * Everything is flat: every heading, row and line is its own direct node, so the paginator can break
 * between any two of them. Gaps are padding (never margin), display fonts are inline on the atoms and all
 * body margins are inline px, so the hidden measuring box matches the real column.
 *
 * Type: Outfit for display, Inter for body (both must be loaded by the app). Small coloured text uses a
 * darkened accent; the pure accent is used for shapes only. No shadows, no images.
 *
 * To register: add 'slate-split' to DEFAULT_ACCENT (suggested #0F766E) and to your template list.
 * A missing key falls back to FALLBACK_ACCENT. Use a #rrggbb accent.
 */

const BODY_FONT = `'Inter', 'Segoe UI', system-ui, -apple-system, Arial, sans-serif`;
const DISPLAY_FONT = `'Outfit', 'Inter', 'Segoe UI', system-ui, -apple-system, Arial, sans-serif`;
const FALLBACK_ACCENT = '#0F766E';
const INK = '#0E1116';
const TEXT = '#3B4350';
const PANEL_BG = '#1F2A37'; // slate panel behind the contact details
const PANEL_LABEL = 'rgba(255, 255, 255, 0.55)';

// Geometry (px).
const STRIP_H = 6; // accent strip along the top of every page
const PAD_X = 48; // left and right page margin for the body and the header text
const PANEL_W = 232; // contact panel on page 1
const TOP = 38; // top padding inside the header
const MARGIN_TOP_FIRST = 28; // body on page 1, under the header
const MARGIN_TOP_NEXT = 40; // body on pages 2+, under the strip
const MARGIN_BOTTOM = 40;

const CONTENT_W = PAGE_WIDTH_PX - PAD_X * 2; // the hidden measuring box must match
const NEXT_PAGE_MAX_HEIGHT = PAGE_HEIGHT_PX - STRIP_H - MARGIN_TOP_NEXT - MARGIN_BOTTOM; // pages 2+

// Contact entries that belong in the slate panel; everything else goes on the details strip.
const PANEL_LABELS = new Set(['email', 'phone', 'tel', 'telephone', 'mobile', 'cell', 'website', 'linkedin', 'github', 'portfolio', 'location', 'address']);

// Heading: a thick accent bar on the left. The bar is a CSS border, so the heading stays plain text.
// The shared renderers receive the same class and style, so their headings match.
const HEADING = 'mb-3 border-l-[4px] py-[2px] pl-3 text-[17px] font-semibold leading-tight tracking-tight';

// Darken a #rrggbb colour toward black (used for the banner and for small accent-coloured text).
const shade = (hex, amount) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0x1f3a5f;
  const f = 1 - amount;
  return `rgb(${Math.round(((n >> 16) & 255) * f)}, ${Math.round(((n >> 8) & 255) * f)}, ${Math.round((n & 255) * f)})`;
};

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


const unifyDatesIn = (sections) => Object.fromEntries(
  Object.entries(sections || {}).map(([key, blocks]) => [
    key,
    Array.isArray(blocks) && blocks.length > 0 ? endGroup(blocks.map((block) => unifyDates(block))) : blocks,
  ]),
);

const SlateSplitTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects: rawProjects, references, certificates: rawCertificates, isEmpty, sectionOrder, edit } = props;
  const projects = withFormattedDates(rawProjects);
  const certificates = withFormattedDates(rawCertificates);
  const accentColor = props.accentColor || DEFAULT_ACCENT['slate-split'] || FALLBACK_ACCENT;
  const accentText = shade(accentColor, 0.3);

  const headingStyle = { fontFamily: DISPLAY_FONT, color: INK, borderColor: accentColor };
  const heading = (key, text) => <h3 key={`${key}-h`} className={HEADING} style={headingStyle}>{text}</h3>;

  // Head of an entry: title with the dates on the same line, employer / school under it.
  const entryHead = (title, date, primary, secondary) => (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[15px] font-semibold leading-snug tracking-tight" style={{ fontFamily: DISPLAY_FONT, color: INK }}>{title}</p>
        {date && <span className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-slate-500">{date}</span>}
      </div>
      {(primary || secondary) && (
        <p className="mt-0.5 text-[12.5px] leading-snug">
          {primary && <span className="font-medium" style={{ color: accentText }}>{primary}</span>}
          {secondary && <span className="text-slate-500">{primary ? ', ' : ''}{secondary}</span>}
        </p>
      )}
    </div>
  );

  // One entry = the head plus one atom per body line. The gap between entries is padding.
  const entry = (id, head, bodyNodes, isLastEntry) => {
    const body = (bodyNodes || []).filter(Boolean);
    return [
      <div key={`${id}-0`} style={{ paddingBottom: body.length === 0 ? (isLastEntry ? 0 : 16) : 4 }}>{head}</div>,
      ...body.map((node, i) => (
        <div key={`${id}-${i + 1}`} style={{ paddingBottom: i === body.length - 1 ? (isLastEntry ? 0 : 16) : 3 }}>{node}</div>
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
          job.title,
          formatDates(jobDates(job)),
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
          entryHead(title, formatDates(ed.date), school, ed.location),
          richLines(ed.achievements, `education-${ed.id ?? i}-ach`),
          i === educations.length - 1,
        );
      }),
    ]) : [],

    // Two-column table: skill name on the left, level dots on the right.
    skills: namedSkills.length > 0 ? endGroup([
      heading('skills', 'Skills'),
      <div key="skills-grid" className="grid grid-cols-2 gap-x-10">
        {namedSkills.map((s, i) => {
          const level = skillLevel(s);
          return (
            <div
              key={`skill-${s.id ?? i}`}
              className="flex items-center justify-between gap-3 border-b py-[6px]"
              style={{ borderColor: tint(accentColor, 0.85) }}
            >
              <p className="min-w-0 text-[11.5px] font-medium leading-snug" style={{ color: INK }}>{s.text}</p>
              {level > 0 && (
                <span role="img" aria-label={`Level ${level} of 5`} className="flex shrink-0 gap-[3px]">
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

  // Extras come from the shared helpers and take this template's heading; their dates are normalised too.
  const extras = unifyDatesIn(renderExtraSections({ projects, languages, hobbies, references, headingClass: HEADING, headingStyle, accentColor }));
  const certs = unifyDatesIn(renderCertificates({ certificates, headingClass: HEADING, headingStyle }));

  const blocks = sectionOrder.flatMap((key) => markSection(edit, key, sectionMap[key] || extras[key] || certs[key] || []));
  const body = usePaginatedBlocks(blocks, NEXT_PAGE_MAX_HEIGHT);
  const pageCount = Math.max(1, body.pages.length);

  // Header pieces.
  const name = (fullName || 'Your Name').trim();
  const nameParts = name.split(/\s+/);
  const firstName = nameParts[0];
  const restName = nameParts.slice(1).join(' ');
  const longestLine = Math.max(firstName.length, restName.length);
  const nameSize = longestLine > 16 ? 36 : longestLine > 11 ? 44 : 52;
  const professionParts = (personal.profession || '').split('|').map((s) => s.trim()).filter(Boolean);
  const parsedContacts = (contactList || [])
    .filter((c) => typeof c === 'string' && c.trim())
    .map((c) => parseContact(formatDates(c, { numeric: false })));
  const panelItems = parsedContacts.filter((c) => PANEL_LABELS.has(c.label.toLowerCase()));
  const detailItems = parsedContacts.filter((c) => !PANEL_LABELS.has(c.label.toLowerCase()));

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
            {/* Accent strip: CSS only, on every page. */}
            <div aria-hidden="true" className="shrink-0" style={{ height: STRIP_H, background: accentColor }} />

            {/* Header: page 1 only, so the name is never repeated on later pages. */}
            {index === 0 && (
              <div {...editAttrs(edit, 'personal')} className="flex shrink-0 items-stretch">
                <div className="min-w-0 flex-1" style={{ padding: `${TOP}px 28px 28px ${PAD_X}px` }}>
                  <h1 className="leading-[1.02] tracking-[-0.04em]" style={{ fontFamily: DISPLAY_FONT, fontSize: nameSize, color: INK }}>
                    <span className="block break-words font-light">{firstName}</span>
                    {restName && <span className="block break-words font-semibold">{restName}</span>}
                  </h1>
                  {professionParts.length > 0 && (
                    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[16px]" style={{ fontFamily: DISPLAY_FONT, color: accentText }}>
                      {professionParts.map((part, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span aria-hidden="true" className="h-4 w-px" style={{ backgroundColor: tint(accentColor, 0.5) }} />}
                          <span>{part}</span>
                        </React.Fragment>
                      ))}
                    </p>
                  )}
                  {detailItems.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4" style={{ borderColor: tint(accentColor, 0.78) }}>
                      {detailItems.map(({ label, value }, i) => (
                        <p key={i} className="text-[11.5px] leading-snug">
                          <span className="text-slate-400">{label} </span>
                          <span style={{ color: INK }}>{value}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                {panelItems.length > 0 && (
                  <div className="shrink-0" style={{ width: PANEL_W, background: PANEL_BG, padding: `${TOP}px 24px 28px` }}>
                    <div className="flex flex-col gap-3.5">
                      {panelItems.map(({ label, value }, i) => (
                        <div key={i} className="min-w-0">
                          <p className="text-[9.5px] font-medium leading-none tracking-[0.06em]" style={{ color: PANEL_LABEL }}>{label}</p>
                          <p className="mt-1 text-[11.5px] leading-snug [overflow-wrap:anywhere]" style={{ color: '#FFFFFF' }}>{value}</p>
                        </div>
                      ))}
                    </div>
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

export default SlateSplitTemplate;
