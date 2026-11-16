// The plans, in one place: what they cost, how long they last, and how "what does this person have right now?"
// is worked out from their payments. No database and no Express in here, so it is tested on its own
// (see lib/plans.test.js: node --test lib/plans.test.js).
//
//   free      R0     no AI suggestions, 1 saved resume, unlimited downloads (with the small RemoPDF label), no uploads
//   premium   one plan, three lengths, paid once, never renews on its own:
//               7 days   R39
//              14 days   R78    (2 x R39)
//              30 days   R156   (4 x R39, and you get 30 days instead of 28)
//             everyone who pays gets the same, best experience whichever length they pick: the strongest AI model
//             thinking hardest, the most AI actions a day, AI cover letters and job matching, importing a resume,
//             clean PDFs without the label, and up to 10 saved resumes.
//
// What the AI does is decided by the AI service (backEnd/routers/ai_models.py), which reads the plan from the signed
// AI pass. This file only decides who has which plan.

export const DAY_MS = 24 * 60 * 60 * 1000;

// Lowest to highest.
export const TIERS = ['free', 'premium'];
export const PAID_TIERS = ['premium'];

// One payment never buys more than this many days of access, whatever an older payment stored.
export const MAX_ACCESS_DAYS = 30;

// Paying while Premium is still running ADDS the new days after the current ones end, so nobody loses days by paying
// early. The days waiting at the end can never total more than this (the longest single plan is 30, so someone with
// 60 days or fewer left can always buy 30 more).
export const MAX_BANKED_DAYS = 90;

// What can be bought, as { id, name, days, amount }. Amounts are in the smallest currency unit (cents), exactly as
// Paystack uses it: 3900 = R39.00. PLAN_7D_AMOUNT / PLAN_14D_AMOUNT / PLAN_30D_AMOUNT in server/.env change a price
// without touching code; the lengths are part of the product and are fixed here.
const PLAN_DEFS = [
  { id: '7d', name: 'RemoPDF Premium, 7 days', days: 7, amount: 3900 },
  { id: '14d', name: 'RemoPDF Premium, 14 days', days: 14, amount: 7800 },
  { id: '30d', name: 'RemoPDF Premium, 30 days', days: 30, amount: 15600 },
];

const wholeNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export const tierRank = (tier) => TIERS.indexOf(tier);
export const isPaidTier = (tier) => PAID_TIERS.includes(tier);

/**
 * The plans that can be bought, shortest first: [{ id, name, amount, currency, days }].
 * Read from the environment on every call so a changed .env is picked up after a restart without surprises.
 * `env` is a parameter only so tests can pass their own.
 */
export function getPlans(env = process.env) {
  const currency = String(env.PAYMENT_CURRENCY || 'ZAR').trim().toUpperCase();
  return PLAN_DEFS.map((def) => ({
    id: def.id,
    name: def.name,
    amount: wholeNumber(env[`PLAN_${def.id.toUpperCase()}_AMOUNT`], def.amount),
    currency,
    days: def.days,
  }));
}

/** The plan with this id ('7d' | '14d' | '30d'), or null when it is not one that can be bought. */
export const findPlan = (id, env = process.env) => getPlans(env).find((plan) => plan.id === id) || null;

// When a payment was made, in ms; NaN when it cannot be read.
const paidTime = (payment) => new Date(payment?.paidAt || payment?.createdAt).getTime();

// How long ONE payment buys, in ms. The days saved on the payment are used; an older payment that has none falls back
// to its expiresAt (and to the 30-day cap when it was saved as "never ends"). A shorter expiresAt always wins, so
// shortening it by hand (for a refund, say) still takes access away. Never more than MAX_ACCESS_DAYS.
const lengthOf = (payment) => {
  const limits = [MAX_ACCESS_DAYS * DAY_MS];
  if (Number(payment.accessDays) > 0) limits.push(Number(payment.accessDays) * DAY_MS);
  if (payment.expiresAt) {
    const own = new Date(payment.expiresAt).getTime() - paidTime(payment);
    limits.push(Number.isFinite(own) ? Math.max(0, own) : NaN);
  }
  return Math.min(...limits);
};

/*
 * What the person has right now, worked out from their successful payments:
 *   { premium, tier, expiresAt, daysLeft }
 * tier is 'premium' while any paid time is left and 'free' otherwise; `premium` is the same thing as a boolean.
 *
 * Payments are laid end to end in the order they were made: a payment made while earlier time is still running starts
 * when that time ends, and one made after it has run out starts the day it was paid. So paying early never wastes days.
 * daysLeft counts whole days and rounds up, so it reads 30 on the day of a 30-day payment and 1 for the whole last day.
 */
export function accessFromPayments(payments, now = Date.now()) {
  const periods = (payments || [])
    .map((payment) => ({ paid: paidTime(payment), length: lengthOf(payment) }))
    .filter((period) => Number.isFinite(period.paid) && Number.isFinite(period.length) && period.length > 0)
    .sort((a, b) => a.paid - b.paid);

  let end = -Infinity;
  for (const period of periods) end = Math.max(period.paid, end) + period.length;

  if (!(end > now)) return { premium: false, tier: 'free', expiresAt: null, daysLeft: 0 };
  return { premium: true, tier: 'premium', expiresAt: new Date(end), daysLeft: Math.ceil((end - now) / DAY_MS) };
}

/**
 * Whether this plan can be bought now: the days already waiting plus the days being bought may not total more than
 * MAX_BANKED_DAYS. `access` is what accessFromPayments answered.
 */
export function canAddPlan(access, plan, now = Date.now()) {
  const waiting = access?.premium && access.expiresAt ? Math.max(0, (new Date(access.expiresAt).getTime() - now) / DAY_MS) : 0;
  return waiting + plan.days <= MAX_BANKED_DAYS;
}
