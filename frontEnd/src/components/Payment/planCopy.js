// What each plan says about itself in the app.
//
// There are two plans. Free has no AI suggestions, saves 1 resume, allows unlimited downloads (with a small RemoPDF
// label) and does not import an existing resume. Premium is one plan bought for 7, 14 or 30 days: everyone who pays
// gets all of it, at its best, whichever length they pick. Nothing renews on its own.
//
// Prices and lengths are NOT here: they come from the server (GET /api/payments/status -> plans), so the price a person
// sees is always the price they are charged, and changing PLAN_7D_AMOUNT / PLAN_14D_AMOUNT / PLAN_30D_AMOUNT in
// server/.env is all it takes to change one.
//
// The daily AI number below must match the AI service (backEnd/routers/ai_models.py, TIER_SPECS daily_credits, or
// AI_DAILY_PREMIUM in Render). The words about the AI match what the service really does: the strongest model it has,
// thinking hardest, with the most room to think.

export const PLAN_ORDER = ['free', 'premium'];

// The lengths Premium is sold in, shortest first. Only used while the server's list has not arrived (a signed-out
// visitor cannot ask for it): keep it equal to PLAN_DEFS in server/lib/plans.js.
export const LIST_PLANS = [
  { id: '7d', days: 7, amount: 3900, currency: 'ZAR' },
  { id: '14d', days: 14, amount: 7800, currency: 'ZAR' },
  { id: '30d', days: 30, amount: 15600, currency: 'ZAR' },
];

export const AI_PER_DAY = 60;

export const PLAN_COPY = {
  free: {
    name: 'Free',
    quality: 'Build and download',
    features: ['Unlimited downloads, with a small RemoPDF label', '1 saved resume'],
    notIncluded: ['AI suggestions', 'Importing an existing resume'],
  },
  premium: {
    name: 'Premium',
    quality: 'Everything, at its best',
    aiPerDay: AI_PER_DAY,
    features: [
      'The strongest AI model, thinking hardest, for every suggestion',
      `${AI_PER_DAY} AI actions a day`,
      'AI writing assistant, study and achievement ideas, summaries, cover letters and job matching',
      'Import an existing resume (PDF or Word)',
      'Clean PDFs with no RemoPDF label',
      'Unlimited downloads',
      'Up to 10 saved resumes',
    ],
  },
};

export const planName = (tier) => (PLAN_COPY[tier] ? PLAN_COPY[tier].name : 'Premium');

export const dayWord = (days) => `${days} ${days === 1 ? 'day' : 'days'}`;

// The id of the plan that costs the least per day (the "best value" one). null when there is nothing to compare, or
// when the cheapest price per day is shared by every plan.
export const bestValueId = (plans) => {
  const list = (Array.isArray(plans) ? plans : []).filter((p) => p && p.days > 0 && p.amount > 0);
  if (list.length < 2) return null;
  const perDay = (p) => p.amount / p.days;
  const lowest = Math.min(...list.map(perDay));
  const cheapest = list.filter((p) => perDay(p) === lowest);
  return cheapest.length === list.length ? null : cheapest[cheapest.length - 1].id;
};
