import React from 'react';

export default function QuantumObsidian({
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
  return (
    <div id="resume-raw-content" className="w-full h-full flex flex-col font-sans bg-white text-slate-800 relative p-[6%] box-sizing-border">
      
      {/* ELITE CYBER HEADER PROFILE */}
      <header className="w-full flex justify-between items-start border-b-2 border-slate-950 pb-6 mb-6 gap-6 shrink-0">
        <div className="flex-1 space-y-2">
          {info.fullName && (
            <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">
              {info.fullName}
            </h1>
          )}
          {info.jobTitle && (
            <p className="text-xs font-mono font-bold tracking-[0.25em] text-orange-600 uppercase">
              // {info.jobTitle}
            </p>
          )}
          {validSummary && (
            <p className="text-[13px] leading-relaxed text-slate-600 pt-1 font-medium max-w-xl whitespace-pre-wrap">
              {validSummary}
            </p>
          )}
        </div>

        {/* Profile Avatar Frame */}
        {info.photo && (
          <div className="shrink-0">
            <div className="w-24 h-24 rounded-2xl border-2 border-slate-900 p-1 bg-white shadow-sm rotate-1 hover:rotate-0 transition-transform duration-300">
              <div className="w-full h-full rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center">
                <img src={info.photo} alt="Profile Focus" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* CORE CONTENT GRID ARCHITECTURE */}
      <div className="flex-1 grid grid-cols-12 gap-8 items-start w-full">
        
        {/* LEFT COLUMN: PRIMARY WORK HISTORY & PROJECTS (7/12 Blocks) */}
        <div className="col-span-7 flex flex-col gap-6">
          
          {/* Work Experience */}
          {validExperience.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-mono font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                <span>[01] EXPERIENCE</span>
                <div className="flex-1 h-px bg-slate-200/80"></div>
              </h2>
              
              <div className="space-y-4">
                {validExperience.map((exp, index) => (
                  <div key={`quantum-exp-${index}`} className="group relative pl-3 border-l border-slate-200 hover:border-slate-900 transition-colors">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="text-[14px] font-black text-slate-900 tracking-tight">{exp.role}</h3>
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 whitespace-nowrap">
                        {formatDates(exp.startDate, exp.endDate, exp.isCurrent)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-xs font-bold text-slate-600 mb-2">
                      <span>{exp.company}</span>
                      {exp.location && <span className="font-medium text-slate-400 text-[11px]">{exp.location}</span>}
                    </div>
                    {exp.description && (
                      <p className="text-[12.5px] text-slate-500 leading-relaxed whitespace-pre-wrap mb-1">{exp.description}</p>
                    )}
                    {exp.achievements && exp.achievements.length > 0 && (
                      <ul className="list-none text-[12.5px] text-slate-600 space-y-1.5 leading-relaxed mt-2">
                        {exp.achievements.map((ach, i) => (
                          <li key={i} className="relative pl-3.5">
                            <span className="absolute left-0 top-[6px] w-1.5 h-1.5 bg-orange-500 rounded-sm"></span>
                            {ach}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Targeted Matrix Projects */}
          {data.projects && data.projects.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-mono font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                <span>[02] ARTIFACT PROJECTS</span>
                <div className="flex-1 h-px bg-slate-200/80"></div>
              </h2>
              <div className="space-y-4">
                {data.projects.map((proj, index) => (
                  <div key={`quantum-proj-${index}`} className="pl-3 border-l border-slate-100">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-[13px] font-bold text-slate-800 tracking-tight">{proj.title}</h3>
                      {proj.date && <span className="text-[10px] font-mono text-slate-400">{proj.date}</span>}
                    </div>
                    {proj.description && (
                      <p className="text-[12px] text-slate-500 leading-relaxed mt-1 whitespace-pre-wrap">{proj.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: TECHNICAL TRACKS & META CREDENTIALS (5/12 Blocks) */}
        <div className="col-span-5 flex flex-col gap-6">
          
          {/* Metadata Contact Channels */}
          {hasContact && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2.5">
              <h4 className="text-[10px] font-mono font-black text-slate-400 tracking-[0.15em] uppercase mb-1">CONNECTIVITY CLEARANCE</h4>
              {info.email && (
                <div className="flex items-center gap-2.5 text-[12px] text-slate-700 font-medium">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  <span className="truncate">{info.email}</span>
                </div>
              )}
              {info.phone && (
                <div className="flex items-center gap-2.5 text-[12px] text-slate-700 font-medium">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <span>{info.phone}</span>
                </div>
              )}
              {info.location && (
                <div className="flex items-center gap-2.5 text-[12px] text-slate-700 font-medium">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span>{info.location}</span>
                </div>
              )}
              {info.linkedin && (
                <div className="flex items-center gap-2.5 text-[12px] text-slate-700 font-medium">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                  <span className="truncate">{info.linkedin.replace(/(^\w+:|^)\/\//, '')}</span>
                </div>
              )}
            </div>
          )}

          {/* Skill Tracks */}
          {validSkills.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-mono font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                <span>[03] SKILLS</span>
                <div className="flex-1 h-px bg-slate-200/80"></div>
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {validSkills.map((skill, index) => {
                  const name = typeof skill === 'string' ? skill : (skill.name || skill.skill);
                  return (
                    <span key={`quantum-sk-${index}`} className="text-[11px] font-mono font-bold bg-slate-900 text-white px-2.5 py-1 rounded-md tracking-tight">
                      {name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Academic Vectors */}
          {validEducation.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-mono font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                <span>[04] EDUCATION</span>
                <div className="flex-1 h-px bg-slate-200/80"></div>
              </h2>
              <div className="space-y-3">
                {validEducation.map((edu, index) => (
                  <div key={`quantum-edu-${index}`} className="space-y-0.5">
                    <h3 className="text-[12.5px] font-black text-slate-900 tracking-tight leading-tight">{edu.degree}</h3>
                    <p className="text-[12px] font-medium text-slate-600">{edu.school}</p>
                    <p className="text-[10px] font-mono font-bold text-slate-400">{formatDates(edu.startDate, edu.endDate, edu.isCurrent)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verifiable Credentials */}
          {validCertificates.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-mono font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                <span>[05] CERTIFICATIONS</span>
                <div className="flex-1 h-px bg-slate-200/80"></div>
              </h2>
              <div className="space-y-2.5">
                {validCertificates.map((cert, index) => (
                  <div key={`quantum-cert-${index}`} className="text-[12px]">
                    <h4 className="font-bold text-slate-800 leading-tight">{cert.title}</h4>
                    <p className="text-slate-500 text-[11px] font-medium">{cert.issuer} {cert.date && `• ${cert.date}`}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Polyglot Capabilities */}
          {validLanguages.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-mono font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                <span>[06] LANGUAGES</span>
                <div className="flex-1 h-px bg-slate-200/80"></div>
              </h2>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                {validLanguages.map((lang, index) => (
                  <div key={`quantum-lang-${index}`} className="font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    <span className="font-bold text-slate-900 block">{lang.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{lang.proficiency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}