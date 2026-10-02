import React, { useEffect, useRef, useState } from 'react';
import PhotoSection from './PhotoSection';
import LicenceSection from './LicenceSection';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const MARITAL_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'];
const MAX_WEBSITES = 5;

// Reduced font sizes (text-xs) and reduced border radius (rounded-sm)
const fieldClass = (value) =>
  `w-full bg-white border ${
    value ? 'border-[#d9856b]/50 text-slate-900 font-medium' : 'border-slate-200 text-slate-500'
  } rounded-sm py-2 px-3 text-xs focus:outline-none focus:border-[#d9856b] transition-all shadow-none`;

const FieldLabel = ({ children, optional, htmlFor }) => (
  <label htmlFor={htmlFor} className="text-xs font-semibold text-slate-800 mb-1.5 flex items-center">
    {children}
    {optional && <span className="ml-1.5 text-[10px] font-medium text-slate-400">Optional</span>}
  </label>
);

const CheckMark = () => (
  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#d9856b] pointer-events-none">
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
    </svg>
  </span>
);

const InputField = ({ label, value, onChange, placeholder, checked, optional, type = 'text', id, ...rest }) => (
  <div className="flex flex-col w-full relative">
    <FieldLabel optional={optional} htmlFor={id}>{label}</FieldLabel>
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        className={fieldClass(value)}
        {...rest}
      />
      {checked && value && <CheckMark />}
    </div>
  </div>
);

// Shared by the custom pickers: close on outside click or Escape
const useDismiss = (open, setOpen, wrapRef, triggerRef) => {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen, wrapRef, triggerRef]);
};

// ---------- Styled date picker (replaces the native browser calendar) ----------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const pad2 = (n) => String(n).padStart(2, '0');
const toISO = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
const todayISO = () => {
  const t = new Date();
  return toISO(t.getFullYear(), t.getMonth(), t.getDate());
};

const parseISO = (s) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return match ? { y: +match[1], m: +match[2] - 1, d: +match[3] } : null;
};
const formatDisplay = (s) => {
  const p = parseISO(s);
  return p ? `${p.d} ${MONTHS[p.m].slice(0, 3)} ${p.y}` : '';
};

const CalendarIcon = () => (
  <svg className="w-4 h-4 shrink-0 text-[#d9856b]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path strokeLinecap="round" d="M3.5 9.5h17M8 3v4M16 3v4" />
  </svg>
);

const Chevron = ({ dir }) => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </svg>
);

const navBtnClass =
  'h-7 w-7 flex items-center justify-center rounded-sm border border-slate-200 bg-white text-slate-600 transition-colors hover:border-[#d9856b] hover:text-[#d9856b] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50';

const headerSelectClass =
  'rounded-sm border border-slate-200 bg-white py-1 px-1.5 text-xs font-semibold text-slate-800 cursor-pointer hover:border-[#d9856b] focus:outline-none focus:border-[#d9856b]';

const DateField = ({ label, value, onChange, optional, id, min, max, placeholder = 'Select date' }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);

  const today = todayISO();
  const selected = parseISO(value);
  const minP = parseISO(min);
  const maxP = parseISO(max);

  const maxYear = maxP ? maxP.y : new Date().getFullYear() + 10;
  const minYear = minP ? minP.y : maxYear - 100;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  const anchor = selected || parseISO(max && max < today ? max : today);
  const [view, setView] = useState({ y: anchor.y, m: anchor.m });

  useDismiss(open, setOpen, wrapRef, triggerRef);

  const togglePicker = () => {
    if (!open) setView({ y: anchor.y, m: anchor.m });
    setOpen((o) => !o);
  };

  const emit = (iso) => onChange({ target: { value: iso } });

  const pick = (day) => {
    emit(toISO(view.y, view.m, day));
    setOpen(false);
    triggerRef.current?.focus();
  };

  const clear = () => {
    emit('');
    setOpen(false);
    triggerRef.current?.focus();
  };

  const ym = view.y * 12 + view.m;
  const lowYM = minP ? minP.y * 12 + minP.m : minYear * 12;
  const highYM = maxP ? maxP.y * 12 + maxP.m : maxYear * 12 + 11;
  const shift = (delta) => {
    const n = ym + delta;
    setView({ y: Math.floor(n / 12), m: n % 12 });
  };

  const firstDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length < 42) cells.push(null);

  return (
    <div className="flex flex-col w-full relative" ref={wrapRef}>
      <FieldLabel optional={optional} htmlFor={id}>{label}</FieldLabel>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        onClick={togglePicker}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${fieldClass(value)} flex items-center justify-between text-left ${open ? 'border-[#d9856b]' : ''}`}
      >
        <span className={value ? '' : 'text-slate-400'}>{value ? formatDisplay(value) : placeholder}</span>
        <CalendarIcon />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Choose ${label.toLowerCase()}`}
          className="absolute left-0 top-full z-30 mt-1 w-[272px] max-w-[calc(100vw-2rem)] rounded-sm border border-slate-200 bg-white p-3 shadow-lg"
        >
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <button type="button" onClick={() => shift(-1)} disabled={ym <= lowYM} aria-label="Previous month" className={navBtnClass}>
              <Chevron dir="left" />
            </button>
            <div className="flex items-center gap-1 min-w-0">
              <select
                aria-label="Month"
                value={view.m}
                onChange={(e) => setView((v) => ({ ...v, m: +e.target.value }))}
                className={headerSelectClass}
              >
                {MONTHS.map((name, i) => (
                  <option
                    key={name}
                    value={i}
                    disabled={view.y * 12 + i < lowYM || view.y * 12 + i > highYM}
                  >
                    {name.slice(0, 3)}
                  </option>
                ))}
              </select>
              <select
                aria-label="Year"
                value={view.y}
                onChange={(e) => setView((v) => ({ ...v, y: +e.target.value }))}
                className={headerSelectClass}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => shift(1)} disabled={ym >= highYM} aria-label="Next month" className={navBtnClass}>
              <Chevron dir="right" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="h-6 flex items-center justify-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5" role="grid">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} className="h-8" />;
              const iso = toISO(view.y, view.m, day);
              const isSelected = value === iso;
              const isToday = iso === today;
              const disabled = (min && iso < min) || (max && iso > max);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(day)}
                  aria-label={formatDisplay(iso)}
                  aria-pressed={isSelected}
                  className={`h-8 w-full rounded-sm text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50 ${
                    isSelected
                      ? 'bg-[#d9856b] text-white font-bold'
                      : disabled
                        ? 'text-slate-300 cursor-not-allowed'
                        : isToday
                          ? 'border border-[#d9856b] font-semibold text-[#d9856b] hover:bg-[#d9856b]/10'
                          : 'font-medium text-slate-700 hover:bg-[#d9856b]/10 hover:text-[#d9856b]'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={clear}
              disabled={!value}
              className="text-[11px] font-semibold text-slate-500 transition-colors hover:text-red-600 disabled:opacity-40 disabled:hover:text-slate-500 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50 rounded-sm px-1"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold text-slate-500 transition-colors hover:text-[#d9856b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50 rounded-sm px-1"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- Styled dropdown (replaces the native <select> popup) ----------
const ChevronDown = ({ open }) => (
  <svg
    className={`w-4 h-4 shrink-0 text-[#d9856b] transition-transform ${open ? 'rotate-180' : ''}`}
    fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
  </svg>
);

const SelectField = ({ label, value, onChange, options, optional, id, placeholder = 'Select' }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  useDismiss(open, setOpen, wrapRef, triggerRef);

  const selectedIndex = options.indexOf(value);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const openList = () => {
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const emit = (next) => onChange({ target: { value: next } });

  const choose = (option) => {
    emit(option);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const clear = () => {
    emit('');
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(options[active]);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
    }
  };

  return (
    <div className="flex flex-col w-full relative" ref={wrapRef}>
      <FieldLabel optional={optional} htmlFor={id}>{label}</FieldLabel>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => { if (e.key === ' ') e.preventDefault(); }}
        className={`${fieldClass(value)} flex items-center justify-between text-left ${open ? 'border-[#d9856b]' : ''}`}
      >
        <span className={value ? '' : 'text-slate-400'}>{value || placeholder}</span>
        <ChevronDown open={open} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-sm border border-slate-200 bg-white py-1 shadow-lg">
          <div ref={listRef} id={`${id}-list`} role="listbox" aria-label={label} className="max-h-56 overflow-y-auto">
            {options.map((option, i) => {
              const isSelected = option === value;
              return (
                <div
                  key={option}
                  id={`${id}-opt-${i}`}
                  data-idx={i}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(option)}
                  className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                    isSelected ? 'font-bold text-[#d9856b]' : 'font-medium text-slate-700'
                  } ${i === active ? 'bg-[#d9856b]/10' : ''}`}
                >
                  <span>{option}</span>
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-[#d9856b]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
          {value && (
            <div className="mt-1 pt-1 border-t border-slate-100 px-2">
              <button
                type="button"
                onClick={clear}
                className="w-full text-left px-1 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50 rounded-sm"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SectionHeading = ({ title, hint }) => (
  <div className="pt-2 pb-3">
    <h2 className="text-base font-bold text-slate-900 tracking-tight">{title}</h2>
    {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
  </div>
);

const PersonalInfo = ({ data, updateData }) => {
  if (!data) return null;
  const pData = data.personal;

  const handleChange = (field) => (e) => {
    updateData('personal', field, e.target.value);
  };

  const websites =
    Array.isArray(pData.websites) && pData.websites.length > 0
      ? pData.websites
      : [{ id: 'website-0', url: '' }];

  const setWebsites = (list) => updateData('personal', 'websites', list);
  const changeWebsite = (id, url) => setWebsites(websites.map((w) => (w.id === id ? { ...w, url } : w)));
  const hasEmptyWebsite = websites.some((w) => !(w.url || '').trim());
  const addWebsite = () => {
    if (hasEmptyWebsite) return;
    setWebsites([...websites, { id: `website-${Date.now()}`, url: '' }]);
  };
  const removeWebsite = (id) => setWebsites(websites.filter((w) => w.id !== id));

  const hasLicence = !!pData.hasLicence;
  const licenceCode = pData.licenceCode || '';

  return (
    <div className="relative w-full pb-[100px] min-h-screen">
      <div className="max-w-3xl mx-auto w-full px-4">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight mb-1 tracking-tight">
            Personal Information
          </h1>
          <p className="text-xs text-slate-500 font-medium">Add your core details and how employers can reach you.</p>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <SectionHeading title="Profile Photo" hint="A clear headshot makes your resume more personable." />
            <PhotoSection photo={pData.photo} photoStyle={pData.photoStyle} updateData={updateData} />
          </div>

          <hr className="border-slate-100" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField id="pi-first-name" label="First Name" value={pData.firstName} onChange={handleChange('firstName')} placeholder="e.g. Alex" checked />
            <InputField id="pi-last-name" label="Last Name" value={pData.lastName} onChange={handleChange('lastName')} placeholder="e.g. Morgan" checked />
            <div className="sm:col-span-2">
              <InputField id="pi-profession" label="Profession/Title" value={pData.profession} onChange={handleChange('profession')} placeholder="e.g. Software Engineer" />
            </div>
            <InputField id="pi-email" label="Email Address *" value={pData.email} onChange={handleChange('email')} placeholder="e.g. alex@example.com" type="email" />
            <InputField id="pi-phone" label="Phone" value={pData.phone} onChange={handleChange('phone')} placeholder="e.g. +27 82 123 4567" checked type="tel" />
          </div>

          <div>
            <SectionHeading title="Location" />
            <div className="space-y-4">
              <InputField id="pi-street" label="Street address" optional value={pData.streetAddress} onChange={handleChange('streetAddress')} placeholder="e.g. 12 Main Road, Sandton" autoComplete="street-address" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InputField id="pi-city" label="City" value={pData.city} onChange={handleChange('city')} placeholder="e.g. Johannesburg" checked />
                <InputField id="pi-province" label="Province/State" value={pData.province} onChange={handleChange('province')} placeholder="e.g. Gauteng" />
                <InputField id="pi-postal" label="Postal Code" value={pData.postalCode} onChange={handleChange('postalCode')} placeholder="e.g. 2196" />
              </div>
            </div>
          </div>

          <div>
            <SectionHeading title="Links" hint="Add your LinkedIn, portfolio, or GitHub." />
            <div className="space-y-3">
              {websites.map((site, index) => (
                <div key={site.id} className="flex items-end gap-2">
                  <div className="flex-1">
                    <InputField
                      id={`pi-website-${site.id}`}
                      label={index === 0 ? 'Website' : `Website ${index + 1}`}
                      optional
                      value={site.url}
                      onChange={(e) => changeWebsite(site.id, e.target.value)}
                      placeholder={index === 0 ? 'linkedin.com/in/yourname' : 'github.com/yourname'}
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                  {websites.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeWebsite(site.id)}
                      aria-label={`Remove website ${index + 1}`}
                      className="shrink-0 h-[36px] w-[36px] flex items-center justify-center rounded-sm border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {websites.length < MAX_WEBSITES && (
                <button
                  type="button"
                  onClick={addWebsite}
                  disabled={hasEmptyWebsite}
                  title={hasEmptyWebsite ? 'Fill in the current link first' : undefined}
                  className="inline-flex items-center gap-1.5 min-h-[32px] px-4 rounded-sm border border-dashed border-slate-300 bg-white text-xs font-semibold text-slate-600 hover:border-[#d9856b] hover:text-[#d9856b] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-300 disabled:hover:text-slate-600"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14M5 12h14" />
                  </svg>
                  Add another link
                </button>
              )}
            </div>
          </div>

          <div>
            <SectionHeading title="More about you" hint="All optional." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DateField id="pi-dob" label="Date of birth" optional value={pData.dateOfBirth} onChange={handleChange('dateOfBirth')} max={todayISO()} />
              <InputField id="pi-nationality" label="Nationality" optional value={pData.nationality} onChange={handleChange('nationality')} placeholder="e.g. South African" />
              <SelectField id="pi-gender" label="Gender" optional value={pData.gender} onChange={handleChange('gender')} options={GENDER_OPTIONS} />
              <SelectField id="pi-marital" label="Marital status" optional value={pData.maritalStatus} onChange={handleChange('maritalStatus')} options={MARITAL_OPTIONS} />
            </div>
          </div>

          <LicenceSection hasLicence={hasLicence} licenceCode={licenceCode} updateData={updateData} />
        </form>
      </div>
    </div>
  );
};

export default PersonalInfo;