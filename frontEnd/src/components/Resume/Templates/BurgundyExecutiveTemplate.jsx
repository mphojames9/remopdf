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
  padLast,
  endGroup,
  editAttrs,
  markSection,
  renderExtraSections,
} from './templateShared';

/**
 * Executive (id: burgundy-executive). EMPTY STARTER: the wiring is done, the design is not.
 *
 * It already paginates, supports edit mode, page numbers and section order, and
 * shows every section in a plain single-column layout. To design it, change the
 * markup below; keep these rules so pagination keeps working:
 *   - Sections stay FLAT: plain DOM elements (div, p, h3, span), no custom
 *     components and no Fragments. Section headings must be <h3>.
 *   - Body spacing is margins on the measured element (firstBodyRef), and the
 *     hidden measuring box must be as wide as the real body (CONTENT_WIDTH).
 */

// Body geometry: mx-12 (48px) on both sides, mb-10 (40px) at the bottom, mt-10 on
// pages 2+ (mt-6 on page 1, under the header).
const MARGIN_X = 48;
const MARGIN_Y = 40;
const CONTENT_WIDTH = PAGE_WIDTH_PX - MARGIN_X * 2;
const CONTENT_MAX_HEIGHT = PAGE_HEIGHT_PX - MARGIN_Y * 2;

const HEADING_CLASS = 'mb-3 border-b border-slate-200 pb-1 text-[14px] font-bold';

const BurgundyExecutiveTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder, edit } = props;
  const accentColor = props.accentColor || DEFAULT_ACCENT['burgundy-executive'];

  const headingStyle = { color: accentColor };
  const heading = (key, text) => <h3 key={`${key}-h`} className={HEADING_CLASS} style={headingStyle}>{text}</h3>;

  const entryHead = (key, title, date) => (
    <div key={key} className="mb-0.5 flex items-baseline justify-between gap-3">
      <p className="text-[13.5px] font-bold leading-tight text-slate-900">{title}</p>
      {date && <span className="shrink-0 whitespace-nowrap text-[11px] text-slate-500">{date}</span>}
    </div>
  );

  const metaLine = (key, primary, secondary) => (primary || secondary) && (
    <p key={key} className="mb-1.5 text-xs">
      {primary && <span className="font-semibold" style={{ color: accentColor }}>{primary}</span>}
      {secondary && <span className="text-slate-500">{primary ? ', ' : ''}{secondary}</span>}
    </p>
  );

  const sectionMap = {
    summary: summary ? endGroup([
      heading('summary', 'Summary'),
      ...renderAchievements(summary, 'summary'),
    ]) : [],
    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Experience'),
      ...jobs.flatMap((job) => padLast([
        entryHead(`job-${job.id}-title`, job.title, jobDates(job)),
        metaLine(`job-${job.id}-meta`, job.employer, [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(', ')),
        ...renderAchievements(job.achievements, `job-${job.id}-ach`),
      ], 'mb-4')),
    ]) : [],
    education: educations.length > 0 ? endGroup([
      heading('education', 'Education'),
      ...educations.flatMap((ed) => padLast([
        entryHead(`education-${ed.id}-title`, [ed.degree, ed.field].filter(Boolean).join(', ') || ed.institution, ed.date),
        metaLine(`education-${ed.id}-meta`, [ed.degree, ed.field].some(Boolean) ? ed.institution : '', ed.location),
        ...renderAchievements(ed.achievements, `education-${ed.id}-ach`),
      ], 'mb-3')),
    ]) : [],
    skills: namedSkills.length > 0 ? endGroup([
      heading('skills', 'Skills'),
      ...namedSkills.map((s) => (
        <span key={`skill-${s.id}`} className="mb-1.5 mr-5 inline-flex items-center gap-2 align-top text-[12px] font-semibold text-slate-800">
          {s.text}
          {skillDots(skillRating(s), accentColor, tint(accentColor, 0.8))}
        </span>
      )),
    ]) : [],
  };

  const extras = {
    ...renderExtraSections({ projects, languages, hobbies, references, headingClass: HEADING_CLASS, headingStyle, accentColor }),
    ...renderCertificates({ certificates, headingClass: HEADING_CLASS, headingStyle }),
  };
  const allBlocks = sectionOrder.flatMap((key) => markSection(edit, key, sectionMap[key] || extras[key] || []));
  const { pages, measureContainerRef, firstBodyRef, measureContent } = usePaginatedBlocks(allBlocks, CONTENT_MAX_HEIGHT);

  return (
    <>
      {/* Hidden copy of every atom, as wide as the real page body, used to measure the page breaks. */}
      <div
        ref={measureContainerRef}
        className="absolute pointer-events-none"
        style={{ top: -9999, left: -9999, width: CONTENT_WIDTH }}
      >
        {measureContent}
      </div>

      {pages.map((pageBlocks, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pages.length}>
          <div className="relative flex h-full w-full flex-col bg-white text-left text-slate-800">
            {index === 0 && (
              <div {...editAttrs(edit, 'personal')} className="flex shrink-0 items-center justify-between gap-6 px-12 pt-10">
                <div className="min-w-0 flex-1">
                  <h1 className="break-words text-[34px] font-bold leading-[1.1] text-slate-900">{fullName || 'Your Name'}</h1>
                  {personal.profession && (
                    <p className="mt-1 text-[15px] font-medium" style={{ color: accentColor }}>{personal.profession}</p>
                  )}
                  {contactList.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-600">
                      {contactList.map((c, i) => <span key={i} className="[overflow-wrap:anywhere]">{c}</span>)}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor={accentColor} />
                </div>
              </div>
            )}

            <div ref={index === 0 ? firstBodyRef : undefined} className={`mx-12 mb-10 min-h-0 flex-1 overflow-hidden ${index === 0 ? 'mt-6' : 'mt-10'}`}>
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

export default BurgundyExecutiveTemplate;
