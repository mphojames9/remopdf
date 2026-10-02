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
 * Timeline (id: teal-timeline). Single column, serif name and headings.
 * Experience and Education sit on a vertical rail with a dot at each entry.
 *
 * Flat like every template: one list of plain DOM elements ("atoms") that the
 * paginator splits into A4 pages. The rail is drawn by giving every atom of an
 * entry a left border, and the gap between entries is padding (not margin), so
 * the rail stays unbroken between atoms and across a page break.
 *
 * Body spacing is applied as margins on the measured element (same as Atelier),
 * so the height the hook reads from firstBodyRef is the real usable height.
 */

const SERIF = 'Georgia, "Times New Roman", serif';

// Body geometry: mx-12 (48px) on both sides, mb-10 (40px) at the bottom, mt-10 on
// pages 2+ (mt-6 on page 1, under the header).
const MARGIN_X = 48;
const MARGIN_Y = 40;
const CONTENT_WIDTH = PAGE_WIDTH_PX - MARGIN_X * 2; // 698, the hidden measuring box must match
const CONTENT_MAX_HEIGHT = PAGE_HEIGHT_PX - MARGIN_Y * 2; // usable height on pages 2+

const HEADING_CLASS = 'text-[18px] font-bold leading-tight mb-3';

const TealTimelineTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder, edit } = props;
  const accentColor = props.accentColor || DEFAULT_ACCENT['teal-timeline'];
  const railColor = tint(accentColor, 0.7);

  // Extra-section helpers receive the same heading look.
  const headingStyle = { fontFamily: SERIF, color: accentColor };
  const heading = (key, text) => <h3 key={`${key}-h`} className={HEADING_CLASS} style={headingStyle}>{text}</h3>;

  // Title and dates on one line, with the accent-coloured employer / school line
  // under it. One atom, so a title can never be left alone at the bottom of a page.
  const entryHead = (title, date, primary, secondary) => (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[14px] font-bold leading-snug text-slate-900">{title}</p>
        {date && <span className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-slate-500">{date}</span>}
      </div>
      {(primary || secondary) && (
        <p className="text-[12.5px]">
          {primary && <span className="font-semibold" style={{ color: accentColor }}>{primary}</span>}
          {secondary && <span className="text-slate-500">{primary ? ', ' : ''}{secondary}</span>}
        </p>
      )}
    </div>
  );

  // One entry on the rail: its head plus its description lines. Each node is its own
  // atom carrying the rail's border; the head also carries the dot.
  const railEntry = (id, head, bodyNodes, isLastEntry) => {
    const list = [head, ...bodyNodes].filter(Boolean);
    return list.map((node, i) => (
      <div
        key={`${id}-${i}`}
        className={`relative ml-[5px] border-l-2 pl-5 ${i === list.length - 1 && !isLastEntry ? 'pb-5' : 'pb-1'}`}
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

  // renderAchievements returns bare rich-text elements; each gets a plain wrapper
  // so it can carry the rail border.
  const richLines = (text, prefix) => (
    text ? renderAchievements(text, prefix).map((el, i) => <div key={`${prefix}-w${i}`}>{el}</div>) : []
  );

  const sectionMap = {
    summary: summary ? endGroup([
      heading('summary', 'Summary'),
      ...renderAchievements(summary, 'summary'),
    ]) : [],
    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Experience'),
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
      ...namedSkills.map((s, i) => (
        <span
          key={`skill-${s.id ?? i}`}
          className="mb-1.5 mr-5 inline-flex items-center gap-2 align-top text-[12px] font-semibold text-slate-800"
        >
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
              <div {...editAttrs(edit, 'personal')} className="shrink-0 px-12 pt-10">
                <div className="flex items-center justify-between gap-6 border-b-[3px] pb-5" style={{ borderColor: accentColor }}>
                  <div className="min-w-0 flex-1">
                    <h1 className="break-words text-[38px] font-bold leading-[1.1] tracking-tight text-slate-900" style={{ fontFamily: SERIF }}>
                      {fullName || 'Your Name'}
                    </h1>
                    {personal.profession && (
                      <p className="mt-1.5 text-[16px] font-medium" style={{ color: accentColor }}>{personal.profession}</p>
                    )}
                    {contactList.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-600">
                        {contactList.map((c, i) => <span key={i} className="[overflow-wrap:anywhere]">{c}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor={accentColor} />
                  </div>
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

export default TealTimelineTemplate;
