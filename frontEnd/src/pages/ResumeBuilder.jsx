import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import PersonalInfo from '../components/Resume/Sections/PersonalInfo';
import ExperienceField, { createJob } from '../components/Resume/Sections/ExperienceField';
import EducationField, { createEducation, normalizeEducation } from '../components/Resume/Sections/EducationField';
import SkillsField, { DEFAULT_SKILL_RATING } from '../components/Resume/Sections/SkillsField';
import Summary from '../components/Resume/Sections/Summary';
import ResumeUpload from '../components/Resume/Sections/ResumeUpload';
import BuilderSidebar from '../components/Resume/Sections/BuilderSidebar';
import AdditionalSections from '../components/Resume/Sections/AdditionalSections';
import AuthModal, { AuthButtons } from '../components/Auth/AuthModal';
import { DEFAULT_LANGUAGE_LEVEL } from '../components/Resume/Sections/LanguageLevelSelect';
import { PHOTO_DEFAULTS } from '../components/Resume/Sections/ResumePhoto';
import demoPhoto from '../assets/profile.webp';
import { downloadBlob } from '../api/client';
import { fetchResume } from '../api/resume';
import { getPaymentStatus } from '../api/payments';
import { setPremiumAccess, onUpgradeRequest, usePremiumAccess, setSignedIn, onSignInRequest } from '../hooks/premiumAccess';
import PaymentModal from '../components/Payment/PaymentModal';
import useResumeProfile, { getSessionUser } from '../hooks/useResumeProfile';
import ResumeSyncDialog, { ResumeLoadingOverlay } from '../components/Auth/ResumeSyncDialog';
import ResumePickerDialog from '../components/Auth/ResumePickerDialog';
import CoverLetterBuilder from '../components/CoverLetter/CoverLetterBuilder';
import JobTargetStudio from '../components/Resume/Sections/JobTargetStudio';
import JobTargetBar from '../components/Resume/Sections/JobTargetBar';
import { sanitizeJobTarget, hasJobTarget } from '../components/Resume/Sections/jobMatchAI';
import { buildResumePdf } from '../utils/resumePdf';
import { 
  TEMPLATE_COMPONENTS,
  TEMPLATE_IDS,
  DEFAULT_TEMPLATE,
  TemplateThumb,
  TEMPLATE_CARDS,
  IconPencil,
  IconTrash,
  PAGE_NUMBER_FORMATS,
  DEFAULT_PAGE_NUMBERS,
  normalizePageNumbers,
  PageNumberContext,
  WatermarkContext,
  SECTION_META,
  PAGE_WIDTH_PX,
  DEFAULT_ACCENT,
  ACCENT_SWATCHES,
} from '../components/Resume/Templates';

// Resolves after the browser has painted the next frame (with a short fallback), so the download
// overlay is on screen before the heavy PDF rendering starts blocking the main thread.
const nextPaint = () => new Promise((resolve) => {
  requestAnimationFrame(() => setTimeout(resolve, 0));
  setTimeout(resolve, 150);
});

/* Icons */
const IconMenu = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IconClose = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconDownload = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3v12" />
    <path d="M7 11l5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);

const IconChevronUp = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 15l-6-6-6 6" />
  </svg>
);

const IconSliders = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <line x1="4" y1="7" x2="20" y2="7" />
    <circle cx="9" cy="7" r="2.3" fill="#ffffff" />
    <line x1="4" y1="17" x2="20" y2="17" />
    <circle cx="15" cy="17" r="2.3" fill="#ffffff" />
  </svg>
);

const IconGrip = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
  </svg>
);

const IconChevronDown = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 9l6 6 6-6" />
  </svg>
);

const IconReset = ({ className = 'w-2.5 h-2.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const STORAGE_KEY_DATA = 'resumeBuilder:resumeData';
const STORAGE_KEY_HIDDEN_SECTIONS = 'resumeBuilder:hiddenSections';
const STORAGE_KEY_SECTION_ORDER = 'resumeBuilder:sectionOrder';
const STORAGE_KEY_TEMPLATE = 'resumeBuilder:selectedTemplate';
const STORAGE_KEY_PAGE_NUMBERS = 'resumeBuilder:pageNumbers';

// Printed at the bottom of every page of a downloaded PDF when the account does not have Premium.
const DOWNLOAD_WATERMARK = 'Created with RemoPDF \u00b7 remopdf.site';

const DEFAULT_SECTION_ORDER = ['summary', 'experience', 'education', 'certificates', 'skills', 'projects', 'languages', 'hobbies', 'references'];

// SECTION_META (from Templates) may not have an entry for every reorderable key, which crashed the
// "Section order" list. These labels are used whenever an entry is missing.
const FALLBACK_SECTION_LABELS = {
  summary: 'Summary',
  experience: 'Work history',
  education: 'Education',
  certificates: 'Certificates',
  skills: 'Skills',
  projects: 'Projects',
  languages: 'Languages',
  hobbies: 'Hobbies & interests',
  references: 'References',
};
const getSectionMeta = (key) => SECTION_META[key] || { label: FALLBACK_SECTION_LABELS[key] || key };

// Keeps the user's saved order, drops unknown/duplicate keys, and appends any
// section that is missing (e.g. an order saved before Projects, Languages,
// Hobbies & Interests, References and Certificates could be reordered).
const normalizeSectionOrder = (saved) => {
  const kept = Array.isArray(saved)
    ? saved.filter((key, i) => DEFAULT_SECTION_ORDER.includes(key) && saved.indexOf(key) === i)
    : [];
  return [...kept, ...DEFAULT_SECTION_ORDER.filter((key) => !kept.includes(key))];
};

// Demo resume for the "All templates" thumbnails. It is only shown while the user's own resume is
// still empty, so every template previews with real-looking content in every section instead of
// "Nothing entered yet". It is already in the shape the templates receive (same as templateProps),
// and createJob() / createEducation() supply any field this file does not set, so a template never
// reads an undefined field. Plain text only (no rich-text markup) so it renders the same everywhere.
const DEMO_PERSONAL = {
  firstName: 'Alex',
  lastName: 'Morgan',
  profession: 'Senior Marketing Manager',
  streetAddress: '24 Garden Avenue',
  city: 'Riverside',
  province: 'Central',
  postalCode: '1200',
  phone: '(555) 010-2030',
  email: 'alex.morgan@example.com',
  dateOfBirth: '',
  nationality: 'British',
  gender: '',
  maritalStatus: '',
  hasLicence: true,
  licenceCode: 'B',
  websites: [{ url: 'linkedin.com/in/alexmorgan' }],
  photo: demoPhoto,
  photoStyle: { ...PHOTO_DEFAULTS },
};

const DEMO_TEMPLATE_PROPS = {
  fullName: 'Alex Morgan',
  personal: DEMO_PERSONAL,
  contactList: [
    'alex.morgan@example.com',
    '(555) 010-2030',
    '24 Garden Avenue, Riverside, Central',
    'linkedin.com/in/alexmorgan',
    'Nationality: British',
    "Driver's licence: Code B",
  ],
  summary: 'Results-driven marketing manager with 8+ years of experience leading brand, digital and content teams. Known for turning data into clear strategy, growing qualified leads and mentoring high-performing teams.',
  jobs: [
    {
      ...createJob(),
      id: 'demo-job-1',
      title: 'Senior Marketing Manager',
      employer: 'Brightwave Media',
      location: 'Riverside',
      city: 'Riverside',
      startMonth: 'Mar',
      startYear: '2021',
      endMonth: '',
      endYear: '',
      current: true,
      startDate: 'Mar 2021',
      endDate: 'Present',
      description: 'Lead a team of 7 across brand, performance and content. Grew qualified leads by 64% in two years and cut cost per acquisition by 28%. Launched a new customer newsletter that reached 40,000 subscribers.',
      achievements: 'Lead a team of 7 across brand, performance and content. Grew qualified leads by 64% in two years and cut cost per acquisition by 28%. Launched a new customer newsletter that reached 40,000 subscribers.',
    },
    {
      ...createJob(),
      id: 'demo-job-2',
      title: 'Digital Marketing Specialist',
      employer: 'Northfield Group',
      location: 'Riverside',
      city: 'Riverside',
      startMonth: 'Jun',
      startYear: '2017',
      endMonth: 'Feb',
      endYear: '2021',
      current: false,
      startDate: 'Jun 2017',
      endDate: 'Feb 2021',
      description: 'Managed paid search and social campaigns with a yearly budget of 1.2M. Introduced weekly reporting dashboards that sped up decisions across the sales and product teams.',
      achievements: 'Managed paid search and social campaigns with a yearly budget of 1.2M. Introduced weekly reporting dashboards that sped up decisions across the sales and product teams.',
    },
  ],
  educations: [
    {
      ...createEducation(),
      id: 'demo-edu-1',
      institution: 'Riverside University',
      degree: 'BCom in Marketing Management',
      gradMonth: 'Nov',
      gradYear: '2016',
      date: 'Nov 2016',
    },
    {
      ...createEducation(),
      id: 'demo-edu-2',
      institution: 'Central Business College',
      degree: 'Diploma in Digital Marketing',
      gradMonth: 'Dec',
      gradYear: '2014',
      date: 'Dec 2014',
    },
  ],
  namedSkills: [
    { id: 'demo-skill-1', text: 'Brand Strategy', rating: 5 },
    { id: 'demo-skill-2', text: 'SEO & Content Marketing', rating: 4 },
    { id: 'demo-skill-3', text: 'Google Analytics', rating: 4 },
    { id: 'demo-skill-4', text: 'Team Leadership', rating: 5 },
    { id: 'demo-skill-5', text: 'Campaign Budgeting', rating: 3 },
  ],
  certificates: {
    enabled: true,
    items: [
      { id: 'demo-cert-1', name: 'Google Analytics Certification', issuer: 'Google', year: '2023', date: '2023' },
      { id: 'demo-cert-2', name: 'Professional Certified Marketer', issuer: 'AMA', year: '2021', date: '2021' },
    ],
  },
  projects: {
    enabled: true,
    items: [
      { id: 'demo-proj-1', title: 'Brand Relaunch 2024', description: 'Led the rebrand of a 15-year-old product line, from research to launch, lifting brand recall by 35%.' },
      { id: 'demo-proj-2', title: 'Customer Newsletter', description: 'Built a monthly newsletter from scratch that now reaches 40,000 subscribers.' },
    ],
  },
  languages: {
    enabled: true,
    items: [
      { id: 'demo-lang-1', name: 'English', level: 'Native' },
      { id: 'demo-lang-2', name: 'French', level: DEFAULT_LANGUAGE_LEVEL },
      { id: 'demo-lang-3', name: 'Spanish', level: 'Intermediate' },
    ],
  },
  hobbies: { enabled: true, text: 'Trail running, photography, volunteer mentoring and cooking.' },
  references: {
    enabled: true,
    availableUponRequest: false,
    items: [
      { id: 'demo-ref-1', name: 'Jordan Ellis', company: 'Brightwave Media', title: 'Chief Marketing Officer', phone: '(555) 010-4455', email: 'jordan.ellis@example.com' },
    ],
  },
  isEmpty: false,
};

// Slim, rounded scrollbars. `.pro-scroll` suits light surfaces; add `.pro-scroll-dark` on dark ones.
// The thumb is drawn inside a transparent border so it looks thin and floats off the edge,
// then thickens on hover and while dragging. Firefox has no ::-webkit-scrollbar, so it gets
// the standard properties instead (Chrome ignores the webkit rules if those are set, hence @supports).
const SCROLLBAR_CSS = `
.pro-scroll { --sb-thumb: #cbd5e1; --sb-thumb-hover: #94a3b8; --sb-thumb-active: #64748b; }
.pro-scroll-dark { --sb-thumb: rgba(255,255,255,.16); --sb-thumb-hover: rgba(255,255,255,.3); --sb-thumb-active: rgba(255,255,255,.45); }
.pro-scroll::-webkit-scrollbar { width: 12px; height: 12px; }
.pro-scroll::-webkit-scrollbar-track, .pro-scroll::-webkit-scrollbar-corner { background: transparent; }
.pro-scroll::-webkit-scrollbar-thumb { background-color: var(--sb-thumb); background-clip: padding-box; border: 4px solid transparent; border-radius: 999px; min-height: 44px; }
.pro-scroll::-webkit-scrollbar-thumb:hover { background-color: var(--sb-thumb-hover); border-width: 3px; }
.pro-scroll::-webkit-scrollbar-thumb:active { background-color: var(--sb-thumb-active); border-width: 3px; }
@supports not selector(::-webkit-scrollbar) {
  .pro-scroll { scrollbar-width: thin; scrollbar-color: var(--sb-thumb) transparent; }
}
`;

// Height-animated show/hide (styles live in the preview modal's <style> block). The children stay
// mounted, and overflow is only clipped while the height is moving, so a dropdown inside (like the
// section-order list) is not cut off once the panel has finished opening.
const Collapse = ({ open, children }) => {
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!open) {
      setFull(false);
      return undefined;
    }
    const t = setTimeout(() => setFull(true), 350);
    return () => clearTimeout(t);
  }, [open]);
  return (
    <div className={`cz-collapse ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className={`cz-collapse-inner ${open && full ? 'is-full' : ''}`}>{children}</div>
    </div>
  );
};

// Removes the inline transforms the section-order drag puts on the rows.
const clearRowStyles = (rows) => {
  Object.values(rows).forEach((el) => {
    if (!el) return;
    el.style.transform = '';
    el.style.transition = '';
    el.style.zIndex = '';
    el.style.boxShadow = '';
  });
};

/* -------------------------------------------------------------------------- */
/*                            Preview Modal                                   */
/* -------------------------------------------------------------------------- */

// Which existing form opens when a section of the resume is clicked in edit mode.
// Projects, Languages, Hobbies, References and Certificates all live in the Finalize form.
const SECTION_EDITORS = {
  personal: { title: 'Heading', Component: PersonalInfo },
  experience: { title: 'Work history', Component: ExperienceField },
  education: { title: 'Education', Component: EducationField },
  skills: { title: 'Skills', Component: SkillsField },
  summary: { title: 'Summary', Component: Summary },
  projects: { title: 'Additional sections', Component: AdditionalSections },
  languages: { title: 'Additional sections', Component: AdditionalSections },
  hobbies: { title: 'Additional sections', Component: AdditionalSections },
  references: { title: 'Additional sections', Component: AdditionalSections },
  certificates: { title: 'Additional sections', Component: AdditionalSections },
};

const ResumePreviewModal = ({ data, template, setTemplate, color, setColor, sectionOrder: savedSectionOrder, setSectionOrder, hiddenSections, setHiddenSections, pageNumbers, setPageNumbers, editorProps, checkPremium, onClose }) => {
  const sectionOrder = normalizeSectionOrder(savedSectionOrder);
  // Sections the user removed from the resume. Their information is kept, they
  // are only left out of the template (and can be added back at any time).
  const hidden = (Array.isArray(hiddenSections) ? hiddenSections : []).filter((key) => DEFAULT_SECTION_ORDER.includes(key));
  const visibleOrder = sectionOrder.filter((key) => !hidden.includes(key));
  const { personal, education, skills, summary, hobbies, languages, projects, references, certificates } = data;
  // Only jobs with a title or employer show on the resume; empty forms are skipped.
  const jobs = (Array.isArray(data.experiences) ? data.experiences : []).filter((j) => j.title || j.employer);
  // Only qualifications with an institution or degree show on the resume; empty forms are skipped.
  const educations = (Array.isArray(education) ? education : [])
    .filter((e) => e.institution || e.degree)
    .map((e) => ({ ...e, date: [e.gradMonth, e.gradYear].filter(Boolean).join(' ') }));
  const accentColor = color || DEFAULT_ACCENT[template] || DEFAULT_ACCENT['blue-sidebar'];
  const isCustomColor = color && !ACCENT_SWATCHES.some((s) => s.hex === color);

  const [sectionOrderOpen, setSectionOrderOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  // Small screens: the footer actions (Edit / Download / Close) live in a menu instead of a footer bar.
  const [actionsOpen, setActionsOpen] = useState(false);
  // True while the PDF is being rendered, so the Download buttons can't be tapped twice.
  const [downloading, setDownloading] = useState(false);

  // Drag and drop for the section-order list. Pointer events cover mouse, pen and touch. While a row is
  // dragged the rows are moved with inline transforms (no React re-render of the heavy preview on every
  // pointer move); the new order is committed once, when the row is dropped.
  const listRef = useRef(null);
  const rowRefs = useRef({});
  const dragRef = useRef(null);
  const settlingRef = useRef(false);
  const pendingClearRef = useRef(false);

  // After the new order has rendered, drop the temporary transforms before the browser paints.
  useLayoutEffect(() => {
    if (!pendingClearRef.current) return;
    pendingClearRef.current = false;
    settlingRef.current = false;
    clearRowStyles(rowRefs.current);
  });
  useEffect(() => () => {
    if (dragRef.current) cancelAnimationFrame(dragRef.current.raf);
  }, []);

  // Edit mode: click a section on the resume to edit it in its existing form, or
  // use the bin on its heading to remove it.
  const [editMode, setEditMode] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [hoverSection, setHoverSection] = useState(null);
  const [undoKey, setUndoKey] = useState(null);

  // Small screens: the Customize / templates pane is a bottom sheet that a button opens. On larger
  // screens it is the permanent right-hand pane and this state is ignored.
  const [panelOpen, setPanelOpen] = useState(false);
  // One-off notification that says what is inside the button; it shows shortly after the preview opens.
  const [hintOpen, setHintOpen] = useState(false);
  const hintDismissedRef = useRef(false);
  const dismissHint = () => {
    hintDismissedRef.current = true;
    setHintOpen(false);
  };
  useEffect(() => {
    const show = setTimeout(() => { if (!hintDismissedRef.current) setHintOpen(true); }, 500);
    const hide = setTimeout(() => setHintOpen(false), 8000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  // When a section editor is finished (Done, removed, edit mode switched off), close the sheet again.
  const hadEditorRef = useRef(false);
  useEffect(() => {
    if (editingSection) {
      hadEditorRef.current = true;
    } else if (hadEditorRef.current) {
      hadEditorRef.current = false;
      setPanelOpen(false);
    }
  }, [editingSection]);

  useEffect(() => {
    if (!undoKey) return undefined;
    const timer = setTimeout(() => setUndoKey(null), 7000);
    return () => clearTimeout(timer);
  }, [undoKey]);

  const toggleEditMode = () => {
    setEditMode((on) => !on);
    setEditingSection(null);
    setHoverSection(null);
  };

  const removeSection = (key) => {
    if (!DEFAULT_SECTION_ORDER.includes(key)) return;
    setHiddenSections((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setEditingSection((current) => (current === key ? null : current));
    setUndoKey(key);
  };

  const restoreSection = (key) => {
    setHiddenSections((prev) => prev.filter((k) => k !== key));
    setUndoKey(null);
  };

  const openEditor = (key) => {
    setEditingSection(key);
    setPanelOpen(true);
  };

  const edit = { enabled: editMode, onEdit: openEditor, onRemove: removeSection };

  const handleResumeClick = (e) => {
    const el = e.target.closest && e.target.closest('[data-section]');
    if (el) openEditor(el.getAttribute('data-section'));
  };

  const handleResumeHover = (e) => {
    const el = e.target.closest && e.target.closest('[data-section]');
    const key = el ? el.getAttribute('data-section') : null;
    setHoverSection((prev) => (prev === key ? prev : key));
  };

  const editor = editingSection ? SECTION_EDITORS[editingSection] : null;
  const EditorForm = editor ? editor.Component : null;

  const containerRef = useRef(null);
  const pageRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [pageHeight, setPageHeight] = useState(0);
  const [autoFit, setAutoFit] = useState(true);

  useLayoutEffect(() => {
    const recompute = () => {
      if (!containerRef.current || !pageRef.current) return;
      const available = containerRef.current.clientWidth - 32;
      const fitScale = Math.max(0.25, Math.min(1, available / PAGE_WIDTH_PX));
      setScale((prev) => (autoFit ? fitScale : prev));
      setPageHeight(pageRef.current.scrollHeight);
    };
    recompute();

    const ro = new ResizeObserver(recompute);
    if (containerRef.current) ro.observe(containerRef.current);
    if (pageRef.current) ro.observe(pageRef.current);
    window.addEventListener('resize', recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [autoFit, template]);

  const zoomOut = () => { setAutoFit(false); setScale((s) => Math.max(0.4, +(s - 0.1).toFixed(2))); };
  const zoomIn = () => { setAutoFit(false); setScale((s) => Math.min(1.5, +(s + 0.1).toFixed(2))); };
  const resetZoom = () => setAutoFit(true);

  const moveSection = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= sectionOrder.length) return;
    const next = [...sectionOrder];
    [next[index], next[target]] = [next[target], next[index]];
    setSectionOrder(next);
  };

  const updateDrag = () => {
    const d = dragRef.current;
    const list = listRef.current;
    if (!d || !list) return;
    const n = d.order.length;
    const raw = (d.pointerY - d.startY) + (list.scrollTop - d.startScroll);
    const dy = Math.max(-d.from * d.pitch, Math.min((n - 1 - d.from) * d.pitch, raw));
    d.over = Math.round(d.from + dy / d.pitch);
    const dragged = rowRefs.current[d.order[d.from]];
    if (dragged) dragged.style.transform = `translateY(${dy}px) scale(1.02)`;
    d.order.forEach((k, i) => {
      if (i === d.from) return;
      const el = rowRefs.current[k];
      if (!el) return;
      let shift = 0;
      if (d.from < d.over && i > d.from && i <= d.over) shift = -d.pitch;
      else if (d.from > d.over && i >= d.over && i < d.from) shift = d.pitch;
      el.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  };

  // Scrolls the list while a row is held near its top or bottom edge (small screens).
  const autoScrollTick = () => {
    const d = dragRef.current;
    const list = listRef.current;
    if (!d || !list) return;
    const rect = list.getBoundingClientRect();
    const edge = 44;
    let speed = 0;
    if (d.pointerY < rect.top + edge) speed = -Math.min(16, 2 + (rect.top + edge - d.pointerY) / 4);
    else if (d.pointerY > rect.bottom - edge) speed = Math.min(16, 2 + (d.pointerY - (rect.bottom - edge)) / 4);
    if (speed) {
      const before = list.scrollTop;
      list.scrollTop += speed;
      if (list.scrollTop !== before) updateDrag();
    }
    d.raf = requestAnimationFrame(autoScrollTick);
  };

  const startDrag = (e, index) => {
    const list = listRef.current;
    if (dragRef.current || settlingRef.current || !list) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const order = [...sectionOrder];
    const rows = order.map((k) => rowRefs.current[k]);
    if (rows.some((r) => !r)) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety, not required */ }
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const ease = reduce ? 'none' : 'transform 180ms cubic-bezier(.22,1,.36,1)';
    rows.forEach((el, i) => { el.style.transition = i === index ? 'none' : ease; });
    rows[index].style.zIndex = '10';
    rows[index].style.boxShadow = '0 10px 24px rgba(15,23,42,0.18)';
    dragRef.current = {
      order,
      from: index,
      over: index,
      pitch: rows.length > 1 ? rows[1].offsetTop - rows[0].offsetTop : rows[0].offsetHeight + 8,
      startY: e.clientY,
      pointerY: e.clientY,
      startScroll: list.scrollTop,
      pointerId: e.pointerId,
      raf: 0,
      reduce,
    };
    updateDrag();
    dragRef.current.raf = requestAnimationFrame(autoScrollTick);
  };

  const moveDrag = (e) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    d.pointerY = e.clientY;
    updateDrag();
  };

  const endDrag = (cancel) => {
    const d = dragRef.current;
    if (!d) return;
    cancelAnimationFrame(d.raf);
    dragRef.current = null;
    settlingRef.current = true;
    const target = cancel ? d.from : d.over;
    const dragged = rowRefs.current[d.order[d.from]];
    if (dragged) {
      dragged.style.transition = d.reduce ? 'none' : 'transform 160ms cubic-bezier(.22,1,.36,1), box-shadow 160ms ease';
      dragged.style.transform = `translateY(${(target - d.from) * d.pitch}px)`;
      dragged.style.boxShadow = '';
    }
    if (cancel) {
      d.order.forEach((k, i) => {
        if (i !== d.from && rowRefs.current[k]) rowRefs.current[k].style.transform = '';
      });
    }
    // Let the dragged row settle into its slot, then commit the new order.
    window.setTimeout(() => {
      if (target === d.from) {
        clearRowStyles(rowRefs.current);
        settlingRef.current = false;
        return;
      }
      const next = [...d.order];
      const [moved] = next.splice(d.from, 1);
      next.splice(target, 0, moved);
      pendingClearRef.current = true;
      setSectionOrder(next);
      // Safety net in case no render follows.
      window.setTimeout(() => {
        if (pendingClearRef.current) {
          pendingClearRef.current = false;
          clearRowStyles(rowRefs.current);
        }
        settlingRef.current = false;
      }, 400);
    }, d.reduce ? 0 : 170);
  };

  const fullName = [personal.firstName, personal.lastName].filter(Boolean).join(' ');
  const websiteList = (Array.isArray(personal.websites) ? personal.websites : [])
    .map((w) => String((w && w.url) || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, ''))
    .filter(Boolean);
  const birthDate = personal.dateOfBirth ? new Date(`${personal.dateOfBirth}T00:00:00`) : null;
  const birthDateText = birthDate && !Number.isNaN(birthDate.getTime())
    ? birthDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const licenceCodeText = String(personal.licenceCode || '').trim();
  const contactList = [
    personal.email,
    personal.phone,
    [personal.streetAddress, personal.city, personal.province].filter(Boolean).join(', '),
    ...websiteList,
    birthDateText && `Born: ${birthDateText}`,
    personal.nationality && `Nationality: ${personal.nationality}`,
    personal.gender && `Gender: ${personal.gender}`,
    personal.maritalStatus && `Marital status: ${personal.maritalStatus}`,
    personal.hasLicence && `Driver's licence${licenceCodeText ? `: Code ${licenceCodeText}` : ''}`,
  ].filter(Boolean);

  const namedSkills = (skills || []).filter((s) => s.text);

  const hasHobbies = !!(hobbies?.enabled && hobbies.text);
  const hasLanguages = !!(languages?.enabled && (languages.items || []).some((l) => l.name));
  const hasProjects = !!(projects?.enabled && (projects.items || []).some((p) => p.title || p.description));
  const hasReferences = !!(references?.enabled && (references.availableUponRequest || (references.items || []).some((r) => r.name)));
  const hasCertificates = !!(certificates?.enabled && (certificates.items || []).some((c) => c.name || c.issuer));

  const isEmpty = !fullName && !summary && jobs.length === 0 && !educations.some((e) => e.institution) && namedSkills.length === 0
    && !hasHobbies && !hasLanguages && !hasProjects && !hasReferences && !hasCertificates;

  // The watermark is part of the template pages, so it is visible in the preview too. Shown until Premium is
  // confirmed; the download asks the server again (checkPremium) before it decides.
  const premiumAccess = usePremiumAccess();
  const previewWatermark = premiumAccess === true ? '' : DOWNLOAD_WATERMARK;

  // Download = render the resume's A4 pages into a real PDF file and save it with the
  // app's existing download code (downloadBlob in api/client), so it also works inside
  // the Android WebView where window.print() does nothing.
  const runDownload = async () => {
    if (downloading) return;
    const source = document.getElementById('resume-preview-content');
    const pageNodes = source ? Array.from(source.querySelectorAll('.a4-page')) : [];
    if (pageNodes.length === 0) return;

    const baseName = (fullName ? `${fullName} - Resume` : 'Resume').replace(/[\\/:*?"<>|]/g, '').trim() || 'Resume';
    setDownloading(true);
    try {
      // Premium gets a clean PDF; everyone else gets a small "Created with RemoPDF" label at the bottom of each page.
      const isPremium = typeof checkPremium === 'function' ? await checkPremium() : false;
      await nextPaint();
      const bytes = await buildResumePdf(pageNodes, {
        pageWidthPx: PAGE_WIDTH_PX,
        title: baseName,
        watermark: isPremium ? null : DOWNLOAD_WATERMARK,
      });
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${baseName}.pdf`);
    } catch (err) {
      console.error('Resume PDF export failed', err);
      window.alert('Sorry, the PDF could not be created. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Every Download button goes through here. Nobody is blocked: runDownload asks checkPremium and adds the
  // watermark when the account is not Premium.
  const downloadResume = () => {
    if (downloading) return;
    runDownload();
  };

  const templateProps = { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder: visibleOrder, edit };

  // The "All templates" thumbnails show the demo resume (every section filled in) while the user's
  // own resume is empty, and switch to their real resume as soon as they enter something. The demo
  // ignores hidden sections so every section is visible in the thumbnails. To always show the demo,
  // change this to `const thumbProps = demoProps;`.
  const demoProps = { ...DEMO_TEMPLATE_PROPS, sectionOrder };
  const thumbProps = isEmpty ? demoProps : templateProps;

  const renderActiveTemplate = () => {
    const Template = TEMPLATE_COMPONENTS[template] || TEMPLATE_COMPONENTS[DEFAULT_TEMPLATE];
    return <Template {...templateProps} />;
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/70"
      onClick={onClose}
    >
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          body * { visibility: hidden; }
          #resume-preview-content, #resume-preview-content * { visibility: visible; }
          #resume-preview-content {
            position: absolute !important;
            top: 0; left: 0;
            width: 210mm !important;
            transform: none !important;
          }
          .a4-page {
            width: 210mm !important;
            height: 297mm !important;
            page-break-after: always;
            break-after: page;
            box-shadow: none !important;
            margin: 0 !important;
          }
        }
        @media print {
          .edit-ui { display: none !important; }
          [data-section] { box-shadow: none !important; outline: none !important; }
        }
        .resume-edit-on [data-section] { cursor: pointer; }
        ${editMode && hoverSection ? `.resume-edit-on [data-section="${hoverSection}"] { outline: 2px dotted #60a5fa; outline-offset: -1px; }` : ''}
        ${editMode && editingSection ? `.resume-edit-on [data-section="${editingSection}"] { outline: 2px dotted #2563eb; outline-offset: -1px; }` : ''}
        .cz-collapse { display: grid; grid-template-rows: 0fr; opacity: 0; visibility: hidden; transition: grid-template-rows .32s cubic-bezier(.22,1,.36,1), opacity .2s ease, visibility 0s linear .32s; }
        .cz-collapse.is-open { grid-template-rows: 1fr; opacity: 1; visibility: visible; transition: grid-template-rows .32s cubic-bezier(.22,1,.36,1), opacity .25s ease .04s, visibility 0s; }
        .cz-collapse-inner { min-height: 0; overflow: hidden; }
        .cz-collapse-inner.is-full { overflow: visible; }
        .cz-row { opacity: 0; transform: translateY(-6px); transition: opacity .25s ease, transform .32s cubic-bezier(.22,1,.36,1); }
        .cz-collapse.is-open .cz-row { opacity: 1; transform: none; }
        .cz-collapse.is-open .cz-row:nth-child(1) { transition-delay: .05s; }
        .cz-collapse.is-open .cz-row:nth-child(2) { transition-delay: .10s; }
        .cz-collapse.is-open .cz-row:nth-child(3) { transition-delay: .15s; }
        @keyframes cz-pop { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: none; } }
        .cz-pop { animation: cz-pop .18s ease-out; transform-origin: top; }
        .cz-sheet { transform: translateY(100%); visibility: hidden; transition: transform .3s cubic-bezier(.22,1,.36,1), visibility .3s; }
        .cz-sheet.is-open { transform: none; visibility: visible; }
        @media (min-width: 768px) { .cz-sheet, .cz-sheet.is-open { transform: none; visibility: visible; transition: none; } }
        @keyframes dl-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dl-rise { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }
        @keyframes dl-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes dl-fan-l { 0%, 100% { transform: rotate(-9deg) translateX(-13px); } 50% { transform: rotate(-14deg) translateX(-19px); } }
        @keyframes dl-fan-r { 0%, 100% { transform: rotate(9deg) translateX(13px); } 50% { transform: rotate(14deg) translateX(19px); } }
        @keyframes dl-write { 0% { transform: scaleX(0); opacity: 1; } 30%, 82% { transform: scaleX(1); opacity: 1; } 100% { transform: scaleX(1); opacity: 0; } }
        @keyframes dl-scan { 0% { transform: translateY(-30px); opacity: 0; } 15%, 85% { opacity: 1; } 100% { transform: translateY(84px); opacity: 0; } }
        @keyframes dl-glow { 0%, 100% { opacity: .14; transform: scale(.92); } 50% { opacity: .28; transform: scale(1.06); } }
        .dl-overlay { animation: dl-fade .18s ease-out; }
        .dl-card { animation: dl-rise .26s cubic-bezier(.22,1,.36,1); }
        .dl-stack { position: relative; width: 120px; height: 100px; }
        .dl-glow {
          position: absolute; left: 50%; top: 50%; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 9999px;
          background: radial-gradient(circle, var(--dl-accent, #2563eb) 0%, transparent 68%); filter: blur(10px);
          animation: dl-glow 2.4s ease-in-out infinite;
        }
        .dl-sheet {
          position: absolute; top: 9px; left: 50%; width: 60px; height: 80px; margin-left: -30px; display: block; overflow: hidden;
          border-radius: 9px; background: #fff; box-shadow: 0 0 0 1px rgba(15,23,42,.07), 0 8px 20px -6px rgba(15,23,42,.25);
        }
        .dl-sheet-l { transform: rotate(-9deg) translateX(-13px); background: #f8fafc; animation: dl-fan-l 2.4s ease-in-out infinite; }
        .dl-sheet-r { transform: rotate(9deg) translateX(13px); background: #f1f5f9; animation: dl-fan-r 2.4s ease-in-out infinite; }
        .dl-sheet-front { animation: dl-float 2.4s ease-in-out infinite; }
        .dl-head { display: flex; align-items: center; gap: 5px; height: 21px; padding: 0 7px; background: linear-gradient(135deg, var(--dl-accent, #2563eb), color-mix(in srgb, var(--dl-accent, #2563eb) 60%, #020617)); background-color: var(--dl-accent, #2563eb); }
        .dl-avatar { flex: none; width: 10px; height: 10px; border-radius: 9999px; background: rgba(255,255,255,.85); }
        .dl-head-lines { display: flex; flex: 1; flex-direction: column; gap: 3px; }
        .dl-body { display: flex; flex-direction: column; gap: 4px; padding: 8px 7px; }
        .dl-line { display: block; height: 3px; border-radius: 9999px; background: #cbd5e1; transform-origin: left center; animation: dl-write 2.4s cubic-bezier(.4,0,.2,1) infinite; animation-delay: calc(var(--i, 0) * .17s); }
        .dl-line.is-head { height: 2.5px; background: rgba(255,255,255,.8); }
        .dl-line.is-title { background: var(--dl-accent, #2563eb); }
        .dl-beam {
          position: absolute; left: 0; right: 0; top: 0; height: 30px; display: block; pointer-events: none;
          background: var(--dl-accent, #2563eb);
          -webkit-mask-image: linear-gradient(to bottom, transparent, #000 85%, transparent); mask-image: linear-gradient(to bottom, transparent, #000 85%, transparent);
          opacity: .22; animation: dl-scan 2.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .cz-collapse, .cz-row, .cz-sheet { transition: none !important; }
          .cz-pop { animation: none; }
          .dl-overlay, .dl-card { animation: none; }
          .dl-glow, .dl-sheet-l, .dl-sheet-r, .dl-sheet-front, .dl-line { animation: none; }
          .dl-beam { display: none; }
        }
      `}</style>

      {/* Download in progress: blocks the screen and shows a resume page being written until the PDF is saved. */}
      {downloading && (
        <div
          className="dl-overlay fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm cursor-wait px-6"
          onClick={(e) => e.stopPropagation()}
          aria-busy="true"
        >
          <div
            role="status"
            aria-live="polite"
            style={{ '--dl-accent': accentColor }}
            className="dl-card w-full max-w-[19rem] rounded-[28px] bg-white px-8 pb-8 pt-9 text-center shadow-[0_28px_70px_-14px_rgba(2,6,23,0.5)] ring-1 ring-slate-900/5"
          >
            <div className="dl-stack mx-auto" aria-hidden="true">
              <span className="dl-glow" />
              <span className="dl-sheet dl-sheet-l" />
              <span className="dl-sheet dl-sheet-r" />
              <span className="dl-sheet dl-sheet-front">
                <span className="dl-head">
                  <span className="dl-avatar" />
                  <span className="dl-head-lines">
                    <span className="dl-line is-head" style={{ '--i': 0, width: '90%' }} />
                    <span className="dl-line is-head" style={{ '--i': 1, width: '60%' }} />
                  </span>
                </span>
                <span className="dl-body">
                  <span className="dl-line is-title" style={{ '--i': 2, width: '40%' }} />
                  <span className="dl-line" style={{ '--i': 3, width: '100%' }} />
                  <span className="dl-line" style={{ '--i': 4, width: '86%' }} />
                  <span className="dl-line" style={{ '--i': 5, width: '62%' }} />
                  <span className="dl-line is-title" style={{ '--i': 6, width: '40%' }} />
                  <span className="dl-line" style={{ '--i': 7, width: '94%' }} />
                </span>
                <span className="dl-beam" />
              </span>
            </div>
            <p className="mt-6 text-[16px] font-semibold tracking-tight text-slate-900">Preparing your PDF</p>
            <p className="mt-1.5 text-[13px] leading-snug text-slate-500">Rendering every page. This only takes a moment.</p>
          </div>
        </div>
      )}

      <div
        className="bg-white w-full h-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Main Body - Split Pane */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row bg-slate-50 min-h-0">
          
          {/* Left Pane - Document Preview */}
          <div className="flex-1 md:flex-1 flex flex-col relative overflow-hidden min-h-0">
            {/* Zoom Controls */}
            <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-10 flex items-center bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-slate-100 px-4 py-1.5 gap-4">
              <button
                type="button"
                onClick={zoomOut}
                className="text-slate-400 hover:text-blue-600 font-medium text-lg leading-none transition-colors focus:outline-none"
              >
                -
              </button>
              <button
                type="button"
                onClick={resetZoom}
                title="Fit to screen"
                className="text-[11px] font-semibold text-slate-700 w-10 text-center focus:outline-none"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                className="text-slate-400 hover:text-blue-600 font-medium text-lg leading-none transition-colors focus:outline-none"
              >
                +
              </button>
            </div>

            {/* Small screens: opens the Customize / templates sheet, with a notification saying what is inside */}
            <div className="md:hidden absolute top-3.5 left-4 z-20">
              <button
                type="button"
                onClick={() => { dismissHint(); setActionsOpen(false); setPanelOpen(true); }}
                aria-haspopup="dialog"
                aria-expanded={panelOpen}
                aria-label="Customize and templates"
                className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white text-slate-700 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.08)] active:scale-95 transition focus:outline-none"
              >
                <IconSliders />
              </button>
              {hintOpen && !panelOpen && (
                <div
                  role="status"
                  className="cz-pop absolute left-0 top-full mt-3 w-64 rounded-xl bg-slate-900 text-white shadow-xl p-3.5 pr-10"
                  style={{ transformOrigin: 'top left' }}
                >
                  <span className="absolute -top-1.5 left-[14px] w-3 h-3 rotate-45 bg-slate-900" aria-hidden="true" />
                  <p className="text-[13px] font-semibold leading-tight">Customize your resume</p>
                  <p className="text-xs leading-snug text-slate-300 mt-1">
                    Colors, section order, page numbers and all templates are inside this button.
                  </p>
                  <button
                    type="button"
                    onClick={dismissHint}
                    aria-label="Dismiss"
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
                  >
                    <IconClose className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Small screens: menu with the actions that the footer shows on larger screens */}
            <div className="sm:hidden absolute top-3.5 right-4 z-20">
              <button
                type="button"
                onClick={() => setActionsOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={actionsOpen}
                aria-label={actionsOpen ? 'Close menu' : 'Open menu'}
                className="relative z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white text-slate-700 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.08)] active:scale-95 transition focus:outline-none"
              >
                {actionsOpen ? <IconClose className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
                {editMode && !actionsOpen && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#d9856b]" />}
              </button>
              {actionsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} />
                  <div
                    role="menu"
                    className="cz-pop absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-20"
                    style={{ transformOrigin: 'top right' }}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setActionsOpen(false); toggleEditMode(); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[13px] font-semibold transition-colors focus:outline-none active:bg-slate-100 ${
                        editMode ? 'bg-[#1e3a8a] text-white active:bg-blue-900' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <IconPencil className="w-3.5 h-3.5" />
                      {editMode ? 'Done editing' : 'Edit resume'}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setActionsOpen(false); downloadResume(); }}
                      disabled={isEmpty || downloading}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors focus:outline-none"
                    >
                      <IconDownload />
                      {downloading ? 'Preparing PDF…' : 'Download'}
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={onClose}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[13px] font-semibold text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-colors focus:outline-none"
                    >
                      <IconClose className="w-4 h-4" />
                      Close preview
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Document Container */}
            <div ref={containerRef} className="pro-scroll flex-1 overflow-y-auto p-4 sm:p-6 md:p-12 pt-20 flex justify-center items-start">
              <div
                className="preview-page-frame relative shrink-0"
                style={{ width: PAGE_WIDTH_PX * scale, height: pageHeight * scale || undefined }}
              >
                <div
                  ref={pageRef}
                  id="resume-preview-content"
                  className="absolute top-0 left-0"
                  style={{ width: PAGE_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: 'top left' }}
                >
                  <div
                    className={editMode ? 'resume-edit-on' : undefined}
                    onClick={editMode ? handleResumeClick : undefined}
                    onMouseOver={editMode ? handleResumeHover : undefined}
                    onMouseLeave={editMode ? () => setHoverSection(null) : undefined}
                  >
                    <PageNumberContext.Provider value={pageNumbers}>
                      <WatermarkContext.Provider value={previewWatermark}>
                        {renderActiveTemplate()}
                      </WatermarkContext.Provider>
                    </PageNumberContext.Provider>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit-mode hint / undo */}
            {editMode && (
              <div className="edit-ui absolute bottom-4 left-1/2 -translate-x-1/2 z-10 max-w-[92%]">
                {undoKey ? (
                  <div className="flex items-center gap-3 bg-slate-900 text-white text-xs font-semibold rounded-full pl-4 pr-2 py-2 shadow-lg">
                    <span>{getSectionMeta(undoKey).label} removed from your resume</span>
                    <button
                      type="button"
                      onClick={() => restoreSection(undoKey)}
                      className="px-3 py-1 rounded-full bg-white text-slate-900 font-semibold hover:bg-slate-200 focus:outline-none"
                    >
                      Undo
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-900/85 text-white text-[11px] font-semibold rounded-full px-4 py-2 shadow-lg text-center pointer-events-none">
                    Click any section to edit it · use the bin to remove it
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Pane - Customization Controls */}
          {/* Dim backdrop behind the sheet (small screens only) */}
          <div
            aria-hidden="true"
            onClick={() => setPanelOpen(false)}
            className={`md:hidden fixed inset-0 z-30 bg-slate-900/25 transition-opacity duration-300 ${panelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          />
          <div
            className={`${editor ? 'md:w-[620px] max-h-[85vh]' : 'md:w-[450px] max-h-[70vh]'} w-full flex flex-col bg-white border-slate-200 overflow-hidden min-h-0 fixed inset-x-0 bottom-0 z-40 rounded-t-2xl shadow-[0_-12px_32px_rgba(15,23,42,0.18)] cz-sheet ${panelOpen ? 'is-open' : ''} md:static md:z-auto md:max-h-none md:flex-none md:rounded-none md:border-l md:shadow-[-10px_0_20px_rgba(0,0,0,0.02)]`}
          >
            {editor ? (
              <div className="flex-1 flex flex-col min-h-0 bg-white">
                <div className="px-6 py-4 flex items-center justify-between gap-3 border-b border-slate-200 shrink-0">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Editing</p>
                    <p className="text-[15px] font-semibold text-slate-800 truncate">{editor.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {editingSection !== 'personal' && SECTION_META[editingSection] && (
                      <button
                        type="button"
                        onClick={() => removeSection(editingSection)}
                        className="px-4 py-2 rounded-full border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors flex items-center gap-1.5 focus:outline-none"
                      >
                        <IconTrash className="w-3 h-3" />
                        Remove
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingSection(null)}
                      className="px-5 py-2 rounded-full bg-[#1e3a8a] text-white text-xs font-semibold hover:bg-blue-900 transition-colors focus:outline-none"
                    >
                      Done
                    </button>
                  </div>
                </div>
                <div className="pro-scroll flex-1 overflow-y-auto p-5 sm:p-6">
                  <EditorForm
                    data={data}
                    {...editorProps}
                    showSkillErrors={false}
                    showLanguageErrors={false}
                  />
                </div>
              </div>
            ) : (
              <>
            {/* Sheet header (small screens only) */}
            <div className="md:hidden shrink-0 flex items-center justify-between pl-6 pr-3 py-2 bg-white border-b border-slate-200">
              <span className="text-[13px] font-semibold text-slate-800">Customize and templates</span>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Close"
                className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors focus:outline-none"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            {/* Customize menu: colors, section order and page numbers */}
            <div className="border-b border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => {
                  if (customizeOpen) setSectionOrderOpen(false);
                  setCustomizeOpen((o) => !o);
                }}
                aria-expanded={customizeOpen}
                className="w-full px-6 py-4 flex items-center justify-between focus:outline-none"
              >
                <span className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-800">
                  <IconMenu className="w-4 h-4" />
                  Customize
                </span>
                <span className={`text-slate-400 transition-transform ${customizeOpen ? 'rotate-180' : ''}`}>
                  <IconChevronDown />
                </span>
              </button>

              <Collapse open={customizeOpen}>
                <div className="border-t border-slate-200 cz-stagger">
                  {/* Colors Header */}
                  <div className="cz-row px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-white">
                    <span className="text-[13px] font-semibold text-slate-800">Colors</span>
                    <div className="flex gap-2.5 items-center">
                      <button
                        onClick={() => setColor(null)}
                        title="Default color"
                        className={`w-5 h-5 rounded-full border border-slate-300 bg-white text-slate-500 flex items-center justify-center hover:scale-110 active:scale-95 transition duration-200 ${
                          color === null ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                        }`}
                      >
                        <IconReset />
                      </button>

                      {ACCENT_SWATCHES.map((swatch) => (
                        <button
                          key={swatch.hex}
                          onClick={() => setColor(swatch.hex)}
                          title={swatch.label}
                          style={{ backgroundColor: swatch.hex }}
                          className={`w-5 h-5 rounded-full shadow-sm hover:scale-110 active:scale-95 transition duration-200 ${
                            color === swatch.hex ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                          }`}
                        ></button>
                      ))}

                      <button
                        onClick={() => setColor('#475569')}
                        title="Grayscale"
                        className={`w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center bg-white hover:scale-110 active:scale-95 transition duration-200 relative ${
                          color === '#475569' ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                        }`}
                      >
                        <div className="absolute w-[18px] h-[1px] bg-slate-400 rotate-45"></div>
                      </button>

                      <label
                        title="Custom color"
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-slate-600 text-[16px] font-medium hover:bg-slate-100 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer relative ${
                          isCustomColor ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                        }`}
                      >
                        +
                        <input
                          type="color"
                          value={isCustomColor ? color : '#000000'}
                          onChange={(e) => setColor(e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Section Order */}
                  <div className="cz-row relative px-6 py-4 border-b border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setSectionOrderOpen((o) => !o)}
                      className="w-full flex items-center justify-between focus:outline-none"
                    >
                      <span className="text-[13px] font-semibold text-slate-800">Section order</span>
                      <span className={`text-slate-400 transition-transform ${sectionOrderOpen ? 'rotate-180' : ''}`}>
                        <IconChevronDown />
                      </span>
                    </button>

                    {sectionOrderOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setSectionOrderOpen(false)} />
                        <div
                          className="cz-pop absolute left-6 right-6 top-full mt-2 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-30"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-[11px] text-slate-400 mb-3 px-1">Drag a section by its handle, or use the arrows, to change the order.</p>
                          <div ref={listRef} className="pro-scroll space-y-2 max-h-[55vh] overflow-y-auto select-none">
                            {sectionOrder.map((key, index) => {
                              const isHidden = hidden.includes(key);
                              return (
                              <div
                                key={key}
                                ref={(el) => { rowRefs.current[key] = el; }}
                                className={`relative flex items-center justify-between bg-slate-50 rounded-lg pl-1.5 pr-1.5 py-1.5 ${isHidden ? 'opacity-60' : ''}`}
                              >
                                <div className="flex items-center gap-1 min-w-0">
                                  <div
                                    aria-hidden="true"
                                    title="Drag to reorder"
                                    onPointerDown={(e) => startDrag(e, index)}
                                    onPointerMove={moveDrag}
                                    onPointerUp={() => endDrag(false)}
                                    onPointerCancel={() => endDrag(true)}
                                    onLostPointerCapture={() => endDrag(true)}
                                    onContextMenu={(e) => e.preventDefault()}
                                    className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-grab active:cursor-grabbing touch-none select-none transition-colors"
                                  >
                                    <IconGrip />
                                  </div>
                                  <span className={`text-xs font-bold text-slate-700 truncate ${isHidden ? 'line-through' : ''}`}>{getSectionMeta(key).label}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => (isHidden ? restoreSection(key) : removeSection(key))}
                                    className="px-2.5 h-7 mr-1 rounded-full border border-slate-300 text-[11px] font-medium text-slate-600 hover:bg-slate-200 transition-colors focus:outline-none"
                                  >
                                    {isHidden ? 'Add back' : 'Remove'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveSection(index, -1)}
                                    disabled={index === 0}
                                    aria-label={`Move ${getSectionMeta(key).label} up`}
                                    className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-25 disabled:hover:bg-transparent transition-colors focus:outline-none"
                                  >
                                    <IconChevronUp />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveSection(index, 1)}
                                    disabled={index === sectionOrder.length - 1}
                                    aria-label={`Move ${getSectionMeta(key).label} down`}
                                    className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-25 disabled:hover:bg-transparent transition-colors focus:outline-none"
                                  >
                                    <IconChevronDown />
                                  </button>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Page numbers */}
                  <div className="cz-row px-6 py-4 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-slate-800">Page numbers</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={pageNumbers.enabled}
                        aria-label="Show page numbers"
                        onClick={() => setPageNumbers((prev) => ({ ...prev, enabled: !prev.enabled }))}
                        className={`shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          pageNumbers.enabled ? 'bg-[#1e3a8a]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            pageNumbers.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                          }`}
                        />
                      </button>
                    </div>
                    <Collapse open={pageNumbers.enabled}>
                      <div className="flex flex-wrap gap-2 pt-3">
                        {PAGE_NUMBER_FORMATS.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            aria-pressed={pageNumbers.format === f.id}
                            onClick={() => setPageNumbers((prev) => ({ ...prev, format: f.id }))}
                            className={`px-3 py-1 rounded-full border text-xs font-medium transition duration-200 active:scale-95 focus:outline-none ${
                              pageNumbers.format === f.id
                                ? 'bg-[#1e3a8a] border-[#1e3a8a] text-white'
                                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {f.example}
                          </button>
                        ))}
                      </div>
                    </Collapse>
                  </div>
                </div>
              </Collapse>
            </div>

            {/* Removed sections */}
            {hidden.length > 0 && (
              <div className="px-6 py-3 border-b border-slate-200 bg-white">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Removed sections</p>
                <div className="flex flex-wrap gap-2">
                  {hidden.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => restoreSection(key)}
                      className="px-3 py-1 rounded-full border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none"
                    >
                      + {getSectionMeta(key).label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Templates Grid */}
            <div className="pro-scroll pro-scroll-dark flex-1 bg-[#091122] p-6 overflow-y-auto">
              <h3 className="text-white text-[13px] font-extrabold mb-5">All templates</h3>
              <div className="grid grid-cols-2 gap-4">
                {TEMPLATE_CARDS.map(({ id, label }) => {
                  // Render the real template (same as the showcase) so a new template needs no separate thumbnail.
                  const Template = TEMPLATE_COMPONENTS[id];
                  if (!Template) return null;
                  return (
                  <div
                    key={id}
                    onClick={() => setTemplate(id)}
                    className={`relative group cursor-pointer overflow-hidden border-2 transition duration-200 hover:z-10 hover:scale-[1.03] active:scale-[0.97] motion-reduce:hover:scale-100 motion-reduce:active:scale-100 ${template === id ? 'border-[#d9856b]' : 'border-transparent'}`}
                  >
                    <TemplateThumb>
                      <div className="pointer-events-none select-none" aria-hidden="true">
                        <Template
                          {...thumbProps}
                          accentColor={color || DEFAULT_ACCENT[id]}
                          edit={{ enabled: false }}
                        />
                      </div>
                    </TemplateThumb>
                    <div className="absolute bottom-0 left-0 w-full bg-slate-900/50 backdrop-blur-md text-white text-[9px] font-semibold text-center py-1 uppercase tracking-widest">
                      {label}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="hidden sm:flex items-center justify-end px-6 py-4 border-t border-slate-200 gap-3 shrink-0 bg-white">
          <button
            onClick={onClose}
            className="order-3 sm:order-1 px-6 py-2 rounded-full border-2 border-[#1e3a8a] text-[#1e3a8a] text-[13px] font-semibold hover:bg-slate-50 transition-colors"
          >
            Close preview
          </button>
          <button
            type="button"
            onClick={toggleEditMode}
            aria-pressed={editMode}
            className={`order-2 sm:order-2 px-6 py-2 rounded-full border-2 border-[#1e3a8a] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2 focus:outline-none ${
              editMode ? 'bg-[#1e3a8a] text-white hover:bg-blue-900' : 'text-[#1e3a8a] hover:bg-slate-50'
            }`}
          >
            <IconPencil className="w-3.5 h-3.5" />
            {editMode ? 'Done editing' : 'Edit resume'}
          </button>
          <button
            type="button"
            onClick={downloadResume}
            disabled={isEmpty || downloading}
            title={isEmpty ? 'Fill in your details first' : 'Download your resume as a PDF'}
            className="order-1 sm:order-3 px-6 py-2 rounded-full bg-[#1e3a8a] text-white text-[13px] font-semibold border-2 border-[#1e3a8a] hover:bg-blue-900 hover:border-blue-900 disabled:opacity-40 disabled:hover:bg-[#1e3a8a] transition-colors flex items-center justify-center gap-2 focus:outline-none"
          >
            <IconDownload />
            {downloading ? 'Preparing PDF…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                            Main Component                                  */
/* -------------------------------------------------------------------------- */

const stepsConfig = [
  { id: 1, label: 'Heading', description: 'Name & contact details', component: PersonalInfo },
  { id: 2, label: 'Work history', description: 'Your relevant job experience', component: ExperienceField },
  { id: 3, label: 'Education', description: 'Schools, degrees & courses', component: EducationField },
  { id: 4, label: 'Skills', description: 'Showcase your top skills', component: SkillsField },
  { id: 5, label: 'Summary', description: 'A short professional pitch', component: Summary },
  { id: 6, label: 'Finalize', description: 'Review & download your resume', component: AdditionalSections }
];

const STORAGE_KEY_STEP = 'resumeBuilder:currentStepIndex';
const STORAGE_KEY_COMPLETED = 'resumeBuilder:completedSteps';

const emptyResumeData = {
  personal: {
    firstName: '', lastName: '', profession: '', city: '', province: '', postalCode: '', phone: '', email: '',
    streetAddress: '', dateOfBirth: '', nationality: '', gender: '', maritalStatus: '',
    hasLicence: false, licenceCode: '', websites: [],
    photo: '', photoStyle: { ...PHOTO_DEFAULTS },
  },
  experiences: [createJob()],
  education: [createEducation()],
  skills: [],
  summary: '',
  hobbies: { enabled: false, text: '' },
  languages: { enabled: false, items: [] },
  projects: { enabled: false, items: [] },
  references: { enabled: false, availableUponRequest: false, items: [] },
  certificates: { enabled: false, items: [] },
};

// ---------------------------------------------------------------------------------------------
// Where the resume is saved: in the person's account when they are signed in (see
// hooks/useResumeProfile.js), otherwise in localStorage on this device. Both hold the same "payload".
// ---------------------------------------------------------------------------------------------

// Turns anything saved before (from this device or from the account) into complete, valid resume data.
const normalizeResumeData = (saved) => {
  if (!saved || typeof saved !== 'object') return emptyResumeData;
  // `experience` is the old single-job format; it becomes the first job.
  const { experience: legacyJob, ...parsed } = saved;
  const legacyHasData = legacyJob && Object.values(legacyJob).some((v) => v !== '' && v !== false && v != null);
  const savedJobs = Array.isArray(parsed.experiences)
    ? parsed.experiences.map((job) => createJob(job))
    : legacyHasData ? [createJob(legacyJob)] : [];
  return {
    ...emptyResumeData,
    ...parsed,
    personal: { ...emptyResumeData.personal, ...parsed.personal },
    experiences: savedJobs.length > 0 ? savedJobs : [createJob()],
    // Older saves hold one education object; normalizeEducation turns it into the first qualification.
    education: normalizeEducation(parsed.education),
    skills: parsed.skills || [],
    summary: parsed.summary || '',
    hobbies: { ...emptyResumeData.hobbies, ...parsed.hobbies },
    languages: { ...emptyResumeData.languages, ...parsed.languages },
    projects: { ...emptyResumeData.projects, ...parsed.projects },
    references: { ...emptyResumeData.references, ...parsed.references },
    certificates: { ...emptyResumeData.certificates, ...parsed.certificates },
    // The job the person is applying for (Premium). Cleaned on the way in; see components/Resume/Sections/jobMatchAI.js.
    jobTarget: sanitizeJobTarget(parsed.jobTarget),
  };
};

const normalizePayload = (saved) => {
  const p = saved && typeof saved === 'object' ? saved : {};
  return {
    resumeData: normalizeResumeData(p.resumeData),
    selectedTemplate: TEMPLATE_IDS.includes(p.selectedTemplate) ? p.selectedTemplate : DEFAULT_TEMPLATE,
    sectionOrder: normalizeSectionOrder(p.sectionOrder),
    hiddenSections: Array.isArray(p.hiddenSections) ? p.hiddenSections.filter((key) => DEFAULT_SECTION_ORDER.includes(key)) : [],
    pageNumbers: normalizePageNumbers(p.pageNumbers ?? null),
    completedSteps: Array.isArray(p.completedSteps) ? p.completedSteps : [],
  };
};

const readStoredJson = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
};

// What localStorage holds, as a complete payload (a blank one when nothing is stored).
const readDevicePayload = () => {
  let template = null;
  try {
    template = localStorage.getItem(STORAGE_KEY_TEMPLATE);
  } catch {}
  return normalizePayload({
    resumeData: readStoredJson(STORAGE_KEY_DATA),
    selectedTemplate: template,
    sectionOrder: readStoredJson(STORAGE_KEY_SECTION_ORDER),
    hiddenSections: readStoredJson(STORAGE_KEY_HIDDEN_SECTIONS),
    pageNumbers: readStoredJson(STORAGE_KEY_PAGE_NUMBERS),
    completedSteps: readStoredJson(STORAGE_KEY_COMPLETED),
  });
};

const writeDevicePayload = (payload) => {
  const entries = [
    [STORAGE_KEY_DATA, JSON.stringify(payload.resumeData)],
    [STORAGE_KEY_SECTION_ORDER, JSON.stringify(payload.sectionOrder)],
    [STORAGE_KEY_HIDDEN_SECTIONS, JSON.stringify(payload.hiddenSections)],
    [STORAGE_KEY_TEMPLATE, payload.selectedTemplate],
    [STORAGE_KEY_PAGE_NUMBERS, JSON.stringify(payload.pageNumbers)],
    [STORAGE_KEY_COMPLETED, JSON.stringify(payload.completedSteps)],
  ];
  entries.forEach(([key, value]) => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  });
};

// Once the account holds the resume, no copy is left on this device (it could be someone else's computer).
// The step the person is on (STORAGE_KEY_STEP) is just a position on this device and stays.
const clearDevicePayload = () => {
  [
    STORAGE_KEY_DATA, STORAGE_KEY_SECTION_ORDER, STORAGE_KEY_HIDDEN_SECTIONS,
    STORAGE_KEY_TEMPLATE, STORAGE_KEY_PAGE_NUMBERS, STORAGE_KEY_COMPLETED,
  ].forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  });
};

// True when the person has actually typed something (the blank starter entries do not count).
const IGNORED_KEYS = new Set(['id', 'photoStyle', 'locationBeforeRemote', 'jobTarget']);
const hasTypedValue = (value) => {
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.some(hasTypedValue);
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, v]) => !IGNORED_KEYS.has(key) && hasTypedValue(v));
  }
  return false;
};
const hasResumeContent = (payload) => hasTypedValue(payload?.resumeData);

// ---------------------------------------------------------------------------------------------
// Thumbnails for the "Choose a resume" dialog: a saved payload drawn with its own template. This turns a
// payload into template props the same way ResumePreviewModal does, so the thumbnail matches the preview.
// ---------------------------------------------------------------------------------------------
const buildThumbProps = (saved) => {
  const p = normalizePayload(saved);
  const { personal, education, skills, summary, hobbies, languages, projects, references, certificates } = p.resumeData;
  const sectionOrder = p.sectionOrder.filter((key) => !p.hiddenSections.includes(key));
  const jobs = (Array.isArray(p.resumeData.experiences) ? p.resumeData.experiences : []).filter((j) => j.title || j.employer);
  const educations = (Array.isArray(education) ? education : [])
    .filter((e) => e.institution || e.degree)
    .map((e) => ({ ...e, date: [e.gradMonth, e.gradYear].filter(Boolean).join(' ') }));

  const fullName = [personal.firstName, personal.lastName].filter(Boolean).join(' ');
  const websiteList = (Array.isArray(personal.websites) ? personal.websites : [])
    .map((w) => String((w && w.url) || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, ''))
    .filter(Boolean);
  const birthDate = personal.dateOfBirth ? new Date(`${personal.dateOfBirth}T00:00:00`) : null;
  const birthDateText = birthDate && !Number.isNaN(birthDate.getTime())
    ? birthDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const licenceCodeText = String(personal.licenceCode || '').trim();
  const contactList = [
    personal.email,
    personal.phone,
    [personal.streetAddress, personal.city, personal.province].filter(Boolean).join(', '),
    ...websiteList,
    birthDateText && `Born: ${birthDateText}`,
    personal.nationality && `Nationality: ${personal.nationality}`,
    personal.gender && `Gender: ${personal.gender}`,
    personal.maritalStatus && `Marital status: ${personal.maritalStatus}`,
    personal.hasLicence && `Driver's licence${licenceCodeText ? `: Code ${licenceCodeText}` : ''}`,
  ].filter(Boolean);

  const namedSkills = (skills || []).filter((s) => s.text);
  const hasHobbies = !!(hobbies?.enabled && hobbies.text);
  const hasLanguages = !!(languages?.enabled && (languages.items || []).some((l) => l.name));
  const hasProjects = !!(projects?.enabled && (projects.items || []).some((pr) => pr.title || pr.description));
  const hasReferences = !!(references?.enabled && (references.availableUponRequest || (references.items || []).some((r) => r.name)));
  const hasCertificates = !!(certificates?.enabled && (certificates.items || []).some((c) => c.name || c.issuer));
  const isEmpty = !fullName && !summary && jobs.length === 0 && !educations.some((e) => e.institution) && namedSkills.length === 0
    && !hasHobbies && !hasLanguages && !hasProjects && !hasReferences && !hasCertificates;

  return {
    template: p.selectedTemplate,
    props: { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder },
  };
};

// The real template, scaled down by TemplateThumb exactly like the "All templates" grid in the preview.
const renderResumeThumb = (saved) => {
  const { template, props } = buildThumbProps(saved);
  const Template = TEMPLATE_COMPONENTS[template] || TEMPLATE_COMPONENTS[DEFAULT_TEMPLATE];
  return (
    <TemplateThumb>
      <div className="pointer-events-none select-none" aria-hidden="true">
        <Template
          {...props}
          accentColor={DEFAULT_ACCENT[template] || DEFAULT_ACCENT['blue-sidebar']}
          edit={{ enabled: false }}
        />
      </div>
    </TemplateThumb>
  );
};

// The text useResumeProfile shows once a save has finished. The header replaces it with a greeting; the other
// states ("Saving…", "Could not save…", "Cannot reach your account…", "Session expired…") still show as they are.
const SAVED_STATUS = 'Saved to your account';

const greetingFor = (date) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// "Upgrade to Premium" in the top bar. Once the account has paid it turns into a small "Premium" badge with the
// days left (read from the server, which works them out from the payment in the database).
// `dark` is for the dark bar on small screens, `compact` shortens the label so it fits there.
const SparkIcon = ({ className = 'h-3.5 w-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
  </svg>
);

// Premium: opens the "What are you applying for?" screen. Shows the job once one is set.
const JobTargetButton = ({ title = '', onClick, dark = false, compact = false }) => (
  <button
    type="button"
    onClick={onClick}
    title={title ? `Applying for: ${title}` : 'Tailor this resume to a job'}
    aria-label={title ? `Applying for ${title}. Change the job.` : 'Tailor this resume to a job'}
    className={`inline-flex h-9 max-w-[11rem] items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60 ${
      dark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    <svg className="h-4 w-4 shrink-0 text-[#d9856b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
    {!compact && <span className="truncate">{title || 'Target a job'}</span>}
  </button>
);

const PremiumButton = ({ premium, daysLeft = 0, expiresAt = null, onClick, dark = false, compact = false }) => {
  if (premium) {
    const endDate = expiresAt ? new Date(expiresAt) : null;
    const endsOn =
      endDate && !Number.isNaN(endDate.getTime())
        ? endDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
    return (
      <span
        title={endsOn ? `Premium access ends on ${endsOn}` : undefined}
        className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold ${
          dark ? 'bg-white/10 text-white ring-1 ring-white/20' : 'bg-[#d9856b]/10 text-[#a64a30] ring-1 ring-[#d9856b]/30'
        }`}
      >
        <SparkIcon className="h-3.5 w-3.5 text-[#d9856b]" />
        Premium
        {daysLeft > 0 && (
          <span className={`border-l pl-2 font-medium ${dark ? 'border-white/20 text-white/80' : 'border-[#d9856b]/30 text-[#a64a30]/80'}`}>
            {compact ? `${daysLeft}d left` : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}
          </span>
        )}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-semibold shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60 focus-visible:ring-offset-2 ${
        dark
          ? 'bg-[#d9856b] text-white hover:bg-[#c9765c] focus-visible:ring-offset-slate-900'
          : 'bg-slate-900 text-white shadow-slate-900/20 hover:bg-slate-800'
      }`}
    >
      <SparkIcon className={`h-3.5 w-3.5 transition-transform group-hover:rotate-12 ${dark ? 'text-white' : 'text-[#f2a98f]'}`} />
      {compact ? 'Upgrade' : 'Upgrade to Premium'}
    </button>
  );
};

// Top-bar text. Signed in: "Good evening, Mpho". It follows the clock, so it changes by itself when the time of
// day does. Signed out: no greeting at all. A save problem or a "Saving…" notice still shows, with a coloured dot.
const HeaderStatus = ({ status, name, signedIn = false, compact = false, className = '' }) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const isNotice = Boolean(status && status !== SAVED_STATUS);
  if (!isNotice && !signedIn) return null;

  const first = String(name || '').trim();
  const text = isNotice ? status : `${greetingFor(now)}${first ? `, ${first}` : ''}`;
  const tone = !isNotice ? '' : /could not|cannot|expired|failed/i.test(status) ? 'error' : /saving/i.test(status) ? 'busy' : 'info';
  const dot = tone === 'error' ? 'bg-rose-500' : tone === 'busy' ? 'animate-pulse bg-amber-400' : 'bg-slate-400';
  const size = isNotice || compact ? 'text-[13px] font-medium' : 'text-[15px] font-semibold tracking-tight';

  return (
    <span role="status" aria-live="polite" className={`inline-flex min-w-0 items-center gap-2 ${size} ${className}`}>
      {isNotice && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />}
      <span className="truncate">{text}</span>
    </span>
  );
};

// Shows which resume is open and opens the list of resumes. `block` stretches it across the width.
const ResumeTitleButton = ({ title, onClick, block = false }) => (
  <button
    type="button"
    onClick={onClick}
    aria-haspopup="dialog"
    className={`group inline-flex h-9 max-w-full items-center gap-2.5 rounded-full bg-slate-100 pl-3 pr-3.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-200/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50 ${
      block ? 'w-full justify-between' : 'sm:max-w-[16rem]'
    }`}
  >
    <span className="flex min-w-0 items-center gap-2">
      <svg className="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
      </svg>
      <span className="truncate">{title || 'My resumes'}</span>
    </span>
    <svg className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-y-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  </button>
);

// Small screens: a row in the dark menu drawer. With onClick it is a button, without it it only shows a status.
const MenuRow = ({ icon, label, value, onClick }) => {
  const body = (
    <>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-[#eba995]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] leading-tight text-slate-400">{label}</span>
        <span className="block truncate text-[13px] font-medium text-slate-100">{value}</span>
      </span>
      {onClick && (
        <svg className="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      )}
    </>
  );
  const row = 'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left';
  if (!onClick) return <div className={row}>{body}</div>;
  return (
    <button type="button" onClick={onClick} className={`${row} transition-colors hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/70`}>
      {body}
    </button>
  );
};

const MenuDocIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </svg>
);
const MenuTargetIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
);

const initialsOf = (user) =>
  `${String(user?.firstName || '').trim().charAt(0)}${String(user?.lastName || '').trim().charAt(0)}`.toUpperCase() || '?';

// The signed-in person: one avatar (the name is in the greeting and in the menu, so it is not repeated here).
const AccountMenu = ({ user, onSignOut, dark = false, compact = false }) => {
  const [open, setOpen] = useState(false);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Account';

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${fullName}`}
        title={fullName}
        className={`flex h-10 items-center gap-1 rounded-full ${compact ? 'px-1' : 'pl-1 pr-2'} transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60 ${
          dark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
        }`}
      >
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#e7a38b] to-[#d9856b] text-[12px] font-semibold text-white shadow-sm ring-2 ${
            dark ? 'ring-white/20' : 'ring-white'
          }`}
        >
          {initialsOf(user)}
        </span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${compact ? 'hidden' : ''} ${open ? 'rotate-180' : ''} ${dark ? 'text-slate-300' : 'text-slate-400'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-[0_24px_48px_-16px_rgba(15,23,42,0.28)]">
            <div className="flex items-center gap-3 px-3 py-3">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e7a38b] to-[#d9856b] text-[13px] font-semibold text-white">
                {initialsOf(user)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">{fullName}</p>
                {user.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
              </div>
            </div>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                if (onSignOut) onSignOut();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50"
            >
              <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Asks before signing out. Cancel is focused first, Escape or a tap outside also cancels, and while the
// sign-out runs (it saves the last changes first) the buttons are locked.
const SIGN_OUT_CSS = `
  @keyframes so-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes so-pop { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } }
  .so-overlay { animation: so-fade .2s ease-out; }
  .so-card { animation: so-pop .3s cubic-bezier(.22, 1, .36, 1); }
  @media (prefers-reduced-motion: reduce) { .so-overlay, .so-card { animation: none; } }
`;

const SignOutDialog = ({ open, busy, onConfirm, onCancel }) => {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    cancelRef.current?.focus();
    return () => {
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="so-overlay fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <style>{SIGN_OUT_CSS}</style>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sign-out-title"
        aria-describedby="sign-out-text"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) {
            event.stopPropagation();
            onCancel();
          }
        }}
        className="so-card w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_32px_64px_-16px_rgba(15,23,42,0.3)] sm:p-7"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d9856b]/10 text-[#b9573d]">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </span>
        <h2 id="sign-out-title" className="mt-5 text-xl font-semibold tracking-tight">Sign out?</h2>
        <p id="sign-out-text" className="mt-2 text-[14px] leading-relaxed text-slate-500">
          Your resumes stay saved in your account. Sign back in any time to pick up where you left off.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="h-11 rounded-xl bg-slate-900 px-4 text-[14px] font-semibold text-white shadow-lg shadow-slate-900/15 transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20 disabled:opacity-60"
          >
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </div>
  );
};

// After signing in, the "Choose a resume" dialog opens when the account holds at least this many resumes.
const MIN_RESUMES_FOR_PICKER = 1;

// The resume library greets a brand-new account with "Welcome" and everyone else with "Welcome back". An account
// counts as brand new for the first 30 minutes after the server created it, and only until the library has been
// shown once on this device (a few minutes of clock difference between the phone and the server are tolerated).
const NEW_ACCOUNT_WINDOW_MS = 30 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const GREETED_KEY_PREFIX = 'remopdf:greeted:';

const isFirstVisit = (user) => {
  if (!user?.id) return false;
  const created = Date.parse(user.createdAt);
  if (!Number.isFinite(created)) return false;
  const age = Date.now() - created;
  if (age < -CLOCK_SKEW_MS || age > NEW_ACCOUNT_WINDOW_MS) return false;
  try {
    return !localStorage.getItem(GREETED_KEY_PREFIX + user.id);
  } catch {
    return true;
  }
};

const markGreeted = (userId) => {
  try {
    localStorage.setItem(GREETED_KEY_PREFIX + userId, '1');
  } catch {
    /* storage blocked: the 30-minute window still ends the "Welcome" greeting */
  }
};

// True from the lg breakpoint up (1024px). Phones and tablets get false, and the answer follows a rotation or resize.
const useIsDesktop = () => {
  const query = '(min-width: 1024px)';
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia) && window.matchMedia(query).matches);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const media = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    setMatches(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return matches;
};

export default function ResumeBuilder({ onBuildCoverLetter }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isDesktop = useIsDesktop();
  // Phones: the job match is not in the page. "Finish Resume" opens it once, so the score is only counted then.
  const [scoreSheetOpen, setScoreSheetOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  // null = closed; anything else = the Sign in with Google dialog is open (the value is not used any more).
  const [authMode, setAuthMode] = useState(null);
  // Signed in: start blank and wait for the account's resume (the device copy is only read once that is
  // known). Signed out: start from what this device holds.
  const [initial] = useState(() => (getSessionUser() ? normalizePayload(null) : readDevicePayload()));
  const [selectedTemplate, setSelectedTemplate] = useState(initial.selectedTemplate);
  const [selectedColor, setSelectedColor] = useState(null);
  const [showSkillErrors, setShowSkillErrors] = useState(false);
  const [showLanguageErrors, setShowLanguageErrors] = useState(false);

  const [sectionOrder, setSectionOrder] = useState(initial.sectionOrder);

  // Page numbers on the resume (on/off + format), chosen in the preview.
  const [pageNumbers, setPageNumbers] = useState(initial.pageNumbers);

  // Sections removed from the resume in the preview (information is kept).
  const [hiddenSections, setHiddenSections] = useState(initial.hiddenSections);

  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem(STORAGE_KEY_STEP), 10);
      return Number.isInteger(saved) && saved >= 0 && saved < stepsConfig.length ? saved : 0;
    } catch {
      return 0;
    }
  });

  const [completedSteps, setCompletedSteps] = useState(initial.completedSteps);

  const [resumeData, setResumeData] = useState(initial.resumeData);

  // Everything that makes up the resume. Its identity changes only when something in it changes.
  const payload = useMemo(
    () => ({ resumeData, selectedTemplate, sectionOrder, hiddenSections, pageNumbers, completedSteps }),
    [resumeData, selectedTemplate, sectionOrder, hiddenSections, pageNumbers, completedSteps],
  );

  // Ids of the languages already on screen, used by the "new languages start on Fluent" effect below.
  const knownLanguageIds = useRef(null);

  // Puts a saved resume (from the account or the device) into the builder.
  const applyPayload = (saved) => {
    const next = normalizePayload(saved);
    // A whole resume was loaded: its languages are not "newly added", so they keep the levels they were saved with.
    knownLanguageIds.current = null;
    setResumeData(next.resumeData);
    setSelectedTemplate(next.selectedTemplate);
    setSectionOrder(next.sectionOrder);
    setHiddenSections(next.hiddenSections);
    setPageNumbers(next.pageNumbers);
    setCompletedSteps(next.completedSteps);
    return next;
  };

  // Signed in: the resume is saved to the account. Signed out: it is saved on this device (localStorage).
  const profile = useResumeProfile({
    payload,
    applyPayload,
    createBlank: () => normalizePayload(null),
    readDevice: readDevicePayload,
    writeDevice: writeDevicePayload,
    clearDevice: clearDevicePayload,
    hasContent: hasResumeContent,
  });

  const showResumeSwitcher = Boolean(profile.user && profile.activeId);
  // One cover letter is kept per resume (on this device), under the open resume's id.
  const coverLetterKey = String(profile.activeId || 'device');
  const activeResume = profile.resumes.find((r) => r.id === profile.activeId);

  // Payment: the PDF download is unlocked by a Paystack payment (see components/Payment/PaymentModal.jsx).
  // `pendingDownloadRef` holds the download the person asked for, and runs it once the payment is confirmed.
  const [paymentOpen, setPaymentOpen] = useState(false);
  const pendingDownloadRef = useRef(null);
  const [paymentFromDownload, setPaymentFromDownload] = useState(false);
  const [premium, setPremium] = useState(false);
  const [premiumInfo, setPremiumInfo] = useState({ daysLeft: 0, expiresAt: null });

  // Takes what /api/payments/status says (or null when signed out) and updates the badge from it.
  const applyAccess = useCallback((status) => {
    const active = Boolean(status?.premium);
    setPremium(active);
    setPremiumAccess(active); // also tells the AI writing assistant (signed out counts as "no Premium")
    setPremiumInfo({
      daysLeft: active ? Math.max(0, Number(status.daysLeft) || 0) : 0,
      expiresAt: active ? status.expiresAt || null : null,
    });
  }, []);

  // Tells the locked parts of the page (writing assistant, Import resume) whether anyone is signed in, so they say
  // "Sign in" instead of "Upgrade to Premium". Declared before the Premium check below so it runs first.
  useEffect(() => {
    setSignedIn(Boolean(profile.user?.id));
  }, [profile.user?.id]);
  useEffect(() => () => setSignedIn(null), []);

  // Those same locked parts ask for the sign-in dialog through this. setAuthMode never changes between renders.
  useEffect(() => onSignInRequest(() => setAuthMode('signin')), []);

  // Whether this account has already paid and how many days are left, so the top bar shows "Premium" with a
  // countdown instead of the upgrade button. It is read again whenever the person comes back to this tab, so
  // the number stays right after a day or more, and the badge goes away by itself once the 30 days are over.
  useEffect(() => {
    if (!profile.user?.id) {
      applyAccess(null);
      return undefined;
    }
    let cancelled = false;
    setPremiumAccess(null); // a different account: not known until the server has answered for it
    const refresh = () => {
      getPaymentStatus()
        .then((status) => {
          if (!cancelled) applyAccess(status);
        })
        .catch(() => {
          /* the badge simply keeps what it showed */
        });
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [profile.user?.id, applyAccess]);

  // How many resumes an account may keep depends on Premium, so the limit is read again from the server
  // whenever Premium starts (paid in this session) or runs out (the 30 days are over).
  const premiumSeenRef = useRef(false);
  useEffect(() => {
    if (premiumSeenRef.current === premium) return;
    premiumSeenRef.current = premium;
    if (profile.user) profile.refreshLimit();
  }, [premium, profile.user?.id, profile.refreshLimit]); // eslint-disable-line react-hooks/exhaustive-deps

  // The top-bar button: opens the payment dialog with no download waiting behind it.
  const openUpgrade = () => {
    pendingDownloadRef.current = null;
    setPaymentFromDownload(false);
    setPaymentOpen(true);
  };

  // The AI writing assistant (in every section of the form) asks for the payment dialog through this.
  // openUpgrade only touches a ref and state setters, so the copy from the first render keeps working.
  useEffect(() => onUpgradeRequest(openUpgrade), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Asks the server whether this account has Premium right now (it can run out between visits). Signed out is
  // always "no Premium". If the server cannot be reached, the last known answer is used.
  const checkPremium = async () => {
    if (!profile.user) return false;
    try {
      const status = await getPaymentStatus();
      applyAccess(status);
      return Boolean(status?.premium);
    } catch {
      return premium;
    }
  };

  const closePayment = () => {
    pendingDownloadRef.current = null;
    setPaymentOpen(false);
  };

  const handlePaid = () => {
    const proceed = pendingDownloadRef.current;
    pendingDownloadRef.current = null;
    setPaymentOpen(false);
    setPremium(true);
    setPremiumAccess(true);
    getPaymentStatus()
      .then(applyAccess)
      .catch(() => {
        /* the badge shows "Premium" without the days until the next check */
      });
    if (proceed) proceed();
  };

  // Paying needs an account. The preview is closed too, so the sign-in dialog is not hidden behind it.
  const handlePaymentSignIn = () => {
    closePayment();
    setPreviewOpen(false);
    setAuthMode('signin');
  };

  // A different resume starts at the first step, and a colour picked for the old one does not carry over.
  const afterResumeChange = (result) => {
    if (result.ok) {
      setCurrentStepIndex(0);
      setSelectedColor(null);
    }
    return result;
  };
  const handleOpenResume = async (id) => (id === profile.activeId ? { ok: true } : afterResumeChange(await profile.openResume(id)));
  const handleNewResume = async () => afterResumeChange(await profile.createNewResume());
  const handleDeleteResume = async (id) => {
    const result = await profile.removeResume(id);
    if (result.ok && result.switched) afterResumeChange(result);
    return result;
  };

  // The one dialog for opening, starting, renaming, copying and deleting resumes (ResumePickerDialog). It opens
  // from the "My resume" button in the header, and after signing in. The account's resumes arrive a moment after the sign-in
  // call returns, and a device-vs-account conflict (ResumeSyncDialog) has to be settled first, so the
  // sign-in only sets `pickPending` and the effect below opens the dialog once everything is loaded.
  const [pickPending, setPickPending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Decided once, at the moment the library opens, so the heading never changes while it is on screen. When it
  // closes the account is marked as greeted, so every later visit says "Welcome back".
  const pickerShown = pickerOpen && showResumeSwitcher && !profile.conflict;

  // Job target (Premium). Before a Premium person starts writing a new resume, ask what they are applying for
  // (a link, the advert pasted, or just a job title). The answer lives in resumeData.jobTarget, so it is saved
  // with the resume and used by the Skills step, the writing assistant and the ATS score.
  const [jobStudioOpen, setJobStudioOpen] = useState(false);
  const jobTarget = resumeData.jobTarget;
  const resumeIsBlank = !hasResumeContent(payload);
  const jobStudioOfferedRef = useRef(null); // the resume it was already offered for: once per resume
  useEffect(() => {
    if (!premium || !profile.user?.id || profile.mode !== 'account') return; // wait until the account's resume has loaded
    if (pickerShown || paymentOpen || authMode !== null || previewOpen || jobStudioOpen) return;
    if (jobTarget || !resumeIsBlank) return; // already answered (or skipped), or the person has started writing
    const key = String(profile.activeId || 'account');
    if (jobStudioOfferedRef.current === key) return;
    jobStudioOfferedRef.current = key;
    setJobStudioOpen(true);
  }, [premium, profile.user?.id, profile.mode, profile.activeId, pickerShown, paymentOpen, authMode, previewOpen, jobStudioOpen, jobTarget, resumeIsBlank]);
  // Premium ended or the account changed: nothing from the Premium screen stays open.
  useEffect(() => {
    if (!premium) setJobStudioOpen(false);
  }, [premium, profile.user?.id]);

  const saveJobTarget = (target) => {
    setResumeData((prev) => ({ ...prev, jobTarget: target }));
    setJobStudioOpen(false);
  };
  // Skipping and removing both keep a { skipped: true } marker, so the question is not asked again for this resume.
  const skipJobTarget = () => {
    setResumeData((prev) => (prev.jobTarget ? prev : { ...prev, jobTarget: { skipped: true } }));
    setJobStudioOpen(false);
  };
  const removeJobTarget = () => {
    setResumeData((prev) => ({ ...prev, jobTarget: { skipped: true } }));
    setJobStudioOpen(false);
  };
  const pickerUserId = profile.user?.id;
  const pickerFirstVisit = useMemo(
    () => (pickerShown ? isFirstVisit(profile.user) : false),
    [pickerShown, pickerUserId], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    if (!pickerShown || !pickerUserId) return undefined;
    return () => markGreeted(pickerUserId);
  }, [pickerShown, pickerUserId]);

  // Thumbnails need each resume's saved data, but the account list only carries id, title and a few details.
  // A fetched resume is kept in memory under its id and last-edit time (so an edit is picked up), which
  // means reopening the dialog does not download every resume, photos included, again. It is dropped when
  // the person signs out or into another account.
  const thumbCache = useRef(new Map());
  useEffect(() => {
    thumbCache.current.clear();
  }, [profile.user?.id]);

  const loadResumeForThumb = async (id, item) => {
    const key = `${id}:${item?.updatedAt || ''}`;
    const cached = thumbCache.current.get(key);
    if (cached) return cached;
    const { resume } = await fetchResume(id);
    if (resume) {
      [...thumbCache.current.keys()].forEach((k) => {
        if (k.startsWith(`${id}:`)) thumbCache.current.delete(k); // keep only the newest copy of each resume
      });
      thumbCache.current.set(key, resume);
    }
    return resume;
  };

  // idToken comes from the Google sign-in window (see AuthModal). New accounts are created by the server on first sign-in.
  const handleSignIn = async (idToken) => {
    const result = await profile.signIn(idToken);
    setPickPending(true);
    return result;
  };

  useEffect(() => {
    if (!pickPending || !profile.user || !profile.activeId || profile.conflict) return;
    if (profile.mode === 'loading' || profile.mode === 'switching') return;
    setPickPending(false);
    if (profile.resumes.length >= MIN_RESUMES_FOR_PICKER) setPickerOpen(true);
  }, [pickPending, profile.user, profile.activeId, profile.conflict, profile.mode, profile.resumes.length]);

  // Every "Sign out" in the page asks first. Confirming saves the last changes, then signs out.
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const confirmSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await profile.signOutUser();
      setPickerOpen(false);
      setPickPending(false);
    } finally {
      setSigningOut(false);
      setSignOutOpen(false);
    }
  };

  const updateData = (section, field, value) => {
    setResumeData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const updateSummary = (value) => {
    setResumeData((prev) => ({ ...prev, summary: value }));
  };

  const updateExperiences = (newJobs) => {
    setResumeData((prev) => ({ ...prev, experiences: newJobs }));
  };

  const updateEducation = (newList) => {
    setResumeData((prev) => ({ ...prev, education: newList }));
  };

  const updateSkills = (newSkills) => {
    setResumeData((prev) => ({ ...prev, skills: newSkills }));
  };

  const updateItems = (section, newItems) => {
    setResumeData((prev) => ({
      ...prev,
      [section]: { ...prev[section], items: newItems },
    }));
  };

  const mergeFound = (existing, found) => {
    const nonEmpty = Object.fromEntries(
      Object.entries(found).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    );
    return { ...existing, ...nonEmpty };
  };

  // An imported job fills the first job (like before); with no job yet it starts one.
  const mergeExperiences = (existing, found) => {
    const jobs = existing || [];
    const foundJob = Object.fromEntries(
      Object.entries(found || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    );
    if (Object.keys(foundJob).length === 0) return jobs;
    if (jobs.length === 0) return [createJob(foundJob)];
    return jobs.map((job, i) => (i === 0 ? { ...job, ...foundJob, id: job.id } : job));
  };

  // An imported qualification fills the first entry (like jobs); with none yet it starts one.
  const mergeEducation = (existing, found) => {
    const list = existing || [];
    const foundEntry = Object.fromEntries(
      Object.entries(found || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    );
    if (Object.keys(foundEntry).length === 0) return list;
    if (list.length === 0) return [createEducation(foundEntry)];
    return list.map((entry, i) => (i === 0 ? { ...entry, ...foundEntry, id: entry.id } : entry));
  };

  // A parsed resume can hold several jobs and qualifications. A list that is still the empty
  // starter entry is replaced; a list the person has already filled in keeps their entries and
  // gets the new ones added (skipping any that look like duplicates).
  const isBlankItem = (item, keys) => !keys.some((k) => String(item?.[k] ?? '').trim());
  const sameText = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

  const mergeList = (existing, incoming, keys, isSame, create, idPrefix) => {
    const current = existing || [];
    if (!incoming || incoming.length === 0) return current;
    const filled = current.filter((item) => !isBlankItem(item, keys));
    const fresh = incoming.filter((item) => !filled.some((have) => isSame(have, item)));
    if (fresh.length === 0) return current;
    const stamp = Date.now();
    return [...filled, ...fresh.map((item, i) => ({ ...create(item), id: `${idPrefix}-${stamp}-${i}` }))];
  };

  const mergeJobList = (existing, incoming) =>
    mergeList(existing, incoming, ['title', 'employer', 'description', 'achievements'],
      (a, b) => sameText(a.title, b.title) && sameText(a.employer, b.employer), createJob, 'import-job');

  const mergeEducationList = (existing, incoming) =>
    mergeList(existing, incoming, ['institution', 'degree'],
      (a, b) => sameText(a.institution, b.institution) && sameText(a.degree, b.degree), createEducation, 'import-edu');

  // New skills are added after the ones already there, skipping any that exist (case-insensitive).
  // Like skills added by hand, they start at the first level so the Skills step is never blocked.
  const mergeSkills = (existing, found) => {
    if (!found || found.length === 0) return existing;
    const have = existing || [];
    const taken = new Set(have.map((skill) => String(skill.text || '').trim().toLowerCase()).filter(Boolean));
    const fresh = found.filter((text) => !taken.has(String(text).trim().toLowerCase()));
    if (fresh.length === 0) return have;
    const stamp = Date.now();
    return [...have, ...fresh.map((text, i) => ({ id: stamp + i, text, rating: DEFAULT_SKILL_RATING }))];
  };

  const mergeSummary = (existing, found) => (existing && existing.trim() ? existing : found || existing);

  // Projects, certificates and languages live in { enabled, items }. Imported items are added to
  // what is already there (skipping duplicates) and the section is switched on so it shows up.
  const mergeSectionItems = (section, incoming, keys, isSame, idPrefix) => {
    const base = section || { enabled: false, items: [] };
    if (!incoming || incoming.length === 0) return base;
    const have = (base.items || []).filter((item) => !isBlankItem(item, keys));
    const fresh = incoming.filter((item) => !have.some((h) => isSame(h, item)));
    if (fresh.length === 0) return { ...base, enabled: true, items: have };
    const stamp = Date.now();
    return {
      ...base,
      enabled: true,
      items: [...have, ...fresh.map((item, i) => ({ ...item, id: `${idPrefix}-${stamp}-${i}` }))],
    };
  };

  // Links are added to the ones already listed instead of replacing them.
  const normalizeUrl = (w) =>
    String((w && w.url) || w || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');

  const mergePersonal = (existing, found) => {
    const { websites: foundSites, ...rest } = found || {};
    const merged = mergeFound(existing, rest);
    if (Array.isArray(foundSites) && foundSites.length > 0) {
      const have = (existing.websites || []).filter((w) => normalizeUrl(w));
      const fresh = foundSites.filter((w) => normalizeUrl(w) && !have.some((h) => normalizeUrl(h) === normalizeUrl(w)));
      // The Heading form edits links by id, so every imported link needs its own.
      const stamp = Date.now();
      merged.websites = [...have, ...fresh.map((w, i) => ({ id: `website-${stamp}-${i}`, url: String((w && w.url) || w).trim() }))];
    }
    return merged;
  };

  // `experiences` / `educations` (lists) come from the resume parser. The single `experience` /
  // `education` objects are the old format and still work.
  const handleImport = (parsed) => {
    setResumeData((prev) => ({
      ...prev,
      personal: mergePersonal(prev.personal, parsed.personal),
      experiences: parsed.experiences
        ? mergeJobList(prev.experiences, parsed.experiences)
        : mergeExperiences(prev.experiences, parsed.experience),
      education: parsed.educations
        ? mergeEducationList(prev.education, parsed.educations)
        : mergeEducation(prev.education, parsed.education),
      skills: mergeSkills(prev.skills, parsed.skills),
      summary: mergeSummary(prev.summary, parsed.summary),
      projects: mergeSectionItems(prev.projects, parsed.projects, ['title', 'description'],
        (a, b) => sameText(a.title, b.title), 'import-proj'),
      certificates: mergeSectionItems(prev.certificates, parsed.certificates, ['name', 'issuer'],
        (a, b) => sameText(a.name, b.name) && sameText(a.issuer, b.issuer), 'import-cert'),
      languages: mergeSectionItems(prev.languages, parsed.languages, ['name'],
        (a, b) => sameText(a.name, b.name), 'import-lang'),
      hobbies: parsed.hobbies && !(prev.hobbies?.text || '').trim()
        ? { ...prev.hobbies, enabled: true, text: parsed.hobbies }
        : prev.hobbies,
      references: parsed.references?.availableUponRequest && !(prev.references?.items || []).some((r) => r.name)
        ? { ...prev.references, enabled: true, availableUponRequest: true }
        : prev.references,
    }));
  };

  useEffect(() => {
    if (!document.getElementById('outfit-font-link')) {
      const link = document.createElement('link');
      link.id = 'outfit-font-link';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STEP, String(currentStepIndex));
    } catch {}
  }, [currentStepIndex]);

  // The effects below write to localStorage only while signed out (profile.writesToDevice()). Signed in,
  // the same data is saved to the account by useResumeProfile instead.
  useEffect(() => {
    if (!profile.writesToDevice()) return;
    try {
      localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify(completedSteps));
    } catch {}
  }, [completedSteps]);

  useEffect(() => {
    if (!profile.writesToDevice()) return;
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(resumeData));
    } catch (e) {
      console.error("Failed to save resume data", e);
    }
  }, [resumeData]);

  useEffect(() => {
    if (!profile.writesToDevice()) return;
    try {
      localStorage.setItem(STORAGE_KEY_SECTION_ORDER, JSON.stringify(sectionOrder));
    } catch {}
  }, [sectionOrder]);

  useEffect(() => {
    if (!profile.writesToDevice()) return;
    try {
      localStorage.setItem(STORAGE_KEY_HIDDEN_SECTIONS, JSON.stringify(hiddenSections));
    } catch {}
  }, [hiddenSections]);

  useEffect(() => {
    if (!profile.writesToDevice()) return;
    try {
      localStorage.setItem(STORAGE_KEY_TEMPLATE, selectedTemplate);
    } catch {}
  }, [selectedTemplate]);

  useEffect(() => {
    if (!profile.writesToDevice()) return;
    try {
      localStorage.setItem(STORAGE_KEY_PAGE_NUMBERS, JSON.stringify(pageNumbers));
    } catch {}
  }, [pageNumbers]);

  // Fluent is the default language level. A language never stays without a
  // level, and a language that has just been added always starts on Fluent,
  // whatever initial level the form gave it. Languages that were already saved
  // keep the level the user chose.
  useEffect(() => {
    const items = resumeData.languages?.items || [];
    const known = knownLanguageIds.current;
    knownLanguageIds.current = new Set(items.map((l) => l.id));
    const hasNoLevel = (l) => !(l.level && String(l.level).trim());
    const isNew = (l) => known && !known.has(l.id);
    if (!items.some((l) => hasNoLevel(l) || (isNew(l) && l.level !== DEFAULT_LANGUAGE_LEVEL))) return;
    setResumeData((prev) => {
      const prevItems = prev.languages?.items || [];
      return {
        ...prev,
        languages: {
          ...prev.languages,
          items: prevItems.map((l) => (hasNoLevel(l) || isNew(l) ? { ...l, level: DEFAULT_LANGUAGE_LEVEL } : l)),
        },
      };
    });
  }, [resumeData.languages?.items]);

  // Every named skill needs a level before leaving the Skills step.
  const skillsMissingLevel = (resumeData.skills || []).filter(
    (skill) => skill.text && skill.text.trim() && !(Number(skill.rating) >= 1)
  ).length;

  // Every named language needs a level before finishing (only when the
  // Languages section is switched on, since that is when it shows on the resume).
  const languagesMissingLevel = resumeData.languages?.enabled
    ? (resumeData.languages.items || []).filter(
        (lang) => lang.name && lang.name.trim() && !(lang.level && String(lang.level).trim())
      ).length
    : 0;

  useEffect(() => {
    setShowSkillErrors(false);
    setShowLanguageErrors(false);
  }, [currentStepIndex]);

  const handleNext = () => {
    if (stepsConfig[currentStepIndex].component === SkillsField && skillsMissingLevel > 0) {
      setShowSkillErrors(true);
      requestAnimationFrame(() => {
        document.querySelector('[data-skill-missing="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    if (stepsConfig[currentStepIndex].component === AdditionalSections && languagesMissingLevel > 0) {
      setShowLanguageErrors(true);
      requestAnimationFrame(() => {
        document.querySelector('[data-language-missing="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    if (!completedSteps.includes(currentStepIndex)) {
      setCompletedSteps([...completedSteps, currentStepIndex]);
    }
    if (currentStepIndex < stepsConfig.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else if (!isDesktop && premium && hasJobTarget(jobTarget)) {
      setScoreSheetOpen(true);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // "Build cover letter" in the sidebar. A parent can still take over with its own handler; otherwise the cover
  // letter page opens right here, on top of the builder, and reads the resume that is being edited.
  const handleBuildCoverLetter = () => {
    setMenuOpen(false);
    if (onBuildCoverLetter) onBuildCoverLetter(resumeData);
    else setCoverLetterOpen(true);
  };

  const progressPercentage = Math.round((completedSteps.length / stepsConfig.length) * 100);
  const ActiveComponent = stepsConfig[currentStepIndex].component;
  const nextStepLabel = stepsConfig[currentStepIndex + 1]?.label || 'Finish';

  return (
    <div
      className="flex flex-col lg:flex-row h-screen bg-[#fffcf6] text-slate-900 antialiased overflow-hidden"
      style={{ fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif" }}
    >
      <style>{SCROLLBAR_CSS}</style>

      {/* Mobile bar: greeting, account and menu only. The open resume, the target job and the Premium status live in the menu. */}
      <div className="z-30 flex shrink-0 items-center justify-between gap-2 bg-slate-900 px-4 py-2 text-white lg:hidden">
        <div className="min-w-0 flex-1">
          <HeaderStatus status={profile.statusText} name={profile.user?.firstName} signedIn={Boolean(profile.user)} compact className="max-w-full text-slate-200" />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {profile.user && !premium && <PremiumButton premium={premium} onClick={openUpgrade} dark compact />}
          {profile.user ? (
            <AccountMenu user={profile.user} onSignOut={() => setSignOutOpen(true)} dark compact />
          ) : (
            <AuthButtons onOpen={setAuthMode} variant="dark" />
          )}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-full p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60"
          >
            <IconMenu />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden" onClick={() => setMenuOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <BuilderSidebar
        steps={stepsConfig}
        currentIndex={currentStepIndex}
        completedSteps={completedSteps}
        progress={progressPercentage}
        onSelect={(index) => {
          setCurrentStepIndex(index);
          setMenuOpen(false);
        }}
        onBuildCoverLetter={handleBuildCoverLetter}
        importSlot={<ResumeUpload onImport={handleImport} />}
        mobileSlot={
          showResumeSwitcher || premium ? (
            <>
              {showResumeSwitcher && (
                <MenuRow
                  icon={<MenuDocIcon />}
                  label="My resume"
                  value={activeResume?.title || 'My resumes'}
                  onClick={() => {
                    setMenuOpen(false);
                    setPickerOpen(true);
                  }}
                />
              )}
              {premium && (
                <MenuRow
                  icon={<MenuTargetIcon />}
                  label="Target job"
                  value={hasJobTarget(jobTarget) ? jobTarget.title : 'Target a job'}
                  onClick={() => {
                    setMenuOpen(false);
                    setJobStudioOpen(true);
                  }}
                />
              )}
              {premium && (
                <MenuRow
                  icon={<SparkIcon className="h-4 w-4" />}
                  label="Premium"
                  value={premiumInfo.daysLeft > 0 ? `${premiumInfo.daysLeft} ${premiumInfo.daysLeft === 1 ? 'day' : 'days'} left` : 'Active'}
                />
              )}
            </>
          ) : null
        }
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full min-h-0">
        {/* Top bar (large screens; small screens have the same controls in the dark bar above) */}
        <header className="relative z-20 hidden shrink-0 items-center gap-4 border-b border-slate-200/70 bg-white px-12 py-3 lg:flex">
          <HeaderStatus status={profile.statusText} name={profile.user?.firstName} signedIn={Boolean(profile.user)} className="text-slate-800" />
          <div className="ml-auto flex items-center gap-3">
            {showResumeSwitcher && <ResumeTitleButton title={activeResume?.title} onClick={() => setPickerOpen(true)} />}
            {premium && <JobTargetButton title={hasJobTarget(jobTarget) ? jobTarget.title : ''} onClick={() => setJobStudioOpen(true)} />}
            {profile.user && <PremiumButton premium={premium} daysLeft={premiumInfo.daysLeft} expiresAt={premiumInfo.expiresAt} onClick={openUpgrade} />}
            {profile.user ? (
              <>
                <span className="h-6 w-px bg-slate-200" aria-hidden="true" />
                <AccountMenu user={profile.user} onSignOut={() => setSignOutOpen(true)} />
              </>
            ) : (
              <AuthButtons onOpen={setAuthMode} />
            )}
          </div>
        </header>

        <div className="pro-scroll flex-1 overflow-y-auto p-5 sm:p-8 lg:p-12 lg:pt-6 pb-36 sm:pb-32">
          {isDesktop && premium && hasJobTarget(jobTarget) && ActiveComponent !== PersonalInfo && (
            <JobTargetBar target={jobTarget} data={resumeData} onEdit={() => setJobStudioOpen(true)} />
          )}
          <ActiveComponent data={resumeData} updateData={updateData} updateSummary={updateSummary} updateSkills={updateSkills} updateExperiences={updateExperiences} updateEducation={updateEducation} updateItems={updateItems} showSkillErrors={showSkillErrors} showLanguageErrors={showLanguageErrors} />
        </div>

        {/* Action Bar */}
        <div className="absolute bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200/80 p-4 sm:p-5 sm:px-10 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 z-20">
          <div className="w-full sm:w-auto">
            {currentStepIndex > 0 && (
              <button 
                onClick={handleBack}
                className="w-full sm:w-auto px-7 py-3 rounded-full border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-all text-xs focus:outline-none flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row w-full sm:w-auto gap-3 sm:gap-4">
            <button
              onClick={() => setPreviewOpen(true)}
              className="w-full sm:w-auto px-7 py-3 rounded-full border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-all text-xs focus:outline-none"
            >
              Preview
            </button>
            <button 
              onClick={handleNext}
              className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#d9856b] text-white font-bold text-xs shadow-lg shadow-[#d9856b]/25 hover:shadow-xl hover:shadow-[#d9856b]/35 hover:-translate-y-0.5 transition-all focus:outline-none"
            >
              {currentStepIndex === stepsConfig.length - 1 ? 'Finish Resume' : `Next: ${nextStepLabel}`}
            </button>
          </div>
        </div>
      </div>

      {previewOpen && (
        <ResumePreviewModal 
          data={resumeData} 
          template={selectedTemplate}
          setTemplate={setSelectedTemplate}
          color={selectedColor}
          setColor={setSelectedColor}
          sectionOrder={sectionOrder}
          setSectionOrder={setSectionOrder}
          hiddenSections={hiddenSections}
          setHiddenSections={setHiddenSections}
          pageNumbers={pageNumbers}
          setPageNumbers={setPageNumbers}
          editorProps={{ updateData, updateSummary, updateSkills, updateExperiences, updateEducation, updateItems }}
          checkPremium={checkPremium}
          onClose={() => setPreviewOpen(false)} 
        />
      )}

      {scoreSheetOpen && !isDesktop && premium && hasJobTarget(jobTarget) && (
        <JobTargetBar sheet target={jobTarget} data={resumeData} onEdit={() => setJobStudioOpen(true)} onSheetClose={() => setScoreSheetOpen(false)} />
      )}

      {coverLetterOpen && (
        <CoverLetterBuilder
          key={coverLetterKey}
          resumeData={resumeData}
          accentColor={selectedColor || DEFAULT_ACCENT[selectedTemplate] || DEFAULT_ACCENT['blue-sidebar']}
          storageKey={coverLetterKey}
          checkPremium={checkPremium}
          onClose={() => setCoverLetterOpen(false)}
        />
      )}

      <JobTargetStudio
        open={jobStudioOpen}
        initial={jobTarget}
        onSave={saveJobTarget}
        onSkip={skipJobTarget}
        onClose={() => setJobStudioOpen(false)}
        onRemove={removeJobTarget}
      />

      <PaymentModal
        open={paymentOpen}
        user={profile.user}
        onClose={closePayment}
        onPaid={handlePaid}
        onSignIn={handlePaymentSignIn}
        doneLabel={paymentFromDownload ? 'Continue to download' : 'Done'}
      />

      <AuthModal
        open={authMode !== null}
        onClose={() => setAuthMode(null)}
        onSignIn={handleSignIn}
      />

      {(profile.mode === 'loading' || profile.mode === 'switching') && <ResumeLoadingOverlay />}
      <SignOutDialog
        open={signOutOpen}
        busy={signingOut}
        onConfirm={confirmSignOut}
        onCancel={() => setSignOutOpen(false)}
      />
      <ResumePickerDialog
        open={pickerShown}
        resumes={profile.resumes}
        activeId={profile.activeId}
        activePayload={payload}
        limit={profile.resumeLimit}
        userName={String(profile.user?.firstName || '').trim()}
        firstVisit={pickerFirstVisit}
        premium={premium}
        daysLeft={premiumInfo.daysLeft}
        onUpgrade={() => {
          setPickerOpen(false);
          openUpgrade();
        }}
        renderPreview={renderResumeThumb}
        loadPayload={loadResumeForThumb}
        onSelect={handleOpenResume}
        onCreate={handleNewResume}
        onRename={profile.renameResume}
        onDuplicate={profile.duplicateResume}
        onDelete={handleDeleteResume}
        onClose={() => setPickerOpen(false)}
      />
      <ResumeSyncDialog conflict={profile.conflict} onResolve={profile.resolveConflict} />
    </div>
  );
}