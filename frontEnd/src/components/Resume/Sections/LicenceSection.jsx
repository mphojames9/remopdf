import React, { useEffect, useRef, useState } from 'react';

/* -------------------------------------------------------------------------- */
/*  Driver's licence section.                                                 */
/*  Same saved data as before (personal.hasLicence, personal.licenceCode).    */
/*  Pick a code from the chips, or choose "Other" to type your own.           */
/* -------------------------------------------------------------------------- */

export const LICENCE_CODES = ['A1', 'A', 'B', 'C1', 'C', 'EB', 'EC1', 'EC'];

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60';

const chipClass = (selected) =>
  `inline-flex h-9 min-w-[48px] items-center justify-center rounded-full border px-4 text-[13px] font-medium transition-colors motion-reduce:transition-none ${focusRing} ${
    selected
      ? 'border-[#d9856b] bg-[#d9856b]/10 text-[#8f442b]'
      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
  }`;

const CardIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <circle cx="8.5" cy="10.5" r="2" />
    <path d="M5.5 16c.5-1.4 1.6-2 3-2s2.5.6 3 2M14.5 9.5h3.5M14.5 13h3.5" />
  </svg>
);

const LicenceSection = ({ hasLicence, licenceCode, updateData }) => {
  const code = (licenceCode || '').trim().toUpperCase();
  const isCustomValue = code !== '' && !LICENCE_CODES.includes(code);
  const [otherOpen, setOtherOpen] = useState(isCustomValue);
  const showOther = otherOpen || isCustomValue;

  const otherRef = useRef(null);
  const focusOther = useRef(false);
  useEffect(() => {
    if (showOther && focusOther.current && otherRef.current) {
      otherRef.current.focus();
      focusOther.current = false;
    }
  }, [showOther]);

  const setCode = (value) => updateData('personal', 'licenceCode', value);

  const pickCode = (value) => {
    setOtherOpen(false);
    setCode(code === value ? '' : value);
  };

  const toggleOther = () => {
    if (showOther) {
      setOtherOpen(false);
    } else {
      setOtherOpen(true);
      focusOther.current = true;
    }
    setCode('');
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
      <button
        type="button"
        role="switch"
        aria-checked={!!hasLicence}
        onClick={() => updateData('personal', 'hasLicence', !hasLicence)}
        className={`flex w-full items-center gap-3 rounded-2xl text-left ${focusRing}`}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#d9856b]/10 text-[#b9573a]">
          <CardIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900">Driver's licence</span>
          <span className="block text-xs text-slate-500">Optional. Add it if the job involves driving.</span>
        </span>
        <span
          aria-hidden="true"
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${hasLicence ? 'bg-[#d9856b]' : 'bg-slate-300'}`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${hasLicence ? 'translate-x-5' : ''}`}
          />
        </span>
      </button>

      {hasLicence && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="mb-2 text-xs font-semibold text-slate-800">Licence code</div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Licence code">
            {LICENCE_CODES.map((c) => (
              <button key={c} type="button" aria-pressed={!showOther && code === c} onClick={() => pickCode(c)} className={chipClass(!showOther && code === c)}>
                {c}
              </button>
            ))}
            <button type="button" aria-pressed={showOther} onClick={toggleOther} className={`${chipClass(showOther)} ${showOther ? '' : 'border-dashed'}`}>
              Other
            </button>
          </div>

          {showOther && (
            <div className="mt-3 w-full max-w-[220px]">
              <label htmlFor="pi-licence-code" className="mb-1.5 block text-xs font-semibold text-slate-800">
                Your code
              </label>
              <input
                ref={otherRef}
                id="pi-licence-code"
                type="text"
                value={licenceCode || ''}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. B1"
                maxLength={8}
                autoCapitalize="characters"
                autoComplete="off"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-[#d9856b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/30"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LicenceSection;
