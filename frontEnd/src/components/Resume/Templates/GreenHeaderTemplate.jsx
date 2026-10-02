import React from 'react';
import { renderAchievements } from '../Sections/richText';
import ResumePhoto from '../Sections/ResumePhoto';
import {
  tint,
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
 * Regent — a serif-led, executive template (premium take on GreenHeader).
 *
 * White page. Serif name and section headings over a clean sans body, a vertical
 * contact column with icons, and a double rule (thick accent + hairline) closing the
 * header. Continuation pages open with the same double rule instead of repeating the name.
 * No shadows, no gradients.
 *
 * Body spacing is applied as margins on the measured element, so the height the
 * pagination hook reads from firstBodyRef is the real usable content height.
 */
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

const ContactIcon = ({ kind, color }) => (kind ? (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] shrink-0">
    {ICONS[kind].map((d, i) => <path key={i} d={d} />)}
  </svg>
) : (
  <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
));

const chunk = (arr, n) => arr.reduce((rows, item, i) => {
  if (i % n === 0) rows.push([]);
  rows[rows.length - 1].push(item);
  return rows;
}, []);

const RegentTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const headingClass = 'mb-3 border-b pb-1 font-serif text-[17px] font-semibold tracking-tight';
  const headingStyle = { color: accentColor, borderColor: tint(accentColor, 0.75) };
  const heading = (key, text) => <h3 key={`${key}-h`} className={headingClass} style={headingStyle}>{text}</h3>;

  // Bold sans title on the left, italic serif dates on the right.
  const entryHead = (key, title, date) => (
    <div key={key} className="mb-0.5 flex items-baseline justify-between gap-4">
      <p className="text-[13.5px] font-bold leading-tight text-slate-900">{title}</p>
      {date && <span className="shrink-0 font-serif text-[12px] italic text-slate-500">{date}</span>}
    </div>
  );

  // Serif employer in the accent colour, with a quieter sans detail after a divider.
  const metaLine = (key, primary, secondary) => (primary || secondary) && (
    <p key={key} className="mb-2 flex flex-wrap items-center">
      {primary && <span className="font-serif text-[13.5px] font-semibold" style={{ color: accentColor }}>{primary}</span>}
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
      // Rows of three: skill name over its level dots, set off by a slim accent edge.
      ...chunk(namedSkills, 3).map((row, i) => (
        <div key={`skills-row-${i}`} className="mb-3 flex gap-5">
          {row.map((s) => (
            <div key={`skill-${s.id}`} className="min-w-0 flex-1 border-l-2 pl-2.5" style={{ borderColor: tint(accentColor, 0.5) }}>
              <p className="truncate text-[11.5px] font-semibold text-slate-800">{s.text}</p>
              <div className="mt-1">{skillDots(skillRating(s), accentColor, tint(accentColor, 0.75))}</div>
            </div>
          ))}
          {Array.from({ length: 3 - row.length }).map((_, k) => <div key={`pad-${k}`} className="flex-1" />)}
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

  return (
    <>
      {/* Matches the body's content width: 794 - 2 x 40 */}
      <div ref={measureContainerRef} className="absolute top-[-9999px] left-[-9999px] w-[714px] pointer-events-none">
        {measureContent}
      </div>

      {pages.map((pageBlocks, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pages.length}>
          <div className="relative w-full h-full bg-white text-slate-800 text-left flex flex-col">
            {index === 0 ? (
              <>
                <div {...editAttrs(edit, 'personal')} className="flex items-center gap-6 px-10 pb-7 pt-10">
                  <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor={accentColor} />
                  <div className="min-w-0 flex-1">
                    <h1 className="font-serif text-[40px] font-semibold leading-[1.05] tracking-tight text-slate-900 break-words">{fullName || 'Your Name'}</h1>
                    {personal.profession && (
                      <p className="mt-2 text-[14px] font-medium tracking-wide" style={{ color: accentColor }}>{personal.profession}</p>
                    )}
                  </div>
                  {contactList.length > 0 && (
                    <div className="w-[190px] shrink-0 space-y-1.5 border-l pl-5 text-[11px] text-slate-600" style={{ borderColor: tint(accentColor, 0.7) }}>
                      {contactList.map((c, i) => (
                        <div key={i} className="flex min-w-0 items-start gap-2">
                          <ContactIcon kind={contactKind(c)} color={accentColor} />
                          <span className="min-w-0 [overflow-wrap:anywhere]">{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Double rule closing the header */}
                <div className="mx-10 h-[3px]" style={{ backgroundColor: accentColor }} />
                <div className="mx-10 mt-[3px] h-px" style={{ backgroundColor: tint(accentColor, 0.6) }} />
              </>
            ) : (
              <>
                {/* Same double rule opens continuation pages (absolute, no effect on pagination) */}
                <div className="absolute left-10 right-10 top-0 h-[3px]" style={{ backgroundColor: accentColor }} />
                <div className="absolute left-10 right-10 top-[6px] h-px" style={{ backgroundColor: tint(accentColor, 0.6) }} />
              </>
            )}

            <div ref={index === 0 ? firstBodyRef : undefined} className={`mx-10 mb-8 flex-1 overflow-hidden ${index === 0 ? 'mt-6' : 'mt-12'}`}>
              {pageBlocks}
              {isEmpty && index === 0 && (
                <p className="text-xs text-slate-400 italic">Nothing entered yet — fill in a few steps to see them appear here.</p>
              )}
            </div>
          </div>
        </A4Page>
      ))}
    </>
  );
};

export default RegentTemplate;
