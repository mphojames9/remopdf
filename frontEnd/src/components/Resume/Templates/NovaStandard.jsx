import React from 'react';

export default function ArchitectResume({
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
      <span key="phone" className="flex items-center gap-1.5 justify-end">
        <svg className="w-3.5 h-3.5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
        </svg>
        {info.phone}
      </span>
    );
  }
  if (info.email) {
    contactItems.push(
      <span key="email" className="flex items-center gap-1.5 justify-end">
        <svg className="w-3.5 h-3.5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
        {info.email}
      </span>
    );
  }
  if (info.location) {
    contactItems.push(
      <span key="location" className="flex items-center gap-1.5 justify-end">
        <svg className="w-3.5 h-3.5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        {info.location}
      </span>
    );
  }
  if (info.linkedin) {
    contactItems.push(
      <span key="linkedin" className="flex items-center gap-1.5 justify-end">
        <svg className="w-3.5 h-3.5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
        {info.linkedin.replace(/(^\w+:|^)\/\//, '')}
      </span>
    );
  }
  if (info.github || info.website || info.secondarySocial) {
    const url = info.github || info.website || info.secondarySocial;
    contactItems.push(
      <span key="web" className="flex items-center gap-1.5 justify-end">
        <svg className="w-3.5 h-3.5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
        </svg>
        {url.replace(/(^\w+:|^)\/\//, '')}
      </span>
    );
  }

  // Section Heading Builder (Modern Line Design)
  const renderSectionHeader = (title) => (
    <div className="w-full mt-6 mb-4 flex items-center gap-4 shrink-0">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-900 whitespace-nowrap">
        {title}
      </h3>
      <div className="flex-1 h-[1px] bg-zinc-200/80"></div>
    </div>
  );

  const mainElements = [];

  // 1. SKILLS SECTION (Modern Badges)
  if (validSkills && validSkills.length > 0) {
    const isFlatStringList = validSkills.every(s => typeof s === 'string');
    mainElements.push(
      <div key="section-skills" className="w-full mb-3 shrink-0">
        {renderSectionHeader("Expertise")}
        {isFlatStringList ? (
          <div className="flex flex-wrap gap-1.5">
            {validSkills.map((skill, idx) => (
              <span key={idx} className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-md text-[11px] font-medium text-zinc-700 tracking-tight shadow-sm">
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {validSkills.map((skill, idx) => {
              const name = skill.name || skill.category || '';
              const keywordsArray = skill.keywords ? skill.keywords : (skill.details ? skill.details.split(',') : []);
              return (
                <div key={`skill-${idx}`} className="flex flex-col gap-1.5">
                  {name && <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-900">{name}</span>}
                  <div className="flex flex-wrap gap-1.5">
                    {keywordsArray.map((kw, i) => (
                       <span key={i} className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-md text-[11px] font-medium text-zinc-700 tracking-tight shadow-sm">
                         {kw.trim()}
                       </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 2. EXPERIENCE SECTION
  if (validExperience && validExperience.length > 0) {
    mainElements.push(
      <div key="section-experience" className="w-full mb-3 shrink-0">
        {renderSectionHeader("Experience")}
        {validExperience.map((exp, idx) => (
          <div key={`exp-${idx}`} className="w-full mb-5 break-inside-avoid relative">
            <div className="flex justify-between items-baseline mb-1">
              <div className="flex items-center gap-2">
                <h4 className="text-[13px] font-bold text-zinc-900 tracking-tight">{exp.role}</h4>
                <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                <span className="text-[12.5px] font-semibold text-zinc-500">{exp.company}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500 shrink-0">
                {exp.location && <span>{exp.location}</span>}
                {exp.location && <span className="opacity-40">•</span>}
                <span className="font-medium tracking-wide uppercase">{formatDates(exp.startDate, exp.endDate, exp.isCurrent)}</span>
              </div>
            </div>
            
            {exp.achievements && exp.achievements.length > 0 ? (
              <ul className="list-none ml-1 text-[11.5px] text-zinc-600 space-y-1.5 leading-[1.6]">
                {exp.achievements.map((ach, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-zinc-400 mt-[0.3em] shrink-0 text-[10px]">○</span>
                    <span>{ach}</span>
                  </li>
                ))}
              </ul>
            ) : exp.description ? (
              <div className="text-[11.5px] text-zinc-600 leading-[1.6] whitespace-pre-wrap mt-2">
                {exp.description}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  // 3. EDUCATION SECTION
  if (validEducation && validEducation.length > 0) {
    mainElements.push(
      <div key="section-education" className="w-full mb-3 shrink-0">
        {renderSectionHeader("Education")}
        {validEducation.map((edu, idx) => (
          <div key={`edu-${idx}`} className="w-full mb-4 break-inside-avoid">
            <div className="flex justify-between items-baseline mb-0.5">
              <div className="flex items-center gap-2">
                <h4 className="text-[13px] font-bold text-zinc-900 tracking-tight">
                  {edu.degree || edu.studyType}{edu.area && <span className="font-normal text-zinc-500"> in {edu.area}</span>}
                </h4>
              </div>
              <span className="text-[11px] text-zinc-500 font-medium tracking-wide uppercase shrink-0">
                {formatDates(edu.startDate, edu.endDate, edu.isCurrent)}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[12.5px] font-semibold text-zinc-600">{edu.school || edu.institution}</span>
              {edu.location && <span className="text-[11px] text-zinc-400 font-medium shrink-0">{edu.location}</span>}
            </div>
            {edu.description && (
              <div className="text-[11.5px] text-zinc-500 mt-1.5 leading-[1.6] whitespace-pre-wrap">
                {edu.description}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 4. PROJECTS SECTION
  const validProjects = data?.projects || [];
  if (validProjects.length > 0) {
    mainElements.push(
      <div key="section-projects" className="w-full mb-3 shrink-0">
        {renderSectionHeader("Projects")}
        {validProjects.map((proj, idx) => (
          <div key={`proj-${idx}`} className="w-full mb-4 break-inside-avoid">
            <div className="flex justify-between items-baseline mb-1.5">
              <h4 className="text-[13px] font-bold text-zinc-900 tracking-tight">{proj.title || proj.name}</h4>
              {proj.date && <span className="text-[11px] text-zinc-500 font-medium tracking-wide uppercase shrink-0">{proj.date}</span>}
            </div>
            {proj.description && (
              <div className="text-[11.5px] text-zinc-600 leading-[1.6] whitespace-pre-wrap">
                {proj.description}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 5. CERTIFICATIONS SECTION
  if (validCertificates && validCertificates.length > 0) {
    mainElements.push(
      <div key="section-certifications" className="w-full mb-3 shrink-0">
        {renderSectionHeader("Certifications")}
        <div className="grid grid-cols-2 gap-4">
          {validCertificates.map((cert, idx) => (
            <div key={`cert-${idx}`} className="text-[11.5px] leading-[1.5]">
              <div className="font-bold text-zinc-900">{cert.title || cert.name}</div>
              {cert.issuer && <div className="text-zinc-600 mt-0.5">{cert.issuer}</div>}
              {cert.date && <div className="text-zinc-400 text-[10.5px] mt-0.5 uppercase tracking-wide">{cert.date}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 6. LANGUAGES SECTION
  if (validLanguages && validLanguages.length > 0) {
    mainElements.push(
      <div key="section-languages" className="w-full mb-3 shrink-0">
        {renderSectionHeader("Languages")}
        <div className="flex flex-wrap gap-4 text-[11.5px] leading-[1.5]">
          {validLanguages.map((l, idx) => (
            <div key={idx} className="flex flex-col">
              <span className="font-bold text-zinc-900">{l.name || l.language}</span>
              {(l.proficiency || l.level) && <span className="text-zinc-500 text-[10.5px] uppercase tracking-wide">{l.proficiency || l.level}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 7. HOBBIES SECTION
  if (validHobbies && validHobbies.length > 0) {
    const hobbiesStr = validHobbies.map(h => typeof h === 'string' ? h : h.name).join(' • ');
    mainElements.push(
      <div key="section-hobbies" className="w-full mb-3 shrink-0">
        {renderSectionHeader("Interests")}
        <div className="text-[11.5px] text-zinc-600 font-medium tracking-wide leading-[1.5]">
          {hobbiesStr}
        </div>
      </div>
    );
  }

  // 8. REFERENCES SECTION
  if (validReferences && validReferences.length > 0) {
    mainElements.push(
      <div key="section-references" className="w-full mb-3 shrink-0">
        {renderSectionHeader("References")}
        <div className="grid grid-cols-2 gap-5">
          {validReferences.map((ref, idx) => (
            <div key={`ref-${idx}`} className="text-[11.5px] leading-[1.5] break-inside-avoid">
              <div className="font-bold text-zinc-900">{ref.name}</div>
              {(ref.role || ref.company) && (
                <div className="text-zinc-600 font-medium mt-0.5">
                  {ref.role}{ref.role && ref.company ? ` at ${ref.company}` : ref.company}
                </div>
              )}
              {ref.contact && <div className="text-zinc-400 mt-1">{ref.contact}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="resume-raw-content" className="w-full min-h-full bg-white pt-14 pb-14 px-16 relative flex flex-col font-sans-modern selection:bg-zinc-100">
      
      {/* High-Fidelity Font Injection */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .font-sans-modern { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
      `}} />

      {/* 1. ASYMMETRICAL HEADER (Strictly isolated for the paginator) */}
      <header className="shrink-0 flex justify-between items-end w-full mb-6 pb-6 border-b-[1.5px] border-zinc-900">
        <div className="flex flex-col">
          <h1 className="text-[36px] font-extrabold tracking-tight text-zinc-900 leading-[1.1] mb-1">
            {firstName} <span className="text-zinc-400">{lastName}</span>
          </h1>
          {info.jobTitle && (
            <h2 className="text-[12.5px] font-bold tracking-[0.2em] uppercase text-zinc-500">
              {info.jobTitle}
            </h2>
          )}
        </div>
        
        {hasContact && (
          <div className="flex flex-col items-end gap-1.5 text-[10.5px] text-zinc-600 font-medium">
            {contactItems.map((item, idx) => (
              <div key={idx}>{item}</div>
            ))}
          </div>
        )}
      </header>

      {/* 2. SUMMARY (Strictly given id="summary-section" for the paginator) */}
      {validSummary && (
        <div id="summary-section" className="w-full mb-2 shrink-0">
          <p className="text-[12.5px] text-zinc-700 leading-[1.7] whitespace-pre-wrap font-medium">
            {validSummary}
          </p>
        </div>
      )}

      {/* 3. PAGINATOR DOM QUEUES */}
      <div className="w-full flex flex-col flex-1 mt-2">
        <aside className="hidden"></aside>
        <main className="w-full flex flex-col">
          {mainElements}
        </main>
      </div>

    </div>
  );
}