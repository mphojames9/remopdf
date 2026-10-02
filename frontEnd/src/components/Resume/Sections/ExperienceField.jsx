import React, { useEffect, useMemo, useRef, useState } from 'react';
import AchievementsField from './AchievementsField';
import SpellCheckPanel from './SpellCheckPanel';
import MonthYearPicker from './MonthYearPicker';
import { skillNames, achievementLines, hasAchievement, appendAchievement } from './aiSuggestions';
import { suggestTitles, suggestAchievements } from './datasetSuggestions';

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
/*                       Suggestions from the dataset                         */
/* -------------------------------------------------------------------------- */

const SparkleIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7 12l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z" />
  </svg>
);

/* -------------------------------------------------------------------------- */
/*                     "Slide into the field" animation                       */
/* -------------------------------------------------------------------------- */

const FLY_MS = 560;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Slides a copy of the picked idea from its row up into the achievements field, then calls onLand.
// The copy lives on <body>, so no panel can clip it and it still finishes if the job panel closes.
// With reduced motion (or no Web Animations support) the idea is added straight away.
const flyIdeaToField = ({ text, sourceEl, targetEl, toEnd, onLand }) => {
  if (!sourceEl || !targetEl || !sourceEl.animate || prefersReducedMotion()) {
    onLand();
    return;
  }

  const from = sourceEl.getBoundingClientRect();
  const to = targetEl.getBoundingClientRect();
  const look = window.getComputedStyle(sourceEl);

  const ghost = document.createElement('div');
  ghost.textContent = text;
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${from.left - 8}px`,
    top: `${from.top}px`,
    width: `${from.width + 16}px`,
    boxSizing: 'border-box',
    padding: '4px 8px',
    background: '#fff',
    color: '#334155',
    fontFamily: look.fontFamily,
    fontSize: look.fontSize,
    lineHeight: look.lineHeight,
    borderRadius: '2px',
    boxShadow: '0 0 0 1px #d9856b, 0 8px 20px rgba(15, 23, 42, 0.16)',
    pointerEvents: 'none',
    zIndex: '9999',
    willChange: 'transform, opacity',
  });
  document.body.appendChild(ghost);

  // Land at the end of the field when it already has text (that is where the new line goes),
  // otherwise at the top. Kept inside the viewport so it never flies off-screen.
  const startLeft = from.left - 8;
  const startTop = from.top;
  const endLeft = to.left + 4;
  const wanted = toEnd ? to.bottom - ghost.offsetHeight - 10 : to.top + 10;
  const endTop = Math.min(Math.max(wanted, 8), window.innerHeight - ghost.offsetHeight - 8);
  const dx = endLeft - startLeft;
  const dy = endTop - startTop;

  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    ghost.remove();
    onLand();
  };

  const anim = ghost.animate(
    [
      { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.6}px, ${dy * 0.6}px) scale(1.03)`, opacity: 1, offset: 0.65 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.97)`, opacity: 0 },
    ],
    { duration: FLY_MS, easing: 'cubic-bezier(0.22, 0.8, 0.28, 1)', fill: 'forwards' }
  );
  anim.onfinish = done;
  anim.oncancel = done;
};

// A short orange ring around the field when a new idea lands in it.
const flashField = (el) => {
  if (!el || !el.animate) return;
  el.animate(
    [{ boxShadow: '0 0 0 3px rgba(217, 133, 107, 0.5)' }, { boxShadow: '0 0 0 3px rgba(217, 133, 107, 0)' }],
    { duration: 800, easing: 'ease-out' }
  );
  const r = el.getBoundingClientRect();
  if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// Title input with a suggestions dropdown fed by the job-title dataset. Suggestions come from the
// typed text, the skills the user picked and their other job titles, and open instantly.
const TitleSuggestField = ({ label, value, onChange, placeholder, skills, previousTitles }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const listId = useRef(`title-suggestions-${Math.random().toString(36).slice(2, 7)}`).current;
  const skillsKey = skills.join('|');
  const previousKey = previousTitles.join('|');

  const items = useMemo(() => {
    if (!open) return [];
    const typed = (value || '').trim().toLowerCase();
    return suggestTitles({ query: value, skills, previousTitles, limit: 8 }).suggestions.filter(
      (s) => s.toLowerCase() !== typed
    );
  }, [open, value, skillsKey, previousKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const showList = open && items.length > 0;

  const pick = (title) => {
    onChange(title);
    setOpen(false);
    setActive(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i < 0 ? items.length - 1 : (i - 1 + items.length) % items.length));
    } else if (e.key === 'Enter' && showList && active >= 0 && items[active]) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div
      ref={wrapRef}
      className="flex flex-col w-full relative"
      onBlur={(e) => {
        if (!wrapRef.current || !wrapRef.current.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      {label && (
        <label htmlFor={`${listId}-input`} className="text-xs font-bold text-slate-800 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={`${listId}-input`}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-opt-${active}` : undefined}
          autoComplete="off"
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-white border border-[#d9856b] text-slate-900 rounded-sm py-2 pl-3 pr-8 text-xs focus:outline-none transition-all shadow-none placeholder-slate-400"
        />
        <SparkleIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#d9856b] pointer-events-none" />
      </div>

      {showList && (
        <div
          id={listId}
          role="listbox"
          aria-label="Suggested job titles"
          className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-sm max-h-56 overflow-y-auto"
        >
          <p className="px-3 py-1.5 text-[10px] font-medium text-slate-400 border-b border-slate-100">Suggested titles</p>
          {items.map((title, i) => (
            <button
              key={title}
              id={`${listId}-opt-${i}`}
              type="button"
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(title)}
              onMouseEnter={() => setActive(i)}
              className={`block w-full text-left px-3 py-2 text-xs transition-colors ${
                i === active ? 'bg-slate-50 text-[#d9856b] font-semibold' : 'text-slate-700'
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const IDEAS_PER_PAGE = 5;
const NO_IDEAS = { suggestions: [], total: 0, roleLabel: '', forTitle: '' };

// Achievement ideas for one job, taken from the dataset role that matches the job title. They
// appear as soon as a title is entered. Each idea has an add button that puts it into the
// achievements field; ideas already in the field show a check instead.
const AchievementSuggestions = ({ job, skills, onAdd, pending = [] }) => {
  const [round, setRound] = useState(0);
  const [result, setResult] = useState(NO_IDEAS);
  const achievementsRef = useRef(job.achievements);
  achievementsRef.current = job.achievements;
  const title = (job.title || '').trim();
  const skillsKey = skills.join('|');

  // Back to the first batch of ideas when the title or skills change.
  useEffect(() => {
    setRound(0);
  }, [title, skillsKey]);

  // Look the ideas up (short delay so it does not run on every keystroke).
  useEffect(() => {
    if (!title) {
      setResult(NO_IDEAS);
      return undefined;
    }
    const timer = setTimeout(() => {
      const found = suggestAchievements({
        title,
        skills,
        existing: achievementLines(achievementsRef.current),
        round,
        limit: IDEAS_PER_PAGE,
      });
      setResult({ ...found, forTitle: title });
    }, 250);
    return () => clearTimeout(timer);
  }, [title, skillsKey, round]); // eslint-disable-line react-hooks/exhaustive-deps

  const { suggestions: items, total, roleLabel } = result;
  const settled = result.forTitle === title;
  // An idea leaves the list once it is in the field (it comes back if that line is deleted).
  // Ideas still sliding in stay mounted so their row can fold away smoothly.
  const visible = items.filter((text) => pending.includes(text) || !hasAchievement(job.achievements, text));

  return (
    <div className="border border-slate-200 rounded-sm bg-slate-50/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-800">Achievement ideas</p>
          <p className="text-[11px] text-slate-500">
            {title && roleLabel
              ? `Ready-made ideas for ${roleLabel}. Tap + to add one.`
              : 'Add a job title to see ready-made ideas.'}
          </p>
        </div>
        {total > IDEAS_PER_PAGE && (
          <button
            type="button"
            onClick={() => setRound((r) => r + 1)}
            className="shrink-0 inline-flex items-center gap-1.5 min-h-[32px] px-3 rounded-sm border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:border-[#d9856b] hover:text-[#d9856b] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d9856b]"
          >
            <SparkleIcon />
            Show new ideas
          </button>
        )}
      </div>

      {title && settled && items.length === 0 && (
        <p className="mt-3 text-xs text-slate-500">
          No ready-made ideas for this title yet. Try a more common title, such as "Project Manager".
        </p>
      )}

      {title && settled && items.length > 0 && visible.length === 0 && (
        <p className="mt-3 text-xs text-slate-500">
          You've added all of these ideas.{total > IDEAS_PER_PAGE ? ' Tap "Show new ideas" for more.' : ''}
        </p>
      )}

      {visible.length > 0 && (
        <>
          {/* Each row is a one-row grid that folds to 0 height when its idea is picked, so the
              ideas below glide up. The bottom spacing lives inside the row (pb-2) so it folds too. */}
          <ul className="mt-3 -mb-2 flex flex-col">
            {visible.map((text) => {
              const sending = pending.includes(text); // sliding into the field
              return (
                <li
                  key={text}
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                    sending ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
                  }`}
                >
                  <div className="min-h-0 overflow-hidden -mx-1 px-1">
                    <div className="flex items-start gap-2.5 pb-2">
                      <button
                        type="button"
                        onClick={(e) => onAdd(text, e.currentTarget.closest('li').querySelector('[data-idea-text]'))}
                        disabled={sending}
                        aria-label={sending ? 'Added' : `Add: ${text}`}
                        className={`mt-0.5 w-6 h-6 shrink-0 rounded-sm border flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d9856b] ${
                          sending
                            ? 'bg-[#d9856b] border-[#d9856b] text-white cursor-default'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-[#d9856b] hover:text-[#d9856b]'
                        }`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d={sending ? 'M5 13l4 4L19 7' : 'M12 5v14M5 12h14'}
                          />
                        </svg>
                      </button>
                      <span data-idea-text className="text-xs text-slate-700 leading-relaxed pt-1">
                        {text}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {visible.some((t) => /\[[^\]]+\]/.test(t)) && (
            <p className="mt-3 text-[11px] text-slate-500">
              Replace the [brackets] with your real numbers and details before you download.
            </p>
          )}
        </>
      )}
    </div>
  );
};

/* A rich-text field with the live spelling and grammar panel underneath it.
   The panel stays mounted but hidden while the field is empty, so it keeps its state and does not
   flash a "loading" notice when the first character is typed. */
const CheckedField = ({ value, onChange, fieldRef, ...fieldProps }) => {
  const text = typeof value === 'string' ? value : '';
  return (
    <div className="flex flex-col gap-3">
      <div ref={fieldRef} className="rounded-sm">
        <AchievementsField {...fieldProps} value={text} onChange={onChange} />
      </div>
      <div className={text.trim() ? '[&>div]:rounded-sm' : 'hidden'}>
        <SpellCheckPanel text={text} onChange={onChange} />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                  One job                                   */
/* -------------------------------------------------------------------------- */

const JobFields = ({ job, onChange, skills, previousTitles }) => {
  const [pending, setPending] = useState([]); // ideas currently sliding into the field
  const fieldRef = useRef(null);
  // Refs keep the landing step on the latest values, since it runs ~half a second after the click.
  const achievementsRef = useRef(job.achievements);
  const onChangeRef = useRef(onChange);
  achievementsRef.current = job.achievements;
  onChangeRef.current = onChange;

  // The idea slides up into the field first, and is added to the text when it lands.
  const addAchievement = (text, sourceEl) => {
    if (pending.includes(text)) return;
    setPending((p) => [...p, text]);
    const fieldEl = fieldRef.current;
    flyIdeaToField({
      text,
      sourceEl,
      targetEl: fieldEl,
      toEnd: !!(achievementsRef.current || '').trim(),
      onLand: () => {
        onChangeRef.current('achievements', appendAchievement(achievementsRef.current, text));
        setPending((p) => p.filter((t) => t !== text));
        flashField(fieldEl);
      },
    });
  };

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
        <TitleSuggestField
          label="Title *"
          value={job.title}
          onChange={(v) => onChange('title', v)}
          placeholder="Sales Manager"
          skills={skills}
          previousTitles={previousTitles}
        />
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

      <CheckedField
        id={`achievements-${job.id}`}
        fieldRef={fieldRef}
        value={job.achievements}
        onChange={(v) => onChange('achievements', v)}
      />
      <AchievementSuggestions job={job} skills={skills} onAdd={addAchievement} pending={pending} />
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
  const skills = skillNames(data.skills);
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
                    <JobFields
                      job={job}
                      skills={skills}
                      previousTitles={jobs.filter((j) => j.id !== job.id).map((j) => j.title).filter(Boolean)}
                      onChange={(field, value) => updateJob(job.id, field, value)}
                    />
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