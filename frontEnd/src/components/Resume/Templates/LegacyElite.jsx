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
      <span key="phone" className="flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
        </svg>
        {info.phone}
      </span>
    );
  }
  if (info.email) {
    contactItems.push(
      <span key="email" className="flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
        {info.email}
      </span>
    );
  }
  if (info.location) {
    contactItems.push(
      <span key="location" className="flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        {info.location}
      </span>
    );
  }
  if (info.linkedin) {
    contactItems.push(
      <span key="linkedin" className="flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
        {info.linkedin.replace(/(^\w+:|^)\/\//, '')}
      </span>
    );
  }
  if (info.github || info.website || info.secondarySocial) {
    const url = info.github || info.website || info.secondarySocial;
    contactItems.push(
      <span key="web" className="flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
        </svg>
        {url.replace(/(^\w+:|^)\/\//, '')}
      </span>
    );
  }

  const contactRow = contactItems.reduce((acc, curr, idx) => {
    if (idx === 0) return [curr];
    return [...acc, <span key={`sep-${idx}`} className="mx-2.5 text-black">|</span>, curr];
  }, []);

  // Section Heading Builder
  const renderSectionHeader = (title) => (
    <div className="w-full mt-4 mb-2.5 border-b-[1.5px] border-black pb-0.5 shrink-0">
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-black leading-none">
        {title}
      </h3>
    </div>
  );

  const mainElements = [];

  // 1. SKILLS SECTION
  if (validSkills && validSkills.length > 0) {
    const isFlatStringList = validSkills.every(s => typeof s === 'string');
    mainElements.push(
      <div key="section-skills" className="w-full mb-3 shrink-0">
        {renderSectionHeader("Skills")}
        {isFlatStringList ? (
          <div className="text-[12px] text-black leading-[1.5]">
            {validSkills.join(', ')}
          </div>
        ) : (
          <div className="space-y-1">
            {validSkills.map((skill, idx) => {
              const name = skill.name || skill.category || '';
              const keywords = skill.keywords ? skill.keywords.join(', ') : skill.details || skill.level || '';
              return (
                <div key={`skill-${idx}`} className="text-[12px] text-black leading-[1.5]">
                  {name && <span className="font-bold">{name}: </span>}
                  {keywords && <span>{keywords}</span>}
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
          <div key={`exp-${idx}`} className="w-full mb-3 break-inside-avoid">
            <div className="flex justify-between items-baseline mb-0.5">
              <h4 className="text-[12.5px] font-bold text-black">{exp.role}</h4>
              <span className="text-[11.5px] text-black font-normal shrink-0">
                {formatDates(exp.startDate, exp.endDate, exp.isCurrent)}
              </span>
            </div>
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-[12.5px] text-black font-normal">{exp.company}</span>
              {exp.location && <span className="text-[11.5px] text-black font-normal shrink-0">{exp.location}</span>}
            </div>
            
            {exp.achievements && exp.achievements.length > 0 ? (
              <ul className="list-disc list-outside ml-5 text-[11.5px] text-black space-y-1 leading-[1.55]">
                {exp.achievements.map((ach, i) => (
                  <li key={i} className="pl-0.5">{ach}</li>
                ))}
              </ul>
            ) : exp.description ? (
              <div className="text-[11.5px] text-black leading-[1.6] whitespace-pre-wrap ml-1">
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
          <div key={`edu-${idx}`} className="w-full mb-3 break-inside-avoid">
            <div className="flex justify-between items-baseline mb-0.5">
              <h4 className="text-[12.5px] font-bold text-black">
                {edu.degree || edu.studyType}{edu.area && ` in ${edu.area}`}
              </h4>
              <span className="text-[11.5px] text-black font-normal shrink-0">
                {formatDates(edu.startDate, edu.endDate, edu.isCurrent)}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[12.5px] text-black">{edu.school || edu.institution}</span>
              {edu.location && <span className="text-[11.5px] text-black font-normal shrink-0">{edu.location}</span>}
            </div>
            {edu.description && (
              <div className="text-[11.5px] text-black mt-1 leading-[1.5] whitespace-pre-wrap">
                {edu.description}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 4. PROJECTS SECTION (Fixed parsing and description render)
  const validProjects = data?.projects || [];
  if (validProjects.length > 0) {
    mainElements.push(
      <div key="section-projects" className="w-full mb-3 shrink-0">
        {renderSectionHeader("Projects")}
        {validProjects.map((proj, idx) => (
          <div key={`proj-${idx}`} className="w-full mb-3 break-inside-avoid">
            <div className="flex justify-between items-baseline mb-1">
              <h4 className="text-[12.5px] font-bold text-black">{proj.title || proj.name}</h4>
              {proj.date && <span className="text-[11.5px] text-black shrink-0">{proj.date}</span>}
            </div>
            {proj.description && (
              <div className="text-[11.5px] text-black leading-[1.6] whitespace-pre-wrap ml-1">
                {proj.description}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 5. CERTIFICATIONS SECTION (Fixed descriptions)
  if (validCertificates && validCertificates.length > 0) {
    mainElements.push(
      <div key="section-certifications" className="w-full mb-3 shrink-0">
        {renderSectionHeader("Certifications")}
        <ul className="list-disc list-outside ml-5 text-[11.5px] text-black space-y-2 leading-[1.55]">
          {validCertificates.map((cert, idx) => (
            <li key={`cert-${idx}`} className="pl-0.5">
              <div>
                <span className="font-bold">{cert.title || cert.name}</span>
                {cert.issuer && <span> – {cert.issuer}</span>}
                {cert.date && <span> ({cert.date})</span>}
              </div>
              {cert.description && (
                <div className="mt-0.5 whitespace-pre-wrap text-black leading-[1.6]">
                  {cert.description}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // 6. LANGUAGES SECTION
  if (validLanguages && validLanguages.length > 0) {
    const langStr = validLanguages.map(l => {
      const name = l.name || l.language;
      const prof = l.proficiency || l.level;
      return `${name}${prof ? ` (${prof})` : ''}`;
    }).join(', ');

    mainElements.push(
      <div key="section-languages" className="w-full mb-3 shrink-0">
        {renderSectionHeader("Languages")}
        <div className="text-[11.5px] text-black leading-[1.5]">
          {langStr}
        </div>
      </div>
    );
  }

  // 7. HOBBIES SECTION
  if (validHobbies && validHobbies.length > 0) {
    const hobbiesStr = validHobbies.map(h => typeof h === 'string' ? h : h.name).join(', ');
    mainElements.push(
      <div key="section-hobbies" className="w-full mb-3 shrink-0">
        {renderSectionHeader("Hobbies")}
        <div className="text-[11.5px] text-black leading-[1.5]">
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
        <div className="grid grid-cols-2 gap-4">
          {validReferences.map((ref, idx) => (
            <div key={`ref-${idx}`} className="text-[11.5px] text-black leading-[1.5] break-inside-avoid">
              <div className="font-bold">{ref.name}</div>
              {(ref.role || ref.company) && (
                <div className="italic text-gray-800">{ref.role}{ref.role && ref.company ? `, ${ref.company}` : ref.company}</div>
              )}
              {ref.contact && <div className="text-gray-600">{ref.contact}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="resume-raw-content" className="w-full min-h-full bg-white pt-12 pb-14 px-14 relative flex flex-col font-serif-classic">
      
      {/* Font Injection */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=PT+Serif:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        .font-serif-classic { font-family: 'PT Serif', 'Times New Roman', serif; }
      `}} />

      {/* 1. HEADER (Strictly isolated for the paginator) */}
      <header className="shrink-0 flex flex-col items-center justify-center w-full mb-4">
        <h1 className="text-[34px] font-bold uppercase tracking-wider text-black leading-tight">
          {firstName} {lastName}
        </h1>
        {info.jobTitle && (
          <h2 className="text-[14px] font-normal tracking-widest uppercase text-gray-700 mt-0.5 mb-2">
            {info.jobTitle}
          </h2>
        )}
        {hasContact && (
          <div className="flex flex-wrap items-center justify-center text-[11px] text-gray-800 mt-0.5">
            {contactRow}
          </div>
        )}
      </header>

      {/* 2. SUMMARY (Strictly given id="summary-section" for the paginator) */}
      {validSummary && (
        <div id="summary-section" className="w-full mb-2 shrink-0">
          {renderSectionHeader("Summary")}
          <p className="text-[12px] text-black leading-[1.6] text-justify whitespace-pre-wrap">
            {validSummary}
          </p>
        </div>
      )}

      {/* 3. PAGINATOR DOM QUEUES */}
      <div className="w-full flex flex-col flex-1">
        <aside className="hidden"></aside>
        <main className="w-full flex flex-col">
          {mainElements}
        </main>
      </div>

    </div>
  );
}