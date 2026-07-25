import React from 'react';

export default function AetherMinimal({
  info,
  data,
  formatDates,
  hasContact,
  validSummary,
  validExperience,
  validSkills,
  validEducation,
  validCertificates,
  validLanguages,
  validHobbies,
  validReferences,
  firstName,
  lastName
}) {
  
  // Create Contact Items
  const contactItems = [];
  if (info.phone) {
    contactItems.push(
      <span key="phone" className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        {info.phone}
      </span>
    );
  }
  if (info.email) {
    contactItems.push(
      <span key="email" className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {info.email}
      </span>
    );
  }
  if (info.location) {
    contactItems.push(
      <span key="location" className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {info.location}
      </span>
    );
  }
  if (info.linkedin) {
    contactItems.push(
      <span key="linkedin" className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
        {info.linkedin.replace(/(^\w+:|^)\/\//, '')}
      </span>
    );
  }
  if (info.github || info.website || info.secondarySocial) {
    const url = info.github || info.website || info.secondarySocial;
    contactItems.push(
      <span key="web" className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        {url.replace(/(^\w+:|^)\/\//, '')}
      </span>
    );
  }

  const contactRow = contactItems.reduce((acc, curr, idx) => {
    if (idx === 0) return [curr];
    return [...acc, <span key={`sep-${idx}`} className="mx-2 text-gray-300">•</span>, curr];
  }, []);

  // Section Heading Builder (Renders as direct DOM sibling)
  const renderSectionHeader = (title) => (
    <div className="w-full mt-5 mb-3 border-b border-gray-200 pb-1.5 shrink-0 break-inside-avoid">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 leading-none">
        {title}
      </h3>
    </div>
  );

  const validProjects = data?.projects || [];

  return (
    <div id="resume-raw-content" className="w-full min-h-full bg-white pt-14 pb-14 px-12 relative flex flex-col font-sans-minimal">
      
      {/* Font Injection */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .font-sans-minimal { font-family: 'Inter', sans-serif; }
      `}} />

      {/* 1. HEADER */}
      <header className="shrink-0 flex flex-col w-full mb-6 text-left">
        <h1 className="text-[36px] font-bold tracking-tight text-gray-900 leading-none mb-1">
          {firstName} {lastName}
        </h1>
        {info.jobTitle && (
          <h2 className="text-[14px] font-medium tracking-widest uppercase text-gray-500 mb-3">
            {info.jobTitle}
          </h2>
        )}
        {hasContact && (
          <div className="flex flex-wrap items-center text-[11.5px] font-medium text-gray-600 mt-1">
            {contactRow}
          </div>
        )}
      </header>

      {/* 2. SUMMARY */}
      {validSummary && (
        <div id="summary-section" className="w-full mb-2 shrink-0">
          <p className="text-[12px] text-gray-700 leading-[1.7] whitespace-pre-wrap">
            {validSummary}
          </p>
        </div>
      )}

      {/* 3. PAGINATOR DOM QUEUES - UNWRAPPED & FLATTENED */}
      <div className="w-full flex flex-col flex-1 mt-2">
        <aside className="hidden"></aside>
        
        <main className="w-full flex flex-col">

          {/* 1. SKILLS SECTION */}
          {validSkills && validSkills.length > 0 && renderSectionHeader("Expertise")}
          {validSkills && validSkills.length > 0 && (
            validSkills.every(s => typeof s === 'string') ? (
              <div className="w-full mb-4 text-[12px] text-gray-700 leading-relaxed font-medium break-inside-avoid shrink-0">
                {validSkills.join('  •  ')}
              </div>
            ) : (
              <div className="w-full flex flex-wrap gap-x-6 gap-y-1.5 mb-4 break-inside-avoid shrink-0">
                {validSkills.map((skill, idx) => {
                  const name = skill.name || skill.category || skill.skill || '';
                  const keywords = skill.keywords ? skill.keywords.join(', ') : skill.details || '';
                  
                  return (
                    <div key={`skill-${idx}`} className="text-[12px] text-gray-700 leading-relaxed">
                      {name && <span className="font-semibold text-gray-900">{name}{keywords ? ': ' : ''}</span>}
                      {keywords && <span className="text-gray-600">{keywords}</span>}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* 2. EXPERIENCE SECTION */}
          {validExperience && validExperience.length > 0 && renderSectionHeader("Experience")}
          {validExperience && validExperience.map((exp, idx) => (
            <React.Fragment key={`exp-${idx}`}>
              <div className="flex justify-between items-baseline mb-0.5 w-full break-inside-avoid shrink-0">
                <h4 className="text-[13px] font-semibold text-gray-900">{exp.role}</h4>
                <span className="text-[11px] text-gray-500 font-medium tracking-wide shrink-0">
                  {formatDates(exp.startDate, exp.endDate, exp.isCurrent)}
                </span>
              </div>
              <div className={`flex justify-between items-baseline w-full break-inside-avoid shrink-0 ${(exp.achievements?.length > 0 || exp.description) ? 'mb-2' : 'mb-4'}`}>
                <span className="text-[12px] text-gray-600 font-medium">{exp.company}</span>
                {exp.location && <span className="text-[11px] text-gray-500 shrink-0">{exp.location}</span>}
              </div>
              
              {exp.achievements && exp.achievements.length > 0 ? (
                exp.achievements.map((ach, i) => (
                  <li key={`ach-${i}`} className={`list-none pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[0.45em] before:w-[3px] before:h-[3px] before:bg-gray-400 before:rounded-full text-[11.5px] text-gray-700 leading-relaxed w-full break-inside-avoid shrink-0 ${i === exp.achievements.length - 1 ? 'mb-4' : 'mb-1.5'}`}>
                    {ach}
                  </li>
                ))
              ) : exp.description ? (
                <div className="text-[11.5px] text-gray-700 leading-relaxed whitespace-pre-wrap w-full mb-4 break-inside-avoid shrink-0">
                  {exp.description}
                </div>
              ) : null}
            </React.Fragment>
          ))}

          {/* 3. EDUCATION SECTION */}
          {validEducation && validEducation.length > 0 && renderSectionHeader("Education")}
          {validEducation && validEducation.map((edu, idx) => (
            <React.Fragment key={`edu-${idx}`}>
              <div className="flex justify-between items-baseline mb-0.5 w-full break-inside-avoid shrink-0">
                <h4 className="text-[13px] font-semibold text-gray-900">
                  {edu.degree || edu.studyType}{edu.area && ` in ${edu.area}`}
                </h4>
                <span className="text-[11px] text-gray-500 font-medium tracking-wide shrink-0">
                  {formatDates(edu.startDate, edu.endDate, edu.isCurrent)}
                </span>
              </div>
              <div className={`flex justify-between items-baseline w-full break-inside-avoid shrink-0 ${!edu.description ? 'mb-3' : 'mb-1.5'}`}>
                <span className="text-[12px] text-gray-600 font-medium">{edu.school || edu.institution}</span>
                {edu.location && <span className="text-[11px] text-gray-500 shrink-0">{edu.location}</span>}
              </div>
              {edu.description && (
                <div className="text-[11.5px] text-gray-700 leading-relaxed whitespace-pre-wrap w-full mb-3 break-inside-avoid shrink-0">
                  {edu.description}
                </div>
              )}
            </React.Fragment>
          ))}

          {/* 4. PROJECTS SECTION */}
          {validProjects.length > 0 && renderSectionHeader("Projects")}
          {validProjects.map((proj, idx) => (
            <React.Fragment key={`proj-${idx}`}>
              <div className={`flex justify-between items-baseline w-full break-inside-avoid shrink-0 ${!proj.description ? 'mb-3' : 'mb-1'}`}>
                <h4 className="text-[13px] font-semibold text-gray-900">{proj.title || proj.name}</h4>
                {proj.date && <span className="text-[11px] text-gray-500 font-medium tracking-wide shrink-0">{proj.date}</span>}
              </div>
              {proj.description && (
                <div className="text-[11.5px] text-gray-700 leading-relaxed whitespace-pre-wrap w-full mb-3 break-inside-avoid shrink-0">
                  {proj.description}
                </div>
              )}
            </React.Fragment>
          ))}

          {/* 5. CERTIFICATIONS SECTION */}
          {validCertificates && validCertificates.length > 0 && renderSectionHeader("Certifications")}
          {validCertificates && validCertificates.map((cert, idx) => (
            <React.Fragment key={`cert-${idx}`}>
              <div className={`list-none pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[0.45em] before:w-[3px] before:h-[3px] before:bg-gray-400 before:rounded-full text-[11.5px] text-gray-700 leading-relaxed w-full break-inside-avoid shrink-0 ${!cert.description ? (idx === validCertificates.length - 1 ? 'mb-4' : 'mb-2.5') : 'mb-1'}`}>
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="font-semibold text-gray-900">{cert.title || cert.name}</span>
                    {cert.issuer && <span className="text-gray-600"> – {cert.issuer}</span>}
                  </div>
                  {cert.date && <span className="shrink-0 ml-2 text-[11px] text-gray-500 tracking-wide font-medium">{cert.date}</span>}
                </div>
              </div>
              {cert.description && (
                <div className={`whitespace-pre-wrap text-[11.5px] text-gray-600 leading-relaxed pl-3 w-full break-inside-avoid shrink-0 ${idx === validCertificates.length - 1 ? 'mb-4' : 'mb-2.5'}`}>
                  {cert.description}
                </div>
              )}
            </React.Fragment>
          ))}

          {/* 6. LANGUAGES SECTION */}
          {validLanguages && validLanguages.length > 0 && renderSectionHeader("Languages")}
          {validLanguages && validLanguages.length > 0 && (
            <div className="w-full mb-4 text-[11.5px] text-gray-700 leading-relaxed font-medium break-inside-avoid shrink-0">
              {validLanguages.map(l => `${l.name || l.language}${l.proficiency || l.level ? ` (${l.proficiency || l.level})` : ''}`).join('  •  ')}
            </div>
          )}

          {/* 7. HOBBIES SECTION */}
          {validHobbies && validHobbies.length > 0 && renderSectionHeader("Hobbies")}
          {validHobbies && validHobbies.length > 0 && (
            <div className="w-full mb-4 text-[11.5px] text-gray-700 leading-relaxed font-medium break-inside-avoid shrink-0">
              {validHobbies.map(h => typeof h === 'string' ? h : h.name).join('  •  ')}
            </div>
          )}

          {/* 8. REFERENCES SECTION */}
          {validReferences && validReferences.length > 0 && renderSectionHeader("References")}
          {validReferences && validReferences.length > 0 && (
            <div className="w-full grid grid-cols-2 gap-4 mb-4 break-inside-avoid shrink-0">
              {validReferences.map((ref, idx) => (
                <div key={`ref-${idx}`} className="text-[11.5px] text-gray-700 leading-relaxed">
                  <div className="font-semibold text-gray-900">{ref.name}</div>
                  {(ref.role || ref.company) && (
                    <div className="text-gray-600">{ref.role}{ref.role && ref.company ? `, ${ref.company}` : ref.company}</div>
                  )}
                  {ref.contact && <div className="text-gray-500 mt-0.5">{ref.contact}</div>}
                </div>
              ))}
            </div>
          )}

        </main>
      </div>

    </div>
  );
}