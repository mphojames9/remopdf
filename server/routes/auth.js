import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // bcrypt ignores everything after 72 bytes, so longer passwords are refused instead of silently cut.
const BCRYPT_ROUNDS = 12;

// Compared against when an email is unknown, so "no such account" and "wrong password" take the same time.
const DUMMY_HASH = bcrypt.hashSync('remopdf-timing-placeholder', BCRYPT_ROUNDS);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
});

// Only plain strings are accepted, so a JSON body like { "email": { "$gt": "" } } can never reach a query.
const text = (value) => (typeof value === 'string' ? value.trim() : '');

const signToken = (userId, expiresIn) => jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn });

/* POST /api/auth/register  { firstName, lastName, email, password } */
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const firstName = text(req.body?.firstName);
    const lastName = text(req.body?.lastName);
    const email = text(req.body?.email).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const errors = {};
    if (!firstName) errors.firstName = 'Enter your first name.';
    else if (firstName.length > 60) errors.firstName = 'First name is too long.';
    if (!lastName) errors.lastName = 'Enter your last name.';
    else if (lastName.length > 60) errors.lastName = 'Last name is too long.';
    if (!email) errors.email = 'Enter your email address.';
    else if (!EMAIL_RE.test(email) || email.length > 254) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Create a password.';
    else if (password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
    else if (Buffer.byteLength(password) > MAX_PASSWORD) errors.password = `Use at most ${MAX_PASSWORD} characters.`;

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: Object.values(errors)[0], errors });
    }

    const emailTaken = { message: 'An account with this email already exists. Try signing in instead.' };
    if (await User.exists({ email })) return res.status(409).json(emailTaken);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    let user;
    try {
      user = await User.create({ firstName, lastName, email, passwordHash, lastLoginAt: new Date() });
    } catch (err) {
      // Two sign-ups with the same email at the same moment: the unique index rejects the second one.
      if (err?.code === 11000) return res.status(409).json(emailTaken);
      throw err;
    }

    return res.status(201).json({ token: signToken(user.id, '7d'), user });
  } catch (err) {
    return next(err);
  }
});

/* POST /api/auth/login  { email, password, remember } */
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const email = text(req.body?.email).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const remember = req.body?.remember === true;

    if (!email || !password) {
      return res.status(400).json({ message: 'Enter your email and password.' });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    const matches = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !matches) {
      // The same message for both cases, so the form cannot be used to find out which emails have accounts.
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    return res.json({ token: signToken(user.id, remember ? '30d' : '1d'), user });
  } catch (err) {
    return next(err);
  }
});

/* GET /api/auth/me  (Authorization: Bearer <token>) */
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
