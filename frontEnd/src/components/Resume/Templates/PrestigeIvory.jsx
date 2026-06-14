import React from 'react';

export default function PrestigeIvory({
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
    <div id="resume-raw-content" className="w-full h-full flex bg-white text-neutral-900 relative">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-[32%] bg-neutral-50 p-8 flex flex-col shrink-0 gap-6 border-r border-neutral-200">
        
        {/* Profile Image Node */}
        {info.photo && (
          <div className="shrink-0 flex justify-center mb-4">
            <div className="w-36 h-36 rounded-full border-[3px] border-white shadow-sm ring-1 ring-neutral-200">
              <div className="w-full h-full rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center">
                <img src={info.photo} alt="Profile" className="w-full h-full object-cover grayscale-[20%]" />
              </div>
            </div>
          </div>
        )}

        {/* Contact Heading Node */}
        {hasContact && (
          <h2 className="text-[11px] font-bold tracking-[0.3em] text-neutral-400 uppercase border-b border-neutral-200 pb-2 mt-2">
            Contact
          </h2>
        )}
        {info.email && (
          <div className="flex items-center gap-3 text-[13px] -mt-2">
            <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
            <span className="break-all font-medium text-neutral-700">{info.email}</span>
          </div>
        )}
        {info.phone && (
          <div className="flex items-center gap-3 text-[13px] -mt-2">
            <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
            <span className="font-medium text-neutral-700">{info.phone}</span>
          </div>
        )}
        {info.location && (
          <div className="flex items-center gap-3 text-[13px] -mt-2">
            <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
            <span className="font-medium text-neutral-700">{info.location}</span>
          </div>
        )}
        {info.linkedin && (
          <div className="flex items-center gap-3 text-[13px] -mt-2">
            <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
            <span className="break-all font-medium text-neutral-700">{info.linkedin.replace(/(^\w+:|^)\/\//, '')}</span>
          </div>
        )}

        {/* Personal Details Node */}
        {(info.dob || info.nationality || info.gender || info.drivingLicense) && (
          <h2 className="text-[11px] font-bold tracking-[0.3em] text-neutral-400 uppercase border-b border-neutral-200 pb-2 mt-4">
            Details
          </h2>
        )}
        {info.dob && (
          <div className="flex flex-col gap-0.5 -mt-2">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">Date of Birth</span>
            <span className="text-[13px] text-neutral-800">{info.dob}</span>
          </div>
        )}
        {info.nationality && (
          <div className="flex flex-col gap-0.5 -mt-2">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">Nationality</span>
            <span className="text-[13px] text-neutral-800">{info.nationality}</span>
          </div>
        )}
        {info.gender && (
          <div className="flex flex-col gap-0.5 -mt-2">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">Gender</span>
            <span className="text-[13px] text-neutral-800">{info.gender}</span>
          </div>
        )}
        {info.drivingLicense && (
          <div className="flex flex-col gap-0.5 -mt-2">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">Driver's License</span>
            <span className="text-[13px] text-neutral-800">{info.drivingLicense}</span>
          </div>
        )}

        {/* Skills Heading Node */}
        {validSkills.length > 0 && (
          <h2 className="text-[11px] font-bold tracking-[0.3em] text-neutral-400 uppercase border-b border-neutral-200 pb-2 mt-4">
            Core Skills
          </h2>
        )}
        {validSkills.map((skill, index) => (
          <div key={`skill-${index}`} className="flex flex-col gap-1.5 -mt-2">
            <div className="flex justify-between text-[13px] font-semibold text-neutral-800">
              <span>{skill.name}</span>
            </div>
            {skill.level && (
              <div className="w-full bg-neutral-200 h-[3px] rounded-full overflow-hidden">
                <div 
                  className="bg-neutral-800 h-full rounded-full" 
                  style={{ width: `${skill.level === 'Beginner' ? 30 : skill.level === 'Intermediate' ? 60 : skill.level === 'Advanced' ? 85 : 100}%` }}
                />
              </div>
            )}
          </div>
        ))}

        {/* Languages Heading Node */}
        {validLanguages.length > 0 && (
          <h2 className="text-[11px] font-bold tracking-[0.3em] text-neutral-400 uppercase border-b border-neutral-200 pb-2 mt-4">
            Languages
          </h2>
        )}
        {validLanguages.map((lang, index) => (
          <div key={`lang-${index}`} className="flex justify-between items-baseline -mt-2 border-b border-dashed border-neutral-200 pb-1">
             <span className="text-[13px] font-semibold text-neutral-800">{lang.name}</span>
             <span className="text-[11px] text-neutral-500 uppercase tracking-widest">{lang.proficiency}</span>
          </div>
        ))}

        {/* Hobbies Heading Node */}
        {validHobbies && validHobbies.length > 0 && (
          <h2 className="text-[11px] font-bold tracking-[0.3em] text-neutral-400 uppercase border-b border-neutral-200 pb-2 mt-4">
            Interests
          </h2>
        )}
        {validHobbies && validHobbies.map((hobby, index) => (
          <div key={`hobby-${index}`} className="flex items-center gap-3 -mt-2 text-[13px] text-neutral-700">
            <span className="w-[3px] h-[3px] bg-neutral-400 rounded-full shrink-0"></span>
            {hobby}
          </div>
        ))}

      </aside>

      {/* RIGHT MAIN SIDE */}
      <main className="w-[68%] p-10 flex flex-col gap-6 shrink-0">
        
        {/* Header Node */}
        <div className="flex flex-col gap-2 pb-6 border-b-2 border-neutral-900 mb-2">
          {info.fullName && <h1 className="text-5xl font-black tracking-tighter text-neutral-900 uppercase">{info.fullName}</h1>}
          {info.jobTitle && <p className="text-[14px] font-bold tracking-[0.25em] text-neutral-500 uppercase mt-1">{info.jobTitle}</p>}
        </div>

        {/* Summary Node */}
        {validSummary && (
          <div className="text-[14px] leading-relaxed text-neutral-600 mb-2 font-medium text-justify whitespace-pre-wrap">
            {validSummary}
          </div>
        )}

        {/* Experience Node */}
        {validExperience.length > 0 && (
          <h2 className="text-sm font-black text-neutral-900 uppercase tracking-[0.2em] mt-2 mb-1">
            Experience
          </h2>
        )}
        {validExperience.map((exp, index) => (
          <div key={`exp-${index}`} className="flex flex-col gap-1 -mt-2 mb-4">
            <div className="flex justify-between items-baseline">
              <h3 className="text-[16px] font-bold text-neutral-900">{exp.role}</h3>
              <span className="text-[12px] font-bold text-neutral-500 uppercase tracking-widest">
                {formatDates(exp.startDate, exp.endDate, exp.isCurrent)}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <p className="text-[14px] font-semibold text-neutral-600 uppercase tracking-wide text-xs">{exp.company}</p>
              {exp.location && <p className="text-[11px] font-medium text-neutral-400 uppercase">{exp.location}</p>}
            </div>
            {exp.description && (
              <p className="text-[13.5px] text-neutral-600 leading-relaxed mt-1 whitespace-pre-wrap">{exp.description}</p>
            )}
            {exp.achievements && exp.achievements.length > 0 && (
              <ul className="mt-2 list-none text-[13.5px] text-neutral-600 space-y-2 leading-relaxed">
                {exp.achievements.map((ach, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-neutral-300 mt-1.5 text-[10px] shrink-0">■</span>
                    <span>{ach}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {/* Projects Node - Added directly after Experience */}
        {data.projects && data.projects.length > 0 && (
          <h2 className="text-sm font-black text-neutral-900 uppercase tracking-[0.2em] mt-3 mb-1">
            Projects
          </h2>
        )}
        {data.projects && data.projects.map((proj, index) => (
          <div key={`proj-${index}`} className="flex flex-col gap-1 -mt-2 mb-4">
            <div className="flex justify-between items-baseline">
              <h3 className="text-[15px] font-bold text-neutral-900">{proj.title}</h3>
              {proj.date && <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">{proj.date}</span>}
            </div>
            {proj.description && (
              <p className="text-[13.5px] text-neutral-600 leading-relaxed mt-1 whitespace-pre-wrap">{proj.description}</p>
            )}
          </div>
        ))}

        {/* Education Node */}
        {validEducation.length > 0 && (
          <h2 className="text-sm font-black text-neutral-900 uppercase tracking-[0.2em] mt-3 mb-1">
            Education
          </h2>
        )}
        {validEducation.map((edu, index) => (
          <div key={`edu-${index}`} className="flex flex-col gap-1 -mt-2 mb-4">
            <div className="flex justify-between items-baseline">
              <h3 className="text-[15px] font-bold text-neutral-900">{edu.degree}</h3>
              <span className="text-[12px] font-bold text-neutral-500 uppercase tracking-widest">
                {formatDates(edu.startDate, edu.endDate, edu.isCurrent)}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <p className="text-[14px] text-neutral-600 font-medium">{edu.school}</p>
              {edu.location && <p className="text-[11px] font-medium text-neutral-400 uppercase">{edu.location}</p>}
            </div>
            {edu.description && (
              <p className="text-[13.5px] text-neutral-600 leading-relaxed mt-1 whitespace-pre-wrap">{edu.description}</p>
            )}
          </div>
        ))}
        
        {/* Certifications Node */}
        {validCertificates.length > 0 && (
          <h2 className="text-sm font-black text-neutral-900 uppercase tracking-[0.2em] mt-3 mb-1">
            Certifications
          </h2>
        )}
        {validCertificates.map((cert, index) => (
          <div key={`cert-${index}`} className="flex flex-col gap-0.5 -mt-2 mb-4">
            <div className="flex justify-between items-baseline">
              <h3 className="text-[14px] font-bold text-neutral-900">{cert.title}</h3>
              <span className="text-[11px] font-bold text-neutral-500 tracking-widest">{cert.date}</span>
            </div>
            <p className="text-[13px] text-neutral-600">{cert.issuer}</p>
            {cert.description && (
              <p className="text-[13.5px] text-neutral-600 leading-relaxed mt-1 whitespace-pre-wrap">{cert.description}</p>
            )}
          </div>
        ))}

        {/* References Node */}
        {validReferences && validReferences.length > 0 && (
          <h2 className="text-sm font-black text-neutral-900 uppercase tracking-[0.2em] mt-3 mb-1">
            References
          </h2>
        )}
        {validReferences && validReferences.length > 0 && (
          <div className="grid grid-cols-2 gap-6 -mt-2">
            {validReferences.map((ref, index) => (
              <div key={`ref-${index}`} className="flex flex-col gap-0.5">
                <h3 className="text-[14px] font-bold text-neutral-900">{ref.name}</h3>
                {(ref.role || ref.company) && (
                  <p className="text-[12px] font-semibold text-neutral-500 uppercase tracking-wide mt-0.5">
                    {ref.role}{ref.role && ref.company ? `, ${ref.company}` : ref.company}
                  </p>
                )}
                {ref.contact && <p className="text-[12px] text-neutral-600 mt-1 font-medium">{ref.contact}</p>}
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}