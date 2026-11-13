// Run with:  node --test lib/plans.test.js   (from the server folder; needs nothing installed)
import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MS, accessEnd, accessFromPayments, findPlan, getPlans, tierOfPayment, tierRank } from './plans.js';

const NOW = new Date('2026-11-13T10:00:00Z').getTime();
const daysAgo = (n) => new Date(NOW - n * DAY_MS);
const daysAhead = (n) => new Date(NOW + n * DAY_MS);

// A successful payment made `ago` days before NOW, valid for `days` days.
const payment = (plan, ago, days = 30) => ({ plan, status: 'success', paidAt: daysAgo(ago), expiresAt: new Date(daysAgo(ago).getTime() + days * DAY_MS) });

test('the plans and their prices', () => {
  const plans = getPlans({});
  assert.deepEqual(plans.map((p) => [p.id, p.amount]), [['plus', 5900], ['pro', 9900], ['max', 15900]]);
  assert.ok(plans.every((p) => p.currency === 'ZAR' && p.days === 30));
  assert.ok(plans.every((p) => p.name.startsWith('RemoPDF ')));
});

test('prices, currency and length can be changed in the environment, and a bad value falls back', () => {
  const plans = getPlans({ PLAN_PRO_AMOUNT: '12900', PLAN_PLUS_AMOUNT: 'abc', PLAN_MAX_AMOUNT: '-5', PAYMENT_CURRENCY: ' usd ', PAYMENT_ACCESS_DAYS: '7' });
  assert.equal(plans.find((p) => p.id === 'pro').amount, 12900);
  assert.equal(plans.find((p) => p.id === 'plus').amount, 5900);
  assert.equal(plans.find((p) => p.id === 'max').amount, 15900);
  assert.ok(plans.every((p) => p.currency === 'USD' && p.days === 7));
});

test('a plan never lasts longer than 30 days, however it is configured', () => {
  assert.ok(getPlans({ PAYMENT_ACCESS_DAYS: '365' }).every((p) => p.days === 30));
  assert.ok(getPlans({ PAYMENT_ACCESS_DAYS: '0' }).every((p) => p.days === 30));
});

test('only the three paid plans can be found; free is not for sale', () => {
  assert.equal(findPlan('max', {}).amount, 15900);
  assert.equal(findPlan('free', {}), null);
  assert.equal(findPlan('', {}), null);
  assert.equal(findPlan('platinum', {}), null);
  assert.equal(findPlan(undefined, {}), null);
});

test('tiers are ordered lowest to highest', () => {
  assert.ok(tierRank('free') < tierRank('plus') && tierRank('plus') < tierRank('pro') && tierRank('pro') < tierRank('max'));
});

test('a payment from before plans existed counts as Pro', () => {
  assert.equal(tierOfPayment({ status: 'success' }), 'pro');
  assert.equal(tierOfPayment({ plan: 'nonsense' }), 'pro');
  assert.equal(tierOfPayment({ plan: 'plus' }), 'plus');
});

test('no payments means the free plan', () => {
  assert.deepEqual(accessFromPayments([], NOW), { premium: false, tier: 'free', expiresAt: null, daysLeft: 0 });
  assert.deepEqual(accessFromPayments(undefined, NOW), { premium: false, tier: 'free', expiresAt: null, daysLeft: 0 });
});

test('a running payment gives its plan and the days left', () => {
  const access = accessFromPayments([payment('plus', 10)], NOW);
  assert.equal(access.premium, true);
  assert.equal(access.tier, 'plus');
  assert.equal(access.daysLeft, 20);
});

test('daysLeft reads 30 on the day of payment and 1 for the whole last day', () => {
  assert.equal(accessFromPayments([payment('max', 0)], NOW).daysLeft, 30);
  assert.equal(accessFromPayments([payment('max', 29.5)], NOW).daysLeft, 1);
});

test('a payment that has run out gives the free plan again', () => {
  assert.equal(accessFromPayments([payment('max', 31)], NOW).tier, 'free');
  assert.equal(accessFromPayments([payment('max', 30)], NOW).premium, false); // ends exactly now
});

test('the highest running plan wins, and a lower one takes over when it ends', () => {
  const plus = payment('plus', 5); // 25 days left
  const max = payment('max', 25); // 5 days left
  assert.equal(accessFromPayments([plus, max], NOW).tier, 'max');
  assert.equal(accessFromPayments([plus, max], NOW).daysLeft, 5);
  const later = NOW + 6 * DAY_MS; // the Max payment has ended, the Plus one has not
  const after = accessFromPayments([plus, max], later);
  assert.equal(after.tier, 'plus');
  assert.equal(after.daysLeft, 19);
});

test('an expired higher plan does not hide a running lower one', () => {
  assert.equal(accessFromPayments([payment('max', 40), payment('plus', 2)], NOW).tier, 'plus');
});

test('two payments of the same plan: the later end counts', () => {
  const access = accessFromPayments([payment('pro', 20), payment('pro', 1)], NOW);
  assert.equal(access.tier, 'pro');
  assert.equal(access.daysLeft, 29);
});

test('old payments saved as "never ends" are still capped at 30 days from payment', () => {
  const old = { status: 'success', paidAt: daysAgo(10), expiresAt: null };
  assert.equal(accessEnd(old), daysAgo(10).getTime() + 30 * DAY_MS);
  const access = accessFromPayments([old], NOW);
  assert.equal(access.tier, 'pro'); // legacy payment
  assert.equal(access.daysLeft, 20);
});

test('a stored expiry beyond 30 days is cut back to 30 days from payment', () => {
  const generous = { plan: 'plus', paidAt: daysAgo(10), expiresAt: daysAhead(300) };
  assert.equal(accessFromPayments([generous], NOW).daysLeft, 20);
});

test('a payment with an unreadable date is ignored, not a crash', () => {
  const broken = { plan: 'max', paidAt: 'not a date', expiresAt: 'nor this' };
  assert.equal(accessFromPayments([broken], NOW).premium, false);
});
