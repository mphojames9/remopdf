// Run with:  node --test lib/plans.test.js   (from the server folder; needs nothing installed)
import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MS, MAX_BANKED_DAYS, accessFromPayments, canAddPlan, findPlan, getPlans, isPaidTier, runningPayments, tierRank } from './plans.js';

const NOW = new Date('2026-11-16T10:00:00Z').getTime();
const daysAgo = (n) => new Date(NOW - n * DAY_MS);

// A successful payment made `ago` days before NOW that buys `days` days (the way the server saves it at checkout).
const payment = (ago, days, extra = {}) => ({
  status: 'success',
  plan: `${days}d`,
  accessDays: days,
  paidAt: daysAgo(ago),
  expiresAt: new Date(daysAgo(ago).getTime() + days * DAY_MS),
  ...extra,
});

test('the plans and their prices: R39 for 7 days, R78 for 14 days, R156 for 30 days', () => {
  const plans = getPlans({});
  assert.deepEqual(plans.map((p) => [p.id, p.days, p.amount]), [['7d', 7, 3900], ['14d', 14, 7800], ['30d', 30, 15600]]);
  assert.ok(plans.every((p) => p.currency === 'ZAR'));
  assert.ok(plans.every((p) => p.name.startsWith('RemoPDF Premium')));
});

test('14 days costs twice the 7-day price and 30 days four times it', () => {
  const [week, fortnight, month] = getPlans({});
  assert.equal(fortnight.amount, week.amount * 2);
  assert.equal(month.amount, week.amount * 4);
});

test('a price or the currency can be changed in the environment, a bad price falls back, the lengths never change', () => {
  const plans = getPlans({ PLAN_7D_AMOUNT: '4900', PLAN_14D_AMOUNT: 'abc', PLAN_30D_AMOUNT: '-5', PAYMENT_CURRENCY: ' usd ', PAYMENT_ACCESS_DAYS: '365' });
  assert.deepEqual(plans.map((p) => p.amount), [4900, 7800, 15600]);
  assert.deepEqual(plans.map((p) => p.days), [7, 14, 30]);
  assert.ok(plans.every((p) => p.currency === 'USD'));
});

test('only the three Premium lengths can be found; free and the old Plus, Pro and Max are not for sale', () => {
  assert.equal(findPlan('30d', {}).amount, 15600);
  assert.equal(findPlan('7d', {}).days, 7);
  for (const id of ['free', 'premium', 'plus', 'pro', 'max', '', 'platinum', undefined, null, 30]) assert.equal(findPlan(id, {}), null, String(id));
});

test('there are two tiers: free, then premium', () => {
  assert.ok(tierRank('free') < tierRank('premium'));
  assert.equal(isPaidTier('premium'), true);
  assert.equal(isPaidTier('free'), false);
  assert.equal(isPaidTier('max'), false);
});

test('no payments means the free plan', () => {
  assert.deepEqual(accessFromPayments([], NOW), { premium: false, tier: 'free', expiresAt: null, daysLeft: 0 });
  assert.deepEqual(accessFromPayments(undefined, NOW), { premium: false, tier: 'free', expiresAt: null, daysLeft: 0 });
});

test('a running payment gives Premium and the days left', () => {
  const access = accessFromPayments([payment(3, 7)], NOW);
  assert.equal(access.premium, true);
  assert.equal(access.tier, 'premium');
  assert.equal(access.daysLeft, 4);
});

test('daysLeft reads the full length on the day of payment and 1 for the whole last day', () => {
  assert.equal(accessFromPayments([payment(0, 7)], NOW).daysLeft, 7);
  assert.equal(accessFromPayments([payment(0, 14)], NOW).daysLeft, 14);
  assert.equal(accessFromPayments([payment(0, 30)], NOW).daysLeft, 30);
  assert.equal(accessFromPayments([payment(6.5, 7)], NOW).daysLeft, 1);
});

test('a payment that has run out gives the free plan again, and it ends exactly at its length', () => {
  assert.equal(accessFromPayments([payment(8, 7)], NOW).tier, 'free');
  assert.equal(accessFromPayments([payment(7, 7)], NOW).premium, false); // ends exactly now
  assert.equal(accessFromPayments([payment(31, 30)], NOW).premium, false);
});

test('every length gives the same Premium: nothing about the plan depends on how long it was bought for', () => {
  for (const days of [7, 14, 30]) assert.equal(accessFromPayments([payment(1, days)], NOW).tier, 'premium');
});

test('paying while Premium is running adds the new days after the current ones: no days are lost', () => {
  const first = payment(5, 7); // 2 days left
  const second = payment(0, 14); // paid today
  const access = accessFromPayments([first, second], NOW);
  assert.equal(access.daysLeft, 16); // 2 + 14
  assert.equal(access.expiresAt.getTime(), NOW + 16 * DAY_MS);
});

test('the order the payments come in does not matter', () => {
  const a = payment(5, 7);
  const b = payment(0, 14);
  assert.equal(accessFromPayments([b, a], NOW).daysLeft, accessFromPayments([a, b], NOW).daysLeft);
});

test('a payment made after the earlier one ran out starts on the day it was paid', () => {
  const old = payment(40, 30); // ended 10 days ago
  const fresh = payment(1, 7); // 6 days left
  assert.equal(accessFromPayments([old, fresh], NOW).daysLeft, 6);
});

test('three payments in a row are laid end to end', () => {
  const access = accessFromPayments([payment(2, 7), payment(1, 7), payment(0, 14)], NOW);
  assert.equal(access.daysLeft, 5 + 7 + 14);
});

test('old payments saved as "never ends" are still capped at 30 days from payment, and count as Premium', () => {
  const old = { status: 'success', paidAt: daysAgo(10), expiresAt: null };
  const access = accessFromPayments([old], NOW);
  assert.equal(access.tier, 'premium');
  assert.equal(access.daysLeft, 20);
});

test('payments from the old Plus, Pro and Max plans are Premium now and keep the days they paid for', () => {
  for (const plan of ['plus', 'pro', 'max']) {
    const old = { status: 'success', plan, paidAt: daysAgo(10), expiresAt: new Date(daysAgo(10).getTime() + 30 * DAY_MS) };
    const access = accessFromPayments([old], NOW);
    assert.equal(access.tier, 'premium', plan);
    assert.equal(access.daysLeft, 20, plan);
  }
});

test('a stored expiry beyond 30 days is cut back to 30 days from payment', () => {
  const generous = { plan: 'plus', paidAt: daysAgo(10), expiresAt: new Date(NOW + 300 * DAY_MS) };
  assert.equal(accessFromPayments([generous], NOW).daysLeft, 20);
});

test('shortening a payment\'s expiry by hand (a refund, say) takes the access away', () => {
  const refunded = payment(3, 30, { expiresAt: new Date(NOW - 1000) });
  assert.equal(accessFromPayments([refunded], NOW).premium, false);
});

test('a payment with an unreadable date is ignored, not a crash', () => {
  const broken = { plan: '30d', paidAt: 'not a date', expiresAt: 'nor this' };
  assert.equal(accessFromPayments([broken], NOW).premium, false);
  assert.equal(accessFromPayments([broken, payment(1, 7)], NOW).daysLeft, 6);
});

test('more time can be added until 90 days are waiting; then it has to run down first', () => {
  const [week, , month] = getPlans({});
  const none = accessFromPayments([], NOW);
  assert.equal(canAddPlan(none, month, NOW), true); // nothing waiting
  const sixty = accessFromPayments([payment(0, 30), payment(0, 30)], NOW); // 60 days waiting
  assert.equal(canAddPlan(sixty, month, NOW), true); // 60 + 30 = 90: exactly the most
  assert.equal(canAddPlan(sixty, week, NOW), true);
  const sixtyOne = accessFromPayments([payment(0, 30), payment(0, 30), payment(0, 1, { accessDays: 1 })], NOW); // 61 days waiting
  assert.equal(canAddPlan(sixtyOne, month, NOW), false); // 91 would be too many
  assert.equal(canAddPlan(sixtyOne, week, NOW), true); // 68 is fine
  assert.equal(MAX_BANKED_DAYS, 90);
});

test('runningPayments: only payments with days still running or waiting, stacked ones included', () => {
  const used = payment(60, 7); // ended long ago
  const running = payment(20, 30); // 10 days left
  const stacked = payment(5, 30); // starts when the one above ends
  const result = runningPayments([stacked, used, running], NOW);
  assert.deepEqual(result, [running, stacked]);
});

test('runningPayments: nothing running means nothing to cancel', () => {
  assert.deepEqual(runningPayments([payment(60, 7), payment(40, 30)], NOW), []);
  assert.deepEqual(runningPayments([], NOW), []);
  assert.deepEqual(runningPayments(undefined, NOW), []);
});

test('cancelling the running payments (expiresAt back to paidAt) ends Premium and leaves used-up ones alone', () => {
  const payments = [payment(60, 7), payment(20, 30), payment(5, 30)];
  assert.equal(accessFromPayments(payments, NOW).premium, true);
  for (const p of runningPayments(payments, NOW)) p.expiresAt = new Date(p.paidAt);
  assert.equal(accessFromPayments(payments, NOW).premium, false);
  assert.equal(payments[0].expiresAt.getTime(), payments[0].paidAt.getTime() + 7 * DAY_MS); // untouched
});

test('a payment cancelled this way can be followed by new days that start on their own', () => {
  const payments = [payment(20, 30)];
  for (const p of runningPayments(payments, NOW)) p.expiresAt = new Date(p.paidAt);
  payments.push(payment(0, 14)); // granted afterwards
  const access = accessFromPayments(payments, NOW);
  assert.equal(access.premium, true);
  assert.equal(access.daysLeft, 14);
});
