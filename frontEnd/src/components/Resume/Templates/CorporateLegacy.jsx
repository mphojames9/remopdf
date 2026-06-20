import React from 'react';

export default function CorporateLegacy({
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
    <div id="resume-raw-content" className="w-full h-full flex bg-white text-slate-900 relative font-inter text-[11px] leading-relaxed">
      
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap');
        .font-lora { font-family: 'Lora', serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
      `}} />

      {/* LEFT SIDEBAR - Processed by PaginatedPreview sidebarQueue */}
      <aside className="w-[34%] bg-slate-50 p-7 flex flex-col shrink-0 gap-6 border-r border-slate-200">
        
        {/* Profile Image Node */}
        {info.photo && (
          <div className="shrink-0 flex justify-center mb-2">
            <img 
              src={info.photo} 
              alt="Profile" 
              className="w-28 h-28 rounded-full object-cover border-2 border-slate-300 shadow-sm"
            />
          </div>
        )}

        {/* Contact Information Node */}
        {hasContact && (
          <div className="flex flex-col gap-3">
            <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider font-inter border-b border-slate-300 pb-1">
              Contact Details
            </h2>
            <div className="flex flex-col gap-2 text-slate-700 font-inter">
              {info.phone && (
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  <span className="break-all">{info.phone}</span>
                </div>
              )}
              {info.email && (
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  <span className="break-all font-medium text-slate-900">{info.email}</span>
                </div>
              )}
              {info.location && (
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  <span>{info.location}</span>
                </div>
              )}
              {info.linkedin && (
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  <span className="break-all">{info.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>
                </div>
              )}
              {info.website && (
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  <span className="break-all">{info.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Core Expertise Node */}
        {validSkills && validSkills.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider font-inter border-b border-slate-300 pb-1">
              Expertise
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {validSkills.map((skill, index) => (
                <span 
                  key={`skill-${index}`}
                  className="bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-md shadow-2xs font-medium text-[10px]"
                >
                  {skill.name || skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Languages Node */}
        {validLanguages && validLanguages.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider font-inter border-b border-slate-300 pb-1">
              Languages
            </h2>
            <div className="flex flex-col gap-1.5">
              {validLanguages.map((lang, index) => (
                <div key={`lang-${index}`} className="flex justify-between items-center text-slate-700">
                  <span className="font-medium">{lang.name || lang}</span>
                  {lang.level && <span className="text-[10px] text-slate-500 italic">{lang.level}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hobbies Node */}
        {validHobbies && validHobbies.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider font-inter border-b border-slate-300 pb-1">
              Interests
            </h2>
            <div className="flex flex-wrap gap-1 text-slate-700">
              {validHobbies.map((hobby, index) => (
                <span key={`hobby-${index}`} className="after:content-[',_'] last:after:content-none">
                  {hobby.name || hobby}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT AREA - Processed by PaginatedPreview mainQueue */}
      <main className="flex-1 p-8 flex flex-col gap-6 bg-white">
        
        {/* Header Block / Identity Node */}
        <div className="flex flex-col gap-1 border-b-2 border-slate-900 pb-4">
          {info.fullName && (
            <h1 className="text-3xl font-bold font-lora tracking-tight text-slate-900">
              {info.fullName}
            </h1>
          )}
          {info.jobTitle && (
            <p className="text-[13px] font-semibold text-slate-600 uppercase tracking-widest font-inter">
              {info.jobTitle}
            </p>
          )}
        </div>

        {/* Professional Summary Node */}
        {validSummary && (
          <div className="flex flex-col gap-2">
            <h2 className="text-[12px] font-bold text-slate-900 uppercase tracking-wider font-inter flex items-center gap-2">
              Professional Profile
            </h2>
            <p className="text-slate-700 text-justify font-inter leading-relaxed">
              {info.summary}
            </p>
          </div>
        )}

        {/* Professional Experience Node */}
        {validExperience && validExperience.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[12px] font-bold text-slate-900 uppercase tracking-wider font-inter">
              Employment History
            </h2>
            <div className="flex flex-col gap-4">
              {validExperience.map((exp, index) => (
                <div key={`exp-${index}`} className="flex flex-col gap-1 relative pl-4 border-l-2 border-slate-200 hover:border-slate-400 transition-colors">
                  <div className="absolute w-2 h-2 bg-slate-900 rounded-full -left-[5px] top-1.5"></div>
                  
                  <div className="flex justify-between items-start flex-wrap gap-1">
                    <h3 className="text-[12px] font-bold text-slate-900 font-lora">
                      {exp.role}
                    </h3>
                    <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded">
                      {formatDates(exp.startDate, exp.endDate, exp.isCurrent)}
                    </span>
                  </div>

                  {(exp.company || exp.location) && (
                    <p className="text-[11px] font-medium text-slate-600 italic">
                      {exp.company}{exp.location ? ` — ${exp.location}` : ''}
                    </p>
                  )}

                  {exp.achievements && exp.achievements.length > 0 && (
                    <ul className="list-disc list-outside pl-4 mt-1.5 flex flex-col gap-1 text-slate-700">
                      {exp.achievements.map((ach, aIdx) => (
                        <li key={`ach-${aIdx}`} className="pl-0.5">
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

        {/* Education Node */}
        {validEducation && validEducation.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-[12px] font-bold text-slate-900 uppercase tracking-wider font-inter">
              Education & Qualifications
            </h2>
            <div className="flex flex-col gap-3">
              {validEducation.map((edu, index) => (
                <div key={`edu-${index}`} className="flex flex-col gap-0.5">
                  <div className="flex justify-between items-start flex-wrap gap-1">
                    <h3 className="text-[12px] font-bold text-slate-900 font-lora">
                      {edu.degree}
                    </h3>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {formatDates(edu.startDate, edu.endDate, edu.isCurrent)}
                    </span>
                  </div>
                  {(edu.school || edu.location) && (
                    <p className="text-[11px] text-slate-600 font-medium">
                      {edu.school}{edu.location ? `, ${edu.location}` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certificates Node */}
        {validCertificates && validCertificates.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <h2 className="text-[12px] font-bold text-slate-900 uppercase tracking-wider font-inter">
              Certifications
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {validCertificates.map((cert, index) => (
                <div key={`cert-${index}`} className="bg-slate-50 p-2 rounded border border-slate-100 flex flex-col">
                  <span className="font-bold text-slate-900">{cert.title || cert.name}</span>
                  {cert.issuer && <span className="text-[10px] text-slate-500 font-medium">{cert.issuer}</span>}
                  {cert.date && <span className="text-[9px] text-slate-400 mt-0.5">{cert.date}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* References Node */}
        {validReferences && validReferences.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <h2 className="text-[12px] font-bold text-slate-900 uppercase tracking-wider font-inter">
              Professional References
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {validReferences.map((ref, index) => (
                <div key={`ref-${index}`} className="flex flex-col gap-0.5 relative pl-3 border-l border-slate-300">
                  <h3 className="text-[11px] font-bold text-slate-900">{ref.name}</h3>
                  {(ref.role || ref.company) && (
                    <p className="text-[10px] font-medium text-slate-500">
                      {ref.role}{ref.role && ref.company ? `, ${ref.company}` : ref.company}
                    </p>
                  )}
                  {ref.email && <span className="text-[10px] text-slate-600 font-mono">{ref.email}</span>}
                  {ref.phone && <span className="text-[10px] text-slate-600">{ref.phone}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}