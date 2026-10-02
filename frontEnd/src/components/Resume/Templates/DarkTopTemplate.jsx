import React from 'react';
import { renderAchievements } from '../Sections/richText';
import ResumePhoto from '../Sections/ResumePhoto';
import {
  jobDates,
  skillRating,
  skillDots,
  usePaginatedBlocks,
  A4Page,
  padLast,
  endGroup,
  editAttrs,
  markSection,
  renderExtraSections,
} from './templateShared';
import renderCertificates from '../Sections/renderCertificates';

/**
 * Chronicle — a timeline template.
 *
 * A tinted rail runs down the left of every page with a solid accent line on its
 * edge. Dates sit in the rail, each role/degree is a node on the line, and each
 * section heading is a square marker. The rail, line and top bar are page-level
 * decoration; every paginated block is still a flat, direct child of the body
 * (no wrappers). Dates and nodes are absolutely positioned out of the block's own
 * left edge, so they never change a block's height.
 *
 * Geometry (A4 = 794px wide):  rail 200px | gutter 24px | content 530px | right pad 40px
 */
const RAIL = 200;

const ICONS = {
  mail: ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6'],
  phone: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z'],
  web: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'],
  pin: ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
};

// Pick an icon from the shape of the text (contact items are plain strings).
const contactKind = (c) => {
  if (typeof c !== 'string') return null;
  const s = c.trim().toLowerCase();
  if (s.includes('@')) return 'mail';
  if (/^[+()\d\s.\-–]{7,}$/.test(s)) return 'phone';
  if (!s.includes(' ') && /^(https?:\/\/|www\.)|linkedin|github|behance|dribbble|\.(com|io|dev|me|net|org|co)(\/|$)/.test(s)) return 'web';
  return 'pin';
};

const ContactIcon = ({ kind, color }) => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] shrink-0">
    {(ICONS[kind] || []).map((d, i) => <path key={i} d={d} />)}
  </svg>
);

const chunk = (arr, n) => arr.reduce((rows, item, i) => {
  if (i % n === 0) rows.push([]);
  rows[rows.length - 1].push(item);
  return rows;
}, []);

const ChronicleTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  // Accent is exposed as a CSS variable so the heading marker/underline also work
  // on headings rendered by the shared extra-section helpers.
  const headingStyle = { '--accent': accentColor };
  const headingClass = `relative mb-3 pb-1.5 text-[13px] font-bold tracking-tight text-slate-900 border-b border-slate-200 before:content-[''] before:absolute before:left-[-30px] before:top-[4px] before:h-[11px] before:w-[11px] before:rounded-[2px] before:bg-[var(--accent,#0f172a)] after:content-[''] after:absolute after:left-0 after:-bottom-px after:h-[2px] after:w-10 after:bg-[var(--accent,#0f172a)]`;
  const heading = (key, text) => (
    <h3 key={`${key}-h`} className={headingClass} style={headingStyle}>{text}</h3>
  );

  // Title row: node on the timeline line + date in the rail + bold title.
  const entryHead = (key, title, date) => (
    <div key={key} className="relative mb-0.5">
      <span className="absolute h-[9px] w-[9px] rounded-full border-2 bg-white" style={{ left: -28.5, top: 4, borderColor: accentColor }} />
      {date && (
        <span className="absolute w-[150px] text-right text-[11px] leading-4 tabular-nums text-slate-500" style={{ right: 'calc(100% + 40px)', top: 2 }}>{date}</span>
      )}
      <p className="text-[14px] font-bold leading-tight text-slate-900">{title}</p>
    </div>
  );

  // Accent-coloured primary line with a quieter secondary detail beside it.
  const metaLine = (key, primary, secondary) => (primary || secondary) && (
    <p key={key} className="mb-2 flex flex-wrap items-center text-xs">
      {primary && <span className="font-semibold" style={{ color: accentColor }}>{primary}</span>}
      {secondary && (
        <span className={`text-[11px] text-slate-500 ${primary ? 'ml-3 pl-3 border-l border-slate-300' : ''}`}>{secondary}</span>
      )}
    </p>
  );

  const sectionMap = {
    summary: summary ? endGroup([
      heading('summary', 'Profile'),
      ...renderAchievements(summary, 'summary'),
    ]) : [],
    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Experience'),
      ...jobs.flatMap((job) => padLast([
        entryHead(`job-${job.id}-title`, job.title, jobDates(job)),
        metaLine(`job-${job.id}-meta`, job.employer, [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(', ')),
        ...renderAchievements(job.achievements, `job-${job.id}-ach`),
      ], 'mb-5')),
    ]) : [],
    education: educations.length > 0 ? endGroup([
      heading('education', 'Education'),
      ...educations.flatMap((ed) => padLast([
        entryHead(`education-${ed.id}-title`, [ed.degree, ed.field].filter(Boolean).join(', '), ed.date),
        metaLine(`education-${ed.id}-meta`, ed.institution, ed.location),
        ...renderAchievements(ed.achievements, `education-${ed.id}-ach`),
      ], 'mb-4')),
    ]) : [],
    skills: namedSkills.length > 0 ? endGroup([
      heading('skills', 'Skills'),
      ...chunk(namedSkills, 2).map((pair, i) => (
        <div key={`skills-row-${i}`} className="mb-1.5 flex gap-8">
          {pair.map((s) => (
            <div key={`skill-${s.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-3 border-b border-slate-200 pb-1.5 text-[11.5px] font-medium text-slate-800">
              <span className="truncate">{s.text}</span>
              {skillDots(skillRating(s), accentColor, '#cbd5e1')}
            </div>
          ))}
          {pair.length === 1 && <div className="flex-1" />}
        </div>
      )),
    ]) : [],
  };

  const extras = {
    ...renderExtraSections({ projects, languages, hobbies, references, headingClass, headingStyle, accentColor }),
    ...renderCertificates({ certificates, headingClass, headingStyle }),
  };
  const allBlocks = sectionOrder.flatMap((key) => markSection(edit, key, sectionMap[key] || extras[key] || []));
  const { pages, measureContainerRef, firstBodyRef, measureContent } = usePaginatedBlocks(allBlocks, 880);

  const words = (fullName || '').trim().split(/\s+/).filter(Boolean);
  const initials = words.length ? (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase() : 'YN';

  return (
    <>
      {/* Must match the body's content width: 794 - 224 (rail + gutter) - 40 (right padding) */}
      <div ref={measureContainerRef} className="absolute top-[-9999px] left-[-9999px] w-[530px] pointer-events-none">
        {measureContent}
      </div>

      {pages.map((pageBlocks, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pages.length}>
          <div className="relative w-full h-full bg-white text-slate-800 text-left flex flex-col">
            {/* Page-level decoration: tint, timeline line, top bar. Absolute, so no effect on pagination. */}
            <div className="absolute left-0 top-0 bottom-0" style={{ width: RAIL, backgroundColor: accentColor, opacity: 0.07, zIndex: 0 }} />
            <div className="absolute top-0 bottom-0" style={{ left: RAIL - 1, width: 2, backgroundColor: accentColor }} />
            <div className="absolute left-0 right-0 top-0 h-2" style={{ backgroundColor: accentColor }} />

            {index === 0 && (
              <div {...editAttrs(edit, 'personal')} className="relative z-10 flex pt-12 pb-8 pr-10">
                <div className="flex shrink-0 justify-center" style={{ width: RAIL }}>
                  {personal.photo ? (
                    <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor={accentColor} />
                  ) : (
                    <div className="flex h-[92px] w-[92px] items-center justify-center rounded-full border-2 bg-white text-[30px] font-semibold" style={{ color: accentColor, borderColor: accentColor }}>
                      {initials}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 pl-6">
                  <h1 className="text-[40px] font-bold leading-[1.05] tracking-tight text-slate-900 break-words">{fullName || 'Your Name'}</h1>
                  {personal.profession && (
                    <p className="mt-2 text-[15px] font-medium" style={{ color: accentColor }}>{personal.profession}</p>
                  )}
                  {contactList.length > 0 && (
                    <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-slate-600">
                      {contactList.map((c, i) => (
                        <div key={i} className="flex min-w-0 items-start gap-2">
                          {contactKind(c) ? (
                            <ContactIcon kind={contactKind(c)} color={accentColor} />
                          ) : (
                            <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
                          )}
                          <span className="min-w-0 [overflow-wrap:anywhere]">{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={index === 0 ? firstBodyRef : undefined} className="relative z-10 flex-1 overflow-hidden pl-[224px] pr-10 py-8">
              {pageBlocks}
              {isEmpty && index === 0 && (
                <p className="text-xs text-slate-400 italic mt-10">Nothing entered yet — fill in a few steps to see them appear here.</p>
              )}
            </div>
          </div>
        </A4Page>
      ))}
    </>
  );
};

export default ChronicleTemplate;
