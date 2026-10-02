

import cvDatasetCollection from '../../../utils/cvDataset';

/* -------------------------------------------------------------------------- */
/*                              Text normalisation                            */
/* -------------------------------------------------------------------------- */

// Dataset keys are PascalCase ("UxUiDesigner"). These tokens need special casing in labels.
const ACRONYMS = {
  hr: 'HR', it: 'IT', seo: 'SEO', qa: 'QA', ux: 'UX', ui: 'UI', ios: 'iOS', ai: 'AI',
  esl: 'ESL', ged: 'GED', hvac: 'HVAC', leed: 'LEED', lms: 'LMS', ohs: 'OHS', vfx: 'VFX',
  cctv: 'CCTV', ceo: 'CEO', cfo: 'CFO', coo: 'COO',
  devops: 'DevOps', elearning: 'E-Learning',
};
const SMALL_WORDS = new Set(['and', 'of', 'for', 'the', 'in', 'to', 'on']);
// Ignored when comparing what the user typed with a role name.
const QUERY_STOPWORDS = new Set(['and', 'of', 'the', 'for', 'in', 'a', 'an', 'to', 'at', 'on']);
// "Senior Software Engineer" is treated as "Software Engineer" when looking up a role.
const SENIORITY = new Set(['senior', 'sr', 'junior', 'jr', 'lead', 'principal', 'trainee', 'intern', 'ii', 'iii', 'iv']);

const prettifyKey = (key) => {
  const spaced = String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\bDev Ops\b/, 'DevOps')
    .replace(/\bE Learning\b/, 'E-Learning');
  return spaced
    .split(' ')
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (ACRONYMS[lower]) return ACRONYMS[lower];
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return word;
    })
    .join(' ');
};

const norm = (value) =>
  String(value == null ? '' : value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value) =>
  norm(value)
    .split(' ')
    .map((word) => word.replace(/^\.+|\.+$/g, ''))
    .filter(Boolean);

const alnum = (value) => norm(value).replace(/[^a-z0-9]/g, '');

const addUnique = (list, items) => {
  if (!Array.isArray(items)) return;
  const seen = new Set(list.map(norm));
  items.forEach((item) => {
    if (typeof item !== 'string') return;
    const text = item.trim();
    const key = norm(text);
    if (!key || seen.has(key)) return;
    seen.add(key);
    list.push(text);
  });
};

/* -------------------------------------------------------------------------- */
/*                                   Indexing                                 */
/* -------------------------------------------------------------------------- */

let indexCache = null;

const getIndex = () => {
  if (indexCache) return indexCache;

  let raw = {};
  try {
    raw = cvDatasetCollection() || {};
  } catch (err) {
    raw = {};
  }

  // Roles. Keys that prettify to the same label ("SeoManager" / "SEOManager") are merged.
  const byLabel = new Map();
  Object.keys(raw).forEach((key) => {
    const entry = raw[key];
    if (!entry) return;
    const label = prettifyKey(key);
    const id = label.toLowerCase();
    let role = byLabel.get(id);
    if (!role) {
      role = {
        key,
        label,
        compact: alnum(label),
        tokens: tokenize(label).filter((t) => !QUERY_STOPWORDS.has(t)),
        skills: [],
        achievements: [],
        skillKeys: new Set(),
        skillTokens: new Set(),
      };
      byLabel.set(id, role);
    }
    addUnique(role.skills, entry.skills);
    addUnique(role.achievements, entry.achievements);
  });
  const roles = Array.from(byLabel.values());

  // Skills, de-duplicated across roles. `count` is how many roles list the skill.
  const skillByKey = new Map();
  roles.forEach((role) => {
    role.skills.forEach((text) => {
      const key = norm(text);
      role.skillKeys.add(key);
      tokenize(text).forEach((t) => {
        if (!QUERY_STOPWORDS.has(t)) role.skillTokens.add(t);
      });
      let skill = skillByKey.get(key);
      if (!skill) {
        skill = { key, text, forms: {}, count: 0, tokens: tokenize(text), alnum: alnum(text) };
        skillByKey.set(key, skill);
      }
      skill.count += 1;
      skill.forms[text] = (skill.forms[text] || 0) + 1;
    });
  });
  const skills = Array.from(skillByKey.values());
  skills.forEach((skill) => {
    // Show the most common spelling of the skill.
    skill.text = Object.keys(skill.forms).sort((a, b) => skill.forms[b] - skill.forms[a])[0];
  });
  const popular = skills.slice().sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));

  // How many roles use each word in their skills. Words used by many roles ("communication")
  // say little about a job, so only rare ones are used when matching a title through skills.
  const skillTokenDf = new Map();
  roles.forEach((role) => {
    role.skillTokens.forEach((t) => skillTokenDf.set(t, (skillTokenDf.get(t) || 0) + 1));
  });

  indexCache = { roles, skills, skillByKey, popular, skillTokenDf };
  return indexCache;
};

// Rare skills say more about a job than common ones ("Communication" is in half the roles).
const idf = (key) => {
  const { roles, skillByKey } = getIndex();
  const skill = skillByKey.get(key);
  return Math.log(roles.length / (skill ? skill.count : 1));
};

/* -------------------------------------------------------------------------- */
/*                                Role matching                               */
/* -------------------------------------------------------------------------- */

const prepQuery = (value) => {
  const all = tokenize(value);
  const withoutSeniority = all.filter((t) => !SENIORITY.has(t));
  const base = withoutSeniority.length ? withoutSeniority : all;
  const meaningful = base.filter((t) => !QUERY_STOPWORDS.has(t));
  return {
    compact: base.join('').replace(/[^a-z0-9]/g, ''),
    tokens: meaningful.length ? meaningful : base,
  };
};

const SKILL_TOKEN_MAX_DF = 60;

// 0-100. 100 = same title, 70+ = confident match, below 40 = loosely related.
const scoreRole = (role, q) => {
  if (!q.compact) return 0;
  if (role.compact === q.compact) return 100;
  if (q.compact.length >= 2 && role.compact.startsWith(q.compact)) return 85;

  const qt = q.tokens;
  const rt = role.tokens;
  if (!qt.length || !rt.length) return 0;

  const hits = qt.filter((t) => rt.some((r) => r.startsWith(t))).length;
  if (hits === qt.length) return 75 + Math.round((10 * qt.length) / rt.length);

  // The typed title is more specific than the role ("Marketing and Sales Manager" -> "Sales Manager").
  if (rt.length >= 2 && rt.every((r) => qt.some((t) => t === r || (r.length >= 3 && t.startsWith(r))))) return 70;

  // Loosely related: score by how much of the typed title is covered by the role's name
  // (full credit) or by one of its distinctive skills ("React Developer" -> a role with React).
  // Words that few roles use count for more than common ones ("Sales" vs "Manager").
  const { skillTokenDf } = getIndex();
  let covered = 0;
  let total = 0;
  qt.forEach((t, i) => {
    const w = q.weights[i];
    total += w;
    if (rt.some((r) => r.startsWith(t))) covered += w;
    else if (t.length >= 3 && role.skillTokens.has(t) && skillTokenDf.get(t) <= SKILL_TOKEN_MAX_DF) covered += 0.6 * w;
  });
  if (covered <= 0 || total <= 0) return 0;
  const headNounHit = rt.some((r) => r.startsWith(qt[qt.length - 1]));
  return 15 + Math.round((40 * covered) / total) + (headNounHit ? 5 : 0);
  return 0;
};

const rankRoles = (query, { skills = [], minScore = 30 } = {}) => {
  const { roles } = getIndex();
  const q = prepQuery(query);
  if (!q.compact) return [];
  q.weights = q.tokens.map((t) =>
    Math.log(roles.length / Math.max(1, roles.filter((r) => r.tokens.some((w) => w.startsWith(t))).length))
  );
  const mine = new Set(skills.map(norm).filter(Boolean));
  const out = [];
  roles.forEach((role, idx) => {
    const base = scoreRole(role, q);
    if (base < minScore) return;
    let overlap = 0;
    mine.forEach((key) => {
      if (role.skillKeys.has(key)) overlap += 1;
    });
    // Shared skills only break ties between similar matches.
    out.push({ role, base, score: base + Math.min(4, overlap), idx });
  });
  out.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return out;
};

const STRONG = 70;
const WEAK = 40;

// The role(s) a job title most likely refers to, best first.
const bestRoles = (title, { skills = [], max = 3 } = {}) => {
  const ranked = rankRoles(title, { skills, minScore: WEAK });
  if (!ranked.length) return [];
  const topBase = Math.max(...ranked.map((r) => r.base));
  const keep =
    topBase >= STRONG
      ? ranked.filter((r) => r.base >= Math.max(STRONG, topBase - 10))
      : ranked.filter((r) => r.base >= topBase - 5);
  return keep.slice(0, max).map((r) => r.role);
};

/* -------------------------------------------------------------------------- */
/*                                Job titles                                  */
/* -------------------------------------------------------------------------- */

const MIN_CONTEXT_SCORE = 2.5;

/**
 * Job titles from the dataset.
 *  - With 2+ characters typed: titles that match the text (prefix, word, or loosely related).
 *  - With nothing typed: titles whose skills overlap the user's skills and earlier jobs.
 * Returns { suggestions: string[] }.
 */
export const suggestTitles = ({ query = '', skills = [], previousTitles = [], limit = 8 } = {}) => {
  if (prepQuery(query).compact.length >= 2) {
    let ranked = rankRoles(query, { skills, minScore: 30 });
    // When some titles match well, hide the loosely related ones.
    if (ranked.length && Math.max(...ranked.map((r) => r.base)) >= STRONG) ranked = ranked.filter((r) => r.base >= STRONG);
    return { suggestions: ranked.slice(0, limit).map((r) => r.role.label) };
  }

  const { roles } = getIndex();
  const weights = new Map();
  skills.forEach((skill) => {
    const key = norm(skill);
    if (key) weights.set(key, 1);
  });
  previousTitles.forEach((title) => {
    bestRoles(title, { max: 1 }).forEach((role) => {
      role.skills.forEach((skill) => {
        const key = norm(skill);
        if (!weights.has(key)) weights.set(key, 0.5);
      });
    });
  });
  if (!weights.size) return { suggestions: [] };

  const scored = [];
  roles.forEach((role, idx) => {
    let score = 0;
    weights.forEach((weight, key) => {
      if (role.skillKeys.has(key)) score += weight * idf(key);
    });
    if (score >= MIN_CONTEXT_SCORE) scored.push({ role, score, idx });
  });
  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return { suggestions: scored.slice(0, limit).map((s) => s.role.label) };
};

/* -------------------------------------------------------------------------- */
/*                                   Skills                                   */
/* -------------------------------------------------------------------------- */

const contextCache = new Map();

// Skills of the roles the user's job titles map to. Earlier titles (most recent job) and
// skills listed first for a role weigh more.
const contextSkillWeights = (jobTitles) => {
  const titles = Array.from(new Set(jobTitles.map((t) => String(t || '').trim()).filter(Boolean))).slice(0, 5);
  const cacheKey = titles.join('|').toLowerCase();
  if (contextCache.has(cacheKey)) return contextCache.get(cacheKey);

  const weights = new Map();
  titles.forEach((title, ti) => {
    const titleWeight = 1 / (1 + ti * 0.3);
    bestRoles(title, { max: 2 }).forEach((role, ri) => {
      const n = Math.max(1, role.skills.length);
      role.skills.forEach((text, i) => {
        const weight = titleWeight * (ri === 0 ? 1 : 0.6) * (1 - 0.5 * (i / n));
        const key = norm(text);
        weights.set(key, (weights.get(key) || 0) + weight);
      });
    });
  });

  if (contextCache.size > 50) contextCache.clear();
  contextCache.set(cacheKey, weights);
  return weights;
};

const matchSkill = (skill, q, qAlnum, qTokens) => {
  if (skill.key === q) return 100;
  if (skill.key.startsWith(q)) return 90;
  if (qTokens.length && qTokens.every((t) => skill.tokens.some((w) => w.startsWith(t)))) return 75;
  if (q.length >= 2 && skill.key.includes(q)) return 55;
  if (qAlnum.length >= 3 && skill.alnum.includes(qAlnum)) return 50;
  return 0;
};

/**
 * Skills from the dataset.
 *  - With text typed: skills that match it, ranked up when they fit the user's job titles.
 *  - With nothing typed: skills for the user's job titles, then the most common skills.
 * `exclude` hides skills the user already has.
 * Returns { suggestions: string[], personalised: boolean } where `personalised` means the
 * list is based on the user's job titles.
 */
export const suggestSkills = ({ query = '', exclude = [], jobTitles = [], limit = 10 } = {}) => {
  const { skills, skillByKey, popular } = getIndex();
  const skip = new Set(exclude.map(norm).filter(Boolean));
  const context = contextSkillWeights(jobTitles);
  const q = norm(query);

  if (q) {
    const qAlnum = q.replace(/[^a-z0-9]/g, '');
    const qTokens = tokenize(query);
    const out = [];
    skills.forEach((skill) => {
      if (skip.has(skill.key)) return;
      const match = matchSkill(skill, q, qAlnum, qTokens);
      if (!match) return;
      const fit = Math.min(1, context.get(skill.key) || 0);
      out.push({ skill, score: match + 15 * fit + 3 * Math.log10(skill.count + 1) });
    });
    out.sort(
      (a, b) =>
        b.score - a.score || a.skill.text.length - b.skill.text.length || a.skill.text.localeCompare(b.skill.text)
    );
    return { suggestions: out.slice(0, limit).map((o) => o.skill.text), personalised: context.size > 0 };
  }

  const picked = [];
  const seen = new Set();
  const push = (skill) => {
    if (!skill || skip.has(skill.key) || seen.has(skill.key) || picked.length >= limit) return;
    seen.add(skill.key);
    picked.push(skill.text);
  };
  Array.from(context.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([key]) => push(skillByKey.get(key)));
  const personalised = picked.length > 0;
  popular.forEach(push);
  return { suggestions: picked, personalised };
};

/* -------------------------------------------------------------------------- */
/*                                Achievements                                */
/* -------------------------------------------------------------------------- */

const interleave = (lists) => {
  const out = [];
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let i = 0; i < longest; i += 1) {
    lists.forEach((list) => {
      if (i < list.length) out.push(list[i]);
    });
  }
  return out;
};

/**
 * Achievement lines for a job title. Lines that mention one of the user's skills come first.
 * `existing` / `exclude` are lines to leave out. `round` pages through the pool, wrapping around,
 * so "show new ideas" gives the next batch.
 * Returns { suggestions: string[], total: number, roleLabel: string } where `total` is the size of
 * the pool and `roleLabel` is the dataset role the title was matched to.
 */
export const suggestAchievements = ({
  title = '',
  skills = [],
  existing = [],
  exclude = [],
  round = 0,
  limit = 5,
} = {}) => {
  const roles = bestRoles(title, { skills, max: 3 });
  if (!roles.length) return { suggestions: [], total: 0, roleLabel: '' };

  const skillKeys = skills.map(norm).filter((k) => k.length >= 3);
  const ranked = roles.map((role) =>
    role.achievements
      .map((text, i) => {
        const t = norm(text);
        return { text, i, hit: skillKeys.some((k) => t.includes(k)) ? 1 : 0 };
      })
      .sort((a, b) => b.hit - a.hit || a.i - b.i)
      .map((x) => x.text)
  );

  const asList = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v ? [v] : []);
  const skip = new Set([...asList(existing), ...asList(exclude)].map(norm).filter(Boolean));
  const pool = [];
  interleave(ranked).forEach((text) => {
    const key = norm(text);
    if (skip.has(key)) return;
    skip.add(key);
    pool.push(text);
  });

  const total = pool.length;
  const roleLabel = roles.slice(0, 2).map((r) => r.label).join(' / ');
  if (!total) return { suggestions: [], total: 0, roleLabel };

  const count = Math.min(limit, total);
  const start = (Math.max(0, round) * limit) % total;
  const suggestions = [];
  for (let i = 0; i < count; i += 1) suggestions.push(pool[(start + i) % total]);
  return { suggestions, total, roleLabel };
};
