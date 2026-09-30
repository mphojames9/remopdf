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

const PinkHeaderTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, isEmpty, accentColor, sectionOrder, edit } = props;

  const headingClass = 'text-[11px] font-bold uppercase tracking-widest mb-3 border-b-2 pb-1';
  const headingStyle = { color: accentColor, borderColor: tint(accentColor, 0.9) };
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
        job.employer && <p key={`job-${job.id}-employer`} className="text-xs font-semibold text-slate-600 mb-1">{job.employer}</p>,
        <p key={`job-${job.id}-meta`} className="text-[11px] text-slate-400 mb-2">
          {[jobDates(job), job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(' | ')}
        </p>,
        ...renderAchievements(job.achievements, `job-${job.id}-ach`),
      ], 'mb-4')),
    ]) : [],
    education: educations.length > 0 ? endGroup([
      heading('education', 'Education'),
      ...educations.flatMap((ed) => padLast([
        <p key={`education-${ed.id}-title`} className="font-bold text-slate-900 text-sm">{[ed.degree, ed.field].filter(Boolean).join(', ')}</p>,
        <p key={`education-${ed.id}-school`} className="text-xs font-semibold text-slate-600 mb-1">{ed.institution}</p>,
        <p key={`education-${ed.id}-meta`} className="text-[11px] text-slate-400 mb-2">{[ed.date, ed.location].filter(Boolean).join(' | ')}</p>,
        ...renderAchievements(ed.achievements, `education-${ed.id}-ach`),
      ], 'mb-3')),
    ]) : [],
    skills: namedSkills.length > 0 ? endGroup([
      heading('skills', 'Skills'),
      ...namedSkills.map((s) => (
        <div key={`skill-${s.id}`} className="flex items-center gap-2 text-xs text-slate-600 mb-1">
          <span className="shrink-0" aria-hidden="true">•</span>
          <span>{s.text}</span>
          {skillDots(skillRating(s), accentColor, tint(accentColor, 0.8))}
        </div>
      )),
    ]) : [],
  };

  const extras = renderExtraSections({ projects, languages, hobbies, references, headingClass, headingStyle, accentColor });
  const allBlocks = sectionOrder.flatMap((key) => markSection(edit, key, sectionMap[key] || extras[key] || []));
  const { pages, measureContainerRef, firstBodyRef, measureContent } = usePaginatedBlocks(allBlocks, 850);

  return (
    <>
      <div ref={measureContainerRef} className="absolute top-[-9999px] left-[-9999px] w-[664px] pointer-events-none">
        {measureContent}
      </div>

      {pages.map((pageBlocks, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pages.length}>
          <div className="w-full h-full text-slate-800 text-left flex flex-col" style={{ backgroundColor: tint(accentColor, 0.92) }}>
            {index === 0 && (
              <div {...editAttrs(edit, 'personal')} className="px-10 py-8 text-white flex items-center justify-between gap-6" style={{ backgroundColor: accentColor }}>
                <div className="min-w-0 flex-1">
                  <h1 className="text-4xl font-extrabold mb-1 break-words">{fullName || 'Your Name'}</h1>
                  {personal.profession && <p className="text-lg mb-4" style={{ color: tint(accentColor, 0.55) }}>{personal.profession}</p>}
                  {contactList.length > 0 && (
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: tint(accentColor, 0.85) }}>
                      {contactList.map((c, i) => <span key={i}>{c}</span>)}
                    </div>
                  )}
                </div>
                <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor="#ffffff" />
              </div>
            )}

            <div ref={index === 0 ? firstBodyRef : undefined} className={`px-10 py-8 bg-white m-6 ${index === 0 ? 'mt-0 rounded-b-md' : 'rounded-md'} shadow-sm flex-1 border overflow-hidden`} style={{ borderColor: tint(accentColor, 0.82) }}>
              {pageBlocks}
              {isEmpty && index === 0 && (
                <p className="text-xs text-slate-400 italic">Nothing entered yet.</p>
              )}
            </div>
          </div>
        </A4Page>
      ))}
    </>
  );
};

export default PinkHeaderTemplate;
