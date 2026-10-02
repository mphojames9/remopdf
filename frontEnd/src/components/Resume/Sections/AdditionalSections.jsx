import React from 'react';
import LanguageLevelSelect from './LanguageLevelSelect';
import AchievementsField from './AchievementsField';
import SpellCheckPanel from './SpellCheckPanel';

/* Icons */
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

/* A small pill switch, scaled down for a tighter aesthetic */
const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
      checked ? 'bg-[#d9856b]' : 'bg-slate-200'
    }`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-4' : 'translate-x-1'
      }`}
    />
  </button>
);

/* Collapsible card with smaller padding, smaller text, and smaller border radius */
const SectionCard = ({ title, description, enabled, onToggle, children }) => (
  <div className="border border-slate-200 rounded-sm bg-white overflow-hidden transition-all">
    <div className="p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <Toggle checked={enabled} onChange={onToggle} />
    </div>
    {enabled && (
      <div className="p-4 sm:p-5 bg-slate-50/40 border-t border-slate-100 flex flex-col gap-3.5">
        {children}
      </div>
    )}
  </div>
);

/* Compact inputs for a more professional, form-like density */
const textInputClass = 'w-full bg-white border border-slate-200 text-slate-900 rounded-sm py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#d9856b] transition-colors';

/* One editable row. Background added to define item boundaries clearly */
const Row = ({ onRemove, children }) => (
  <div className="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-sm">
    <div className="flex-1 min-w-0 flex flex-col gap-3">{children}</div>
    <button
      type="button"
      onClick={onRemove}
      aria-label="Remove"
      className="mt-0.5 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors"
    >
      <IconTrash />
    </button>
  </div>
);

const AddRowButton = ({ onClick, label, disabled = false, disabledHint }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={disabled ? disabledHint : undefined}
    className="self-start flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-sm hover:border-[#d9856b] transition-colors disabled:bg-slate-50 disabled:text-slate-300 disabled:hover:border-slate-200 disabled:cursor-not-allowed"
  >
    <IconPlus /> {label}
  </button>
);

const hasEmptyRow = (items, field) => items.some((item) => !String(item[field] || '').trim());

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* A rich-text field with the live spelling and grammar panel underneath it.
   The panel stays mounted but hidden while the field is empty, so it keeps its state and does not
   flash a "loading" notice when the first character is typed. */
const CheckedField = ({ value, onChange, ...fieldProps }) => {
  const text = typeof value === 'string' ? value : '';
  return (
    <div className="flex flex-col gap-3">
      <AchievementsField {...fieldProps} value={text} onChange={onChange} />
      <div className={text.trim() ? '[&>div]:rounded-sm' : 'hidden'}>
        <SpellCheckPanel text={text} onChange={onChange} />
      </div>
    </div>
  );
};

const AdditionalSections = ({ data, updateData, updateItems }) => {
  if (!data) return null;

  const hobbies = data.hobbies || { enabled: false, text: '' };
  const languages = data.languages || { enabled: false, items: [] };
  const projects = data.projects || { enabled: false, items: [] };
  const references = data.references || { enabled: false, availableUponRequest: false, items: [] };
  const certificates = data.certificates || { enabled: false, items: [] };

  const languageItems = languages.items || [];
  const projectItems = projects.items || [];
  const referenceItems = references.items || [];
  const certificateItems = certificates.items || [];

  const setItem = (section, items, index, field, value) => {
    const next = items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    updateItems(section, next);
  };

  const addItem = (section, items, blank) => updateItems(section, [...items, { id: newId(), ...blank }]);
  const removeItem = (section, items, index) => updateItems(section, items.filter((_, i) => i !== index));

  return (
    <div className="max-w-4xl mx-auto w-full pb-28">
      <h1 className="text-xl lg:text-2xl font-bold text-slate-900 leading-tight mb-1.5">Finalize your Resume</h1>
      <p className="text-xs text-slate-600 mb-6">
        Choose any extra sections you'd like to include, then review and download.
      </p>

      <div className="space-y-4">
        {/* Hobbies & Interests */}
        <SectionCard
          title="Hobbies & Interests"
          description="Show a bit of personality outside of work."
          enabled={!!hobbies.enabled}
          onToggle={(val) => updateData('hobbies', 'enabled', val)}
        >
          <CheckedField
            id="hobbies-text"
            label="Your interests"
            placeholder="e.g. Rock climbing, chess, oil painting..."
            rows={4}
            minHeightClass="min-h-[100px]"
            value={hobbies.text || ''}
            onChange={(value) => updateData('hobbies', 'text', value)}
          />
        </SectionCard>

        {/* Languages (Updated to use LanguageLevelSelect) */}
        <SectionCard
          title="Languages"
          description="Languages you speak and how well."
          enabled={!!languages.enabled}
          onToggle={(val) => updateData('languages', 'enabled', val)}
        >
          {languageItems.map((item, index) => (
            <Row key={item.id} onRemove={() => removeItem('languages', languageItems, index)}>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={item.name || ''}
                  onChange={(e) => setItem('languages', languageItems, index, 'name', e.target.value)}
                  placeholder="Language (e.g., French)"
                  className={`${textInputClass} w-full sm:w-2/3`}
                />
                <LanguageLevelSelect
                  value={item.level || ''}
                  onChange={(val) => setItem('languages', languageItems, index, 'level', val)}
                />
              </div>
            </Row>
          ))}
          <AddRowButton
            label="Add language"
            disabled={hasEmptyRow(languageItems, 'name')}
            disabledHint="Enter a language before adding another"
            onClick={() => addItem('languages', languageItems, { name: '', level: '' })}
          />
        </SectionCard>

        {/* Projects */}
        <SectionCard
          title="Projects"
          description="Personal or professional projects worth mentioning."
          enabled={!!projects.enabled}
          onToggle={(val) => updateData('projects', 'enabled', val)}
        >
          {projectItems.map((item, index) => (
            <Row key={item.id} onRemove={() => removeItem('projects', projectItems, index)}>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={item.title || ''}
                  onChange={(e) => setItem('projects', projectItems, index, 'title', e.target.value)}
                  placeholder="Project title"
                  className={`${textInputClass} sm:w-2/3`}
                />
                <input
                  type="text"
                  value={item.link || ''}
                  onChange={(e) => setItem('projects', projectItems, index, 'link', e.target.value)}
                  placeholder="Link (optional)"
                  className={`${textInputClass} sm:w-1/3`}
                />
              </div>
              <CheckedField
                id={`project-desc-${item.id}`}
                label="Description"
                placeholder="What did you build, and what was the impact?"
                rows={4}
                minHeightClass="min-h-[100px]"
                value={item.description || ''}
                onChange={(value) => setItem('projects', projectItems, index, 'description', value)}
              />
            </Row>
          ))}
          <AddRowButton
            label="Add project"
            disabled={hasEmptyRow(projectItems, 'title')}
            disabledHint="Enter a project title before adding another"
            onClick={() => addItem('projects', projectItems, { title: '', link: '', description: '' })}
          />
        </SectionCard>

        {/* Certificates */}
        <SectionCard
          title="Certificates"
          description="Certifications, licences and courses you've completed."
          enabled={!!certificates.enabled}
          onToggle={(val) => updateData('certificates', 'enabled', val)}
        >
          {certificateItems.map((item, index) => (
            <Row key={item.id} onRemove={() => removeItem('certificates', certificateItems, index)}>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={item.name || ''}
                  onChange={(e) => setItem('certificates', certificateItems, index, 'name', e.target.value)}
                  placeholder="Certificate name"
                  className={`${textInputClass} sm:w-2/3`}
                />
                <input
                  type="text"
                  value={item.date || ''}
                  onChange={(e) => setItem('certificates', certificateItems, index, 'date', e.target.value)}
                  placeholder="Date earned"
                  className={`${textInputClass} sm:w-1/3`}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={item.issuer || ''}
                  onChange={(e) => setItem('certificates', certificateItems, index, 'issuer', e.target.value)}
                  placeholder="Issued by (e.g., Google, Microsoft)"
                  className={`${textInputClass} sm:w-2/3`}
                />
                <input
                  type="text"
                  value={item.link || ''}
                  onChange={(e) => setItem('certificates', certificateItems, index, 'link', e.target.value)}
                  placeholder="Link (optional)"
                  className={`${textInputClass} sm:w-1/3`}
                />
              </div>
              <CheckedField
                id={`certificate-desc-${item.id}`}
                label="Description"
                placeholder="What did this certificate cover, or what skills did it prove?"
                rows={4}
                minHeightClass="min-h-[100px]"
                value={item.description || ''}
                onChange={(value) => setItem('certificates', certificateItems, index, 'description', value)}
              />
            </Row>
          ))}
          <AddRowButton
            label="Add certificate"
            disabled={hasEmptyRow(certificateItems, 'name')}
            disabledHint="Enter a certificate name before adding another"
            onClick={() => addItem('certificates', certificateItems, { name: '', issuer: '', date: '', link: '', description: '' })}
          />
        </SectionCard>

        {/* References */}
        <SectionCard
          title="References"
          description="Let employers know who can vouch for you."
          enabled={!!references.enabled}
          onToggle={(val) => updateData('references', 'enabled', val)}
        >
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!references.availableUponRequest}
              onChange={(e) => updateData('references', 'availableUponRequest', e.target.checked)}
              className="w-3.5 h-3.5 accent-[#d9856b] rounded-sm"
            />
            Just say "Available upon request"
          </label>

          {!references.availableUponRequest && (
            <>
              {referenceItems.map((item, index) => (
                <Row key={item.id} onRemove={() => removeItem('references', referenceItems, index)}>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={item.name || ''}
                      onChange={(e) => setItem('references', referenceItems, index, 'name', e.target.value)}
                      placeholder="Full name"
                      className={`${textInputClass} sm:w-1/3`}
                    />
                    <input
                      type="text"
                      value={item.relationship || ''}
                      onChange={(e) => setItem('references', referenceItems, index, 'relationship', e.target.value)}
                      placeholder="Relationship / Title"
                      className={`${textInputClass} sm:w-1/3`}
                    />
                    <input
                      type="text"
                      value={item.contact || ''}
                      onChange={(e) => setItem('references', referenceItems, index, 'contact', e.target.value)}
                      placeholder="Phone or email"
                      className={`${textInputClass} sm:w-1/3`}
                    />
                  </div>
                </Row>
              ))}
              <AddRowButton
                label="Add reference"
                disabled={hasEmptyRow(referenceItems, 'name')}
                disabledHint="Enter a name before adding another"
                onClick={() => addItem('references', referenceItems, { name: '', relationship: '', contact: '' })}
              />
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default AdditionalSections;