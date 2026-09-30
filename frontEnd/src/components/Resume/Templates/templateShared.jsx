import React, { useState, useEffect, useRef, useLayoutEffect, createContext, useContext } from 'react';
import { renderAchievements } from '../Sections/richText';
import { getSkillLevelLabel } from '../Sections/SkillsField';
import { languageLevelInfo } from '../Sections/LanguageLevelSelect';

/*
 * Shared building blocks for every resume template: colour helpers, the A4 page
 * + auto-pagination engine, page numbers, and the edit-mode helpers.
 */

const IconPencil = ({ className = 'w-2.5 h-2.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const IconTrash = ({ className = 'w-2.5 h-2.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
  </svg>
);

// Page numbers on the resume: the user can switch them on or off and pick how
// they read. `example` is what the format looks like on a 2-page resume.
const PAGE_NUMBER_FORMATS = [
  { id: 'number', example: '1' },
  { id: 'page', example: 'Page 1' },
  { id: 'page-of', example: 'Page 1 of 2' },
  { id: 'slash', example: '1 / 2' },
  { id: 'dash', example: '\u2013 1 \u2013' },
];
const DEFAULT_PAGE_NUMBERS = { enabled: true, format: 'page-of' };

const normalizePageNumbers = (value) => ({
  enabled: value && typeof value.enabled === 'boolean' ? value.enabled : DEFAULT_PAGE_NUMBERS.enabled,
  format: value && PAGE_NUMBER_FORMATS.some((f) => f.id === value.format) ? value.format : DEFAULT_PAGE_NUMBERS.format,
});

const formatPageNumber = (format, page, total) => {
  switch (format) {
    case 'number': return `${page}`;
    case 'page': return `Page ${page}`;
    case 'slash': return `${page} / ${total}`;
    case 'dash': return `\u2013 ${page} \u2013`;
    case 'page-of':
    default: return `Page ${page} of ${total}`;
  }
};

// Lets every template's A4Page read the page-number setting without each
// template having to pass it down.
const PageNumberContext = createContext(DEFAULT_PAGE_NUMBERS);

const SECTION_META = {
  summary: { label: 'Summary' },
  experience: { label: 'Experience' },
  education: { label: 'Education' },
  skills: { label: 'Skills' },
  projects: { label: 'Projects' },
  languages: { label: 'Languages' },
  hobbies: { label: 'Hobbies & Interests' },
  references: { label: 'References' },
};

// Exact A4 Dimensions at 96 DPI (210mm x 297mm)
const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;

// Extra empty space kept free at the bottom of every page's content area, on top
// of the page body's own padding. The paginator treats it as unusable, so a row
// that would run into it moves to the next page instead of being cut off by the
// page edge (or the "Page X of Y" label).
const PAGE_BOTTOM_PADDING = 48;

/* -------------------------------------------------------------------------- */
/*                            Color Helpers                                   */
/* -------------------------------------------------------------------------- */

const tint = (hex, amount) => {
  if (!hex) return hex;
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  if (amount >= 0) {
    r += (255 - r) * amount;
    g += (255 - g) * amount;
    b += (255 - b) * amount;
  } else {
    r += r * amount;
    g += g * amount;
    b += b * amount;
  }
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// "Jan 2020 – Present" for one job. Empty when no start date was entered.
const jobDates = (job) => {
  const start = [job.startMonth, job.startYear].filter(Boolean).join(' ');
  if (!start) return '';
  const end = job.current ? 'Present' : [job.endMonth, job.endYear].filter(Boolean).join(' ');
  return end ? `${start} – ${end}` : start;
};

// Skill level helpers. `rating` is 1-5; 0 / missing means no level chosen.
const skillRating = (skill) => {
  const n = Number(skill && skill.rating);
  return n >= 1 ? Math.min(5, Math.round(n)) : 0;
};

// Five small dots, `rating` of them filled. Renders nothing when there is no level.
const skillDots = (rating, activeColor, inactiveColor) => (
  rating > 0 ? (
    <span
      className="inline-flex items-center gap-[3px] shrink-0"
      title={getSkillLevelLabel(rating)}
      aria-label={getSkillLevelLabel(rating)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: i <= rating ? activeColor : inactiveColor }}
        />
      ))}
    </span>
  ) : null
);

// Language level helpers (see languageLevelInfo in LanguageLevelSelect): every
// language shows its own level text, Fluent when none is saved, with 1-5 bars.
// Five small dots, `rating` of them filled. Renders nothing for unknown text.
const languageDots = (rating, label, activeColor, inactiveColor) => (
  rating > 0 ? (
    <span
      className="inline-flex items-center gap-[3px] shrink-0"
      title={label}
      aria-label={label}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: i <= rating ? activeColor : inactiveColor }}
        />
      ))}
    </span>
  ) : null
);

const DEFAULT_ACCENT = {
  'blue-sidebar': '#1e3a8a',
  'green-header': '#15803d',
  'pink-header': '#be185d',
  'dark-top': '#334155',
};

// Deep, muted tones that read as professional. Each is dark enough to carry white
// text, because the accent is used as a background in the sidebar/header templates.
const ACCENT_SWATCHES = [
  { hex: '#1e3a8a', label: 'Navy' },
  { hex: '#2b6cb0', label: 'Steel blue' },
  { hex: '#0f766e', label: 'Teal' },
  { hex: '#166534', label: 'Forest' },
  { hex: '#881337', label: 'Burgundy' },
  { hex: '#1f2937', label: 'Charcoal' },
];

/* -------------------------------------------------------------------------- */
/*                        Auto-Pagination Engine                              */
/* -------------------------------------------------------------------------- */

/**
 * Templates are FLAT. A template builds one plain list of elements (headings,
 * meta rows, paragraphs, skill chips, ...) with no <section> or list-container
 * wrapper around them, exactly like the BordeauxElite structure. Every element
 * in that list is one "atom".
 *
 * All atoms are laid out once, in flow, inside a hidden container so their real
 * positions can be measured. The first atom whose bottom edge crosses the page
 * limit starts the next page, together with every atom after it. Each atom
 * therefore lands on exactly one page: nothing is duplicated and nothing is
 * re-wrapped, the atoms are rendered straight into the page body.
 *
 * Spacing between groups (a heading + its rows) is carried by the LAST element
 * of the group (see endGroup), not by a wrapper, so a heading that starts a
 * page never gets a stray gap above it.
 *
 * Note: atoms are tagged with `data-atom`, so every atom must be a plain DOM
 * element (div, p, h3, span ...), not a custom component and not a Fragment.
 */
function buildAtomModel(nodes) {
  const atoms = [];
  const measureContent = [];

  React.Children.toArray(nodes).forEach((node) => {
    const id = atoms.length;
    const leaf = React.isValidElement(node)
      ? React.cloneElement(node, { 'data-atom': id })
      : <div key={`text-${id}`} data-atom={id}>{node}</div>;
    atoms.push({ id, leaf });
    measureContent.push(leaf);
  });

  return { atoms, measureContent };
}

// A page is just its atoms, in order. No wrapper is rebuilt around them.
function renderPageAtoms(ids, { atoms }) {
  return ids.map((id) => atoms[id] && atoms[id].leaf).filter(Boolean);
}

// metrics[id] = { top, bottom, heading } in the hidden container's own coordinates.
// Returns pages as arrays of atom ids. An atom that would cross the page's limit
// (measured from the top of the page's first atom) starts a new page. Page 1 and
// the pages after it can have different limits, because page 1 also carries the
// header. A heading is never left alone at the bottom of a page: it moves to the
// next page together with the atom that follows it.
function splitIntoPages(metrics, firstPageMax, laterPageMax) {
  const pages = [];
  let current = [];
  let pageTop = 0;
  metrics.forEach((m, id) => {
    if (!m) return;
    const limit = pages.length === 0 ? firstPageMax : laterPageMax;
    if (current.length && m.bottom - pageTop > limit) {
      const carried = [];
      while (current.length > 1 && metrics[current[current.length - 1]].heading) {
        carried.unshift(current.pop());
      }
      pages.push(current);
      current = carried;
      pageTop = carried.length ? metrics[carried[0]].top : 0;
    }
    if (!current.length) pageTop = m.top;
    current.push(id);
  });
  if (current.length) pages.push(current);
  return pages;
}

/**
 * Custom Hook that measures every atom and splits them into A4 pages.
 * Returns:
 *   pages            - array of pages, each an array of flat elements to render
 *   measureContainerRef + measureContent - render `measureContent` inside a hidden
 *                      element that has `ref={measureContainerRef}` and the same
 *                      content width as the real page body.
 *   firstBodyRef     - put this ref on the element that holds page 1's atoms. Its
 *                      real height (page height minus the header) decides how much
 *                      fits on page 1, so a tall header can never push the last
 *                      rows off the bottom of the page.
 */
function usePaginatedBlocks(blocks, contentMaxHeight = 980) {
  const measureContainerRef = useRef(null);
  const firstBodyRef = useRef(null);
  const measureRef = useRef(() => {});
  const [layout, setLayout] = useState(null); // array of pages, each an array of atom ids
  const layoutSignatureRef = useRef('');

  const model = buildAtomModel(blocks);

  // Always points at the latest render's measuring code, so the ResizeObserver
  // below never runs a stale copy.
  measureRef.current = () => {
    const root = measureContainerRef.current;
    if (!root) return;

    // The preview is zoomed with CSS transform: scale(), and getBoundingClientRect()
    // reports scaled numbers. Divide the zoom back out so page breaks are the same
    // at every zoom level.
    const rootRect = root.getBoundingClientRect();
    const zoom = root.offsetWidth ? rootRect.width / root.offsetWidth : 1;

    const metrics = [];
    root.querySelectorAll('[data-atom]').forEach((node) => {
      const rect = node.getBoundingClientRect();
      const marginTop = parseFloat(getComputedStyle(node).marginTop) || 0;
      metrics[Number(node.getAttribute('data-atom'))] = {
        top: (rect.top - rootRect.top) / zoom - marginTop,
        bottom: (rect.bottom - rootRect.top) / zoom,
        heading: node.tagName === 'H3',
      };
    });

    // Page 1 shares its height with the header, so use the room it really has:
    // the page body's own height (clientHeight ignores the zoom transform) minus
    // its top and bottom padding. The fixed number is only an upper bound.
    let firstPageMax = contentMaxHeight;
    const body = firstBodyRef.current;
    if (body) {
      const cs = getComputedStyle(body);
      const inner = body.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
      if (inner > 0) firstPageMax = Math.min(contentMaxHeight, inner);
    }

    const nextLayout = splitIntoPages(
      metrics,
      firstPageMax - PAGE_BOTTOM_PADDING,
      contentMaxHeight - PAGE_BOTTOM_PADDING,
    );

    // `blocks` is a brand-new array of new React elements on every render, so this
    // effect runs after every render. Only call setLayout when the page split
    // actually changes, otherwise setLayout -> re-render -> effect -> setLayout
    // loops forever ("Maximum update depth exceeded"). The layout stores atom ids
    // only; the elements themselves are rebuilt from the latest `blocks` on every
    // render, so edits and colour changes always show up.
    const signature = nextLayout.map((ids) => ids.join(',')).join('|');
    if (layoutSignatureRef.current === signature) return;
    layoutSignatureRef.current = signature;
    setLayout(nextLayout);
  };

  useLayoutEffect(() => {
    measureRef.current();
  }, [blocks, contentMaxHeight]);

  // Measure again when the hidden content or the page-1 body changes size on its
  // own (web fonts finishing loading, a different header height), not only when
  // React re-renders.
  useEffect(() => {
    const root = measureContainerRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => measureRef.current());
    ro.observe(root);
    if (firstBodyRef.current) ro.observe(firstBodyRef.current);
    return () => ro.disconnect();
  }, []);

  const allIds = model.atoms.map((a) => a.id);
  const pageIds = layout && layout.length ? layout : [allIds]; // always at least one page
  const pages = pageIds.map((ids) => renderPageAtoms(ids, model));

  return { pages, measureContainerRef, firstBodyRef, measureContent: model.measureContent };
}

// A4 Page Wrapper Component
const A4Page = ({ children, pageNum, totalPages }) => {
  const pageNumbers = useContext(PageNumberContext);
  return (
    <div
      className="a4-page relative bg-white shadow-md overflow-hidden mb-8 print:mb-0 print:shadow-none print:break-after-page"
      style={{
        width: `${PAGE_WIDTH_PX}px`,
        height: `${PAGE_HEIGHT_PX}px`,
        minHeight: `${PAGE_HEIGHT_PX}px`,
        maxHeight: `${PAGE_HEIGHT_PX}px`,
        boxSizing: 'border-box',
      }}
    >
      {children}
      {pageNumbers.enabled && (
        <div className="absolute bottom-2 right-6 text-[10px] text-slate-500 select-none font-medium">
          {formatPageNumber(pageNumbers.format, pageNum, totalPages)}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                            Flat Template Helpers                           */
/* -------------------------------------------------------------------------- */

const stripMb = (cls = '') => cls.split(/\s+/).filter((c) => c && !/^mb-/.test(c)).join(' ');

// Drops empty entries (false / null / '') and gives the LAST element `spacing`
// as its bottom margin, replacing any mb-* it already had.
const padLast = (nodes, spacing) => {
  const list = nodes.filter(Boolean);
  const last = list.length - 1;
  return list.map((node, i) => (
    i === last
      ? React.cloneElement(node, { className: `${stripMb(node.props.className)} ${spacing}`.trim() })
      : node
  ));
};

// Closes a group (heading + rows) with the space that used to come from the
// wrapper's mb-6.
const endGroup = (nodes) => padLast(nodes, 'mb-6');

/* -------------------------------------------------------------------------- */
/*                         Edit mode (click to edit / remove)                 */
/* -------------------------------------------------------------------------- */

// Pencil + bin shown at the right end of a section heading while the preview is
// in edit mode. Absolutely positioned, so it never changes the page layout.
const SectionControls = ({ label, onEdit, onRemove }) => (
  <span className="edit-ui absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 normal-case tracking-normal">
    <button
      type="button"
      title={`Edit ${label}`}
      aria-label={`Edit ${label}`}
      onClick={(e) => { e.stopPropagation(); onEdit(); }}
      className="w-[18px] h-[18px] rounded-full bg-white text-blue-700 border border-slate-300 shadow-sm flex items-center justify-center hover:bg-blue-50 focus:outline-none"
    >
      <IconPencil />
    </button>
    <button
      type="button"
      title={`Remove ${label}`}
      aria-label={`Remove ${label}`}
      onClick={(e) => { e.stopPropagation(); onRemove(); }}
      className="w-[18px] h-[18px] rounded-full bg-white text-red-600 border border-slate-300 shadow-sm flex items-center justify-center hover:bg-red-50 focus:outline-none"
    >
      <IconTrash />
    </button>
  </span>
);

// Props that mark a wrapper element as a clickable resume section (edit mode only).
const editAttrs = (edit, key) => (edit && edit.enabled ? { 'data-section': key } : {});

// Tags every element of a section with data-section (so a click anywhere in it
// opens that section's editor) and adds the pencil / bin to its first element,
// the heading. Templates stay flat: elements are only cloned, never wrapped.
// `removable: false` tags the elements but leaves out the controls.
const markSection = (edit, key, blocks, removable = true) => {
  if (!edit || !edit.enabled || !blocks || blocks.length === 0) return blocks;
  return blocks.map((node, i) => {
    if (!React.isValidElement(node)) return node;
    if (i > 0 || !removable) return React.cloneElement(node, { 'data-section': key });
    return React.cloneElement(
      node,
      { 'data-section': key, className: `${node.props.className || ''} relative`.trim() },
      node.props.children,
      <SectionControls
        key={`${key}-controls`}
        label={(SECTION_META[key] && SECTION_META[key].label) || key}
        onEdit={() => edit.onEdit(key)}
        onRemove={() => edit.onRemove(key)}
      />,
    );
  });
};

/* -------------------------------------------------------------------------- */
/*                            Template Components                             */
/* -------------------------------------------------------------------------- */

// Returns { projects, languages, hobbies, references }: each one a flat list of
// elements ([] when that section is off or empty), so a template can place them
// anywhere in the user's section order.
const renderExtraSections = ({ projects, languages, hobbies, references, headingClass, headingStyle, accentColor = '#334155' }) => {
  const out = { projects: [], languages: [], hobbies: [], references: [] };
  const heading = (key, text) => <h3 key={`${key}-h`} className={headingClass} style={headingStyle}>{text}</h3>;

  const projectItems = (projects?.items || []).filter((p) => p.title || p.description);
  if (projects?.enabled && projectItems.length > 0) {
    out.projects = endGroup([
      heading('projects', 'Projects'),
      ...projectItems.flatMap((p) => padLast([
        <div key={`project-${p.id}-title`} className="flex justify-between items-baseline gap-2 mb-1">
          <p className="font-bold text-slate-900 text-sm">{p.title}</p>
          {p.link && <span className="text-[11px] text-slate-500 whitespace-nowrap">{p.link}</span>}
        </div>,
        ...renderAchievements(p.description, `project-${p.id}-desc`),
      ], 'mb-3')),
    ]);
  }

  const languageItems = (languages?.items || []).filter((l) => l.name);
  if (languages?.enabled && languageItems.length > 0) {
    out.languages = endGroup([
      heading('languages', 'Languages'),
      ...languageItems.map((l) => {
        const { label, rating } = languageLevelInfo(l);
        return (
          <span key={`language-${l.id}`} className="inline-flex items-center gap-2 align-top mr-6 mb-1 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">{l.name}</span>
            {languageDots(rating, label, accentColor, tint(accentColor, 0.8))}
            <span className="text-[11px] text-slate-500">{label}</span>
          </span>
        );
      }),
    ]);
  }

  if (hobbies?.enabled && hobbies.text) {
    out.hobbies = endGroup([
      heading('hobbies', 'Hobbies & Interests'),
      ...renderAchievements(hobbies.text, 'hobbies-text'),
    ]);
  }

  const referenceItems = (references?.items || []).filter((r) => r.name);
  if (references?.enabled && (references.availableUponRequest || referenceItems.length > 0)) {
    out.references = endGroup([
      heading('references', 'References'),
      ...(references.availableUponRequest
        ? [<p key="references-note" className="text-xs text-slate-600">Available upon request.</p>]
        : referenceItems.map((r) => (
          <p key={`reference-${r.id}`} className="text-xs text-slate-600 mb-2">
            <span className="font-semibold text-slate-800">{r.name}</span>
            {r.relationship && ` · ${r.relationship}`}
            {r.contact && ` · ${r.contact}`}
          </p>
        ))),
    ]);
  }

  return out;
};

export {
  IconPencil,
  IconTrash,
  PAGE_NUMBER_FORMATS,
  DEFAULT_PAGE_NUMBERS,
  normalizePageNumbers,
  formatPageNumber,
  PageNumberContext,
  SECTION_META,
  PAGE_WIDTH_PX,
  PAGE_HEIGHT_PX,
  PAGE_BOTTOM_PADDING,
  tint,
  jobDates,
  skillRating,
  skillDots,
  languageDots,
  DEFAULT_ACCENT,
  ACCENT_SWATCHES,
  usePaginatedBlocks,
  A4Page,
  stripMb,
  padLast,
  endGroup,
  SectionControls,
  editAttrs,
  markSection,
  renderExtraSections,
};
