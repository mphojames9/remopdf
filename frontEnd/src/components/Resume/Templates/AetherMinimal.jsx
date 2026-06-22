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
  validLanguages
}) {
  return (
    <div id="resume-raw-content" className="w-full h-full flex flex-col font-sans bg-white text-zinc-800 p-[6%] box-sizing-border relative">
      {/* MINIMALIST HEADER FRAME */}
      <header className="w-full border-b border-zinc-200 pb-8 mb-6 flex justify-between items-end shrink-0">
        <div className="space-y-1">
          {info.fullName && (
            <h1 className="text-3xl font-light tracking-tight text-zinc-900 uppercase">
              {info.fullName.split(' ').map((word, i) => i === 0 ? <span key={i} className="font-extrabold">{word} </span> : word + ' ')}
            </h1>
          )}
          {info.jobTitle && (
            <p className="text-xs font-mono tracking-[0.3em] text-zinc-400 uppercase">
              {info.jobTitle}
            </p>
          )}
        </div>
        
        {/* Compact Contact Metadata */}
        {hasContact && (
          <div className="text-right text-[11px] font-mono text-zinc-500 space-y-0.5 max-w-[40%] truncate">
            {info.email && <div>{info.email}</div>}
            {info.phone && <div>{info.phone}</div>}
            {info.location && <div>{info.location}</div>}
            {info.linkedin && <div className="truncate">{info.linkedin.replace(/(^\w+:|^)\/\//, '')}</div>}
          </div>
        )}
      </header>

      {/* ASYMMETRIC GRID SYSTEM */}
      <div className="flex-1 grid grid-cols-12 gap-8 items-start w-full">
        {/* LEFT COLUMN: THE SIDE PROFILE LAYOUT (4/12) */}
        <div className="col-span-4 flex flex-col gap-6 border-r border-zinc-100 pr-4 h-full">
          {/* Executive Summary */}
          {validSummary && (
            <div className="space-y-2">
              <h2 className="text-[10px] font-mono font-bold tracking-[0.2em] text-zinc-400 uppercase">/ PROFILE</h2>
              <p className="text-[12px] leading-relaxed text-zinc-600 font-medium whitespace-pre-wrap">
                {validSummary}
              </p>
            </div>
          )}

          {/* Skill Blocks */}
          {validSkills.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-[10px] font-mono font-bold tracking-[0.2em] text-zinc-400 uppercase">/ CAPABILITIES</h2>
              <div className="flex flex-col gap-1.5">
                {validSkills.map((skill, index) => {
                  const name = typeof skill === 'string' ? skill : (skill.name || skill.skill);
                  return (
                    <div key={`aether-sk-${index}`} className="text-[12px] text-zinc-700 font-medium flex items-center gap-2">
                      <span className="w-1 h-1 bg-zinc-900 rounded-full"></span>
                      {name}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Academic Paths */}
          {validEducation.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-[10px] font-mono font-bold tracking-[0.2em] text-zinc-400 uppercase">/ EDUCATION</h2>
              <div className="space-y-3">
                {validEducation.map((edu, index) => (
                  <div key={`aether-edu-${index}`} className="text-[11px]">
                    <h3 className="font-bold text-zinc-900 leading-tight">{edu.degree}</h3>
                    <p className="text-zinc-600 font-medium">{edu.school}</p>
                    <p className="text-zinc-400 font-mono text-[10px] mt-0.5">{formatDates(edu.startDate, edu.endDate, edu.isCurrent)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified Certification Tracks */}
          {validCertificates.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-[10px] font-mono font-bold tracking-[0.2em] text-zinc-400 uppercase">/ CERTIFICATIONS</h2>
              <div className="space-y-2">
                {validCertificates.map((cert, index) => (
                  <div key={`aether-cert-${index}`} className="text-[11px]">
                    <h4 className="font-bold text-zinc-800 leading-tight">{cert.title}</h4>
                    <p className="text-zinc-500 font-medium text-[10px]">{cert.issuer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CORE WORK CHRONOLOGY (8/12) */}
        <div className="col-span-8 flex flex-col gap-6">
          {validExperience.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-[10px] font-mono font-bold tracking-[0.2em] text-zinc-400 uppercase">// PROFESSIONAL TIMELINE</h2>
              <div className="space-y-5">
                {validExperience.map((exp, index) => (
                  <div key={`aether-exp-${index}`} className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-[14px] font-extrabold text-zinc-900 tracking-tight">{exp.role}</h3>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {formatDates(exp.startDate, exp.endDate, exp.isCurrent)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-[12px] font-bold text-zinc-500">
                      <span>{exp.company}</span>
                      {exp.location && <span className="font-normal text-zinc-400 text-[11px]">{exp.location}</span>}
                    </div>
                    {exp.description && (
                      <p className="text-[12px] text-zinc-600 leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                    )}
                    {exp.achievements && exp.achievements.length > 0 && (
                      <ul className="list-none text-[12px] text-zinc-600 space-y-1 mt-2">
                        {exp.achievements.map((ach, i) => (
                          <li key={i} className="relative pl-4">
                            <span className="absolute left-0 top-[7px] w-1 h-1 bg-zinc-400 rounded-full"></span>
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

          {/* Engineering Projects Array */}
          {data.projects && data.projects.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-[10px] font-mono font-bold tracking-[0.2em] text-zinc-400 uppercase">// NOTABLE ARTIFACTS</h2>
              <div className="space-y-3">
                {data.projects.map((proj, index) => (
                  <div key={`aether-proj-${index}`} className="space-y-0.5">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-[12.5px] font-bold text-zinc-800">{proj.title}</h3>
                      {proj.date && <span className="text-[10px] font-mono text-zinc-400">{proj.date}</span>}
                    </div>
                    {proj.description && (
                      <p className="text-[11.5px] text-zinc-500 leading-relaxed whitespace-pre-wrap">{proj.description}</p>
                    )}
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