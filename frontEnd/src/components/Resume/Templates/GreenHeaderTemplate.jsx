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

const GreenHeaderTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, isEmpty, accentColor, sectionOrder, edit } = props;

  const headingClass = 'text-[11px] font-bold uppercase tracking-wider mb-3';
  const headingStyle = { color: accentColor };
  const heading = (key, text) => <h3 key={`${key}-h`} className={headingClass} style={headingStyle}>{text}</h3>;

  const sectionMap = {
    summary: summary ? endGroup([
      heading('summary', 'Summary'),
      ...renderAchievements(summary, 'summary'),
    ]) : [],
    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Experience'),
      ...jobs.flatMap((job) => padLast([
        <p key={`job-${job.id}-title`} className="font-bold text-slate-900 text-sm">{job.title}</p>,
        job.employer && (
          <p key={`job-${job.id}-employer`} className="text-xs font-semibold mt-0.5" style={{ color: accentColor }}>{job.employer}</p>
        ),
        <div key={`job-${job.id}-meta`} className="flex justify-between items-center text-[11px] text-slate-500 mb-2 mt-1">
          <span>{[job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(' · ')}</span>
          <span>{jobDates(job)}</span>
        </div>,
        ...renderAchievements(job.achievements, `job-${job.id}-ach`),
      ], 'mb-4')),
    ]) : [],
    education: educations.length > 0 ? endGroup([
      heading('education', 'Education'),
      ...educations.flatMap((ed) => padLast([
        <p key={`education-${ed.id}-title`} className="font-bold text-slate-900 text-sm">{[ed.degree, ed.field].filter(Boolean).join(', ')}</p>,
        <p key={`education-${ed.id}-school`} className="text-xs font-semibold mt-0.5" style={{ color: accentColor }}>{ed.institution}</p>,
        <div key={`education-${ed.id}-meta`} className="flex justify-between items-center text-[11px] text-slate-500 mb-2 mt-1">
          <span>{ed.location}</span>
          <span>{ed.date}</span>
        </div>,
        ...renderAchievements(ed.achievements, `education-${ed.id}-ach`),
      ], 'mb-3')),
    ]) : [],
    skills: namedSkills.length > 0 ? endGroup([
      heading('skills', 'Skills'),
      ...namedSkills.map((s) => (
        <span key={`skill-${s.id}`} className="inline-flex items-center gap-2 align-top mr-2 mb-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded px-2 py-1">
          {s.text}
          {skillDots(skillRating(s), accentColor, tint(accentColor, 0.8))}
        </span>
      )),
    ]) : [],
  };

  const extras = renderExtraSections({ projects, languages, hobbies, references, headingClass, headingStyle, accentColor });
  const allBlocks = sectionOrder.flatMap((key) => markSection(edit, key, sectionMap[key] || extras[key] || []));
  const { pages, measureContainerRef, firstBodyRef, measureContent } = usePaginatedBlocks(allBlocks, 880);

  return (
    <>
      <div ref={measureContainerRef} className="absolute top-[-9999px] left-[-9999px] w-[714px] pointer-events-none">
        {measureContent}
      </div>

      {pages.map((pageBlocks, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pages.length}>
          <div className="w-full h-full text-slate-800 text-left flex flex-col">
            {index === 0 && (
              <div {...editAttrs(edit, 'personal')} className="px-10 py-8 border-b-[6px] bg-slate-50 flex items-center gap-6" style={{ borderColor: tint(accentColor, 0.35) }}>
                <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor={accentColor} />
                <div className="min-w-0 flex-1">
                  <h1 className="text-4xl font-extrabold text-slate-900 mb-2 break-words">{fullName || 'Your Name'}</h1>
                  {personal.profession && <p className="text-lg font-semibold" style={{ color: accentColor }}>{personal.profession}</p>}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-xs text-slate-600 font-medium">
                    {contactList.map((c, i) => <span key={i}>{c}</span>)}
                  </div>
                </div>
              </div>
            )}

            <div ref={index === 0 ? firstBodyRef : undefined} className="px-10 py-8 flex-1 overflow-hidden">
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

export default GreenHeaderTemplate;
