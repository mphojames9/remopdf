import React, { useState, useEffect, useRef } from 'react';
import MonthYearPicker from './MonthYearPicker';
import AchievementsField from './AchievementsField';
import SpellCheckPanel from './SpellCheckPanel';

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

// Slim accent-coloured scrollbar for the dropdown lists. Chromium/Safari get the rounded thumb with a
// hover state; Firefox falls back to the standard thin scrollbar.
const SCROLLBAR_CSS = `
.edu-scroll { scrollbar-width: thin; scrollbar-color: #d9856b66 transparent; }
@supports selector(::-webkit-scrollbar) {
  .edu-scroll { scrollbar-width: auto; scrollbar-color: auto; }
  .edu-scroll::-webkit-scrollbar { width: 6px; }
  .edu-scroll::-webkit-scrollbar-track { background: transparent; }
  .edu-scroll::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
  .edu-scroll::-webkit-scrollbar-thumb { background: #d9856b66; border-radius: 2px; }
  .edu-scroll::-webkit-scrollbar-thumb:hover { background: #d9856b; }
}
`;

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
/*                    Institution picker (Hipolabs universities)              */
/* -------------------------------------------------------------------------- */

// The hosted Hipolabs API only serves plain http (its https address redirects to http), and browsers
// block that from an https site such as remopdf.site (it worked on http://localhost, which is exempt).
// So there is no API call at all: the open-source dataset behind that API is a static JSON file served
// over https with CORS enabled. It is downloaded once (compressed in transit), trimmed to the three
// fields we use, and searched in the browser. Fully frontend, no backend needed.
const UNIVERSITY_DATASET_URLS = [
  'https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json',
  'https://cdn.jsdelivr.net/gh/Hipo/university-domains-list@master/world_universities_and_domains.json',
];
const MIN_SEARCH_CHARS = 2;
const MAX_VISIBLE_RESULTS = 8;
const SEARCH_DEBOUNCE_MS = 300;

// Shared by every picker on the page so re-opening a qualification does not refetch.
const universitySearchCache = new Map();

/* -------------------------------------------------------------------------- */
/*                         Smarter school matching                            */
/* -------------------------------------------------------------------------- */

// Schools the public dataset is missing or lists under a different name (mostly South African
// private colleges and TVET colleges). They are searched together with the dataset.
const EXTRA_INSTITUTIONS = [
  ...[
    ['University of Pretoria', 'Gauteng'],
    ['University of the Witwatersrand', 'Gauteng'],
    ['University of Johannesburg', 'Gauteng'],
    ['Tshwane University of Technology', 'Gauteng'],
    ['University of South Africa', 'Gauteng'],
    ['Vaal University of Technology', 'Gauteng'],
    ['Sefako Makgatho Health Sciences University', 'Gauteng'],
    ['University of Cape Town', 'Western Cape'],
    ['Stellenbosch University', 'Western Cape'],
    ['University of the Western Cape', 'Western Cape'],
    ['Cape Peninsula University of Technology', 'Western Cape'],
    ['University of KwaZulu-Natal', 'KwaZulu-Natal'],
    ['Durban University of Technology', 'KwaZulu-Natal'],
    ['Mangosuthu University of Technology', 'KwaZulu-Natal'],
    ['University of Zululand', 'KwaZulu-Natal'],
    ['North-West University', 'North West'],
    ['University of the Free State', 'Free State'],
    ['Central University of Technology', 'Free State'],
    ['Nelson Mandela University', 'Eastern Cape'],
    ['Rhodes University', 'Eastern Cape'],
    ['University of Fort Hare', 'Eastern Cape'],
    ['Walter Sisulu University', 'Eastern Cape'],
    ['University of Limpopo', 'Limpopo'],
    ['University of Venda', 'Limpopo'],
    ['University of Mpumalanga', 'Mpumalanga'],
    ['Sol Plaatje University', 'Northern Cape'],
    ['Tshwane North TVET College', 'Gauteng'],
    ['Tshwane South TVET College', 'Gauteng'],
    ['Ekurhuleni East TVET College', 'Gauteng'],
    ['Ekurhuleni West TVET College', 'Gauteng'],
    ['Central Johannesburg TVET College', 'Gauteng'],
    ['Sedibeng TVET College', 'Gauteng'],
    ['South West Gauteng TVET College', 'Gauteng'],
    ['Western TVET College', 'Gauteng'],
  ].map(([name, province]) => ({ name, 'state-province': province, country: 'South Africa' })),
  ...[
    'Boston City Campus',
    'Damelin',
    'Rosebank College',
    'Varsity College',
    'Stadio',
    'Regenesys Business School',
    'Milpark Education',
    'Midrand Graduate Institute',
    'The Independent Institute of Education',
    'CTI Education Group',
    'Monash South Africa',
  ].map((name) => ({ name, 'state-province': null, country: 'South Africa' })),
];

// What people type instead of the full name (the dataset has no abbreviations).
const SCHOOL_ALIASES = {
  wits: 'witwatersrand',
  unisa: 'university of south africa',
  ukzn: 'kwazulu natal',
  unizulu: 'university of zululand',
  univen: 'university of venda',
  stellies: 'stellenbosch',
  nmmu: 'nelson mandela',
  smu: 'sefako makgatho',
  unp: 'university of pretoria',
};

const INITIALS_SKIP = new Set(['of', 'the', 'and', 'for', 'at', 'in', 'de', 'du', 'la', 'le', 'des', 'da', 'do', 'di', 'del', 'van', 'von', 'der', 'den']);

// Lowercase, strip accents, "&" -> "and", punctuation -> spaces, so "Université  de-Paris" == "universite de paris".
const normalizeText = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const indexUniversity = (u) => {
  const norm = normalizeText(u.name);
  const tokens = norm.split(' ').filter(Boolean);
  return {
    name: u.name,
    country: u.country,
    'state-province': u['state-province'],
    _norm: norm,
    _tokens: tokens,
    _init: tokens.filter((t) => !INITIALS_SKIP.has(t)).map((t) => t[0]).join(''),
    _curated: !!u._curated,
    _place: normalizeText([u['state-province'], u.country].filter(Boolean).join(' ')).split(' ').filter(Boolean),
  };
};

// Edit distance that also counts a swapped pair of letters as one slip; gives up early past `max`.
const editDistance = (a, b, max) => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
};

const fuzzyTokenHit = (qt, tokens) => {
  if (qt.length < 4) return false;
  const max = qt.length >= 8 ? 2 : 1;
  return tokens.some((t) => editDistance(qt, t.slice(0, qt.length), max) <= max || editDistance(qt, t, max) <= max);
};

const buildQuery = (query) => {
  const rawTokens = normalizeText(query).split(' ').filter(Boolean);
  const tokens = rawTokens.flatMap((t) => (SCHOOL_ALIASES[t] ? SCHOOL_ALIASES[t].split(' ') : [t]));
  return {
    aliased: rawTokens.some((t) => SCHOOL_ALIASES[t]),
    norm: tokens.join(' '),
    tokens,
    compact: rawTokens.join(''), // "u j" and "uj" both read as the abbreviation UJ
    single: rawTokens.length === 1,
  };
};

// 0 = not a match. Higher = better: exact name, name starts with the text, abbreviation, then every
// typed word matching a word of the name (any order, partial words allowed), then typo-tolerant matches.
const scoreUniversity = (e, q, fuzzy) => {
  const bonus = e._curated ? 5 : 0; // the hand-picked schools win ties
  if (e._norm === q.norm) return 1000 + bonus;
  if (e._norm.startsWith(q.norm)) return 900 + bonus;
  if (q.compact.length >= 2 && e._init === q.compact) return 850 + bonus;
  if (q.single && q.compact.length >= 3 && e._init.startsWith(q.compact)) return 500;
  if (q.single && q.compact.length < 3) return 0; // two letters: only the checks above

  let total = 0;
  let nameHits = 0;
  for (const qt of q.tokens) {
    if (e._tokens.includes(qt)) {
      total += 30;
      nameHits += 1;
    } else if (qt.length >= 2 && e._tokens.some((t) => t.startsWith(qt))) {
      total += 25;
      nameHits += 1;
    } else if (qt.length >= 4 && e._norm.includes(qt)) {
      total += 12;
      nameHits += 1;
    } else if (!q.aliased && e._place.some((t) => t.startsWith(qt))) {
      total += 8; // "pretoria south africa": the place words count, but never alone
    } else if (fuzzy && fuzzyTokenHit(qt, e._tokens)) {
      total += 10;
      nameHits += 1;
    } else {
      return 0;
    }
  }
  if (!nameHits) return 0;
  if (e._tokens[0] && e._tokens[0].startsWith(q.tokens[0])) total += 15;
  return 600 + total + bonus;
};

const searchUniversities = (entries, query) => {
  const q = buildQuery(query);
  if (!q.norm) return [];
  const run = (fuzzy) => {
    const hits = [];
    for (const e of entries) {
      const s = scoreUniversity(e, q, fuzzy);
      if (s > 0) hits.push([s, e]);
    }
    return hits;
  };
  let hits = run(false);
  if (hits.length < 4 && q.norm.length >= 4) hits = run(true); // few results: also forgive typos
  const seen = new Set();
  return hits
    .sort((a, b) => b[0] - a[0] || a[1].name.length - b[1].name.length || a[1].name.localeCompare(b[1].name))
    .filter(([, e]) => {
      const key = `${e._norm}|${e.country}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(([, e]) => e);
};

// One shared download for every picker on the page; a failed attempt is retried on the next search.
let universityDatasetPromise = null;
const loadUniversityDataset = () => {
  if (universityDatasetPromise) return universityDatasetPromise;
  universityDatasetPromise = (async () => {
    let lastError;
    for (const url of UNIVERSITY_DATASET_URLS) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`University list returned ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Unexpected university list format');
        return [...EXTRA_INSTITUTIONS.map((u) => ({ ...u, _curated: true })), ...data.filter((u) => u && u.name)].map(indexUniversity);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  })().catch((err) => {
    universityDatasetPromise = null;
    throw err;
  });
  return universityDatasetPromise;
};

const fetchUniversities = async (query, signal) => {
  const entries = await loadUniversityDataset();
  if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
  return searchUniversities(entries, query);
};

const universityLocation = (u) => [u['state-province'], u.country].filter(Boolean).join(', ');

/* Text input that suggests schools as the user types. Picking a suggestion fills the institution
   (and its location); the typed text always stays valid, because schools that are not in the
   dataset (high schools, small colleges) must still be enterable. */
const InstitutionField = ({ id, label, value, onChange, onSelect, placeholder, focused }) => {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [highlight, setHighlight] = useState(-1);
  const blurTimer = useRef(null);

  const query = (value || '').trim();
  const listId = `${id}-listbox`;
  const canSearch = query.length >= MIN_SEARCH_CHARS;
  const showList = open && canSearch;

  useEffect(() => {
    if (!open || query.length < MIN_SEARCH_CHARS) {
      setStatus('idle');
      setResults([]);
      return undefined;
    }

    const key = query.toLowerCase();
    const cached = universitySearchCache.get(key);
    if (cached) {
      setResults(cached.slice(0, MAX_VISIBLE_RESULTS));
      setStatus('done');
      setHighlight(-1);
      return undefined;
    }

    setStatus('loading');
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await fetchUniversities(query, controller.signal);
        const ranked = data; // already matched, ranked and de-duplicated by searchUniversities
        universitySearchCache.set(key, ranked);
        setResults(ranked.slice(0, MAX_VISIBLE_RESULTS));
        setStatus('done');
        setHighlight(-1);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setResults([]);
          setStatus('error');
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const choose = (index) => {
    if (index >= 0 && index < results.length) onSelect(results[index]);
    setOpen(false);
    setHighlight(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!canSearch) return;
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const count = results.length;
      if (count === 0) return;
      setHighlight((h) => (e.key === 'ArrowDown' ? (h + 1) % count : (h - 1 + count) % count));
    } else if (e.key === 'Enter') {
      // Never let Enter submit the surrounding form; it only confirms a highlighted suggestion.
      e.preventDefault();
      if (showList && highlight >= 0) choose(highlight);
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setHighlight(-1);
      }
    }
  };

  return (
    <div className="flex flex-col w-full relative">
      {label && (
        <label htmlFor={id} className="text-xs font-bold text-slate-800 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <div className={`absolute left-0 top-0 h-full w-1 bg-[#d9856b] rounded-l-sm transition-opacity ${focused ? 'opacity-100' : 'opacity-0'} z-10`}></div>
        <input
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && highlight >= 0 ? `${id}-option-${highlight}` : undefined}
          autoComplete="off"
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Delay so a click on a suggestion lands before the list unmounts.
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          onFocus={() => {
            clearTimeout(blurTimer.current);
            loadUniversityDataset().catch(() => {}); // warm up so the first suggestions appear quickly
          }}
          placeholder={placeholder}
          className={`w-full bg-white border ${
            focused ? 'border-[#d9856b] text-slate-900 font-medium' : 'border-slate-200 text-slate-900 focus:border-[#d9856b]'
          } rounded-sm py-1.5 px-3 text-xs focus:outline-none transition-all shadow-none`}
        />

        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label="School suggestions"
            className="absolute left-0 right-0 top-full mt-1 z-30 max-h-64 overflow-y-auto edu-scroll bg-white border border-slate-200 rounded-sm shadow-md"
          >
            {status === 'loading' && <li className="px-3 py-2 text-[11px] text-slate-400" role="presentation">Searching schools…</li>}
            {status === 'error' && (
              <li className="px-3 py-2 text-[11px] text-slate-500" role="presentation">
                Couldn't load school suggestions. You can still type your school's name.
              </li>
            )}
            {status === 'done' && results.length === 0 && (
              <li className="px-3 py-2 text-[11px] text-slate-500" role="presentation">No matching schools found.</li>
            )}
            {results.map((u, i) => (
              <li
                key={`${u.name}|${u.country}`}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={highlight === i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                onMouseEnter={() => setHighlight(i)}
                className={`px-3 py-2 cursor-pointer ${highlight === i ? 'bg-[#d9856b]/10' : 'hover:bg-slate-50'}`}
              >
                <span className="block text-xs font-semibold text-slate-800">{u.name}</span>
                {universityLocation(u) && <span className="block text-[10px] font-medium text-slate-400">{universityLocation(u)}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                     Field of Study picker (built-in list)                  */
/* -------------------------------------------------------------------------- */

// Browsers block the Coursera API from other sites (no CORS headers), so the list is built in.
// Nothing is fetched, which also makes the dropdown instant and fully offline-safe.
const FIELD_GROUPS = {
  'Business & Management': [
    'Business Administration', 'Operations Management', 'Supply Chain Management', 'Logistics',
    'Project Management', 'Human Resource Management', 'Industrial Management', 'Marketing',
    'Entrepreneurship', 'International Business', 'Management', 'Public Administration',
  ],
  'Finance & Economics': [
    'Accounting', 'Finance', 'Economics', 'Banking', 'Auditing', 'Taxation', 'Actuarial Science',
  ],
  'Engineering': [
    'Industrial Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering',
    'Chemical Engineering', 'Mechatronics', 'Manufacturing Engineering', 'Metallurgical Engineering',
    'Mining Engineering', 'Aerospace Engineering', 'Biomedical Engineering', 'Environmental Engineering',
  ],
  'Computing & Data': [
    'Computer Science', 'Information Technology', 'Software Engineering', 'Information Systems',
    'Data Science', 'Artificial Intelligence', 'Cybersecurity', 'Computer Engineering', 'Statistics',
  ],
  'Science & Mathematics': [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Biochemistry', 'Environmental Science',
    'Geology', 'Agriculture', 'Food Science', 'Microbiology', 'Zoology', 'Botany',
  ],
  'Health': [
    'Nursing', 'Medicine', 'Pharmacy', 'Public Health', 'Physiotherapy', 'Dentistry',
    'Occupational Health and Safety', 'Nutrition', 'Psychology', 'Radiography', 'Medical Laboratory Science',
  ],
  'Social Sciences & Law': [
    'Law', 'Political Science', 'Sociology', 'Social Work', 'International Relations', 'Criminology',
    'Anthropology', 'Development Studies', 'Geography', 'Public Policy',
  ],
  'Education': [
    'Education', 'Early Childhood Education', 'Teaching', 'Educational Leadership', 'Curriculum Studies',
  ],
  'Arts & Humanities': [
    'English', 'History', 'Philosophy', 'Linguistics', 'Languages', 'Theology', 'Journalism',
    'Communication', 'Media Studies', 'Graphic Design', 'Fine Arts', 'Music', 'Architecture',
    'Film Studies',
  ],
  'Trades & Vocational': [
    'Engineering Studies', 'Electrical Trade', 'Welding', 'Boilermaking', 'Fitting and Turning',
    'Occupational Safety', 'Hospitality Management', 'Tourism', 'Office Administration',
  ],
};

const FIELD_OPTIONS = Object.entries(FIELD_GROUPS)
  .flatMap(([group, labels]) => labels.map((label) => ({ label, group })))
  .sort((a, b) => a.label.localeCompare(b.label));

const useFieldOptions = () => ({ options: FIELD_OPTIONS, status: 'done' });

// Names that start with the query come first, then the rest of the matches (still alphabetical).
const filterFieldOptions = (options, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  const starts = (o) => (o.label.toLowerCase().startsWith(q) ? 0 : 1);
  return options
    .filter((o) => o.label.toLowerCase().includes(q) || o.group.toLowerCase().includes(q))
    .sort((a, b) => starts(a) - starts(b));
};

/* Dropdown that opens on focus and narrows as the user types. The typed text always stays valid,
   so a field that isn't in the list can still be entered. */
const FieldOfStudyField = ({ id, label, value, onChange, placeholder }) => {
  const { options } = useFieldOptions();
  const [open, setOpen] = useState(false);
  // False while the value came from a pick, so reopening shows every option instead of just that one.
  const [typed, setTyped] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const blurTimer = useRef(null);

  const query = (value || '').trim();
  const listId = `${id}-listbox`;
  const visible = filterFieldOptions(options, typed ? query : '');
  const optionCount = visible.length;

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  useEffect(() => {
    if (!open || highlight < 0) return;
    const el = document.getElementById(`${id}-option-${highlight}`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [open, highlight, id]);

  const close = () => {
    setOpen(false);
    setHighlight(-1);
    setTyped(false);
  };

  const choose = (index) => {
    if (index >= 0 && index < visible.length) onChange(visible[index].label);
    close();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (optionCount === 0) return;
      setHighlight((h) => (e.key === 'ArrowDown' ? (h + 1) % optionCount : h <= 0 ? optionCount - 1 : h - 1));
    } else if (e.key === 'Enter') {
      // Never let Enter submit the surrounding form; it only confirms a highlighted option.
      e.preventDefault();
      if (open && highlight >= 0) choose(highlight);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      close();
    }
  };

  return (
    <div className="flex flex-col w-full relative">
      {label && (
        <label htmlFor={id} className="text-xs font-bold text-slate-800 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && highlight >= 0 ? `${id}-option-${highlight}` : undefined}
          autoComplete="off"
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value);
            setTyped(true);
            setOpen(true);
            setHighlight(-1);
          }}
          onKeyDown={handleKeyDown}
          onClick={() => setOpen(true)}
          onFocus={() => {
            clearTimeout(blurTimer.current);
            setOpen(true);
          }}
          onBlur={() => {
            // Delay so a click on an option lands before the list unmounts.
            blurTimer.current = setTimeout(close, 120);
          }}
          placeholder={placeholder}
          className="w-full bg-white border border-slate-200 text-slate-900 focus:border-[#d9856b] rounded-sm py-1.5 pl-3 pr-8 text-xs focus:outline-none transition-all shadow-none"
        />
        <svg
          className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Fields of study"
            className="absolute left-0 right-0 top-full mt-1 z-30 max-h-64 overflow-y-auto edu-scroll bg-white border border-slate-200 rounded-sm shadow-md"
          >
            {visible.map((o, i) => (
              <li
                key={`${o.group}|${o.label}`}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={highlight === i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                onMouseEnter={() => setHighlight(i)}
                className={`px-3 py-2 cursor-pointer ${highlight === i ? 'bg-[#d9856b]/10' : 'hover:bg-slate-50'}`}
              >
                <span className="block text-xs font-semibold text-slate-800">{o.label}</span>
                {o.group && <span className="block text-[10px] font-medium text-slate-400">{o.group}</span>}
              </li>
            ))}
            {visible.length === 0 && (
              <li className="px-3 py-2 text-[11px] text-slate-500" role="presentation">No matching fields.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

/* A rich-text field with the live spelling and grammar panel underneath it.
   The panel stays mounted but hidden while the field is empty, so it keeps its state and does not
   flash a "loading" notice when the first character is typed. */
const CheckedField = ({ value, onChange, ...fieldProps }) => {
  const text = typeof value === 'string' ? value : '';
  return (
    <div className="flex flex-col gap-3">
      <AchievementsField {...fieldProps} value={text} onChange={onChange} />
      <div className={text.trim() ? '[&>div]:rounded-sm' : 'hidden'}>
        <SpellCheckPanel text={text} onChange={onChange} field="education" />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                             One qualification                              */
/* -------------------------------------------------------------------------- */

const QualificationFields = ({ entry, onChange }) => {
  const [isCourseworkOpen, setIsCourseworkOpen] = useState(true);

  const handleChange = (field) => (e) => onChange({ [field]: e.target.value });

  // Picking a school fills the institution and, when the dataset knows it, the location too.
  // Location stays editable afterwards, and is left alone if the dataset has nothing for it.
  const handleSelectInstitution = (university) => {
    const location = universityLocation(university);
    onChange({ institution: university.name, ...(location ? { location } : {}) });
  };

  return (
    <div>
      <div className="space-y-4 w-full">
        <div className="flex flex-col sm:flex-row gap-4">
          <InstitutionField
            id={`institution-${entry.id}`}
            label="Institution *"
            value={entry.institution}
            onChange={(v) => onChange({ institution: v })}
            onSelect={handleSelectInstitution}
            placeholder="Start typing your school's name"
            focused={true}
          />
          <InputField label="Institution Location" value={entry.location} onChange={handleChange('location')} placeholder="City, Country" />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <InputField label="Degree" value={entry.degree} onChange={handleChange('degree')} placeholder="BSc, Certificate, etc." />
          <FieldOfStudyField
            id={`field-${entry.id}`}
            label="Field of Study"
            value={entry.field}
            onChange={(v) => onChange({ field: v })}
            placeholder="Computer Science"
          />
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
        <button
          type="button"
          onClick={() => setIsCourseworkOpen(!isCourseworkOpen)}
          aria-expanded={isCourseworkOpen}
          className={`w-full min-h-[44px] px-3 sm:px-3.5 py-2 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#d9856b]/50 ${isCourseworkOpen ? 'border-b border-slate-100' : ''}`}
        >
          <span className="text-xs font-bold text-slate-800 leading-snug">Add additional coursework or achievements</span>
          <svg
            className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${isCourseworkOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isCourseworkOpen && (
          <div className="p-2.5 sm:p-3.5 bg-slate-50/50 flex flex-col gap-2">
            <CheckedField
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
      <style>{SCROLLBAR_CSS}</style>
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
                <div id={`qualification-body-${entry.id}`} className="border-t border-slate-100 px-3 py-4 sm:px-4 sm:py-5 bg-white">
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