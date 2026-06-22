import React from 'react';

export default function HeliosZenith({
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
  validReferences
}) {
  const mainElements = [];

  // 1. DEMOGRAPHICS
  if (info.dob || info.nationality || info.gender || info.drivingLicense) {
    mainElements.push(
      <div key="demographics" className="flex flex-wrap gap-x-10 gap-y-4 pb-6 mb-8 border-b border-stone-200/80 shrink-0">
        {info.dob && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Date of Birth</span>
            <span className="text-[13px] font-bold text-stone-800">{info.dob}</span>
          </div>
        )}
        {info.nationality && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Nationality</span>
            <span className="text-[13px] font-bold text-stone-800">{info.nationality}</span>
          </div>
        )}
        {info.gender && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Gender</span>
            <span className="text-[13px] font-bold text-stone-800">{info.gender}</span>
          </div>
        )}
        {info.drivingLicense && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Driver's License</span>
            <span className="text-[13px] font-bold text-stone-800">{info.drivingLicense}</span>
          </div>
        )}
      </div>
    );
  }

  // 2. EXECUTIVE SUMMARY
  if (validSummary) {
    mainElements.push(
      <div key="summary" id="summary-section" className="relative font-serif text-[15px] leading-relaxed text-stone-700 italic bg-white p-6 mb-8 border-l-[3px] border-amber-500 rounded-r-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] whitespace-pre-wrap shrink-0">
        <span className="absolute text-5xl text-amber-200 font-serif -top-3 left-2 select-none pointer-events-none">“</span>
        <div className="relative z-10 pl-3">{validSummary}</div>
      </div>
    );
  }

  // 3. EXPERIENCE
  if (validExperience.length > 0) {
    mainElements.push(
      <h2 key="experience-heading" className="font-serif text-lg font-bold text-stone-900 uppercase tracking-wider flex items-center gap-3 mb-5 mt-2 shrink-0">
        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
        Professional Experience
      </h2>
    );
    validExperience.forEach((exp, index) => {
      mainElements.push(
        <div key={`exp-${index}`} className="flex flex-col gap-1 relative pl-6 border-l border-stone-200 ml-1.5 mb-6 shrink-0">
          <div className="absolute w-2 h-2 rounded-full bg-amber-500 -left-[4.5px] top-[7px] ring-4 ring-stone-50" />
          <div className="flex justify-between items-baseline gap-4">
            <h3 className="text-[15px] font-bold text-stone-900 tracking-tight">{exp.role}</h3>
            <span className="text-[10px] font-extrabold text-stone-600 bg-stone-200/60 border border-stone-300/30 px-2.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">
              {formatDates(exp.startDate, exp.endDate, exp.isCurrent)}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <p className="text-[13px] font-semibold text-amber-600 tracking-wide">{exp.company}</p>
            {exp.location && <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">{exp.location}</p>}
          </div>
          {exp.description && (
            <p className="text-[13.5px] text-stone-600 leading-relaxed mt-1.5 whitespace-pre-wrap">{exp.description}</p>
          )}
          {exp.achievements && exp.achievements.length > 0 && (
            <ul className="mt-2 list-none text-[13.5px] text-stone-600 space-y-1.5 leading-relaxed">
              {exp.achievements.map((ach, i) => (
                <li key={`ach-${i}`} className="flex items-start gap-2.5">
                  <span className="text-amber-500 font-bold mt-0.5 select-none">→</span>
                  <span>{ach}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    });
  }

  // 4. EDUCATION
  if (validEducation.length > 0) {
    mainElements.push(
      <h2 key="education-heading" className="font-serif text-lg font-bold text-stone-900 uppercase tracking-wider flex items-center gap-3 mb-5 mt-2 shrink-0">
        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
        Education History
      </h2>
    );
    validEducation.forEach((edu, index) => {
      mainElements.push(
        <div key={`edu-${index}`} className="flex flex-col gap-1 relative pl-6 border-l border-stone-200 ml-1.5 mb-6 shrink-0">
          <div className="absolute w-2 h-2 rounded-full bg-amber-500 -left-[4.5px] top-[7px] ring-4 ring-stone-50" />
          <div className="flex justify-between items-baseline gap-4">
            <h3 className="text-[15px] font-bold text-stone-900 tracking-tight">{edu.degree}</h3>
            <span className="text-[10px] font-extrabold text-stone-600 bg-stone-200/60 border border-stone-300/30 px-2.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">
              {formatDates(edu.startDate, edu.endDate, edu.isCurrent)}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <p className="text-[13px] text-stone-700 font-semibold">{edu.school}</p>
            {edu.location && <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">{edu.location}</p>}
          </div>
          {edu.description && (
            <p className="text-[13.5px] text-stone-600 leading-relaxed mt-1 whitespace-pre-wrap">{edu.description}</p>
          )}
        </div>
      );
    });
  }

  // 5. SKILLS
  if (validSkills.length > 0) {
    mainElements.push(
      <h2 key="skills-heading" className="font-serif text-lg font-bold text-stone-900 uppercase tracking-wider flex items-center gap-3 mb-5 mt-2 shrink-0">
        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
        Core Expertise
      </h2>
    );
    mainElements.push(
      <div key="skills-grid" className="grid grid-cols-2 gap-x-8 gap-y-3 pl-4.5 mb-8 shrink-0">
        {validSkills.map((skill, index) => {
          const name = typeof skill === 'string' ? skill : (skill.name || skill.skill);
          const level = typeof skill === 'string' ? 3 : (skill.level || 3);
          
          let barWidth = 100;
          if (typeof level === 'number' || !isNaN(Number(level))) {
            barWidth = (Number(level) / 5) * 100;
          } else {
            barWidth = level === 'Beginner' ? 30 : level === 'Intermediate' ? 60 : level === 'Advanced' ? 85 : 100;
          }

          return (
            <div key={`skill-${index}`} className="flex flex-col gap-1 w-full">
              <div className="flex justify-between text-[13px] font-bold text-stone-800">
                <span>{name}</span>
              </div>
              <div className="w-full bg-stone-200/70 h-1 rounded-full overflow-hidden relative">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // 6. PROJECTS
  if (data.projects && data.projects.length > 0) {
    mainElements.push(
      <h2 key="projects-heading" className="font-serif text-lg font-bold text-stone-900 uppercase tracking-wider flex items-center gap-3 mb-5 mt-2 shrink-0">
        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
        Featured Projects
      </h2>
    );
    data.projects.forEach((proj, index) => {
      mainElements.push(
        <div key={`proj-${index}`} className="flex flex-col gap-1 relative pl-6 border-l border-stone-200 ml-1.5 mb-6 shrink-0">
          <div className="absolute w-2 h-2 rounded-full bg-amber-500 -left-[4.5px] top-[7px] ring-4 ring-stone-50" />
          <div className="flex justify-between items-baseline gap-4">
            <h3 className="text-[15px] font-bold text-stone-900 tracking-tight">{proj.title}</h3>
            {proj.date && <span className="text-[10px] font-extrabold text-stone-600 bg-stone-200/60 border border-stone-300/30 px-2.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">{proj.date}</span>}
          </div>
          {proj.description && (
            <p className="text-[13.5px] text-stone-600 leading-relaxed mt-1 whitespace-pre-wrap">{proj.description}</p>
          )}
        </div>
      );
    });
  }

  // 7. CERTIFICATIONS
  if (validCertificates && validCertificates.length > 0) {
    mainElements.push(
      <h2 key="certs-heading" className="font-serif text-lg font-bold text-stone-900 uppercase tracking-wider flex items-center gap-3 mb-5 mt-2 shrink-0">
        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
        Certifications
      </h2>
    );
    validCertificates.forEach((cert, index) => {
      mainElements.push(
        <div key={`cert-${index}`} className="flex flex-col gap-0.5 relative pl-6 border-l border-stone-200 ml-1.5 mb-6 shrink-0">
          <div className="absolute w-2 h-2 rounded-full bg-amber-500 -left-[4.5px] top-[7px] ring-4 ring-stone-50" />
          <div className="flex justify-between items-baseline gap-4">
            <h3 className="text-[14px] font-bold text-stone-900 tracking-tight">{cert.title}</h3>
            {cert.date && <span className="text-[10px] font-extrabold text-stone-600 bg-stone-200/60 border border-stone-300/30 px-2.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">{cert.date}</span>}
          </div>
          <p className="text-[12.5px] text-amber-600 font-semibold">{cert.issuer}</p>
          {cert.description && (
            <p className="text-[13.5px] text-stone-600 leading-relaxed mt-1 whitespace-pre-wrap">{cert.description}</p>
          )}
        </div>
      );
    });
  }

  // 8. LANGUAGES & HOBBIES (Dual Column)
  if (validLanguages.length > 0 || (validHobbies && validHobbies.length > 0)) {
    mainElements.push(
      <div key="lang-hobbies-block" className="flex flex-col sm:flex-row gap-8 pb-2 mb-8 mt-2 shrink-0">
        {validLanguages.length > 0 && (
          <div className="flex-1 flex flex-col gap-3">
            <h2 className="font-serif text-base font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              Languages
            </h2>
            <div className="flex flex-col gap-2 pl-4">
              {validLanguages.map((lang, index) => (
                <div key={`lang-${index}`} className="flex justify-between items-center text-[13.5px] border-b border-stone-200/60 pb-1">
                  <span className="font-bold text-stone-800">{lang.name}</span>
                  <span className="text-amber-600 text-[10px] font-extrabold uppercase tracking-widest bg-amber-50 border border-amber-200/40 px-2 py-0.5 rounded">
                    {lang.proficiency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {validHobbies && validHobbies.length > 0 && (
          <div className="flex-1 flex flex-col gap-3">
            <h2 className="font-serif text-base font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              Interests
            </h2>
            <div className="flex flex-wrap gap-2 pl-4">
              {validHobbies.map((hobby, index) => (
                <div key={`hobby-${index}`} className="inline-flex items-center gap-2 text-[13px] font-bold text-stone-700 bg-white border border-stone-200 px-3 py-1.5 rounded-lg shadow-sm">
                  <span className="w-1 h-1 bg-amber-500 rounded-full" />
                  {hobby}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 9. REFERENCES
  if (validReferences && validReferences.length > 0) {
    mainElements.push(
      <h2 key="refs-heading" className="font-serif text-lg font-bold text-stone-900 uppercase tracking-wider flex items-center gap-3 mb-5 mt-2 shrink-0">
        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
        References
      </h2>
    );
    mainElements.push(
      <div key="refs-grid" className="grid grid-cols-2 gap-6 pl-1.5 relative mb-8 shrink-0">
        {validReferences.map((ref, index) => (
          <div key={`ref-${index}`} className="flex flex-col gap-0.5 relative pl-6 border-l border-stone-200">
            <div className="absolute w-2 h-2 rounded-full bg-amber-500 -left-[4.5px] top-[7px] ring-4 ring-stone-50" />
            <h3 className="text-[14px] font-bold text-stone-900 tracking-tight">{ref.name}</h3>
            {(ref.role || ref.company) && (
              <p className="text-[12.5px] font-semibold text-amber-600">
                {ref.role}{ref.role && ref.company ? `, ${ref.company}` : ref.company}
              </p>
            )}
            {ref.contact && <p className="text-[12.5px] text-stone-500 mt-1 font-mono tracking-tight">{ref.contact}</p>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div id="resume-raw-content" className="w-full h-full flex flex-col font-sans bg-stone-50 text-stone-800 relative">
      
      {/* TOP HEADER SIDEBAR */}
      <aside className="w-full shrink-0 bg-stone-50">
        <div className="w-full bg-stone-950 text-stone-300 px-12 py-10 flex flex-col md:flex-row gap-10 md:items-center border-b-[4px] border-amber-500 shadow-2xl relative z-10 selection:bg-amber-500/30">
          
          {info.photo && (
            <div className="shrink-0 flex justify-center">
              <div className="relative w-36 h-36 rounded-2xl border border-stone-800 p-1.5 bg-stone-900/50 shadow-[0_8px_30px_rgb(0,0,0,0.6)]">
                <div className="w-full h-full rounded-xl overflow-hidden bg-stone-800 flex items-center justify-center relative group">
                  <img src={info.photo} alt="Profile" className="w-full h-full object-cover filter grayscale contrast-125 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500" />
                  <div className="absolute inset-0 border border-white/10 rounded-xl pointer-events-none" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-4 border-stone-950" />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-5 flex-1">
            <div className="flex flex-col gap-1 border-b border-stone-800/80 pb-5">
              {info.fullName && (
                <h1 className="font-serif text-5xl font-normal tracking-tight text-white leading-none uppercase flex flex-wrap gap-x-3">
                  {info.fullName.split(' ').map((word, i) => (
                    <span 
                      key={i} 
                      className={i >= 1 ? "font-black text-transparent bg-clip-text bg-gradient-to-r from-stone-100 to-stone-400" : "font-light"}
                    >
                      {word}
                    </span>
                  ))}
                </h1>
              )}
              {info.jobTitle && (
                <p className="text-[12px] font-black tracking-[0.3em] text-amber-500 uppercase mt-2 ml-1">
                  {info.jobTitle}
                </p>
              )}
            </div>

            {hasContact && (
              <div className="flex flex-wrap gap-x-8 gap-y-3 text-stone-400 pl-1">
                {info.email && (
                  <div className="flex items-center gap-2 group">
                     <svg className="w-4 h-4 text-stone-600 group-hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <span className="text-[13px] font-medium text-stone-300 break-all transition-colors group-hover:text-amber-400">{info.email}</span>
                  </div>
                )}
                {info.phone && (
                  <div className="flex items-center gap-2 group">
                    <svg className="w-4 h-4 text-stone-600 group-hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                    <span className="text-[13px] font-medium text-stone-300 transition-colors group-hover:text-amber-400">{info.phone}</span>
                  </div>
                )}
                {info.location && (
                  <div className="flex items-center gap-2 group">
                    <svg className="w-4 h-4 text-stone-600 group-hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-8-4.5-8-11.8A8 8 0 0112 1.2a8 8 0 018 8C20 16.5 12 21 12 21z"/><circle cx="12" cy="9.2" r="3"/></svg>
                    <span className="text-[13px] font-medium text-stone-300 transition-colors group-hover:text-amber-400">{info.location}</span>
                  </div>
                )}
                {info.linkedin && (
                  <div className="flex items-center gap-2 group">
                    <svg className="w-4 h-4 text-stone-600 group-hover:text-amber-500 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                    <span className="text-[13px] font-medium text-stone-300 break-all transition-colors group-hover:text-amber-400">
                      {info.linkedin.replace(/(^\w+:|^)\/\//, '')}
                    </span>
                  </div>
                )}
                {info.website && (
                  <div className="flex items-center gap-2 group">
                    <svg className="w-4 h-4 text-stone-600 group-hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" /><path strokeLinecap="round" strokeLinejoin="round" d="M11.5 3a17 17 0 000 18M12.5 3a17 17 0 000 18" /></svg>
                    <span className="text-[13px] font-medium text-stone-300 break-all transition-colors group-hover:text-amber-400">
                      {info.website.replace(/(^\w+:|^)\/\//, '')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Container - Fully Flattened Queue */}
      <main className="flex-1 p-10 flex flex-col bg-stone-50 selection:bg-amber-100">
        {mainElements}
      </main>
    </div>
  );
}