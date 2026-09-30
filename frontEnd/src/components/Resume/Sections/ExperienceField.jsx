import React, { useEffect, useState } from 'react';
import AchievementsField from './AchievementsField';
import MonthYearPicker from './MonthYearPicker';

/* -------------------------------------------------------------------------- */
/*                                 Job helpers                                */
/* -------------------------------------------------------------------------- */

export const createJob = (values = {}) => ({
  id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  title: '',
  employer: '',
  location: '',
  remote: false,
  locationBeforeRemote: '', // typed location, restored if Remote is unchecked
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  current: false,
  achievements: '',
  ...values,
});

const jobHasContent = (job) =>
  !!(job.title || job.employer || job.location || job.startMonth || job.startYear || job.endMonth || job.endYear || job.achievements);

// Title and Employer are the required fields (marked with * in the form).
const jobIsComplete = (job) => !!((job.title || '').trim() && (job.employer || '').trim());

const jobDatesText = (job) => {
  const start = [job.startMonth, job.startYear].filter(Boolean).join('/');
  const end = job.current ? 'Present' : [job.endMonth, job.endYear].filter(Boolean).join('/');
  if (!start && !end) return '';
  return [start, end].filter(Boolean).join(' – ');
};

/* -------------------------------------------------------------------------- */
/*                                 Form pieces                                */
/* -------------------------------------------------------------------------- */

const InputField = ({ label, value, onChange, placeholder, focused, disabled }) => (
  <div className="flex flex-col w-full relative">
    {label && <label className="text-xs font-bold text-slate-800 mb-1.5">{label}</label>}
    <input
      type="text"
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      aria-label={label ? undefined : placeholder}
      disabled={disabled}
      className={`w-full bg-white border ${
        focused ? 'border-[#d9856b] text-slate-900' : 'border-slate-200 text-slate-900 focus:border-[#d9856b]'
      } rounded-sm py-2 px-3 text-xs focus:outline-none transition-all shadow-none placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed`}
    />
  </div>
);

const Checkbox = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 cursor-pointer group w-fit">
    <div className="relative flex items-center justify-center">
      <input type="checkbox" checked={!!checked} onChange={onChange} className="peer sr-only" />
      <div className="w-4 h-4 border border-slate-300 rounded-sm bg-white peer-checked:bg-[#d9856b] peer-checked:border-[#d9856b] peer-focus-visible:ring-2 peer-focus-visible:ring-[#d9856b]/50 transition-colors shadow-none"></div>
      <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
  </label>
);

/* -------------------------------------------------------------------------- */
/*                                  One job                                   */
/* -------------------------------------------------------------------------- */

const JobFields = ({ job, onChange }) => {
  const handleChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    onChange(field, val);
  };

  // Templates already print "Remote" from job.remote, so while it's on we keep the location
  // field empty (no "Remote · Remote") and stash what was typed so unchecking brings it back.
  const handleRemote = (e) => {
    if (e.target.checked) {
      onChange({ remote: true, locationBeforeRemote: job.location || '', location: '' });
    } else {
      onChange({ remote: false, location: job.locationBeforeRemote || '', locationBeforeRemote: '' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Restructured Layout: Tighter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="Title *" value={job.title} onChange={handleChange('title')} placeholder="Sales Manager" focused={true} />
        <InputField label="Employer *" value={job.employer} onChange={handleChange('employer')} placeholder="Company Name" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          <InputField
            label="Location"
            value={job.remote ? 'Remote' : job.location}
            onChange={handleChange('location')}
            placeholder="City, State"
            disabled={!!job.remote}
          />
          <Checkbox label="Remote work" checked={job.remote} onChange={handleRemote} />
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 mb-1.5 block">Start Date</span>
              <MonthYearPicker
                label="Start date"
                month={job.startMonth}
                year={job.startYear}
                onChange={({ month, year }) => onChange({ startMonth: month, startYear: year })}
              />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 mb-1.5 block">End Date</span>
              <MonthYearPicker
                label="End date"
                align="right"
                disabled={!!job.current}
                disabledText="Present"
                month={job.endMonth}
                year={job.endYear}
                onChange={({ month, year }) => onChange({ endMonth: month, endYear: year })}
              />
            </div>
          </div>
          <Checkbox label="I currently work here" checked={job.current} onChange={handleChange('current')} />
        </div>
      </div>

      <AchievementsField id={`achievements-${job.id}`} value={job.achievements} onChange={(v) => onChange('achievements', v)} />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                Work history                                */
/* -------------------------------------------------------------------------- */

const WorkHistory = ({ data, updateExperiences }) => {
  const [openId, setOpenId] = useState(undefined);

  // Jobs already flagged remote (saved earlier, imported, or set to "Remote" by the previous
  // version of this file) get their location moved aside so only the Remote tag shows.
  useEffect(() => {
    const list = Array.isArray(data && data.experiences) ? data.experiences : [];
    if (!list.some((j) => j.remote && j.location)) return;
    updateExperiences(
      list.map((j) =>
        j.remote && j.location
          ? {
              ...j,
              locationBeforeRemote: j.location === 'Remote' ? j.locationBeforeRemote || '' : j.location,
              location: '',
            }
          : j
      )
    );
  }, [data && data.experiences, updateExperiences]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return null;
  const jobs = Array.isArray(data.experiences) ? data.experiences : [];
  const activeId = openId === undefined ? jobs[0] && jobs[0].id : openId;

  // "Add another job" waits until every job has a Title and an Employer, so empty jobs can't pile up.
  // With no jobs at all the button reads "Add a job" and stays enabled, otherwise there would be
  // no way to create the first one.
  const addDisabled = jobs.length > 0 && !jobs.every(jobIsComplete);

  const updateJob = (id, fieldOrPatch, value) => {
    const patch = typeof fieldOrPatch === 'object' ? fieldOrPatch : { [fieldOrPatch]: value };
    updateExperiences(jobs.map((job) => (job.id === id ? { ...job, ...patch } : job)));
  };

  const addJob = () => {
    const job = createJob();
    updateExperiences([...jobs, job]);
    setOpenId(job.id);
    requestAnimationFrame(() => {
      const panel = document.getElementById(`job-panel-${job.id}`);
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const removeJob = (job, index) => {
    const label = job.title || job.employer || 'this job';
    if (jobHasContent(job) && !window.confirm(`Remove ${label}?`)) return;
    const remaining = jobs.filter((j) => j.id !== job.id);
    updateExperiences(remaining);
    setOpenId(remaining.length ? remaining[Math.max(0, index - 1)].id : null);
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-50/50">
      {/* pb-28 creates the reserved space at the bottom so the absolute footer never overlaps the form */}
      <div className="max-w-4xl mx-auto w-full px-4 pt-8 pb-28">
        <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 leading-tight mb-1 tracking-tight">
          Work History
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Start with your most recent job and work backward.
        </p>

        <form className="space-y-3 w-full" onSubmit={(e) => e.preventDefault()}>
          {jobs.map((job, index) => {
            const open = job.id === activeId;
            const heading = [job.title, job.employer].filter(Boolean).join(' · ') || (index === 0 ? 'Most recent job' : `Job ${index + 1}`);
            const dates = jobDatesText(job);
            
            return (
              <div key={job.id} id={`job-panel-${job.id}`} className="rounded-sm border border-slate-200 bg-white scroll-mt-4">
                <div className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : job.id)}
                    aria-expanded={open}
                    aria-controls={`job-body-${job.id}`}
                    className="flex-1 min-w-0 min-h-[48px] flex items-center gap-3 px-4 py-2 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d9856b] rounded-sm"
                  >
                    <svg className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="min-w-0 flex flex-col justify-center">
                      <span className="block text-xs font-bold text-slate-800 truncate">{heading}</span>
                      {dates && <span className="block text-[10px] font-medium text-slate-400 truncate">{dates}</span>}
                    </span>
                  </button>
                  {jobs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeJob(job, index)}
                      aria-label={`Remove ${heading}`}
                      className="shrink-0 w-12 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d9856b] rounded-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 7h12M9 7V5h6v2m-8 0l1 12h8l1-12M10 11v5M14 11v5" />
                      </svg>
                    </button>
                  )}
                </div>

                {open && (
                  <div id={`job-body-${job.id}`} className="border-t border-slate-100 px-4 py-5 bg-white">
                    <JobFields job={job} onChange={(field, value) => updateJob(job.id, field, value)} />
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={addJob}
            disabled={addDisabled}
            title={addDisabled ? 'Enter a title and employer for each job before adding another' : undefined}
            className="inline-flex items-center gap-1.5 min-h-[36px] px-4 mt-2 rounded-sm border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:border-[#d9856b] hover:text-[#d9856b] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d9856b] disabled:bg-slate-50 disabled:text-slate-300 disabled:hover:border-slate-200 disabled:hover:text-slate-300 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14M5 12h14" />
            </svg>
            {jobs.length === 0 ? 'Add a job' : 'Add another job'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WorkHistory;