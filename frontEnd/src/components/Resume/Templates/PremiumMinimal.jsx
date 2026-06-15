import React from 'react';

export default function PremiumMinimal({
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
    <div id="resume-raw-content" className="w-full h-full flex font-sans bg-white text-slate-800 relative">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-[32%] bg-slate-50 border-r border-slate-200 text-slate-700 p-8 flex flex-col shrink-0 gap-6">
        
        {/* Profile Image Node */}
        {info.photo && (
          <div className="shrink-0 flex justify-center mb-2">
            <div className="w-32 h-32 rounded-full border border-slate-300 p-1 bg-white shadow-sm">
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                <img src={info.photo} alt="Profile" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        )}

        {/* Contact Info Node */}
        {hasContact && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-bold tracking-widest text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">Contact</h2>
            {info.email && (
              <div className="flex items-center gap-3 text-[13px]">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <span className="break-all">{info.email}</span>
              </div>
            )}
            {info.phone && (
              <div className="flex items-center gap-3 text-[13px]">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                <span>{info.phone}</span>
              </div>
            )}
            {info.location && (
              <div className="flex items-center gap-3 text-[13px]">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>{info.location}</span>
              </div>
            )}
            {info.linkedin && (
              <div className="flex items-center gap-3 text-[13px]">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                <span className="break-all">{info.linkedin.replace(/(^\w+:|^)\/\//, '')}</span>
              </div>
            )}
          </div>
        )}

        {/* Personal Details Node */}
        {(info.dob || info.nationality || info.gender || info.drivingLicense) && (
          <div className="flex flex-col gap-2 mt-2">
            <h2 className="text-sm font-bold tracking-widest text-slate-900 uppercase border-b border-slate-300 pb-1 mb-1">Details</h2>
            {info.dob && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</span>
                <span className="text-[13px] text-slate-700">{info.dob}</span>
              </div>
            )}
            {info.nationality && (
              <div className="flex flex-col gap-0.5 mt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nationality</span>
                <span className="text-[13px] text-slate-700">{info.nationality}</span>
              </div>
            )}
            {info.gender && (
              <div className="flex flex-col gap-0.5 mt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</span>
                <span className="text-[13px] text-slate-700">{info.gender}</span>
              </div>
            )}
            {info.drivingLicense && (
              <div className="flex flex-col gap-0.5 mt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">License</span>
                <span className="text-[13px] text-slate-700">{info.drivingLicense}</span>
              </div>
            )}
          </div>
        )}

{/* Skills Heading Node */}
        {validSkills.length > 0 && (
          <h2 className="text-sm font-bold tracking-widest text-slate-900 uppercase border-b border-slate-300 pb-1 mt-2">Expertise</h2>
        )}
        {validSkills.map((skill, index) => {
          // Extract the name robustly (handles plain strings or objects)
          const name = typeof skill === 'string' ? skill : (skill.name || skill.skill);
          
          // Extract the level, defaulting to 3 (60%) if missing
          const level = typeof skill === 'string' ? 3 : (skill.level || 3);
          
          // Calculate width to accommodate both 1-5 numerical scale and legacy text strings
          let barWidth = 100;
          if (typeof level === 'number' || !isNaN(Number(level))) {
            barWidth = (Number(level) / 5) * 100;
          } else {
            barWidth = level === 'Beginner' ? 30 : level === 'Intermediate' ? 60 : level === 'Advanced' ? 85 : 100;
          }

          return (
            <div key={`skill-${index}`} className="flex flex-col gap-1 -mt-2">
              <div className="flex justify-between text-[13px] font-medium text-slate-700">
                <span>{name}</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-slate-600 h-full rounded-full" 
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
        
        {validSkills.map((skill, index) => (
          <div key={`skill-${index}`} className="flex flex-col gap-1 -mt-2">
            <div className="flex justify-between text-[13px] font-medium text-slate-700">
              <span>{skill.name}</span>
            </div>
            {skill.level && (
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-slate-600 h-full rounded-full" 
                  style={{ width: `${skill.level === 'Beginner' ? 30 : skill.level === 'Intermediate' ? 60 : skill.level === 'Advanced' ? 85 : 100}%` }}
                />
              </div>
            )}
          </div>
        ))}

        {/* Languages Heading Node */}
        {validLanguages.length > 0 && (
          <h2 className="text-sm font-bold tracking-widest text-slate-900 uppercase border-b border-slate-300 pb-1 mt-2">Languages</h2>
        )}
        {validLanguages.map((lang, index) => (
          <div key={`lang-${index}`} className="flex justify-between items-center text-[13px] -mt-2">
            <span className="font-medium text-slate-700">{lang.name}</span>
            <span className="text-slate-500 text-xs">{lang.proficiency}</span>
          </div>
        ))}

        {/* Hobbies Heading Node */}
        {validHobbies && validHobbies.length > 0 && (
          <h2 className="text-sm font-bold tracking-widest text-slate-900 uppercase border-b border-slate-300 pb-1 mt-2">Interests</h2>
        )}
        {validHobbies && validHobbies.map((hobby, index) => (
          <div key={`hobby-${index}`} className="flex items-center gap-2 -mt-2 text-[13px] text-slate-700">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full shrink-0"></span>
            {hobby}
          </div>
        ))}

      </aside>

      {/* RIGHT MAIN SIDE */}
      <main className="w-[68%] p-8 flex flex-col gap-6 shrink-0">
        
        {/* Header Node */}
        <div className="flex flex-col gap-1 border-b-[3px] border-slate-800 pb-6 mb-2">
          {info.fullName && <h1 className="text-4xl font-light tracking-wider text-slate-900 uppercase">{info.fullName}</h1>}
          {info.jobTitle && <p className="text-sm font-bold tracking-widest text-slate-500 uppercase mt-1">{info.jobTitle}</p>}
        </div>

        {/* Summary Node */}
        {validSummary && (
          <div className="text-[14px] leading-relaxed text-slate-600 mb-2 whitespace-pre-wrap">
            {validSummary}
          </div>
        )}

        {/* Experience Node */}
        {validExperience.length > 0 && (
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest flex items-center gap-4">
            Experience
            <div className="flex-1 h-px bg-slate-200"></div>
          </h2>
        )}
        {validExperience.map((exp, index) => (
          <div key={`exp-${index}`} className="flex flex-col gap-1 -mt-2 mb-2">
            <div className="flex justify-between items-baseline">
              <h3 className="text-[15px] font-bold text-slate-800">{exp.role}</h3>
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap bg-slate-100 px-2 py-1 rounded">
                {formatDates(exp.startDate, exp.endDate, exp.isCurrent)}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <p className="text-[14px] font-medium text-slate-600">{exp.company}</p>
              {exp.location && <p className="text-[12px] text-slate-400">{exp.location}</p>}
            </div>
            {exp.description && (
              <p className="text-[13px] text-slate-600 leading-relaxed mt-1 whitespace-pre-wrap">{exp.description}</p>
            )}
            {exp.achievements && exp.achievements.length > 0 && (
              <ul className="mt-2 list-disc list-inside text-[13px] text-slate-600 space-y-1.5 leading-relaxed">
                {exp.achievements.map((ach, i) => (
                  <li key={i} className="pl-1"><span className="-ml-1">{ach}</span></li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {/* Projects Node - Added directly after Experience */}
        {data.projects && data.projects.length > 0 && (
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest flex items-center gap-4 mt-2">
            Projects
            <div className="flex-1 h-px bg-slate-200"></div>
          </h2>
        )}
        {data.projects && data.projects.map((proj, index) => (
          <div key={`proj-${index}`} className="flex flex-col gap-1 -mt-2 mb-2">
            <div className="flex justify-between items-baseline">
              <h3 className="text-[15px] font-bold text-slate-800">{proj.title}</h3>
              {proj.date && <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{proj.date}</span>}
            </div>
            {proj.description && (
              <p className="text-[13px] text-slate-600 leading-relaxed mt-1 whitespace-pre-wrap">{proj.description}</p>
            )}
          </div>
        ))}

        {/* Education Node */}
        {validEducation.length > 0 && (
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest flex items-center gap-4 mt-2">
            Education
            <div className="flex-1 h-px bg-slate-200"></div>
          </h2>
        )}
        {validEducation.map((edu, index) => (
          <div key={`edu-${index}`} className="flex flex-col gap-1 -mt-2 mb-2">
            <div className="flex justify-between items-baseline">
              <h3 className="text-[15px] font-bold text-slate-800">{edu.degree}</h3>
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                {formatDates(edu.startDate, edu.endDate, edu.isCurrent)}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <p className="text-[14px] text-slate-600">{edu.school}</p>
              {edu.location && <p className="text-[12px] text-slate-400">{edu.location}</p>}
            </div>
            {edu.description && (
              <p className="text-[13px] text-slate-600 leading-relaxed mt-1 whitespace-pre-wrap">{edu.description}</p>
            )}
          </div>
        ))}

        {/* Certifications Node */}
        {validCertificates.length > 0 && (
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest flex items-center gap-4 mt-2">
            Certifications
            <div className="flex-1 h-px bg-slate-200"></div>
          </h2>
        )}
        {validCertificates.map((cert, index) => (
          <div key={`cert-${index}`} className="flex flex-col gap-0.5 -mt-2 mb-2">
            <h3 className="text-[14px] font-bold text-slate-800">{cert.title}</h3>
            <div className="flex justify-between items-baseline text-[13px] text-slate-600">
              <p>{cert.issuer}</p>
              <span>{cert.date}</span>
            </div>
            {cert.description && (
              <p className="text-[13px] text-slate-600 leading-relaxed mt-1 whitespace-pre-wrap">{cert.description}</p>
            )}
          </div>
        ))}

        {/* References Node */}
        {validReferences && validReferences.length > 0 && (
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest flex items-center gap-4 mt-2">
            References
            <div className="flex-1 h-px bg-slate-200"></div>
          </h2>
        )}
        {validReferences && validReferences.length > 0 && (
          <div className="grid grid-cols-2 gap-6 -mt-2">
            {validReferences.map((ref, index) => (
              <div key={`ref-${index}`} className="flex flex-col gap-0.5">
                <h3 className="text-[14px] font-bold text-slate-800">{ref.name}</h3>
                {(ref.role || ref.company) && (
                  <p className="text-[12px] font-medium text-slate-600">
                    {ref.role}{ref.role && ref.company ? `, ${ref.company}` : ref.company}
                  </p>
                )}
                {ref.contact && <p className="text-[12px] text-slate-500 mt-1">{ref.contact}</p>}
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}