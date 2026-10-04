import React from 'react';
import { renderAchievements } from '../Sections/richText';
import ResumePhoto from '../Sections/ResumePhoto';
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
 * Gold Executive (id: gold-executive). Two columns under a cream header.
 *
 *   header   photo | name + profession + tagline | contact column with icons
 *   sidebar  Skills, Education, Certificates, Languages  (tinted, full height)
 *   main     Summary, Experience, Projects, Hobbies, References
 *
 * Both columns are paginated independently: every column is a flat list of
 * plain DOM atoms and gets its own usePaginatedBlocks call. The page count is
 * whichever column needs more pages, and the sidebar tint runs the full height
 * of every page, so a long main column never leaves a hole on the left.
 *
 * Gaps between entries are padding (never margin) so measured heights are real.
 * All body margins are inline px so the hidden measuring boxes match exactly.
 *
 * To register: add 'gold-executive' to DEFAULT_ACCENT (suggested #B08A55) and to
 * your template list. If the key is missing the template falls back to FALLBACK_ACCENT.
 */

const SERIF = '"Cormorant Garamond", "Playfair Display", Georgia, "Times New Roman", serif';
const FALLBACK_ACCENT = '#B08A55';
const INK = '#1E2B37';
const PAPER = '#FFFEFB';

// Which sections live in the sidebar. Everything else goes in the main column,
// in the order the user set in sectionOrder.
const SIDEBAR_KEYS = new Set(['skills', 'education', 'certificates', 'languages']);

// Geometry (px). Sidebar and main body margins are applied inline on the measured element.
const HEADER_H = 220;
const SIDEBAR_W = 256;
const SIDE_PAD_X = 24;
const MAIN_PAD_L = 28;
const MAIN_PAD_R = 32;
const TOP_FIRST = 28; // page 1, under the header
const TOP_NEXT = 40; // pages 2+
const BOTTOM = 40;

const SIDE_CONTENT_W = SIDEBAR_W - SIDE_PAD_X * 2; // 208, the hidden sidebar measuring box must match
const MAIN_CONTENT_W = PAGE_WIDTH_PX - SIDEBAR_W - MAIN_PAD_L - MAIN_PAD_R; // the hidden main measuring box must match
const NEXT_PAGE_MAX_HEIGHT = PAGE_HEIGHT_PX - TOP_NEXT - BOTTOM; // usable height on pages 2+

// Section heading: spaced caps over a hairline, with a short accent bar sitting on the rule.
// The accent comes in through the --accent custom property set in headingStyle.
const HEADING_BASE =
  `relative border-b pb-2 mb-3 font-bold uppercase after:absolute after:left-0 after:-bottom-px after:h-[2px] after:w-10 after:bg-[var(--accent)] after:content-['']`;
const MAIN_HEADING = `${HEADING_BASE} text-[13px] tracking-[0.22em]`;
const SIDE_HEADING = `${HEADING_BASE} text-[11.5px] tracking-[0.2em]`;

// Small stroke icons for the contact column.
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

// Pick an icon from what the contact string looks like.
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
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mt-[1px] shrink-0"
    aria-hidden="true"
  >
    {ICON_PATHS[name] || ICON_PATHS.pin}
  </svg>
);

const GoldExecutiveTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder, edit } = props;
  const accentColor = props.accentColor || DEFAULT_ACCENT['gold-executive'] || FALLBACK_ACCENT;

  const ruleColor = tint(accentColor, 0.55);
  const headingStyle = { color: INK, borderColor: ruleColor, '--accent': accentColor };
  const heading = (key, text, cls) => <h3 key={`${key}-h`} className={cls} style={headingStyle}>{text}</h3>;

  // One entry = a list of atoms. The last atom carries the gap to the next entry as padding.
  const entry = (id, head, bodyNodes, isLastEntry, gap = 18) => {
    const list = [head, ...bodyNodes].filter(Boolean);
    return list.map((node, i) => (
      <div key={`${id}-${i}`} style={{ paddingBottom: i === list.length - 1 ? (isLastEntry ? 0 : gap) : 3 }}>
        {node}
      </div>
    ));
  };

  // renderAchievements returns bare rich-text elements; wrap each so it can carry padding.
  const richLines = (text, prefix) => (
    text ? renderAchievements(text, prefix).map((el, i) => <div key={`${prefix}-w${i}`}>{el}</div>) : []
  );

  // Main column: title and dates on one line, employer / location under it.
  const mainHead = (title, date, primary, secondary) => (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[14.5px] font-bold leading-snug" style={{ color: INK }}>{title}</p>
        {date && <span className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-slate-500">{date}</span>}
      </div>
      {(primary || secondary) && (
        <p className="text-[12.5px] leading-snug text-slate-600">
          {primary && <span className="font-medium">{primary}</span>}
          {secondary && <span className="text-slate-500">{primary ? ', ' : ''}{secondary}</span>}
        </p>
      )}
    </div>
  );

  const sectionMap = {
    summary: summary ? endGroup([
      heading('summary', 'Professional Summary', MAIN_HEADING),
      ...renderAchievements(summary, 'summary'),
    ]) : [],

    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Work Experience', MAIN_HEADING),
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
        const meta = [ed.date, ed.location].filter(Boolean).join(' · ');
        return entry(
          `education-${ed.id ?? i}`,
          (
            <div>
              <p className="text-[12.5px] font-bold leading-snug" style={{ color: INK }}>{title}</p>
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
        <div key={`skill-${s.id ?? i}`} className="flex items-start gap-2.5 py-[2.5px] text-[12px] leading-snug text-slate-800">
          <span className="mt-[6px] h-[5px] w-[5px] shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
          <span className="min-w-0 [overflow-wrap:anywhere]">{s.text}</span>
        </div>
      )),
    ]) : [],
  };

  // Extras come from the shared helpers. They are called once per column so each gets that column's heading size.
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
  const nameParts = (fullName || 'Your Name').trim().split(/\s+/);
  const firstName = nameParts[0];
  const restName = nameParts.slice(1).join(' ');
  const longestWord = Math.max(...nameParts.map((p) => p.length));
  const nameSize = longestWord > 11 ? 34 : longestWord > 8 ? 42 : 50;
  const professionParts = (personal.profession || '').split('|').map((s) => s.trim()).filter(Boolean);
  const contacts = (contactList || []).filter((c) => typeof c === 'string' && c.trim());

  const printExact = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };
  const sidebarBg = `linear-gradient(180deg, ${tint(accentColor, 0.9)} 0%, ${tint(accentColor, 0.8)} 100%)`;
  const headerBg = `linear-gradient(135deg, #FFFFFF 0%, ${tint(accentColor, 0.93)} 100%)`;

  return (
    <>
      {/* Hidden copies of every atom, one box per column, as wide as the real column body. */}
      <div
        ref={main.measureContainerRef}
        className="absolute pointer-events-none"
        style={{ top: -9999, left: -9999, width: MAIN_CONTENT_W }}
      >
        {main.measureContent}
      </div>
      <div
        ref={side.measureContainerRef}
        className="absolute pointer-events-none"
        style={{ top: -9999, left: -9999 - SIDEBAR_W, width: SIDE_CONTENT_W }}
      >
        {side.measureContent}
      </div>

      {Array.from({ length: pageCount }, (_, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pageCount}>
          <div className="relative flex h-full w-full flex-col text-left text-slate-800" style={{ background: PAPER, ...printExact }}>
            {index === 0 && (
              <div
                {...editAttrs(edit, 'personal')}
                className="flex shrink-0 items-center gap-7 overflow-hidden px-9"
                style={{ height: HEADER_H, background: headerBg }}
              >
                {personal.photo && (
                  <div className="shrink-0">
                    <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor={accentColor} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h1
                    className="break-words font-semibold uppercase leading-[1.02]"
                    style={{ fontFamily: SERIF, fontSize: nameSize, letterSpacing: '0.01em' }}
                  >
                    <span style={{ color: INK }}>{firstName}</span>
                    {restName && (<><br /><span style={{ color: accentColor }}>{restName}</span></>)}
                  </h1>
                  {professionParts.length > 0 && (
                    <p className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] font-semibold uppercase tracking-[0.2em]" style={{ color: INK }}>
                      {professionParts.map((part, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span aria-hidden="true" className="h-3 w-px" style={{ backgroundColor: accentColor }} />}
                          <span>{part}</span>
                        </React.Fragment>
                      ))}
                    </p>
                  )}
                  {/* Optional one-line tagline; only shows if the personal data has one. */}
                  {personal.tagline && (
                    <p className="mt-2 max-w-[300px] text-[12px] italic leading-snug text-slate-600">{personal.tagline}</p>
                  )}
                </div>

                {contacts.length > 0 && (
                  <div className={`flex shrink-0 flex-col border-l pl-5 ${contacts.length > 6 ? 'gap-1.5' : 'gap-2'}`} style={{ width: 210, borderColor: ruleColor }}>
                    {contacts.slice(0, 9).map((c, i) => (
                      <div key={i} className={`flex items-start gap-2.5 leading-snug text-slate-700 ${contacts.length > 6 ? 'text-[10.5px]' : 'text-[11px]'}`}>
                        <ContactIcon name={contactIcon(c)} color={accentColor} />
                        <span className="min-w-0 [overflow-wrap:anywhere]">{c}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex min-h-0 flex-1">
              <div
                className="flex shrink-0 flex-col"
                style={{ width: SIDEBAR_W, background: sidebarBg, borderRight: `1px solid ${tint(accentColor, 0.75)}` }}
              >
                <div
                  ref={index === 0 ? side.firstBodyRef : undefined}
                  className="min-h-0 flex-1 overflow-hidden"
                  style={{ marginLeft: SIDE_PAD_X, marginRight: SIDE_PAD_X, marginTop: index === 0 ? TOP_FIRST : TOP_NEXT, marginBottom: BOTTOM }}
                >
                  {side.pages[index] || null}
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div
                  ref={index === 0 ? main.firstBodyRef : undefined}
                  className="min-h-0 flex-1 overflow-hidden"
                  style={{ marginLeft: MAIN_PAD_L, marginRight: MAIN_PAD_R, marginTop: index === 0 ? TOP_FIRST : TOP_NEXT, marginBottom: BOTTOM }}
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

export default GoldExecutiveTemplate;
