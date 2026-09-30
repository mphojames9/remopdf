import React, { useState } from 'react';
import MonthYearPicker from './MonthYearPicker';
import AchievementsField from './AchievementsField';

/* -------------------------------------------------------------------------- */
/*                            Qualification helpers                           */
/* -------------------------------------------------------------------------- */

export const createEducation = (values = {}) => ({
  id: `edu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  institution: '',
  location: '',
  degree: '',
  field: '',
  gradMonth: '',
  gradYear: '',
  achievements: '',
  ...values,
});

// Older saves and imports hold ONE education object; it becomes the first qualification.
export const normalizeEducation = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((e) => createEducation(e)) : [createEducation()];
  }
  const hasData = value && typeof value === 'object' && Object.values(value).some((v) => v !== '' && v != null);
  return [createEducation(hasData ? value : {})];
};

const educationHasContent = (e) =>
  !!(e.institution || e.location || e.degree || e.field || e.gradMonth || e.gradYear || e.achievements);

// Institution is the required field (marked with * in the form).
const educationIsComplete = (e) => !!(e.institution || '').trim();

const educationDatesText = (e) => [e.gradMonth, e.gradYear].filter(Boolean).join('/');

/* -------------------------------------------------------------------------- */
/*                                 Form pieces                                */
/* -------------------------------------------------------------------------- */

const InputField = ({ label, value, onChange, placeholder, focused }) => (
  <div className="flex flex-col w-full relative">
    {label && <label className="text-xs font-bold text-slate-800 mb-1">{label}</label>}
    <div className="relative">
      <div className={`absolute left-0 top-0 h-full w-1 bg-[#d9856b] rounded-l-sm transition-opacity ${focused ? 'opacity-100' : 'opacity-0'} z-10`}></div>
      <input
        type="text"
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={label ? undefined : placeholder}
        className={`w-full bg-white border ${
          focused ? 'border-[#d9856b] text-slate-900 font-medium' : 'border-slate-200 text-slate-900 focus:border-[#d9856b]'
        } rounded-sm py-1.5 px-3 text-xs focus:outline-none transition-all shadow-none`}
      />
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/*                             One qualification                              */
/* -------------------------------------------------------------------------- */

const QualificationFields = ({ entry, onChange }) => {
  const [isCourseworkOpen, setIsCourseworkOpen] = useState(true);

  const handleChange = (field) => (e) => onChange({ [field]: e.target.value });

  const handleAddAchievement = (achievement) => {
    onChange({
      achievements: entry.achievements ? `${entry.achievements}\n- ${achievement}` : `- ${achievement}`,
    });
  };

  return (
    <div>
      <div className="space-y-4 w-full">
        <div className="flex flex-col sm:flex-row gap-4">
          <InputField label="Institution *" value={entry.institution} onChange={handleChange('institution')} placeholder="School Name" focused={true} />
          <InputField label="Institution Location" value={entry.location} onChange={handleChange('location')} placeholder="City, Country" />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <InputField label="Degree" value={entry.degree} onChange={handleChange('degree')} placeholder="BSc, Certificate, etc." />
          <InputField label="Field of Study" value={entry.field} onChange={handleChange('field')} placeholder="Computer Science" />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-1/2">
            <span className="text-xs font-bold text-slate-800 mb-1 block">Graduation Date</span>
            <MonthYearPicker
              label="Graduation date"
              heightClass="h-[30px]" // matches the py-1.5 inputs above
              month={entry.gradMonth}
              year={entry.gradYear}
              onChange={({ month, year }) => onChange({ gradMonth: month, gradYear: year })}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 border border-slate-200 rounded-sm bg-white overflow-hidden transition-all">
        <div
          onClick={() => setIsCourseworkOpen(!isCourseworkOpen)}
          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 border-b border-slate-100"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <span>Add additional coursework or achievements</span>
          </div>
        </div>
        {isCourseworkOpen && (
          <div className="p-3.5 bg-slate-50/50 flex flex-col gap-2">
            <div className="flex gap-2 mb-1">
              {['Dean\'s List', 'Minimum Average', 'Honors'].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddAchievement(item)}
                  className="px-2.5 py-1 bg-white border border-slate-200 text-[11px] font-semibold rounded-sm hover:border-[#d9856b]"
                >
                  + {item}
                </button>
              ))}
            </div>
            <AchievementsField
              id={`education-details-${entry.id}`}
              label="Details"
              placeholder={'- Dean\'s List, 2023\n- Relevant coursework: Data Structures, Algorithms'}
              value={entry.achievements}
              onChange={(v) => onChange({ achievements: v })}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              Education section                             */
/* -------------------------------------------------------------------------- */

const EducationSection = ({ data, updateEducation }) => {
  const [openId, setOpenId] = useState(undefined);

  if (!data) return null;
  // The builder stores an array; normalizeEducation only matters for data saved before this change.
  const entries = Array.isArray(data.education) ? data.education : normalizeEducation(data.education);
  const activeId = openId === undefined ? entries[0] && entries[0].id : openId;

  // "Add another qualification" waits until every qualification has an Institution, so empty
  // entries can't pile up. With none at all the button reads "Add a qualification" and stays enabled.
  const addDisabled = entries.length > 0 && !entries.every(educationIsComplete);

  const updateEntry = (id, patch) => {
    updateEducation(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  };

  const addEntry = () => {
    const entry = createEducation();
    updateEducation([...entries, entry]);
    setOpenId(entry.id);
    requestAnimationFrame(() => {
      const panel = document.getElementById(`qualification-panel-${entry.id}`);
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const removeEntry = (entry, index) => {
    const label = entry.degree || entry.institution || 'this qualification';
    if (educationHasContent(entry) && !window.confirm(`Remove ${label}?`)) return;
    const remaining = entries.filter((e) => e.id !== entry.id);
    updateEducation(remaining);
    setOpenId(remaining.length ? remaining[Math.max(0, index - 1)].id : null);
  };

  return (
    <div className="max-w-3xl mx-auto w-full pb-24">
      <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 leading-tight mb-1">Tell us about your education</h1>
      <p className="text-xs lg:text-sm text-slate-600 font-medium mb-6">
        Enter your education experience so far. Start with your most recent qualification.
      </p>

      <form className="space-y-3 w-full" onSubmit={(e) => e.preventDefault()}>
        {entries.map((entry, index) => {
          const open = entry.id === activeId;
          const heading =
            [entry.degree, entry.institution].filter(Boolean).join(' · ') ||
            (index === 0 ? 'Most recent qualification' : `Qualification ${index + 1}`);
          const dates = educationDatesText(entry);

          return (
            <div key={entry.id} id={`qualification-panel-${entry.id}`} className="rounded-sm border border-slate-200 bg-white scroll-mt-4">
              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : entry.id)}
                  aria-expanded={open}
                  aria-controls={`qualification-body-${entry.id}`}
                  className="flex-1 min-w-0 min-h-[48px] flex items-center gap-3 px-4 py-2 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d9856b]/50 rounded-sm"
                >
                  <svg className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="min-w-0 flex flex-col justify-center">
                    <span className="block text-xs font-bold text-slate-800 truncate">{heading}</span>
                    {dates && <span className="block text-[10px] font-medium text-slate-400 truncate">{dates}</span>}
                  </span>
                </button>
                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(entry, index)}
                    aria-label={`Remove ${heading}`}
                    className="shrink-0 w-12 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d9856b]/50 rounded-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 7h12M9 7V5h6v2m-8 0l1 12h8l1-12M10 11v5M14 11v5" />
                    </svg>
                  </button>
                )}
              </div>

              {open && (
                <div id={`qualification-body-${entry.id}`} className="border-t border-slate-100 px-4 py-5 bg-white">
                  <QualificationFields entry={entry} onChange={(patch) => updateEntry(entry.id, patch)} />
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={addEntry}
          disabled={addDisabled}
          title={addDisabled ? 'Enter an institution for each qualification before adding another' : undefined}
          className="inline-flex items-center gap-1.5 min-h-[36px] px-4 mt-2 rounded-sm border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:border-[#d9856b] hover:text-[#d9856b] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d9856b]/50 disabled:bg-slate-50 disabled:text-slate-300 disabled:hover:border-slate-200 disabled:hover:text-slate-300 disabled:cursor-not-allowed"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14M5 12h14" />
          </svg>
          {entries.length === 0 ? 'Add a qualification' : 'Add another qualification'}
        </button>
      </form>
    </div>
  );
};

export default EducationSection;