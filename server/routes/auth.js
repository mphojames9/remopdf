import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import requireAuth from '../middleware/requireAuth.js';
import { verifiedPhoneFromToken } from '../lib/firebaseAdmin.js';

/*
 * Accounts.
 *
 *   POST /api/auth/register  { firstName, lastName, email, password, phoneToken }  -> 201 { token, user }
 *   POST /api/auth/login     { email, password, remember }                         -> { token, user }
 *   GET  /api/auth/me        (Authorization: Bearer <token>)                       -> { user }
 *
 * The token is a JWT signed with JWT_SECRET whose `sub` is the account id (requireAuth reads it from there).
 * "Remember me" only changes how long the token lives; the browser decides where it is kept.
 *
 * phoneToken is the Firebase ID token the browser got after the person typed the SMS code. The server checks it
 * itself (lib/firebaseAdmin.js); a phone number in the request body is never used.
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
    const email = text(req.body?.email, 254).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!firstName || !lastName) return res.status(400).json({ message: 'Enter your first and last name.' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < MIN_PASSWORD) return res.status(400).json({ message: `Use at least ${MIN_PASSWORD} characters for your password.` });
    if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) return res.status(400).json({ message: `Your password is too long. Use at most ${MAX_PASSWORD_BYTES} characters.` });

    // The number is only ever taken from the verified token.
    const phone = await verifiedPhoneFromToken(req.body?.phoneToken);
    if (!phone) return res.status(400).json({ message: 'We could not confirm your mobile number. Please request a new code and try again.' });

    if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists. Try signing in instead.' });

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    let user;
    try {
      user = await User.create({ firstName, lastName, email, passwordHash, lastLoginAt: new Date() });
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
