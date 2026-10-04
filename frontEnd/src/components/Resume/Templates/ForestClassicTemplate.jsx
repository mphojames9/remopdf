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
 * Atlas (id: atlas). A single-column, text-only resume with a strong identity.
 * Everything that makes it look designed is CSS shapes and type; every word on the
 * page is real text in reading order (no photo, icons or images; the skill level meter is a CSS shape next to a real text level word).
 *
 *   - oversized name, with a large soft circle and ring behind the header
 *   - contact details as a 4-column grid (repeat(4, 1fr)): a small label over each value
 *   - a full-height accent rail down the left edge of every page
 *   - a light timeline rail with accent nodes for Experience and Education
 *   - the summary set as a larger lead paragraph
 *   - skills and languages in two columns, each with a 5-segment level meter and the level word
 *     (skills: Beginner ... Expert; languages: their own level, e.g. Native, Fluent);
 *     set SHOW_SKILL_LEVELS to false for outlined chips (or a plain comma line via SKILLS_AS_CHIPS)
 *
 * Type: Outfit for display, Inter for body (both must be loaded by the app; the system
 * UI font is the fallback). Small coloured text uses a darkened accent so it stays
 * readable and prints well; the pure accent is used for shapes only.
 *
 * Pagination follows the other templates: a flat list of plain DOM atoms split into
 * A4 pages by usePaginatedBlocks. Gaps are padding (never margin), display fonts are
 * inline on the atoms, and body margins are inline px so the hidden measuring box
 * matches the real page body.
 *
 * To register: add 'atlas' to DEFAULT_ACCENT (suggested #F26A21) and to your template
 * list. A missing key falls back to FALLBACK_ACCENT. Use a #rrggbb accent.
 */

const SKILLS_AS_CHIPS = true; // only used when SHOW_SKILL_LEVELS is false
const SHOW_SKILL_LEVELS = true; // two-column list: name, a 5-segment meter and the level word
// Skill levels come from the skill's `rating` (1-5, set in the Skills step). 0 / missing = no level shown.
const SKILL_LEVELS = ['Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'];

// Language levels are words (Native, Fluent, ...), so the bar count comes from the word.
// Anything unrecognised still shows its word, just without a meter.
const LANGUAGE_RANK = [
  [/native|mother|bilingual/i, 5],
  [/fluent|proficien/i, 4],
  [/advanced|upper|professional|working/i, 3],
  [/intermediate|conversation/i, 2],
  [/beginner|basic|elementary|novice|a1|a2/i, 1],
];
const languageRating = (level) => {
  const hit = LANGUAGE_RANK.find(([re]) => re.test(String(level || '')));
  return hit ? hit[1] : 0;
};

const BODY_FONT = `'Inter', 'Segoe UI', system-ui, -apple-system, Arial, sans-serif`;
const DISPLAY_FONT = `'Outfit', 'Inter', 'Segoe UI', system-ui, -apple-system, Arial, sans-serif`;
const FALLBACK_ACCENT = '#F26A21';
const INK = '#0E1116';
const TEXT = '#3B4350';

const RAIL_W = 8; // accent strip on the left edge
const MARGIN_L = 60;
const MARGIN_R = 48;
const MARGIN_BOTTOM = 40;
const MARGIN_TOP_FIRST = 26; // page 1, under the header
const MARGIN_TOP_NEXT = 44; // pages 2+
const CONTENT_WIDTH = PAGE_WIDTH_PX - MARGIN_L - MARGIN_R; // the hidden measuring box must match
const CONTENT_MAX_HEIGHT = PAGE_HEIGHT_PX - MARGIN_TOP_NEXT - MARGIN_BOTTOM; // usable height on pages 2+

// Darken a #rrggbb colour toward black (used for small accent-coloured text).
const shade = (hex, amount) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0x1f3a5f;
  const f = 1 - amount;
  return `rgb(${Math.round(((n >> 16) & 255) * f)}, ${Math.round(((n >> 8) & 255) * f)}, ${Math.round((n & 255) * f)})`;
};

// One date format everywhere: "May 2026", "May 2026 – Present", and "10 Sep 2026" for a full date (Born).
// Anything that is not a recognisable date (a bare year, free text) is left as written.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const PRESENT_RE = /^(present|current|now|ongoing|today|to date)$/i;

// 0-11 for "5", "05", "May", "sept", "September"; -1 when it is not a month.
const monthIndex = (token) => {
  const t = String(token).trim().toLowerCase();
  if (/^\d{1,2}$/.test(t)) { const n = Number(t); return n >= 1 && n <= 12 ? n - 1 : -1; }
  return t.length >= 3 ? MONTH_NAMES.findIndex((name) => name.startsWith(t)) : -1;
};

const fmtMonthYear = (part) => {
  const t = String(part || '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (PRESENT_RE.test(t)) return 'Present';
  let m;
  let i = -1;
  let y = '';
  if ((m = /^(\d{1,2})[\s/.-](\d{4})$/.exec(t))) { i = monthIndex(m[1]); y = m[2]; } //   05 2026 | 5/2026 | 05-2026
  else if ((m = /^(\d{4})[\s/.-](\d{1,2})$/.exec(t))) { i = monthIndex(m[2]); y = m[1]; } // 2026-05 | 2026/05
  else if ((m = /^([a-z]{3,9})\.?[\s/.-]*(\d{4})$/i.exec(t))) { i = monthIndex(m[1]); y = m[2]; } // May 2026 | September 2026
  return i >= 0 ? `${MONTHS[i]} ${y}` : t;
};

// "05 2026 – Present", "05/2026 - 08/2027", "Jan 2020 to Mar 2022" all become "May 2026 – Present" etc.
const fmtDateRange = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.split(/\s*[–—]\s*|\s+-\s+|\s+to\s+/i).map(fmtMonthYear).filter(Boolean).join(' – ');
};

// A full date with a day (Born): "10 September 2026", "2026-09-10", "10/09/2026" (day first) -> "10 Sep 2026".
const fmtFullDate = (value) => {
  const t = String(value || '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  let m;
  let d = 0;
  let i = -1;
  let y = '';
  if ((m = /^(\d{1,2})\s+([a-z]{3,9})\.?\s+(\d{4})$/i.exec(t))) { d = Number(m[1]); i = monthIndex(m[2]); y = m[3]; }
  else if ((m = /^([a-z]{3,9})\.?\s+(\d{1,2})\s+(\d{4})$/i.exec(t))) { d = Number(m[2]); i = monthIndex(m[1]); y = m[3]; }
  else if ((m = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/.exec(t))) { y = m[1]; i = monthIndex(m[2]); d = Number(m[3]); }
  else if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t))) { d = Number(m[1]); i = monthIndex(m[2]); y = m[3]; }
  return i >= 0 && d >= 1 && d <= 31 ? `${d} ${MONTHS[i]} ${y}` : t;
};

// Certificates are drawn by the shared renderCertificates, which prints `date` exactly as stored.
// Format the dates before handing them over (works for a plain array or a { enabled, items } object).
const withFormattedDates = (certs) => {
  const fix = (c) => (c && typeof c === 'object' && c.date ? { ...c, date: fmtDateRange(c.date) } : c);
  if (Array.isArray(certs)) return certs.map(fix);
  if (certs && Array.isArray(certs.items)) return { ...certs, items: certs.items.map(fix) };
  return certs;
};

// Heading: a short accent bar above a large title. The bar is CSS only, so the heading stays plain text.
const HEADING_CLASS =
  `mb-3 text-[17px] font-semibold tracking-tight before:mb-2 before:block before:h-[3px] before:w-7 before:rounded-full before:bg-[var(--accent)] before:content-['']`;

// Contact entries arrive as plain strings. Each one is sorted into:
//   - Email, Phone, Location, Website(s), LinkedIn
//   - anything written as "Label: value" that is not one of those, e.g.
//     "Born: 10 September 2026", "Nationality: South African" (uses its own label)
// splitContacts returns one flat list of { label, values } cells for the header grid.
const PRIMARY_ORDER = ['Email', 'Phone', 'Location', 'Website', 'LinkedIn'];
const KNOWN_LABELS = {
  email: 'Email', 'e-mail': 'Email',
  phone: 'Phone', tel: 'Phone', telephone: 'Phone', mobile: 'Phone', cell: 'Phone',
  location: 'Location', address: 'Location', city: 'Location',
  website: 'Website', web: 'Website', portfolio: 'Website', site: 'Website',
  linkedin: 'LinkedIn',
};

// Kind of an unlabelled value, chosen from what it looks like (anything unrecognised is a location).
const kindOf = (value) => {
  const t = String(value).trim().toLowerCase();
  if (t.includes('@')) return 'Email';
  if (t.includes('linkedin')) return 'LinkedIn';
  if (/^\+?[\d\s().-]{7,}$/.test(t)) return 'Phone';
  if (/^(https?:\/\/|www\.)/.test(t) || /\.(com|dev|io|net|org|co|me|app|site|za)(\/|$)/.test(t)) return 'Website';
  return 'Location';
};

const tidyValue = (kind, value) => (
  kind === 'Website' || kind === 'LinkedIn' ? value.replace(/^https?:\/\//i, '').replace(/\/+$/, '') : value
);

const splitContacts = (list) => {
  const slots = {};
  const details = [];
  (list || []).forEach((raw) => {
    if (typeof raw !== 'string') return;
    // "[www.site.com](https://www.site.com)" -> "www.site.com"
    const text = raw.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim();
    if (!text) return;
    const m = /^([A-Za-z][A-Za-z .'’/-]{1,28}):\s*(?!\/\/)(.+)$/.exec(text);
    let kind;
    let value = text;
    if (m) {
      const known = KNOWN_LABELS[m[1].trim().toLowerCase()];
      if (!known) {
        const label = m[1].trim();
        const isBirth = /^(born|birth|dob|date of birth)\b/i.test(label);
        details.push({ label: label.charAt(0).toUpperCase() + label.slice(1), value: isBirth ? fmtFullDate(m[2].trim()) : m[2].trim() });
        return;
      }
      kind = known;
      value = m[2].trim();
    } else {
      kind = kindOf(text);
    }
    (slots[kind] = slots[kind] || []).push(tidyValue(kind, value));
  });
  const primary = PRIMARY_ORDER.filter((k) => slots[k]).map((k) => ({
    label: k === 'Website' && slots[k].length > 1 ? 'Websites' : k,
    values: slots[k],
  }));
  return [...primary, ...details.map((d) => ({ label: d.label, values: [d.value] }))];
};

const AtlasTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder, edit } = props;
  const accentColor = props.accentColor || DEFAULT_ACCENT.atlas || FALLBACK_ACCENT;
  const accentText = shade(accentColor, 0.3);
  const railColor = tint(accentColor, 0.78);

  const headingStyle = { fontFamily: DISPLAY_FONT, color: INK, '--accent': accentColor };
  const heading = (key, text) => <h3 key={`${key}-h`} className={HEADING_CLASS} style={headingStyle}>{text}</h3>;

  // Title with the dates on the same line, employer / school under it. One atom, so a title is never stranded.
  const entryHead = (title, date, primary, secondary) => (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[15px] font-semibold leading-snug tracking-tight" style={{ fontFamily: DISPLAY_FONT, color: INK }}>{title}</p>
        {date && (
          <span className="shrink-0 whitespace-nowrap text-[10.5px] tabular-nums text-slate-700">
            {fmtDateRange(date)}
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

  // One entry on the timeline rail: every atom carries the rail's left border, the head also carries the node.
  // The gap between entries is padding, so the rail stays unbroken between atoms and across a page break.
  const railEntry = (id, head, bodyNodes, isLastEntry) => {
    const list = [head, ...bodyNodes].filter(Boolean);
    return list.map((node, i) => (
      <div
        key={`${id}-${i}`}
        className={`relative ml-[5px] border-l-2 pl-5 ${i === list.length - 1 && !isLastEntry ? 'pb-6' : 'pb-1'}`}
        style={{ borderColor: railColor }}
      >
        {i === 0 && (
          <span
            className="absolute -left-[7px] top-[5px] h-3 w-3 rounded-full border-2 bg-white"
            style={{ borderColor: accentColor }}
          />
        )}
        {node}
      </div>
    ));
  };

  const richLines = (text, prefix) => (
    text ? renderAchievements(text, prefix).map((el, i) => <div key={`${prefix}-w${i}`}>{el}</div>) : []
  );

  // One item with a level (a skill or a language): name, then a 5-segment meter plus the level as real text.
  // The meter is CSS only and hidden from readers; the level word carries the information.
  const levelCell = (key, name, rating, levelText) => (
    <div key={key} className="min-w-0">
      <p className="text-[12.5px] font-medium leading-snug [overflow-wrap:anywhere]" style={{ color: INK }}>{name}</p>
      {(rating > 0 || levelText) && (
        <div className="mt-1 flex items-center gap-2">
          {rating > 0 && (
            <span aria-hidden="true" className="flex gap-[3px]">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className="h-[3px] w-[18px] rounded-full" style={{ background: n <= rating ? accentColor : railColor }} />
              ))}
            </span>
          )}
          {levelText && <span className="text-[10.5px] leading-none" style={{ color: accentText }}>{levelText}</span>}
        </div>
      )}
    </div>
  );

  const skillCell = (sk, i) => {
    const rating = Math.max(0, Math.min(5, Math.round(Number(sk.rating) || 0)));
    return levelCell(`skill-${sk.id ?? i}`, sk.text, rating, SKILL_LEVELS[rating - 1]);
  };

  const languageCell = (l, i) => {
    const level = String(l.level || '').trim();
    return levelCell(`lang-${l.id ?? i}`, l.name, languageRating(level), level);
  };

  // Two items per row, one atom per row, so a long list can split across pages.
  const pairRows = (items, cell, prefix) => {
    const rows = [];
    for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
    return rows.map((row, r) => (
      <div
        key={`${prefix}-row-${r}`}
        className={`grid gap-x-8 ${r === rows.length - 1 ? '' : 'pb-3.5'}`}
        style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}
      >
        {row.map((item, j) => cell(item, r * 2 + j))}
      </div>
    ));
  };

  const skillAtoms = () => {
    if (SHOW_SKILL_LEVELS) return pairRows(namedSkills, skillCell, 'skills');
    return [SKILLS_AS_CHIPS ? (
      <div key="skills-chips" className="flex flex-wrap gap-1.5">
        {namedSkills.map((sk, i) => (
          <span
            key={`skill-${sk.id ?? i}`}
            className="rounded-md border px-2.5 py-[3px] text-[11.5px] font-medium leading-snug"
            style={{ borderColor: '#E2E8F0', background: '#F8FAFC', color: INK }}
          >
            {sk.text}
          </span>
        ))}
      </div>
    ) : (
      <p key="skills-list" className="text-[12.5px] font-medium leading-relaxed" style={{ color: INK }}>
        {namedSkills.map((sk) => sk.text).filter(Boolean).join(', ')}
      </p>
    )];
  };

  // Languages use the same bar meter as skills. The shared renderer draws dots, so this template draws its own.
  const languageList = (languages && languages.enabled !== false
    ? (Array.isArray(languages) ? languages : languages.items || [])
    : []
  ).filter((l) => l && l.name && String(l.name).trim());
  const languageBlocks = languageList.length > 0
    ? endGroup([heading('languages', 'Languages'), ...pairRows(languageList, languageCell, 'languages')])
    : [];

  const sectionMap = {
    // Lead paragraph: larger and darker than the body. The overrides reach into whatever renderAchievements outputs.
    summary: summary ? endGroup([
      heading('summary', 'Professional Summary'),
      ...renderAchievements(summary, 'summary').map((el, i) => (
        <div key={`summary-w${i}`} className="[&_*]:!text-[13.5px] [&_*]:!leading-[1.65] [&_*]:!text-[#1F2937]">{el}</div>
      )),
    ]) : [],

    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Work Experience'),
      ...jobs.flatMap((job, i) => railEntry(
        `job-${job.id ?? i}`,
        entryHead(job.title, jobDates(job), job.employer, [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(', ')),
        richLines(job.achievements, `job-${job.id ?? i}-ach`),
        i === jobs.length - 1,
      )),
    ]) : [],

    education: educations.length > 0 ? endGroup([
      heading('education', 'Education'),
      ...educations.flatMap((ed, i) => {
        const title = [ed.degree, ed.field].filter(Boolean).join(', ');
        return railEntry(
          `education-${ed.id ?? i}`,
          title
            ? entryHead(title, ed.date, ed.institution, ed.location)
            : entryHead(ed.institution, ed.date, '', ed.location),
          richLines(ed.achievements, `education-${ed.id ?? i}-ach`),
          i === educations.length - 1,
        );
      }),
    ]) : [],

    skills: namedSkills.length > 0 ? endGroup([
      heading('skills', 'Skills'),
      ...skillAtoms(),
    ]) : [],
  };

  const extras = {
    ...renderExtraSections({ projects, languages, hobbies, references, headingClass: HEADING_CLASS, headingStyle, accentColor }),
    ...renderCertificates({ certificates: withFormattedDates(certificates), headingClass: HEADING_CLASS, headingStyle }),
    languages: languageBlocks,
  };
  const allBlocks = sectionOrder.flatMap((key) => markSection(edit, key, sectionMap[key] || extras[key] || []));
  const { pages, measureContainerRef, firstBodyRef, measureContent } = usePaginatedBlocks(allBlocks, CONTENT_MAX_HEIGHT);

  // Header pieces.
  const name = (fullName || 'Your Name').trim();
  const nameSize = name.length > 22 ? 40 : name.length > 16 ? 46 : 54;
  const professionParts = (personal.profession || '').split('|').map((s) => s.trim()).filter(Boolean);
  const contactCells = splitContacts(contactList);

  return (
    <>
      {/* Hidden copy of every atom, as wide as the real page body, used to measure the page breaks. */}
      <div
        ref={measureContainerRef}
        className="absolute pointer-events-none"
        style={{ top: -9999, left: -9999, width: CONTENT_WIDTH, fontFamily: BODY_FONT }}
      >
        {measureContent}
      </div>

      {pages.map((pageBlocks, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pages.length}>
          <div
            className="relative flex h-full w-full flex-col overflow-hidden bg-white text-left antialiased"
            style={{ fontFamily: BODY_FONT, color: TEXT, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {/* Decorative shapes: CSS only, no text. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0" style={{ width: RAIL_W, background: accentColor }} />
            {index === 0 && (
              <>
                <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-[360px] w-[360px] rounded-full" style={{ background: tint(accentColor, 0.92) }} />
                <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 h-[240px] w-[240px] rounded-full border" style={{ borderColor: tint(accentColor, 0.65) }} />
              </>
            )}

            {index === 0 && (
              <div {...editAttrs(edit, 'personal')} className="relative shrink-0 pt-12" style={{ paddingLeft: MARGIN_L, paddingRight: MARGIN_R }}>
                <h1 className="break-words font-semibold leading-[1.02] tracking-[-0.04em]" style={{ fontFamily: DISPLAY_FONT, fontSize: nameSize, color: INK }}>
                  {name}
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
                {contactCells.length > 0 && (
                  <div className="mt-6 grid gap-x-5 gap-y-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    {contactCells.map((cell) => (
                      <div key={cell.label} className="min-w-0">
                        <p className="text-[9px] font-medium uppercase leading-none tracking-[0.1em] text-slate-400">{cell.label}</p>
                        {cell.values.map((v, i) => (
                          <p key={i} className={`${i === 0 ? 'mt-1.5' : 'mt-0.5'} text-[11.5px] leading-snug [overflow-wrap:anywhere]`} style={{ color: INK }}>{v}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div
              ref={index === 0 ? firstBodyRef : undefined}
              className="relative min-h-0 flex-1 overflow-hidden"
              style={{ marginLeft: MARGIN_L, marginRight: MARGIN_R, marginTop: index === 0 ? MARGIN_TOP_FIRST : MARGIN_TOP_NEXT, marginBottom: MARGIN_BOTTOM }}
            >
              {pageBlocks}
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

export default AtlasTemplate;
