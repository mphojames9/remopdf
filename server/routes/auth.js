import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import requireAuth from '../middleware/requireAuth.js';
import { checkEmailToken } from '../lib/firebaseAdmin.js';

/*
 * Accounts.
 *
 *   POST /api/auth/register  { firstName, lastName, email, password, phone, emailToken }  -> 201 { token, user }
 *   POST /api/auth/login     { email, password, remember }                                -> { token, user }
 *   GET  /api/auth/me        (Authorization: Bearer <token>)                              -> { user }
 *   POST /api/auth/reset-password  { emailToken, password }                               -> { ok: true }
 *
 * The token is a JWT signed with JWT_SECRET whose `sub` is the account id (requireAuth reads it from there).
 * "Remember me" only changes how long the token lives; the browser decides where it is kept.
 *
 * emailToken is the Firebase ID token the browser got after the person opened the link in the verification email.
 * The server checks it itself (lib/firebaseAdmin.js) and takes the email address ONLY from it. An `email` in the
 * request body is optional, and if it is there and different from the verified one, the request is refused.
 * `phone` is optional, saved as +27XXXXXXXXX and treated as unverified.
 *
 * Resetting a forgotten password uses the same proof of email ownership, so the server sends no email itself:
 *   1. The browser asks Firebase to email a sign-in link: sendSignInLinkToEmail(auth, email, { url: <reset page>,
 *      handleCodeInApp: true }). (Firebase console > Authentication > Sign-in method: turn on "Email link".)
 *   2. The person opens the link on the reset page; the browser calls signInWithEmailLink and gets an ID token.
 *   3. The browser sends { emailToken, password } to /reset-password. The account is found by the verified email
 *      in the token, never by anything in the body.
 * A token works once: it is refused unless the Firebase sign-in is newer than the account's last password reset.
 * After a reset every earlier sign-in token is refused (requireAuth), so other devices must sign in again.
 */

// Uses bcryptjs if it is installed, otherwise bcrypt. Both make and read the same $2a/$2b hashes, so accounts
// created with either keep working.
const bcrypt = await import('bcryptjs')
  .then((m) => m.default || m)
  .catch(() => import('bcrypt').then((m) => m.default || m));

const MIN_PASSWORD = 8; // the same number the sign-up form uses
const MAX_PASSWORD_BYTES = 72; // bcrypt only reads the first 72 bytes, so a longer password would be silently cut
const BCRYPT_COST = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_LIFETIME = { remember: '30d', session: '1d' };

// Used when the email is unknown, so a wrong email takes as long to answer as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// The one rule for a new password (sign-up and reset). Returns the message to show, or null when it is fine.
const passwordProblem = (password) => {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for your password.`;
  if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) return `Your password is too long. Use at most ${MAX_PASSWORD_BYTES} characters.`;
  return null;
};

// South African numbers in any of the usual ways people type them (082 123 4567, +27 82 123 4567,
// 27821234567, 0027821234567, +27 (0)82 123 4567) become +27821234567. Anything else gives null.
const normalizePhone = (value) => {
  const compact = text(value, 40).replace(/[\s().-]/g, '');
  const match = compact.match(/^(?:(?:\+27|0027|27)0?|0)([1-9]\d{8})$/);
  return match ? `+27${match[1]}` : null;
};

const issueToken = (user, remember) =>
  jwt.sign({}, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: String(user._id),
    expiresIn: remember ? TOKEN_LIFETIME.remember : TOKEN_LIFETIME.session,
  });

// 20 attempts per 15 minutes per address is plenty for a person and slows down password guessing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
});

const router = Router();

// Login and sign-up forms are tiny; anything bigger is refused before it is read.
router.use(express.json({ limit: '10kb' }));

/* POST /api/auth/register */
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const firstName = text(req.body?.firstName, 60);
    const lastName = text(req.body?.lastName, 60);
    const bodyEmail = text(req.body?.email, 254).toLowerCase(); // only compared with the verified one, never used
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const rawPhone = text(req.body?.phone, 40);

    if (!firstName || !lastName) return res.status(400).json({ message: 'Enter your first and last name.' });
    const problem = passwordProblem(password);
    if (problem) return res.status(400).json({ message: problem });

    // The email address is only ever taken from the verified token.
    const check = await checkEmailToken(req.body?.emailToken);
    const email = check.email;
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
      // `reason` is for whoever is debugging (the Network tab, the Render logs); the form only shows `message`.
      return res.status(400).json({
        message: 'We could not confirm your email address. Please verify it and try again.',
        reason: check.reason || 'the verified address is not a usable email',
      });
    }
    if (bodyEmail && bodyEmail !== email) {
      return res.status(400).json({ message: 'The email address does not match the one you verified. Please check it and try again.' });
    }

    // Optional, and never proof of anything: no SMS is sent, so it is saved as typed (in +27 form).
    let phone;
    if (rawPhone) {
      phone = normalizePhone(rawPhone);
      if (!phone) return res.status(400).json({ message: 'Enter a valid mobile number, for example 082 123 4567.' });
    }

    if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists. Try signing in instead.' });

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    let user;
    try {
      user = await User.create({
        firstName,
        lastName,
        email,
        emailVerified: true,
        ...(phone ? { phone } : {}),
        passwordHash,
        lastLoginAt: new Date(),
      });
    } catch (err) {
      // Two requests with the same email can both pass the check above; the unique index stops the second one.
      if (err?.code === 11000) return res.status(409).json({ message: 'An account with this email already exists. Try signing in instead.' });
      throw err;
    }

    return res.status(201).json({ token: issueToken(user, true), user });
  } catch (err) {
    return next(err);
  }
});

/* POST /api/auth/login */
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const email = text(req.body?.email, 254).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const remember = req.body?.remember === true;

    if (!email || !password) return res.status(400).json({ message: 'Enter your email and password.' });

    // passwordHash is left out of queries unless it is asked for like this.
    const user = await User.findOne({ email }).select('+passwordHash');
    const matches = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !matches) return res.status(401).json({ message: 'Incorrect email or password.' });

    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
    return res.json({ token: issueToken(user, remember), user });
  } catch (err) {
    return next(err);
  }
});

/* POST /api/auth/reset-password  { emailToken, password }  ->  { ok: true }   (the person then signs in as usual) */
router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const problem = passwordProblem(password);
    if (problem) return res.status(400).json({ message: problem });

    // The account is found by the email address in the verified token, and only by that.
    const check = await checkEmailToken(req.body?.emailToken);
    const email = check.email;
    if (!email || !Number.isFinite(check.authTime)) {
      return res.status(400).json({
        message: 'We could not confirm your email address. Please open the link in your email again.',
        reason: check.reason || 'the token has no sign-in time',
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const now = new Date();

    // One atomic update: it only matches when no reset has happened since this Firebase sign-in, so the same email
    // link (or two requests arriving together) can set a password only once.
    const result = await User.updateOne(
      {
        email,
        $or: [{ passwordChangedAt: null }, { passwordChangedAt: { $lt: new Date(check.authTime * 1000) } }],
      },
      { $set: { passwordHash, passwordChangedAt: now } }
    );

    if (result.matchedCount === 0) {
      if (!(await User.exists({ email }))) {
        return res.status(404).json({ message: 'No account uses this email address. Try signing up instead.' });
      }
      return res.status(409).json({ message: 'This reset link was already used. Please request a new one.' });
    }

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

/* GET /api/auth/me  ->  { user }   (401 when the token is missing, expired, or its account was deleted) */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: 'Please sign in to continue.' });
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

export default router;
