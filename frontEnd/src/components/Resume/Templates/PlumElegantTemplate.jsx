import React from 'react';
import { renderAchievements } from '../Sections/richText';
import ResumePhoto from '../Sections/ResumePhoto';
import renderCertificates from '../Sections/renderCertificates';
import {
  PAGE_WIDTH_PX,
  PAGE_HEIGHT_PX,
  tint,
  jobDates,
  skillRating,
  skillDots,
  DEFAULT_ACCENT,
  usePaginatedBlocks,
  A4Page,
  endGroup,
  editAttrs,
  markSection,
  renderExtraSections,
} from './templateShared';

/**
 * Horizon (id: horizon). A deep tonal hero band with the name set large and light,
 * then a soft rounded sidebar panel beside a clean white main column.
 *
 * Everything dark is derived from the accent colour (shade of it), so changing the
 * accent re-themes the band, the panel tint, the pills and the headings together.
 * The accent should be a #rrggbb hex; anything else falls back to a neutral ink.
 *
 *   band     photo (or initials) | name, profession, contact grid with icons
 *   sidebar  Skills (with levels), Education, Certificates, Languages
 *   main     Summary, Experience, Projects, Hobbies, References
 *
 * Both columns are paginated on their own with usePaginatedBlocks, and the page
 * count is whichever needs more. Gaps are padding (never margin) and all body
 * margins are inline px, so the hidden measuring boxes match the real columns.
 *
 * To register: add 'horizon' to DEFAULT_ACCENT (suggested #4F5BFF) and to your
 * template list. A missing key falls back to FALLBACK_ACCENT.
 */

const FONT = `'Outfit', 'Inter', 'Segoe UI', system-ui, sans-serif`;
const FALLBACK_ACCENT = '#4F5BFF';
const INK = '#161B26';
const BODY = '#3A4252';

const SIDEBAR_KEYS = new Set(['skills', 'education', 'certificates', 'languages']);

// Geometry (px).
const HEADER_H = 206;
const SIDEBAR_W = 240;
const ROW_PAD_X = 12; // gap left of the sidebar panel
const ROW_PAD_TOP_FIRST = 14; // under the band
const ROW_PAD_TOP_NEXT = 12;
const ROW_PAD_BOTTOM = 12;
const BODY_TOP = 22;
const BODY_BOTTOM = 22;
const SIDE_PAD_X = 20;
const MAIN_PAD_L = 26;
const MAIN_PAD_R = 32;

const SIDE_CONTENT_W = SIDEBAR_W - SIDE_PAD_X * 2; // the hidden sidebar measuring box must match
const MAIN_CONTENT_W = PAGE_WIDTH_PX - ROW_PAD_X - SIDEBAR_W - MAIN_PAD_L - MAIN_PAD_R; // the hidden main measuring box must match
const NEXT_PAGE_MAX_HEIGHT = PAGE_HEIGHT_PX - ROW_PAD_TOP_NEXT - ROW_PAD_BOTTOM - BODY_TOP - BODY_BOTTOM; // pages 2+, both columns

// Colour helpers for the tonal palette.
const toRgb = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return [30, 43, 55];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const shade = (hex, amount) => {
  const [r, g, b] = toRgb(hex);
  const f = 1 - amount;
  return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(b * f)})`;
};
const alpha = (hex, a) => {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

// Section heading: a filled dot, the title, then a rule that fades out.
// The accent and the rule gradient come in through custom properties in headingStyle.
const HEADING_BASE =
  `flex items-center gap-2.5 mb-3 font-medium tracking-tight before:h-2 before:w-2 before:shrink-0 before:rounded-full before:bg-[var(--accent)] before:content-[''] after:h-px after:flex-1 after:[background-image:var(--rule)] after:content-['']`;
const MAIN_HEADING = `${HEADING_BASE} text-[15px]`;
const SIDE_HEADING = `${HEADING_BASE} text-[13px]`;

// Contact icons (stroke, 24px grid), chosen from what the entry looks like.
const ICON_PATHS = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  linkedin: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 11v6M8 7.5v.01M12 17v-6M12 13.5a2.5 2.5 0 0 1 5 0V17" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  heart: <path d="M12 20.5C5 15.5 3 12 3 9a4.5 4.5 0 0 1 9-1.5A4.5 4.5 0 0 1 21 9c0 3-2 6.5-9 11.5z" />,
  car: <><path d="M4 16v-4l2-5h12l2 5v4z" /><path d="M4 12h16" /><circle cx="8" cy="18.5" r="1.5" /><circle cx="16" cy="18.5" r="1.5" /></>,
};

// Personal-detail lines ("Born: …", "Nationality: …") are matched by their label first.
const LABEL_ICONS = [
  [/^(born|birth|dob|date of birth)\b/, 'calendar'],
  [/^(nationality|citizen)/, 'flag'],
  [/^(gender|sex)\b|^(male|female|non-binary)$/, 'user'],
  [/^(marital|civil status|single\b|married\b|divorced\b|widowed\b)/, 'heart'],
  [/^(driver|driving|licen[cs]e)/, 'car'],
];

const contactIcon = (value) => {
  const t = String(value).trim().toLowerCase();
  for (const [re, name] of LABEL_ICONS) if (re.test(t)) return name;
  if (t.includes('linkedin')) return 'linkedin';
  const v = t.replace(/^[a-z' ]{2,24}:(?!\/\/)\s*/, ''); // drop a "Phone:" / "Website:" style label
  if (v.includes('@')) return 'mail';
  if (/^\+?[\d\s().-]{7,}$/.test(v)) return 'phone';
  // Any bare domain counts as a website (johndoe.co.za, portfolio.xyz, github.com/john).
  if (/^(https?:\/\/|www\.)/.test(v) || /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/.test(v)) return 'globe';
  return 'pin';
};
const ContactIcon = ({ name, color }) => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mt-[1.5px] shrink-0" aria-hidden="true">
    {ICON_PATHS[name] || ICON_PATHS.pin}
  </svg>
);

const HorizonTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder, edit } = props;
  const accentColor = props.accentColor || DEFAULT_ACCENT.horizon || FALLBACK_ACCENT;

  const headingStyle = {
    color: INK,
    '--accent': accentColor,
    '--rule': `linear-gradient(90deg, ${alpha(accentColor, 0.38)}, transparent)`,
  };
  const heading = (key, text, cls) => <h3 key={`${key}-h`} className={cls} style={headingStyle}>{text}</h3>;

  // One entry = a list of atoms; the last atom carries the gap to the next entry as padding.
  const entry = (id, head, bodyNodes, isLastEntry, gap = 18) => {
    const list = [head, ...bodyNodes].filter(Boolean);
    return list.map((node, i) => (
      <div key={`${id}-${i}`} style={{ paddingBottom: i === list.length - 1 ? (isLastEntry ? 0 : gap) : 3 }}>
        {node}
      </div>
    ));
  };

  const richLines = (text, prefix) => (
    text ? renderAchievements(text, prefix).map((el, i) => <div key={`${prefix}-w${i}`}>{el}</div>) : []
  );

  // Main column: title with the dates on the same line, employer / location underneath.
  const mainHead = (title, date, primary, secondary) => (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[14.5px] font-medium leading-snug" style={{ color: INK }}>{title}</p>
        {date && (
          <span
            className="shrink-0 whitespace-nowrap text-[10.5px] font-medium tabular-nums"
            style={{ color: shade(accentColor, 0.35) }}
          >
            {date}
          </span>
        )}
      </div>
      {(primary || secondary) && (
        <p className="mt-0.5 text-[12.5px] leading-snug">
          {primary && <span className="font-medium" style={{ color: shade(accentColor, 0.25) }}>{primary}</span>}
          {secondary && <span className="text-slate-500">{primary ? ', ' : ''}{secondary}</span>}
        </p>
      )}
    </div>
  );

  const sectionMap = {
    summary: summary ? endGroup([
      heading('summary', 'Summary', MAIN_HEADING),
      ...renderAchievements(summary, 'summary'),
    ]) : [],

    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Experience', MAIN_HEADING),
      ...jobs.flatMap((job, i) => entry(
        `job-${job.id ?? i}`,
        mainHead(job.title, jobDates(job), job.employer, [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(', ')),
        richLines(job.achievements, `job-${job.id ?? i}-ach`),
        i === jobs.length - 1,
      )),
    ]) : [],

    education: educations.length > 0 ? endGroup([
      heading('education', 'Education', SIDE_HEADING),
      ...educations.flatMap((ed, i) => {
        const title = [ed.degree, ed.field].filter(Boolean).join(', ') || ed.institution;
        const school = title === ed.institution ? '' : ed.institution;
        const meta = [ed.date, ed.location].filter(Boolean).join(', ');
        return entry(
          `education-${ed.id ?? i}`,
          (
            <div>
              <p className="text-[12.5px] font-medium leading-snug" style={{ color: INK }}>{title}</p>
              {school && <p className="text-[11.5px] leading-snug text-slate-600">{school}</p>}
              {meta && <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">{meta}</p>}
            </div>
          ),
          richLines(ed.achievements, `education-${ed.id ?? i}-ach`),
          i === educations.length - 1,
          14,
        );
      }),
    ]) : [],

    skills: namedSkills.length > 0 ? endGroup([
      heading('skills', 'Skills', SIDE_HEADING),
      ...namedSkills.map((s, i) => (
        <div key={`skill-${s.id ?? i}`} className="flex items-center justify-between gap-3 py-[3px] text-[12px] leading-snug" style={{ color: INK }}>
          <span className="min-w-0 [overflow-wrap:anywhere]">{s.text}</span>
          <span className="shrink-0">{skillDots(skillRating(s), accentColor, tint(accentColor, 0.72))}</span>
        </div>
      )),
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

  // Band pieces.
  const name = (fullName || 'Your Name').trim();
  const nameSize = name.length > 26 ? 34 : name.length > 18 ? 40 : 46;
  const initials = name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const professionParts = (personal.profession || '').split('|').map((s) => s.trim()).filter(Boolean);
  const contacts = (contactList || []).filter((c) => typeof c === 'string' && c.trim());

  const bandBg = `radial-gradient(120% 150% at 100% 0%, ${alpha(accentColor, 0.5)} 0%, transparent 55%), linear-gradient(115deg, ${shade(accentColor, 0.8)} 0%, ${shade(accentColor, 0.66)} 100%)`;
  const panelBg = tint(accentColor, 0.93);
  const printExact = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };

  return (
    <>
      {/* Hidden copies of every atom, one box per column, as wide as the real column body. */}
      <div
        ref={main.measureContainerRef}
        className="absolute pointer-events-none"
        style={{ top: -9999, left: -9999, width: MAIN_CONTENT_W, fontFamily: FONT }}
      >
        {main.measureContent}
      </div>
      <div
        ref={side.measureContainerRef}
        className="absolute pointer-events-none"
        style={{ top: -9999, left: -9999 - SIDEBAR_W, width: SIDE_CONTENT_W, fontFamily: FONT }}
      >
        {side.measureContent}
      </div>

      {Array.from({ length: pageCount }, (_, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pageCount}>
          <div className="relative flex h-full w-full flex-col bg-white text-left" style={{ fontFamily: FONT, color: BODY, ...printExact }}>
            {index === 0 && (
              <div
                {...editAttrs(edit, 'personal')}
                className="flex shrink-0 items-center gap-7 overflow-hidden px-9 text-white"
                style={{ height: HEADER_H, background: bandBg, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
              >
                <div className="shrink-0">
                  {personal.photo ? (
                    <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor="rgba(255,255,255,0.35)" />
                  ) : (
                    <div
                      className="flex h-[88px] w-[88px] items-center justify-center rounded-[26px] text-[30px] font-light"
                      style={{ background: 'rgba(255,255,255,0.1)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22)' }}
                    >
                      {initials}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="break-words font-light leading-[1.05] tracking-[-0.02em]" style={{ fontSize: nameSize }}>{name}</h1>
                  {professionParts.length > 0 && (
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]" style={{ color: tint(accentColor, 0.55) }}>
                      {professionParts.map((part, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span aria-hidden="true" className="h-3.5 w-px bg-white/40" />}
                          <span>{part}</span>
                        </React.Fragment>
                      ))}
                    </p>
                  )}
                  {contacts.length > 0 && (
                    <div className={`grid grid-cols-2 gap-x-6 leading-snug text-white/80 ${contacts.length > 8 ? 'mt-3 gap-y-1 text-[10.5px]' : 'mt-4 gap-y-1.5 text-[11px]'}`}>
                      {contacts.slice(0, 10).map((c, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <ContactIcon name={contactIcon(c)} color={tint(accentColor, 0.5)} />
                          <span className="min-w-0 [overflow-wrap:anywhere]">{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div
              className="flex min-h-0 flex-1"
              style={{ paddingTop: index === 0 ? ROW_PAD_TOP_FIRST : ROW_PAD_TOP_NEXT, paddingBottom: ROW_PAD_BOTTOM, paddingLeft: ROW_PAD_X }}
            >
              <div className="flex shrink-0 flex-col" style={{ width: SIDEBAR_W, background: panelBg, borderRadius: 22 }}>
                <div
                  ref={index === 0 ? side.firstBodyRef : undefined}
                  className="min-h-0 flex-1 overflow-hidden"
                  style={{ marginLeft: SIDE_PAD_X, marginRight: SIDE_PAD_X, marginTop: BODY_TOP, marginBottom: BODY_BOTTOM }}
                >
                  {side.pages[index] || null}
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div
                  ref={index === 0 ? main.firstBodyRef : undefined}
                  className="min-h-0 flex-1 overflow-hidden"
                  style={{ marginLeft: MAIN_PAD_L, marginRight: MAIN_PAD_R, marginTop: BODY_TOP, marginBottom: BODY_BOTTOM }}
                >
                  {main.pages[index] || null}
                  {isEmpty && index === 0 && (
                    <p className="text-xs italic text-slate-400">Nothing entered yet — fill in a few steps to see them appear here.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </A4Page>
      ))}
    </>
  );
};

export default HorizonTemplate;
