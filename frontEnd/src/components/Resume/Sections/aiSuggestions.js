/* -------------------------------------------------------------------------- */
/*                    AI suggestions for the Work History step                */
/* -------------------------------------------------------------------------- */
/*
  suggestTitles()        -> ideas for the "Title *" field
  suggestAchievements()  -> achievement bullets for ONE job, based on its title,
                            employer, time in the role and the user's skills

  Both call your backend first:  POST AI_ENDPOINT
    request  { type: 'titles' | 'achievements', ...context, count }
    response { suggestions: string[] }

  Keep your AI key on the server, never in the React bundle. If the endpoint is
  missing, slow or fails, both functions fall back to the built-in suggestions
  below, so the form never breaks.
*/

export const AI_ENDPOINT = '/api/ai/resume-suggest';
const REQUEST_TIMEOUT_MS = 12000;
const TITLE_COUNT = 6;
const ACHIEVEMENT_COUNT = 5;

const norm = (s) => String(s || '').toLowerCase().trim();

/* ------------------------------ skills helper ------------------------------ */

// Skill names from SkillsField data ({ text, rating }), best-rated first.
export const skillNames = (skills) =>
  (Array.isArray(skills) ? skills : [])
    .filter((s) => s && s.text && s.text.trim())
    .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
    .map((s) => s.text.trim());

/* ----------------------------- achievements text ---------------------------- */
// The achievements value may be plain text (one line per achievement) or HTML
// from a rich-text editor. These helpers handle both.

const stripHtml = (v) =>
  String(v || '')
    .replace(/<\/(li|p|div)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const escapeHtml = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const achievementLines = (value) =>
  stripHtml(value)
    .split('\n')
    .map((l) => l.replace(/^[\s•\-–*]+/, '').trim())
    .filter(Boolean);

export const hasAchievement = (value, text) => achievementLines(value).some((l) => norm(l) === norm(text));

export const appendAchievement = (value, text) => {
  const current = String(value || '');
  const clean = String(text).trim();

  if (/<(ul|ol)[\s>]/i.test(current)) {
    const next = current.replace(/<\/(ul|ol)>\s*$/i, (m) => `<li>${escapeHtml(clean)}</li>${m}`);
    if (next !== current) return next;
  }
  if (/<[a-z][\s\S]*>/i.test(current)) return `${current}<ul><li>${escapeHtml(clean)}</li></ul>`;
  return current.trim() ? `${current.replace(/\s+$/, '')}\n${clean}` : clean;
};

/* --------------------------------- backend --------------------------------- */

async function callAi(payload, signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  if (signal) signal.addEventListener('abort', onAbort);
  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`AI request failed (${res.status})`);
    const data = await res.json();
    const list = Array.isArray(data && data.suggestions) ? data.suggestions : [];
    return list.map((s) => String(s).trim()).filter(Boolean);
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

// Try the backend, otherwise use the local generator. A cancelled request is re-thrown.
async function withFallback(payload, signal, fallback) {
  try {
    const list = await callAi(payload, signal);
    if (list.length) return { suggestions: list, source: 'ai' };
  } catch (err) {
    if (signal && signal.aborted) throw err;
  }
  return { suggestions: fallback(), source: 'local' };
}

/* ------------------------------ local: titles ------------------------------- */

const TITLE_CATALOG = [
  { title: 'Sales Manager', keys: ['sales', 'negotiation', 'crm', 'pipeline', 'leadership'] },
  { title: 'Sales Representative', keys: ['sales', 'customer', 'negotiation', 'communication'] },
  { title: 'Account Executive', keys: ['sales', 'accounts', 'negotiation', 'crm'] },
  { title: 'Business Development Manager', keys: ['business development', 'sales', 'partnership', 'lead generation'] },
  { title: 'Software Engineer', keys: ['javascript', 'python', 'java', 'react', 'node', 'programming', 'coding', 'sql'] },
  { title: 'Frontend Developer', keys: ['react', 'javascript', 'css', 'html', 'typescript', 'vue'] },
  { title: 'Backend Developer', keys: ['node', 'python', 'java', 'sql', 'api', 'database'] },
  { title: 'Full Stack Developer', keys: ['react', 'node', 'javascript', 'sql', 'api'] },
  { title: 'Data Analyst', keys: ['excel', 'sql', 'data', 'analysis', 'power bi', 'tableau', 'reporting'] },
  { title: 'Business Analyst', keys: ['analysis', 'requirements', 'reporting', 'stakeholder', 'process'] },
  { title: 'Product Manager', keys: ['product', 'roadmap', 'strategy', 'stakeholder', 'agile'] },
  { title: 'Project Manager', keys: ['project management', 'planning', 'agile', 'scrum', 'budget', 'schedule'] },
  { title: 'Operations Manager', keys: ['operations', 'logistics', 'process', 'leadership', 'budget'] },
  { title: 'Team Leader', keys: ['leadership', 'team', 'coaching', 'management', 'mentoring'] },
  { title: 'Marketing Manager', keys: ['marketing', 'brand', 'campaign', 'strategy', 'analytics'] },
  { title: 'Digital Marketing Specialist', keys: ['seo', 'social media', 'google ads', 'email marketing', 'analytics'] },
  { title: 'Content Writer', keys: ['writing', 'content', 'copywriting', 'editing', 'seo'] },
  { title: 'Social Media Manager', keys: ['social media', 'content', 'community', 'canva', 'branding'] },
  { title: 'Graphic Designer', keys: ['photoshop', 'illustrator', 'canva', 'design', 'branding'] },
  { title: 'UI/UX Designer', keys: ['figma', 'ux', 'ui', 'wireframe', 'prototype', 'user research'] },
  { title: 'Customer Service Representative', keys: ['customer', 'service', 'communication', 'problem-solving', 'attitude'] },
  { title: 'Customer Success Manager', keys: ['customer', 'retention', 'onboarding', 'relationship', 'crm'] },
  { title: 'Office Administrator', keys: ['administration', 'microsoft office', 'organization', 'scheduling', 'filing'] },
  { title: 'Executive Assistant', keys: ['scheduling', 'calendar', 'communication', 'organization', 'travel'] },
  { title: 'HR Coordinator', keys: ['recruitment', 'onboarding', 'hr', 'payroll', 'employee'] },
  { title: 'Accountant', keys: ['accounting', 'bookkeeping', 'tax', 'excel', 'audit', 'payroll'] },
  { title: 'Financial Analyst', keys: ['finance', 'forecasting', 'excel', 'budget', 'modeling'] },
  { title: 'Retail Sales Associate', keys: ['retail', 'customer', 'sales', 'cash handling', 'merchandising'] },
  { title: 'Warehouse Associate', keys: ['warehouse', 'inventory', 'forklift', 'logistics', 'packing'] },
  { title: 'Teacher', keys: ['teaching', 'lesson planning', 'classroom', 'curriculum', 'education'] },
];

const localTitles = ({ query, skills, count }) => {
  const q = norm(query);
  const skillText = skills.map(norm).join(' | ');

  const scoreItem = (item, useQuery) => {
    const t = norm(item.title);
    let score = 0;
    if (useQuery && q) {
      if (t.startsWith(q)) score += 10;
      else if (t.includes(q)) score += 6;
      score += q.split(/\s+/).filter((w) => w.length > 1 && t.includes(w)).length * 2;
    }
    score += item.keys.filter((k) => skillText.includes(k)).length * 3;
    return score;
  };

  const rank = (useQuery) =>
    TITLE_CATALOG.map((item, index) => ({ title: item.title, index, score: scoreItem(item, useQuery) }))
      .sort((a, b) => b.score - a.score || a.index - b.index);

  // What the user typed matters most; skills are the tie-breaker.
  let ranked = rank(true);
  if (q) {
    const matched = ranked.filter((r) => r.score > 0 && (norm(r.title).includes(q) || q.split(/\s+/).some((w) => w.length > 1 && norm(r.title).includes(w))));
    ranked = matched.length ? matched : rank(false);
  }
  return ranked.slice(0, count).map((r) => r.title);
};

/* --------------------------- local: achievements ---------------------------- */
// [Brackets] are placeholders: the form reminds the user to fill in real numbers.

const FAMILIES = [
  {
    re: /sales|account exec|business develop|retail|cashier|store/,
    bullets: [
      'Exceeded monthly sales targets by [X]% through proactive outreach and consultative selling',
      'Built and maintained a pipeline of [X]+ active accounts, growing repeat business by [X]%',
      'Closed [X] new deals worth $[X] by tailoring proposals to each client\'s needs',
      'Tracked leads and follow-ups in a CRM, lifting conversion rate from [X]% to [X]%',
      'Trained [X] new team members on products and sales process, shortening ramp-up by [X] weeks',
      'Negotiated terms that improved profit margins by [X]% without losing the account',
    ],
  },
  {
    re: /engineer|develop|programmer|software|devops|\bdata\b|\bit\b|\bweb\b|\bqa\b|tester/,
    bullets: [
      'Built and shipped [feature or product] used by [X]+ users, using [technologies]',
      'Cut page load or API response time by [X]% by optimizing queries and adding caching',
      'Wrote automated tests that raised coverage from [X]% to [X]% and reduced production bugs by [X]%',
      'Automated [manual process], saving [X] hours per week for the team',
      'Reviewed code and mentored [X] junior developers, improving team delivery speed',
      'Worked with product and design to deliver [X] releases on schedule',
    ],
  },
  {
    re: /market|content|seo|social|brand|writer|copy/,
    bullets: [
      'Grew [channel] audience by [X]% in [X] months with a consistent content calendar',
      'Launched [X] campaigns that generated [X] leads at a [X]% lower cost per lead',
      'Raised email open rate from [X]% to [X]% by A/B testing subject lines and send times',
      'Analyzed campaign data and reallocated budget, increasing ROI by [X]%',
      'Managed a monthly budget of $[X] across paid and organic channels',
      'Wrote [X]+ articles or posts that brought in [X] monthly visitors',
    ],
  },
  {
    re: /design|\bux\b|\bui\b|creative|artist/,
    bullets: [
      'Designed [X] screens or brand assets used by [X]+ customers',
      'Ran user research with [X] participants and turned findings into changes that raised task completion by [X]%',
      'Built a reusable design system that cut design-to-development handoff time by [X]%',
      'Partnered with developers to ship [X] features on schedule',
      'Revised layouts based on feedback, increasing engagement or conversions by [X]%',
    ],
  },
  {
    re: /support|service|customer|success|help ?desk|receptionist|call cent/,
    bullets: [
      'Resolved [X]+ customer requests per week while keeping satisfaction at [X]%',
      'Cut average response time from [X] to [X] minutes by creating reusable answer templates',
      'Turned [X] escalated complaints into retained accounts through clear follow-up',
      'Documented fixes for common issues, reducing repeat tickets by [X]%',
      'Trained [X] new team members on tools and service standards',
    ],
  },
  {
    re: /account(ant|ing)|financ|bookkeep|audit|payroll|treasur/,
    bullets: [
      'Prepared monthly financial reports for $[X] in revenue and closed the books [X] days faster',
      'Processed [X]+ invoices and payments per month with [X]% accuracy',
      'Found and corrected [X] discrepancies during audits, saving $[X]',
      'Built budget and forecast models that improved planning accuracy by [X]%',
      'Streamlined payroll or reconciliations with [tool], saving [X] hours per month',
    ],
  },
  {
    re: /admin|assistant|coordinator|clerk|secretary|office|\bhr\b|human resources|recruit/,
    bullets: [
      'Managed calendars, travel and correspondence for [X] executives or team members',
      'Reorganized filing and records, cutting document retrieval time by [X]%',
      'Processed [X]+ requests per month with [X]% accuracy',
      'Coordinated [X] meetings or events per quarter, keeping attendance at [X]%',
      'Introduced [tool] to replace manual tracking, saving [X] hours per week',
    ],
  },
  {
    re: /manager|lead|supervisor|director|head|owner/,
    bullets: [
      'Led a team of [X] people, delivering [X] projects on time and [X]% under budget',
      'Set weekly goals and coached team members, improving team performance by [X]%',
      'Streamlined schedules and processes, reducing costs by [X]%',
      'Hired and onboarded [X] employees, shortening ramp-up time to [X] weeks',
      'Reported KPIs to leadership and adjusted plans, lifting results by [X]%',
    ],
  },
];

const GENERIC_BULLETS = [
  'Delivered [X] projects on time by planning tasks and communicating clearly with stakeholders',
  'Improved [process] by [X]%, saving [X] hours per week',
  'Trained and supported [X] colleagues, raising overall team output',
  'Handled [X]+ daily tasks accurately while meeting every deadline',
  'Recognized by [manager or client] for [specific result]',
];

const localAchievements = ({ title, skills, existing, round, count }) => {
  const family = FAMILIES.find((f) => f.re.test(norm(title)));
  const skillBullets = skills
    .slice(0, 2)
    .map((s) => `Put ${s} into practice by [what you did], leading to [result]`);
  if (skills.length >= 2) skillBullets.push(`Combined ${skills[0]} and ${skills[1]} to [what you did], leading to [result]`);

  const taken = new Set((existing || []).map(norm));
  const pool = [
    ...skillBullets.slice(0, 1),
    ...(family ? family.bullets : []),
    ...skillBullets.slice(1),
    ...GENERIC_BULLETS,
  ].filter((b, i, arr) => arr.indexOf(b) === i && !taken.has(norm(b)));

  if (pool.length <= count) return pool;
  const start = ((round || 0) * count) % pool.length;
  return Array.from({ length: count }, (_, i) => pool[(start + i) % pool.length]);
};

/* ---------------------------------- public ---------------------------------- */

export function suggestTitles({ query = '', employer = '', skills = [], previousTitles = [], signal } = {}) {
  return withFallback(
    { type: 'titles', query, employer, skills, previousTitles, count: TITLE_COUNT },
    signal,
    () => localTitles({ query, skills, count: TITLE_COUNT })
  );
}

export function suggestAchievements({
  title = '',
  employer = '',
  remote = false,
  years = null,
  skills = [],
  existing = [],
  exclude = [],
  round = 0,
  signal,
} = {}) {
  return withFallback(
    { type: 'achievements', title, employer, remote, years, skills, existing, exclude, count: ACHIEVEMENT_COUNT },
    signal,
    () => localAchievements({ title, skills, existing, round, count: ACHIEVEMENT_COUNT })
  );
}
