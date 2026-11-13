// The four plans, in one place: what they cost, how long they last, and how "what does this person have right now?"
// is worked out from their payments. No database and no Express in here, so it is tested on its own
// (see lib/plans.test.js: node --test lib/plans.test.js).
//
//   free   R0     the writing assistant on the small AI model, 6 AI actions a day, PDFs with the RemoPDF label
//   plus   R59    the large AI model, 25 a day, clean PDFs, cover letters and job matching
//   pro    R99    the large AI model thinking harder, 40 a day
//   max    R159   the large AI model thinking hardest, with the most room, 60 a day
//
// What each plan does with AI is decided by the AI service (backEnd/routers/ai_models.py), which reads the plan from
// the signed AI pass. This file only decides who has which plan.

export const DAY_MS = 24 * 60 * 60 * 1000;

// Lowest to highest. A higher plan always includes everything a lower one has.
export const TIERS = ['free', 'plus', 'pro', 'max'];
export const PAID_TIERS = ['plus', 'pro', 'max'];

// Payments saved before plans existed were all the one Premium plan, which got the AI the Pro plan gets now.
export const LEGACY_TIER = 'pro';

// Every plan lasts at most this long from the day of payment, whatever PAYMENT_ACCESS_DAYS says or an older payment stored.
export const MAX_ACCESS_DAYS = 30;

// Prices in the smallest currency unit (cents), exactly as Paystack uses it: 5900 = R59.00.
// PLAN_PLUS_AMOUNT / PLAN_PRO_AMOUNT / PLAN_MAX_AMOUNT in server/.env change them without touching code.
const DEFAULT_AMOUNTS = { plus: 5900, pro: 9900, max: 15900 };
const NAMES = { plus: 'RemoPDF Plus', pro: 'RemoPDF Pro', max: 'RemoPDF Max' };

const wholeNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export const tierRank = (tier) => TIERS.indexOf(tier);
export const isPaidTier = (tier) => PAID_TIERS.includes(tier);

/**
 * The plans that can be bought, in order: [{ id, name, amount, currency, days }].
 * Read from the environment on every call so a changed .env is picked up after a restart without surprises.
 * `env` is a parameter only so tests can pass their own.
 */
export function getPlans(env = process.env) {
  const currency = String(env.PAYMENT_CURRENCY || 'ZAR').trim().toUpperCase();
  const days = Math.min(wholeNumber(env.PAYMENT_ACCESS_DAYS, MAX_ACCESS_DAYS), MAX_ACCESS_DAYS); // 1 to 30 days; 0 or empty = 30
  return PAID_TIERS.map((id) => ({
    id,
    name: NAMES[id],
    amount: wholeNumber(env[`PLAN_${id.toUpperCase()}_AMOUNT`], DEFAULT_AMOUNTS[id]),
    currency,
    days,
  }));
}

/** The plan with this id, or null when it is not one that can be bought ("free" is not for sale). */
export const findPlan = (id, env = process.env) => getPlans(env).find((plan) => plan.id === id) || null;

/** The plan a stored payment bought. Payments from before plans existed have no `plan`. */
export const tierOfPayment = (payment) => (isPaidTier(payment?.plan) ? payment.plan : LEGACY_TIER);

// When a payment's access ends: the expiresAt saved on it, but never later than MAX_ACCESS_DAYS after it was paid.
// The cap also covers older payments that were saved as "never ends" (expiresAt null).
export const accessEnd = (payment) => {
  const paid = new Date(payment.paidAt || payment.createdAt).getTime();
  const cap = paid + MAX_ACCESS_DAYS * DAY_MS;
  return payment.expiresAt ? Math.min(new Date(payment.expiresAt).getTime(), cap) : cap;
};

/*
 * What the person has right now, worked out from their successful payments:
 *   { premium, tier, expiresAt, daysLeft }
 * The plan is the highest one with a payment that has not run out. When two payments of the same plan are active, the
 * later end counts. After a higher plan ends, a lower one that is still running takes over again. `premium` means
 * "has any paid plan" (kept for everything that only needs yes or no). daysLeft counts whole days and rounds up, so
 * it reads 30 on the day of payment and 1 for the whole last day.
 */
export function accessFromPayments(payments, now = Date.now()) {
  const active = (payments || [])
    .map((payment) => ({ tier: tierOfPayment(payment), end: accessEnd(payment) }))
    .filter((entry) => Number.isFinite(entry.end) && entry.end > now);
  if (active.length === 0) return { premium: false, tier: 'free', expiresAt: null, daysLeft: 0 };

  const top = active.reduce((best, entry) => (tierRank(entry.tier) > tierRank(best) ? entry.tier : best), 'free');
  const latest = Math.max(...active.filter((entry) => entry.tier === top).map((entry) => entry.end));
  return { premium: true, tier: top, expiresAt: new Date(latest), daysLeft: Math.ceil((latest - now) / DAY_MS) };
}
