import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Resume from '../models/Resume.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { isAdminEmail } from '../lib/admins.js';
import { DAY_MS, MAX_ACCESS_DAYS, MAX_BANKED_DAYS, accessFromPayments } from '../lib/plans.js';
import { accessFor } from './payments.js';

/*
 * Admin panel API. Every route needs a signed-in account whose role is "admin" (middleware/requireAdmin.js).
 *
 *   GET    /api/admin/stats                                         -> { users, premium, free, admins, suspended, newLast7Days, activeLast7Days }
 *   GET    /api/admin/users?search=&filter=&sort=&page=&limit=      -> { items, total, page, pages, limit }
 *            filter: all | premium | free | admin | suspended      sort: newest | oldest | name | recent
 *   GET    /api/admin/users/:id                                     -> { user, phone, payments, resumes }
 *   PATCH  /api/admin/users/:id   { firstName?, lastName?, role?, disabled? }  -> { user }
 *   DELETE /api/admin/users/:id                                     -> { ok: true }
 *
 * Safety rules, enforced here and not only in the panel:
 *   - an admin cannot change their own role, suspend themselves or delete themselves
 *   - an admin account cannot be suspended or deleted: remove its admin access first
 *   - addresses in ADMIN_EMAILS cannot be demoted here (remove them from the list instead)
 *   - deleting an account deletes its resumes but keeps its payment records (they are financial records)
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

// Premium is worked out from payments laid end to end (lib/plans.js). Nothing paid longer ago than this can still be
// running: one payment buys at most MAX_ACCESS_DAYS, and no more than MAX_BANKED_DAYS can be waiting when it is made.
// Reading only this window keeps the premium count and filter fast however many old payments there are.
const ACCESS_LOOKBACK_MS = (MAX_BANKED_DAYS + MAX_ACCESS_DAYS + 10) * DAY_MS;

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const asString = (value) => (typeof value === 'string' ? value : '');
const cleanText = (value, max) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '');
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fail = (res, status, message) => res.status(status).json({ message });

/* What each user has right now, as a Map of user id (string) -> { premium, tier, expiresAt, daysLeft }.
 * Only users with a successful payment in the lookback window are in it. `userIds` narrows it to those users. */
async function accessMap(userIds) {
  const since = new Date(Date.now() - ACCESS_LOOKBACK_MS);
  const filter = {
    status: 'success',
    $or: [{ paidAt: { $gte: since } }, { paidAt: null, createdAt: { $gte: since } }],
  };
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
});

const describe = async (u) => {
  const [access, resumes] = await Promise.all([accessFor(u._id), Resume.countDocuments({ user: u._id })]);
  return shape(u, access, resumes);
};

const router = Router();

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please wait a moment.' },
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
    return res.json({ users, premium, free: users - premium, admins, suspended, newLast7Days, activeLast7Days });
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

    const [summary, payments, resumes] = await Promise.all([
      describe(user),
      Payment.find({ user: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
      Resume.find({ user: user._id }).sort({ updatedAt: -1 }).limit(20).lean(), // resumeJson is never selected
    ]);

    return res.json({
      user: summary,
      phone: user.phone || '', // old accounts only; it was never verified
      payments: payments.map((p) => ({
        id: String(p._id),
        reference: p.reference,
        plan: p.plan || null,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        channel: p.channel || '',
        paidAt: p.paidAt || null,
        createdAt: p.createdAt,
      })),
      resumes: resumes.map((r) => ({ id: String(r._id), title: r.title, template: r.template || '', updatedAt: r.updatedAt })),
    });
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

export default router;
