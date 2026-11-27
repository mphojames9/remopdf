import crypto from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Resume from '../models/Resume.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { accessCodeConfigured, accessCodeMatches, isAdminEmail } from '../lib/admins.js';
import { DAY_MS, MAX_ACCESS_DAYS, MAX_BANKED_DAYS, accessFromPayments, canAddPlan, getPlans, runningPayments } from '../lib/plans.js';
import { accessFor } from './payments.js';

/*
 * Admin panel API. Every route needs a signed-in account whose role is "admin" (middleware/requireAdmin.js).
 *
 *   GET    /api/admin/stats                                         -> { users, premium, free, admins, suspended, newLast7Days, activeLast7Days, signupsByDay, premiumTools, maxBankedDays }
 *            ?tzOffset=<minutes, as new Date().getTimezoneOffset()> makes signupsByDay count days in the admin's own time zone
 *   GET    /api/admin/users?search=&filter=&sort=&page=&limit=      -> { items, total, page, pages, limit }
 *            filter: all | premium | free | admin | suspended      sort: newest | oldest | name | recent
 *   GET    /api/admin/users/:id                                     -> { user, phone, payments, resumes }
 *   PATCH  /api/admin/users/:id   { firstName?, lastName?, role?, disabled? }  -> { user }
 *   DELETE /api/admin/users/:id                                     -> { ok: true }
 *   POST   /api/admin/users/:id/premium         { days, note?, accessCode }  -> same as GET /users/:id   (activate Premium or add days)
 *   POST   /api/admin/users/:id/premium/revoke  { note?, accessCode }        -> same as GET /users/:id   (end Premium now)
 *
 * Safety rules, enforced here and not only in the panel:
 *   - an admin cannot change their own role, suspend themselves or delete themselves
 *   - an admin account cannot be suspended or deleted: remove its admin access first
 *   - addresses in ADMIN_EMAILS cannot be demoted here (remove them from the list instead)
 *   - deleting an account deletes its resumes but keeps its payment records (they are financial records)
 *   - adding or removing Premium needs ADMIN_ACCESS_CODE as well (compared in constant time, 10 wrong tries per 15 minutes,
 *     and switched off completely while the variable is not set)
 *   - days given by an admin are payments with amount 0 and channel "admin", at most MAX_ACCESS_DAYS each, and Premium can
 *     never be more than MAX_BANKED_DAYS ahead, the same rule customers have (lib/plans.js)
 *   - removing Premium keeps every payment: the running ones get their expiresAt moved back to when they were paid
 * Resume contents are never sent to the panel, only the title, template and last-edited date.
 */

const NOT_FOUND = { message: 'User not found.' };
const ID_RE = /^[0-9a-f]{24}$/i; // mongoose.isValidObjectId() also accepts any 12-character string, so it is not used here.

const FILTERS = ['all', 'premium', 'free', 'admin', 'suspended'];
const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name: { firstName: 1, lastName: 1, _id: 1 },
  recent: { lastLoginAt: -1, _id: -1 }, // accounts that never signed in come last
};
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const asString = (value) => (typeof value === 'string' ? value : '');
const cleanText = (value, max) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '');
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fail = (res, status, message, code) => res.status(status).json(code ? { message, code } : { message });

/* What each user has right now, as a Map of user id (string) -> { premium, tier, expiresAt, daysLeft }.
 * Only users with a successful payment are in it. `userIds` narrows it to those users. All of a user's payments are read
 * (not only recent ones) because an old payment can still push a newer one back, and the answer has to match accessFor. */
async function accessMap(userIds) {
  const filter = { status: 'success' };
  if (userIds) filter.user = { $in: userIds };

  const payments = await Payment.find(filter).select('user paidAt createdAt accessDays expiresAt').lean();
  const byUser = new Map();
  for (const payment of payments) {
    const key = String(payment.user);
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key).push(payment);
  }
  const result = new Map();
  for (const [key, list] of byUser) result.set(key, accessFromPayments(list));
  return result;
}

// Ids (strings) of everyone whose Premium is running now. Payments of deleted accounts are in here too, which is why
// callers always match them against the User collection.
async function premiumIds() {
  const map = await accessMap();
  return [...map].filter(([, access]) => access.premium).map(([id]) => id);
}

// Days Premium still has ahead, to the second (daysLeft is rounded up for display).
const waitingDays = (access) =>
  access?.premium && access.expiresAt ? Math.max(0, (new Date(access.expiresAt).getTime() - Date.now()) / DAY_MS) : 0;

// One account as the panel shows it.
const shape = (u, access, resumes = 0) => ({
  id: String(u._id),
  firstName: u.firstName || '',
  lastName: u.lastName || '',
  email: u.email,
  role: u.role || 'user',
  isEnvAdmin: isAdminEmail(u.email),
  disabled: Boolean(u.disabled),
  emailVerified: Boolean(u.emailVerified),
  createdAt: u.createdAt,
  lastLoginAt: u.lastLoginAt || null,
  resumes,
  premium: Boolean(access?.premium),
  premiumUntil: access?.premium ? access.expiresAt : null,
  daysLeft: access?.premium ? access.daysLeft : 0,
  canAddDays: Math.max(0, Math.floor(MAX_BANKED_DAYS - waitingDays(access))), // how many more days an admin may add now
});

const describe = async (u) => {
  const [access, resumes] = await Promise.all([accessFor(u._id), Resume.countDocuments({ user: u._id })]);
  return shape(u, access, resumes);
};

// Everything the account window shows: the account, its payments and its resumes (titles only).
async function buildDetail(user) {
  const [summary, payments, resumes] = await Promise.all([
    describe(user),
    Payment.find({ user: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
    Resume.find({ user: user._id }).sort({ updatedAt: -1 }).limit(20).lean(), // resumeJson is never selected
  ]);
  return {
    user: summary,
    phone: user.phone || '', // old accounts only; it was never verified
    payments: payments.map((p) => ({
      id: String(p._id),
      reference: p.reference,
      plan: p.plan || null,
      amount: p.amount,
      currency: p.currency,
      accessDays: p.accessDays || 0,
      status: p.status,
      channel: p.channel || '',
      byAdmin: Boolean(p.grantedBy),
      note: p.note || '',
      revoked: Boolean(p.revokedAt),
      paidAt: p.paidAt || null,
      createdAt: p.createdAt,
    })),
    resumes: resumes.map((r) => ({ id: String(r._id), title: r.title, template: r.template || '', updatedAt: r.updatedAt })),
  };
}

const router = Router();

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please wait a moment.' },
});

// Only failed attempts count (skipSuccessfulRequests), so a wrong access code can be tried 10 times per 15 minutes per admin.
const premiumLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => String(req.userId),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many failed attempts. Please wait 15 minutes and try again.' },
});

// Order matters: rate limit, then the sign-in and admin checks. Nothing here may be cached by the browser or a proxy.
router.use(adminLimiter, ...requireAdmin, (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.param('id', (req, res, next, id) => (ID_RE.test(id) ? next() : res.status(404).json(NOT_FOUND)));

/* GET /api/admin/stats */
router.get('/stats', async (req, res, next) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * DAY_MS);
    const [users, admins, suspended, newLast7Days, activeLast7Days, paying] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ disabled: true }),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      User.countDocuments({ lastLoginAt: { $gte: weekAgo } }),
      premiumIds(),
    ]);
    const premium = paying.length ? await User.countDocuments({ _id: { $in: paying } }) : 0;

    // New accounts per day for the last 14 days, oldest first, counted in the admin's own time zone so a sign-up at
    // 1 am South African time lands on that day and not on the day before.
    const offset = parseInt(asString(req.query.tzOffset), 10);
    const tzMinutes = Number.isInteger(offset) && Math.abs(offset) <= 14 * 60 ? offset : 0;
    const dayKey = (time) => new Date(new Date(time).getTime() - tzMinutes * 60 * 1000).toISOString().slice(0, 10);
    const SIGNUP_DAYS = 14;
    const perDay = new Map();
    for (let i = SIGNUP_DAYS - 1; i >= 0; i -= 1) perDay.set(dayKey(Date.now() - i * DAY_MS), 0);
    const recentUsers = await User.find({ createdAt: { $gte: new Date(Date.now() - (SIGNUP_DAYS + 1) * DAY_MS) } }).select('createdAt').lean();
    for (const recent of recentUsers) {
      const key = dayKey(recent.createdAt);
      if (perDay.has(key)) perDay.set(key, perDay.get(key) + 1);
    }

    return res.json({
      users,
      premium,
      free: users - premium,
      admins,
      suspended,
      newLast7Days,
      activeLast7Days,
      signupsByDay: [...perDay].map(([date, count]) => ({ date, count })),
      premiumTools: accessCodeConfigured(), // false = ADMIN_ACCESS_CODE is not set, so the panel cannot add or remove Premium
      maxBankedDays: MAX_BANKED_DAYS,
    });
  } catch (err) {
    return next(err);
  }
});

/* GET /api/admin/users */
router.get('/users', async (req, res, next) => {
  try {
    const search = asString(req.query.search).trim().slice(0, 80);
    const filter = FILTERS.includes(asString(req.query.filter)) ? asString(req.query.filter) : 'all';
    const sortKey = Object.hasOwn(SORTS, asString(req.query.sort)) ? asString(req.query.sort) : 'newest';
    const page = Math.min(10000, Math.max(1, parseInt(asString(req.query.page), 10) || 1));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(asString(req.query.limit), 10) || DEFAULT_LIMIT));

    const query = {};

    // Every word must appear in the first name, last name or email, so "mpho matli" finds "Mpho James Matli".
    const words = search.split(/\s+/).filter(Boolean).slice(0, 5);
    if (words.length > 0) {
      query.$and = words.map((word) => {
        const rx = new RegExp(escapeRegex(word), 'i');
        return { $or: [{ email: rx }, { firstName: rx }, { lastName: rx }] };
      });
    }

    if (filter === 'admin') query.role = 'admin';
    if (filter === 'suspended') query.disabled = true;
    if (filter === 'premium' || filter === 'free') {
      const paying = await premiumIds();
      query._id = filter === 'premium' ? { $in: paying } : { $nin: paying };
    }

    let find = User.find(query).sort(SORTS[sortKey]).skip((page - 1) * limit).limit(limit);
    if (sortKey === 'name') find = find.collation({ locale: 'en', strength: 2 }); // "anna" sorts with "Anna"
    const [rows, total] = await Promise.all([find.lean(), User.countDocuments(query)]);

    const ids = rows.map((row) => row._id);
    const [access, counts] = await Promise.all([
      ids.length ? accessMap(ids) : new Map(),
      ids.length ? Resume.aggregate([{ $match: { user: { $in: ids } } }, { $group: { _id: '$user', count: { $sum: 1 } } }]) : [],
    ]);
    const resumeCount = new Map(counts.map((c) => [String(c._id), c.count]));

    const items = rows.map((row) => shape(row, access.get(String(row._id)), resumeCount.get(String(row._id)) || 0));
    return res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)), limit });
  } catch (err) {
    return next(err);
  }
});

/* GET /api/admin/users/:id */
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json(NOT_FOUND);
    return res.json(await buildDetail(user));
  } catch (err) {
    return next(err);
  }
});

/* PATCH /api/admin/users/:id   { firstName?, lastName?, role?: 'user' | 'admin', disabled?: boolean } */
router.patch('/users/:id', async (req, res, next) => {
  try {
    const body = isPlainObject(req.body) ? req.body : {};
    const target = await User.findById(req.params.id).lean();
    if (!target) return res.status(404).json(NOT_FOUND);

    const isSelf = String(target._id) === String(req.userId);
    const currentRole = target.role || 'user';
    const set = {};
    const unset = {};

    if (body.firstName !== undefined) {
      const firstName = cleanText(body.firstName, 60);
      if (!firstName) return fail(res, 400, 'First name cannot be empty.');
      set.firstName = firstName;
    }
    if (body.lastName !== undefined) {
      set.lastName = cleanText(body.lastName, 60);
    }

    if (body.role !== undefined) {
      if (body.role !== 'user' && body.role !== 'admin') return fail(res, 400, 'Role must be "user" or "admin".');
      if (body.role !== currentRole) {
        if (isSelf) return fail(res, 400, 'You cannot change your own role.');
        if (body.role === 'user' && isAdminEmail(target.email)) {
          return fail(res, 400, 'This address is listed in ADMIN_EMAILS on the server. Remove it from that list first.');
        }
        set.role = body.role;
      }
    }

    if (body.disabled !== undefined) {
      if (typeof body.disabled !== 'boolean') return fail(res, 400, 'Suspended must be true or false.');
      if (body.disabled !== Boolean(target.disabled)) {
        if (body.disabled) {
          if (isSelf) return fail(res, 400, 'You cannot suspend your own account.');
          if ((set.role || currentRole) === 'admin') return fail(res, 400, 'Remove admin access before suspending this account.');
          set.disabled = true;
          set.disabledAt = new Date();
        } else {
          set.disabled = false;
          unset.disabledAt = 1;
        }
      }
    }

    const update = {};
    if (Object.keys(set).length > 0) update.$set = set;
    if (Object.keys(unset).length > 0) update.$unset = unset;
    if (!update.$set && !update.$unset) return res.json({ user: await describe(target) }); // nothing to change

    const updated = await User.findByIdAndUpdate(target._id, update, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(404).json(NOT_FOUND);
    return res.json({ user: await describe(updated) });
  } catch (err) {
    return next(err);
  }
});

/* DELETE /api/admin/users/:id */
router.delete('/users/:id', async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id).select('role').lean();
    if (!target) return res.status(404).json(NOT_FOUND);

    if (String(target._id) === String(req.userId)) return fail(res, 400, 'You cannot delete your own account.');
    if (target.role === 'admin') return fail(res, 400, 'Remove admin access before deleting this account.');

    // Resumes first: if the second step fails, the account still exists and the delete can simply be run again.
    // Payment records are kept on purpose. If the same Gmail signs in again it gets a brand-new account, which does not
    // inherit them, so nothing is granted by keeping them.
    await Resume.deleteMany({ user: target._id });
    await User.deleteOne({ _id: target._id });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

/* Both premium routes start here: the switch must be on and the code must be right. 400 (not 401/403) on a wrong code,
 * because the panel treats 401/403 as "your sign-in stopped working" and would sign the admin out. */
function checkAccessCode(req, res) {
  if (!accessCodeConfigured()) {
    fail(res, 503, 'Premium tools are switched off. Add ADMIN_ACCESS_CODE on the server to turn them on.', 'ACCESS_CODE_NOT_SET');
    return false;
  }
  if (!accessCodeMatches(isPlainObject(req.body) ? req.body.accessCode : undefined)) {
    fail(res, 400, 'That access code is not right.', 'ACCESS_CODE');
    return false;
  }
  return true;
}

/* POST /api/admin/users/:id/premium   { days, note?, accessCode }
 * Activates Premium or adds days to it. The days start when the current ones end, exactly like a customer paying early. */
router.post('/users/:id/premium', premiumLimiter, async (req, res, next) => {
  try {
    if (!checkAccessCode(req, res)) return;
    const body = req.body; // an object, or checkAccessCode would have refused it

    const target = await User.findById(req.params.id).lean();
    if (!target) return res.status(404).json(NOT_FOUND);

    const days = Number(body.days);
    if (!Number.isInteger(days) || days < 1) return fail(res, 400, 'Enter a whole number of days, 1 or more.');

    const access = await accessFor(target._id);
    if (!canAddPlan(access, { days })) {
      const room = Math.max(0, Math.floor(MAX_BANKED_DAYS - waitingDays(access)));
      return fail(
        res,
        400,
        room > 0
          ? `You can add up to ${room} more days. Premium can run at most ${MAX_BANKED_DAYS} days ahead.`
          : `Premium is already at the ${MAX_BANKED_DAYS}-day maximum. Try again once some days have passed.`
      );
    }

    // One payment never buys more than MAX_ACCESS_DAYS, so a longer gift is saved as several, all made now.
    const chunks = [];
    for (let left = days; left > 0; left -= MAX_ACCESS_DAYS) chunks.push(Math.min(left, MAX_ACCESS_DAYS));

    const paidAt = new Date();
    const currency = getPlans()[0].currency;
    const note = cleanText(body.note, 200);
    await Payment.create(
      chunks.map((chunkDays) => ({
        user: target._id,
        reference: `admin-${crypto.randomBytes(9).toString('hex')}`,
        amount: 0,
        currency,
        accessDays: chunkDays,
        status: 'success',
        paidAt,
        expiresAt: new Date(paidAt.getTime() + chunkDays * DAY_MS),
        channel: 'admin',
        grantedBy: req.userId,
        ...(note ? { note } : {}),
      }))
    );

    console.info(`[admin] ${req.adminEmail} added ${days} Premium days to ${target.email}${note ? ` (${note})` : ''}`);
    return res.json(await buildDetail(target));
  } catch (err) {
    return next(err);
  }
});

/* POST /api/admin/users/:id/premium/revoke   { note?, accessCode }
 * Ends Premium right now. Every payment that still has days running or waiting is cancelled by moving its expiresAt back
 * to the moment it was paid (lib/plans.js reads that as "buys nothing"). Payments whose days were already used up are
 * left alone, and no payment is deleted or has its status changed, so the records stay true. */
router.post('/users/:id/premium/revoke', premiumLimiter, async (req, res, next) => {
  try {
    if (!checkAccessCode(req, res)) return;
    const body = req.body;

    const target = await User.findById(req.params.id).lean();
    if (!target) return res.status(404).json(NOT_FOUND);

    const payments = await Payment.find({ user: target._id, status: 'success' }).lean();
    const running = runningPayments(payments);
    if (running.length === 0) return fail(res, 400, 'This account does not have Premium right now.');

    const revokedAt = new Date();
    const revokeNote = cleanText(body.note, 200);
    for (const payment of running) {
      await Payment.updateOne(
        { _id: payment._id, status: 'success' },
        {
          $set: {
            expiresAt: new Date(payment.paidAt || payment.createdAt),
            revokedAt,
            revokedBy: req.userId,
            ...(revokeNote ? { revokeNote } : {}),
          },
        }
      );
    }

    console.info(`[admin] ${req.adminEmail} removed Premium from ${target.email}${revokeNote ? ` (${revokeNote})` : ''}`);
    return res.json(await buildDetail(target));
  } catch (err) {
    return next(err);
  }
});

export default router;
