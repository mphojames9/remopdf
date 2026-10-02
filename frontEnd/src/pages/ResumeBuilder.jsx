import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import PersonalInfo from '../components/Resume/Sections/PersonalInfo';
import ExperienceField, { createJob } from '../components/Resume/Sections/ExperienceField';
import EducationField, { createEducation, normalizeEducation } from '../components/Resume/Sections/EducationField';
import SkillsField from '../components/Resume/Sections/SkillsField';
import Summary from '../components/Resume/Sections/Summary';
import ResumeUpload from '../components/Resume/Sections/ResumeUpload';
import BuilderSidebar from '../components/Resume/Sections/BuilderSidebar';
import AdditionalSections from '../components/Resume/Sections/AdditionalSections';
import { DEFAULT_LANGUAGE_LEVEL } from '../components/Resume/Sections/LanguageLevelSelect';
import { PHOTO_DEFAULTS } from '../components/Resume/Sections/ResumePhoto';
import demoPhoto from '../assets/profile.png';
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
  SECTION_META,
  PAGE_WIDTH_PX,
  DEFAULT_ACCENT,
  ACCENT_SWATCHES,
} from '../components/Resume/Templates';

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

const DEFAULT_SECTION_ORDER = ['summary', 'experience', 'education', 'certificates', 'skills', 'projects', 'languages', 'hobbies', 'references'];

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

const ResumePreviewModal = ({ data, template, setTemplate, color, setColor, sectionOrder: savedSectionOrder, setSectionOrder, hiddenSections, setHiddenSections, pageNumbers, setPageNumbers, editorProps, onClose }) => {
  const sectionOrder = normalizeSectionOrder(savedSectionOrder);
  // Sections the user removed from the resume. Their information is kept, they
  // are only left out of the template (and can be added back at any time).
  const hidden = (Array.isArray(hiddenSections) ? hiddenSections : []).filter((key) => SECTION_META[key]);
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
    if (!SECTION_META[key]) return;
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

  // Download = print the resume's A4 pages to PDF. The pages are copied into a
  // hidden frame first, so the printout is only the pages (no modal, nothing
  // clipped by the scrolling preview) and matches the preview exactly, page
  // numbers included. In the print dialog the user picks "Save as PDF".
  const downloadResume = () => {
    const source = document.getElementById('resume-preview-content');
    const pageNodes = source ? Array.from(source.querySelectorAll('.a4-page')) : [];
    if (pageNodes.length === 0) return;

    const oldFrame = document.getElementById('resume-print-frame');
    if (oldFrame) oldFrame.remove();

    const fileTitle = (fullName ? `${fullName} - Resume` : 'Resume').replace(/[<>&"]/g, '');
    const headMarkup = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map((node) => node.outerHTML).join('\n');
    const pagesMarkup = pageNodes.map((node) => node.outerHTML).join('\n');

    const frame = document.createElement('iframe');
    frame.id = 'resume-print-frame';
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);

    const frameWindow = frame.contentWindow;
    const frameDoc = frame.contentDocument;
    frameDoc.open();
    frameDoc.write(`<!doctype html><html><head><meta charset="utf-8"><base href="${document.baseURI}"><title>${fileTitle}</title>
${headMarkup}
<style>
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  @media print {
    #resume-preview-content { position: static !important; width: 210mm !important; }
    .a4-page { min-height: 0 !important; max-height: none !important; }
    .a4-page:last-child { break-after: auto !important; page-break-after: auto !important; }
  }
</style></head><body><div id="resume-preview-content">${pagesMarkup}</div></body></html>`);
    frameDoc.close();

    let started = false;
    const start = async () => {
      if (started) return;
      started = true;
      try {
        // Print only once the web font and any photo have loaded in the frame.
        if (frameDoc.fonts && frameDoc.fonts.ready) {
          await Promise.race([frameDoc.fonts.ready, new Promise((resolve) => setTimeout(resolve, 2000))]);
        }
        await Promise.all(Array.from(frameDoc.images).map((img) => (
          img.complete ? null : new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; })
        )));
      } catch {
        // print anyway
      }
      // The browser suggests the page title as the file name.
      const previousTitle = document.title;
      document.title = fileTitle;
      frameWindow.addEventListener('afterprint', () => {
        document.title = previousTitle;
        frame.remove();
      }, { once: true });
      frameWindow.focus();
      frameWindow.print();
    };
    frameWindow.addEventListener('load', start, { once: true });
    setTimeout(start, 3000); // fallback if the frame's load event never arrives
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
        @media (prefers-reduced-motion: reduce) {
          .cz-collapse, .cz-row, .cz-sheet { transition: none !important; }
          .cz-pop { animation: none; }
        }
      `}</style>

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
                      disabled={isEmpty}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors focus:outline-none"
                    >
                      <IconDownload />
                      Download
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
                      {renderActiveTemplate()}
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
                    <span>{SECTION_META[undoKey].label} removed from your resume</span>
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
                                  <span className={`text-xs font-bold text-slate-700 truncate ${isHidden ? 'line-through' : ''}`}>{SECTION_META[key].label}</span>
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
                                    aria-label={`Move ${SECTION_META[key].label} up`}
                                    className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-25 disabled:hover:bg-transparent transition-colors focus:outline-none"
                                  >
                                    <IconChevronUp />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveSection(index, 1)}
                                    disabled={index === sectionOrder.length - 1}
                                    aria-label={`Move ${SECTION_META[key].label} down`}
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
                      + {SECTION_META[key].label}
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
            disabled={isEmpty}
            title={isEmpty ? 'Fill in your details first' : 'Download your resume as a PDF'}
            className="order-1 sm:order-3 px-6 py-2 rounded-full bg-[#1e3a8a] text-white text-[13px] font-semibold border-2 border-[#1e3a8a] hover:bg-blue-900 hover:border-blue-900 disabled:opacity-40 disabled:hover:bg-[#1e3a8a] transition-colors flex items-center justify-center gap-2 focus:outline-none"
          >
            <IconDownload />
            Download
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

// Where "Build cover letter" goes when the parent doesn't pass its own handler.
const COVER_LETTER_PATH = '/cover-letter';

export default function ResumeBuilder({ onBuildCoverLetter }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEMPLATE);
      return TEMPLATE_IDS.includes(saved) ? saved : DEFAULT_TEMPLATE;
    } catch {
      return DEFAULT_TEMPLATE;
    }
  });
  const [selectedColor, setSelectedColor] = useState(null);
  const [showSkillErrors, setShowSkillErrors] = useState(false);
  const [showLanguageErrors, setShowLanguageErrors] = useState(false);

  const [sectionOrder, setSectionOrder] = useState(() => {
    try {
      return normalizeSectionOrder(JSON.parse(localStorage.getItem(STORAGE_KEY_SECTION_ORDER)));
    } catch {
      return DEFAULT_SECTION_ORDER;
    }
  });

  // Page numbers on the resume (on/off + format), chosen in the preview.
  const [pageNumbers, setPageNumbers] = useState(() => {
    try {
      return normalizePageNumbers(JSON.parse(localStorage.getItem(STORAGE_KEY_PAGE_NUMBERS)));
    } catch {
      return DEFAULT_PAGE_NUMBERS;
    }
  });

  // Sections removed from the resume in the preview (information is kept).
  const [hiddenSections, setHiddenSections] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_HIDDEN_SECTIONS));
      return Array.isArray(saved) ? saved.filter((key) => DEFAULT_SECTION_ORDER.includes(key)) : [];
    } catch {
      return [];
    }
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem(STORAGE_KEY_STEP), 10);
      return Number.isInteger(saved) && saved >= 0 && saved < stepsConfig.length ? saved : 0;
    } catch {
      return 0;
    }
  });

  const [completedSteps, setCompletedSteps] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_COMPLETED));
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const [resumeData, setResumeData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DATA);
      if (saved) {
        // `experience` is the old single-job format; it becomes the first job.
        const { experience: legacyJob, ...parsed } = JSON.parse(saved);
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
        };
      }
      return emptyResumeData;
    } catch {
      return emptyResumeData;
    }
  });

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

  const mergeSkills = (existing, found) => {
    if (!found || found.length === 0) return existing;
    if (existing && existing.length > 0) return existing;
    return found.map((text, i) => ({ id: Date.now() + i, text, rating: 0 }));
  };

  const mergeSummary = (existing, found) => (existing && existing.trim() ? existing : found || existing);

  const handleImport = (parsed) => {
    setResumeData((prev) => ({
      ...prev,
      personal: mergeFound(prev.personal, parsed.personal),
      experiences: mergeExperiences(prev.experiences, parsed.experience),
      education: mergeEducation(prev.education, parsed.education),
      skills: mergeSkills(prev.skills, parsed.skills),
      summary: mergeSummary(prev.summary, parsed.summary),
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify(completedSteps));
    } catch {}
  }, [completedSteps]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(resumeData));
    } catch (e) {
      console.error("Failed to save resume data", e);
    }
  }, [resumeData]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SECTION_ORDER, JSON.stringify(sectionOrder));
    } catch {}
  }, [sectionOrder]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HIDDEN_SECTIONS, JSON.stringify(hiddenSections));
    } catch {}
  }, [hiddenSections]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TEMPLATE, selectedTemplate);
    } catch {}
  }, [selectedTemplate]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PAGE_NUMBERS, JSON.stringify(pageNumbers));
    } catch {}
  }, [pageNumbers]);

  // Fluent is the default language level. A language never stays without a
  // level, and a language that has just been added always starts on Fluent,
  // whatever initial level the form gave it. Languages that were already saved
  // keep the level the user chose.
  const knownLanguageIds = useRef(null);
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
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleBuildCoverLetter = () => {
    if (onBuildCoverLetter) onBuildCoverLetter(resumeData);
    else window.location.assign(COVER_LETTER_PATH);
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

      {/* Mobile Bar */}
      <div className="flex lg:hidden items-center justify-between bg-slate-900 text-white px-5 py-4 shrink-0 z-30">
        <span className="text-base font-medium tracking-tight text-white">
          
        </span>
        <button
          onClick={() => setMenuOpen(true)}
          className="p-1.5 text-slate-300 hover:text-white transition-colors focus:outline-none"
        >
          <IconMenu />
        </button>
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
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full min-h-0">
        <div className="pro-scroll flex-1 overflow-y-auto p-5 sm:p-8 lg:p-12 pb-36 sm:pb-32">
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
          onClose={() => setPreviewOpen(false)} 
        />
      )}
    </div>
  );
}