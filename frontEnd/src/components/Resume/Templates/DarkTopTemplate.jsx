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

const DarkTopTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, isEmpty, accentColor, sectionOrder, edit } = props;

  const headingClass = 'text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-1';
  const heading = (key, text, plain = false) => (
    <h3 key={`${key}-h`} className={plain ? 'text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3' : headingClass}>{text}</h3>
  );

  const sectionMap = {
    summary: summary ? endGroup([
      heading('summary', 'Summary', true),
      ...renderAchievements(summary, 'summary'),
    ]) : [],
    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Experience'),
      ...jobs.flatMap((job) => padLast([
        <div key={`job-${job.id}-title`} className="flex justify-between items-baseline mb-1">
          <p className="font-bold text-slate-900 text-sm">{job.title}</p>
          {jobDates(job) && <p className="text-[11px] text-slate-500 font-medium ml-2">{jobDates(job)}</p>}
        </div>,
        job.employer && <p key={`job-${job.id}-employer`} className="text-xs text-slate-700 font-semibold mb-1">{job.employer}</p>,
        (job.location || job.remote) && (
          <p key={`job-${job.id}-meta`} className="text-[11px] text-slate-500 mt-1 mb-2">
            {[job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(' · ')}
          </p>
        ),
        ...renderAchievements(job.achievements, `job-${job.id}-ach`),
      ], 'mb-4')),
    ]) : [],
    education: educations.length > 0 ? endGroup([
      heading('education', 'Education'),
      ...educations.flatMap((ed) => padLast([
        <div key={`education-${ed.id}-title`} className="flex justify-between items-baseline mb-1">
          <p className="font-bold text-slate-900 text-sm">{[ed.degree, ed.field].filter(Boolean).join(', ')}</p>
          {ed.date && <p className="text-[11px] text-slate-500 font-medium ml-2">{ed.date}</p>}
        </div>,
        <p key={`education-${ed.id}-school`} className="text-xs text-slate-700 font-semibold mb-1">{ed.institution}</p>,
        ed.location && <p key={`education-${ed.id}-location`} className="text-[11px] text-slate-500 mt-1">{ed.location}</p>,
        ...renderAchievements(ed.achievements, `education-${ed.id}-ach`),
      ], 'mb-3')),
    ]) : [],
    skills: namedSkills.length > 0 ? endGroup([
      heading('skills', 'Skills'),
      ...namedSkills.map((s) => (
        <span key={`skill-${s.id}`} className="inline-flex items-center gap-2 align-top mr-2 mb-2 px-3 py-1 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold border border-slate-200">
          {s.text}
          {skillDots(skillRating(s), accentColor, '#cbd5e1')}
        </span>
      )),
    ]) : [],
  };

  const extras = renderExtraSections({ projects, languages, hobbies, references, headingClass, headingStyle: {}, accentColor });
  const allBlocks = sectionOrder.flatMap((key) => markSection(edit, key, sectionMap[key] || extras[key] || []));
  const { pages, measureContainerRef, firstBodyRef, measureContent } = usePaginatedBlocks(allBlocks, 880);

  return (
    <>
      <div ref={measureContainerRef} className="absolute top-[-9999px] left-[-9999px] w-[714px] pointer-events-none">
        {measureContent}
      </div>

      {pages.map((pageBlocks, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pages.length}>
          <div className="w-full h-full bg-white text-slate-800 text-left flex flex-col">
            {index === 0 && (
              <div {...editAttrs(edit, 'personal')} className="px-10 py-8 text-white flex justify-between items-start" style={{ backgroundColor: accentColor }}>
                <div className="pr-8 flex items-center gap-6 min-w-0">
                  <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor="#ffffff" />
                  <div className="min-w-0">
                    <h1 className="text-4xl font-extrabold mb-1 break-words">{fullName || 'Your Name'}</h1>
                    {personal.profession && <p className="text-slate-300 font-medium text-lg">{personal.profession}</p>}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-300 space-y-1.5 shrink-0">
                  {contactList.map((c, i) => <div key={i}>{c}</div>)}
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

export default DarkTopTemplate;
