import crypto from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import requireAuth from '../middleware/requireAuth.js';

/*
 * Paystack payments.
 *
 *   GET  /api/payments/status               -> { premium, expiresAt, daysLeft, testMode, plan }
 *   GET  /api/payments/ai-pass              -> { pass, expiresIn }   (Premium only: a signed pass for the AI service)
 *   POST /api/payments/initialize           -> { accessCode, reference }   (or { premium: true } if already paid)
 *   GET  /api/payments/verify/:reference    -> { status: 'success' | 'failed' | 'pending', ... }
 *   POST /api/payments/webhook              (Paystack -> us; see paystackWebhook, mounted in index.js)
 *
 * The price lives only here (PAYMENT_AMOUNT / PAYMENT_CURRENCY / PAYMENT_ACCESS_DAYS in server/.env), so the
 * browser cannot choose what it pays. The secret key never leaves the server.
 * Premium lasts at most 30 days from the day of payment (MAX_ACCESS_DAYS); daysLeft is worked out from the database.
 */

const PAYSTACK_API = 'https://api.paystack.co';
const REFERENCE_RE = /^[A-Za-z0-9.=-]{1,100}$/; // the characters Paystack allows in a reference
const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
// Premium access never lasts longer than this, whatever PAYMENT_ACCESS_DAYS says or an older payment stored.
// It counts from the moment of payment; when it runs out the person pays again.
const MAX_ACCESS_DAYS = 30;
// Which ways to pay Paystack shows. Default is card only, so the window opens on the card form (number, expiry, CVV).
// Set PAYMENT_CHANNELS=card,bank,... in server/.env to offer more.
const ALLOWED_CHANNELS = ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer', 'eft', 'apple_pay'];
const getChannels = () => {
  const wanted = (process.env.PAYMENT_CHANNELS || 'card')
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter((c) => ALLOWED_CHANNELS.includes(c));
  return wanted.length > 0 ? [...new Set(wanted)] : ['card'];
};

const wholeNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
};

// Read on every call (not once at import) so a changed .env is picked up after a restart without surprises.
const secretKey = () => (process.env.PAYSTACK_SECRET_KEY || '').trim();
const getPlan = () => ({
  name: (process.env.PAYMENT_PLAN_NAME || 'RemoPDF Premium').trim(),
  amount: wholeNumber(process.env.PAYMENT_AMOUNT, 4900) || 4900, // smallest unit: 4900 = 49.00
  currency: (process.env.PAYMENT_CURRENCY || 'ZAR').trim().toUpperCase(),
  days: Math.min(wholeNumber(process.env.PAYMENT_ACCESS_DAYS, MAX_ACCESS_DAYS) || MAX_ACCESS_DAYS, MAX_ACCESS_DAYS), // 1 to 30 days; 0 or empty = 30
  channels: getChannels(),
});

// Errors with `expose` are safe to show to the person; anything else becomes a generic 500.
const httpError = (status, message, extra = {}) => Object.assign(new Error(message), { status, expose: true, ...extra });
const sendError = (err, res, next) => (err?.expose ? res.status(err.status).json({ message: err.message }) : next(err));

async function paystack(method, path, body) {
  const secret = secretKey();
  if (!secret) throw httpError(503, 'Payments are not set up yet. Please try again later.');

  let res;
  try {
    res = await fetch(`${PAYSTACK_API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw httpError(502, 'Could not reach the payment provider. Please try again.');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok || !data || data.status !== true) {
    console.error('Paystack request failed:', method, path.split('?')[0], res.status, data?.message);
    throw httpError(502, 'The payment provider could not process that. Please try again.', { upstream: res.status });
  }
  return data.data;
}

// When a payment's access ends: the expiresAt saved on it, but never later than MAX_ACCESS_DAYS after it was paid.
// The cap also covers older payments that were saved as "never ends" (expiresAt null).
const accessEnd = (payment) => {
  const paid = new Date(payment.paidAt || payment.createdAt).getTime();
  const cap = paid + MAX_ACCESS_DAYS * DAY_MS;
  return payment.expiresAt ? Math.min(new Date(payment.expiresAt).getTime(), cap) : cap;
};

/*
 * What the person has right now, read from their payments in the database:
 *   { premium, expiresAt, daysLeft }
 * Access is "premium" while at least one successful payment has not run out. daysLeft counts whole days and
 * rounds up, so it reads 30 on the day of payment and 1 for the whole last day.
 */
export async function accessFor(userId) {
  const payments = await Payment.find({ user: userId, status: 'success' }).sort({ paidAt: -1 }).limit(5).lean();
  const now = Date.now();
  const ends = payments.map(accessEnd).filter((end) => Number.isFinite(end) && end > now);
  if (ends.length === 0) return { premium: false, expiresAt: null, daysLeft: 0 };
  const latest = Math.max(...ends);
  return { premium: true, expiresAt: new Date(latest), daysLeft: Math.ceil((latest - now) / DAY_MS) };
}

/*
 * Turns what Paystack says about a transaction into our Payment record. Used by both the manual check and
 * the webhook, so they always agree. Safe to run twice: only the first call that sees "success" changes
 * anything (the update is conditional), so access is never granted twice for one payment.
 */
async function settle(payment, tx) {
  if (payment.status === 'success') return payment;

  if (tx.status === 'success') {
    const sameAmount = Number(tx.amount) === payment.amount;
    const sameCurrency = String(tx.currency || '').toUpperCase() === payment.currency;
    if (!sameAmount || !sameCurrency) {
      // Paid, but not what we asked for. Never grant access for it; leave it for a human to look at.
      console.error('Payment mismatch for', payment.reference, { got: [tx.amount, tx.currency], expected: [payment.amount, payment.currency] });
      return (await Payment.findOneAndUpdate({ _id: payment._id, status: 'pending' }, { $set: { status: 'failed' } }, { new: true })) || payment;
    }
    const paidAt = tx.paid_at && !Number.isNaN(new Date(tx.paid_at).getTime()) ? new Date(tx.paid_at) : new Date();
    const accessDays = payment.accessDays > 0 ? Math.min(payment.accessDays, MAX_ACCESS_DAYS) : MAX_ACCESS_DAYS;
    const expiresAt = new Date(paidAt.getTime() + accessDays * DAY_MS);
    const updated = await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $ne: 'success' } },
      { $set: { status: 'success', paidAt, expiresAt, channel: String(tx.channel || '').slice(0, 30) } },
      { new: true }
    );
    return updated || (await Payment.findById(payment._id)) || payment;
  }

  if (tx.status === 'failed') {
    return (await Payment.findOneAndUpdate({ _id: payment._id, status: 'pending' }, { $set: { status: 'failed' } }, { new: true })) || payment;
  }

  return payment; // "abandoned", "ongoing", ... : still waiting
}

const initLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many payment attempts. Please try again in a few minutes.' },
});

// The browser checks every few seconds while the Paystack window is open, so this one is more generous.
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many checks. Please wait a moment.' },
});

/*
 * AI suggestions run on a separate service (it holds the Groq key and cannot see this database), and it may not be
 * able to reach this server at all. So a Premium account asks for an "AI pass" here: a short signed note saying
 * "this account has Premium right now". The browser hands it to the AI service, which checks the signature with the
 * same AI_PASS_SECRET and never has to call this server. A pass never outlives the paid access it was made from.
 *
 * AI_PASS_SECRET: at least 32 random characters, the SAME value in server/.env and on the AI service (Render), and
 * not the JWT_SECRET, so that service can never make sign-in tokens.
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
const AI_PASS_SECONDS = 5 * 60;
const AI_PASS_AUDIENCE = 'remopdf-ai'; // the AI service refuses a pass made for anything else
const AI_PASS_MIN_SECRET = 32;
const aiPassSecret = () => (process.env.AI_PASS_SECRET || '').trim();

const router = Router();

/* GET /api/payments/status */
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const access = await accessFor(req.userId);
    return res.json({ ...access, testMode: secretKey().startsWith('sk_test_'), plan: getPlan() });
  } catch (err) {
    return next(err);
  }
});

/* GET /api/payments/ai-pass  ->  { pass, expiresIn }   (403 unless the account has Premium right now) */
router.get('/ai-pass', requireAuth, verifyLimiter, async (req, res, next) => {
  try {
    const secret = aiPassSecret();
    if (secret.length < AI_PASS_MIN_SECRET) {
      console.error(`AI_PASS_SECRET is missing or shorter than ${AI_PASS_MIN_SECRET} characters, so no AI passes can be made.`);
      return res.status(503).json({ message: 'AI suggestions are not set up yet. Please try again later.' });
    }

    const access = await accessFor(req.userId);
    if (!access.premium) {
      return res.status(403).json({ message: 'AI suggestions are a Premium feature.', premiumRequired: true });
    }

    const secondsLeft = Math.floor((access.expiresAt.getTime() - Date.now()) / 1000);
    const expiresIn = Math.max(1, Math.min(AI_PASS_SECONDS, secondsLeft));
    const pass = jwt.sign({ premium: true }, secret, {
      algorithm: 'HS256',
      expiresIn,
      audience: AI_PASS_AUDIENCE,
      subject: String(req.userId),
    });
    return res.json({ pass, expiresIn });
  } catch (err) {
    return next(err);
  }
});

/* POST /api/payments/initialize  { name?, phone? }  ->  201 { accessCode, reference } */
router.post('/initialize', requireAuth, initLimiter, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: 'Please sign in to continue.' });

    // Billing details from the payment dialog. Only plain strings are accepted.
    const billingName = typeof req.body?.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';
    const billingPhone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    if (billingName.length > 100) return res.status(400).json({ message: 'That name is too long.' });
    if (billingPhone && !PHONE_RE.test(billingPhone)) return res.status(400).json({ message: 'Enter a valid phone number, or leave it empty.' });

    const access = await accessFor(user.id);
    if (access.premium) return res.json({ premium: true, expiresAt: access.expiresAt, daysLeft: access.daysLeft });

    const plan = getPlan();
    const reference = `remo-${crypto.randomBytes(12).toString('hex')}`;

    // The pending record is saved first, so a webhook that arrives before this request finishes still finds it.
    const payment = await Payment.create({
      user: user.id,
      reference,
      amount: plan.amount,
      currency: plan.currency,
      accessDays: plan.days,
      billingName,
      billingPhone,
    });

    try {
      const tx = await paystack('POST', '/transaction/initialize', {
        email: user.email,
        amount: plan.amount,
        currency: plan.currency,
        reference,
        channels: plan.channels, // card only by default: the window opens straight on the card form
        metadata: {
          userId: user.id,
          plan: plan.name,
          // Shown on the transaction in the Paystack dashboard.
          custom_fields: [
            ...(billingName ? [{ display_name: 'Name', variable_name: 'billing_name', value: billingName }] : []),
            ...(billingPhone ? [{ display_name: 'Phone', variable_name: 'billing_phone', value: billingPhone }] : []),
          ],
        },
      });
      payment.accessCode = tx.access_code;
      await payment.save();
      return res.status(201).json({ accessCode: tx.access_code, reference });
    } catch (err) {
      await Payment.deleteOne({ _id: payment._id }); // nothing was created at Paystack, so keep no trace
      throw err;
    }
  } catch (err) {
    return sendError(err, res, next);
  }
});

/* GET /api/payments/verify/:reference  ->  { status, premium, expiresAt?, message? } */
router.get('/verify/:reference', requireAuth, verifyLimiter, async (req, res, next) => {
  try {
    const { reference } = req.params;
    if (!REFERENCE_RE.test(reference)) return res.status(404).json({ message: 'Payment not found.' });

    // Looked up together with the owner, so nobody can check (or claim) someone else's payment.
    const payment = await Payment.findOne({ reference, user: req.userId });
    if (!payment) return res.status(404).json({ message: 'Payment not found.' });

    if (payment.status !== 'success') {
      let tx;
      try {
        tx = await paystack('GET', `/transaction/verify/${encodeURIComponent(reference)}`);
      } catch (err) {
        // Paystack does not know the reference yet (the window has not been opened): simply still waiting.
        if (err?.upstream === 400 || err?.upstream === 404) return res.json({ status: 'pending', premium: false });
        throw err;
      }
      const settled = await settle(payment, tx);
      if (settled.status === 'failed') {
        return res.json({ status: 'failed', premium: false, message: String(tx.gateway_response || 'The payment did not go through.').slice(0, 200) });
      }
      if (settled.status !== 'success') return res.json({ status: 'pending', premium: false });
    }

    const access = await accessFor(req.userId);
    return res.json({ status: 'success', ...access });
  } catch (err) {
    return sendError(err, res, next);
  }
});

export default router;

/*
 * POST /api/payments/webhook
 * Paystack calls this itself when a payment succeeds, even if the person closed the tab first. It is mounted in
 * index.js BEFORE express.json() with express.raw(), because the signature is calculated over the exact bytes
 * Paystack sent. Set the URL in the Paystack dashboard (Settings > API Keys & Webhooks); it must be a public
 * https address, so it only works once the server is deployed.
 */
export async function paystackWebhook(req, res) {
  const secret = secretKey();
  const raw = Buffer.isBuffer(req.body) ? req.body : null;
  const signature = String(req.headers['x-paystack-signature'] || '');
  if (!secret || !raw || !signature) return res.sendStatus(401);

  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.sendStatus(401);

  let event;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.sendStatus(400);
  }

  try {
    const reference = event?.data?.reference;
    if (event?.event === 'charge.success' && typeof reference === 'string' && REFERENCE_RE.test(reference)) {
      const payment = await Payment.findOne({ reference });
      if (payment) await settle(payment, event.data);
    }
    return res.sendStatus(200);
  } catch (err) {
    console.error('Paystack webhook failed:', err);
    return res.sendStatus(500); // Paystack tries again later
  }
}
