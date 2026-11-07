import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import requireAuth from '../middleware/requireAuth.js';
import { checkGoogleToken } from '../lib/firebaseAdmin.js';

/*
 * Accounts. People sign in with Google, and only with a Gmail address. There are no passwords, no verification
 * emails and no password reset.
 *
 *   POST /api/auth/google  { idToken }                    -> { token, user, isNew }   (201 for a new account, 200 otherwise)
 *   GET  /api/auth/me      (Authorization: Bearer <token>) -> { user }
 *
 * idToken is the Firebase ID token the browser got after the Google sign-in window (src/api/googleAuth.js).
 * The server checks it itself (lib/firebaseAdmin.js) and takes the email address and name ONLY from it.
 *
 * The account is found by that verified Gmail address. The first sign-in with an address creates the account;
 * an account made earlier with the same address (when passwords existed) is simply signed in to, so its resumes
 * and payments are all still there.
 *
 * The token this route hands back is a JWT signed with JWT_SECRET whose `sub` is the account id (requireAuth reads
 * it from there). It lasts 30 days; signing out on the device removes it.
 */

const TOKEN_LIFETIME = '30d';

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const issueToken = (user) =>
  jwt.sign({}, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: String(user._id),
    expiresIn: TOKEN_LIFETIME,
  });

// "Mpho James Matli" -> first name "Mpho", last name "James Matli". A Google account with no name uses the part of
// the address before the @.
const namesFrom = (fullName, email) => {
  const parts = text(fullName, 130).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: text(email.split('@')[0], 60) || 'there', lastName: '' };
  return { firstName: parts[0].slice(0, 60), lastName: parts.slice(1).join(' ').slice(0, 60) };
};

// 20 attempts per 15 minutes per address is plenty for a person and stops anyone hammering the endpoint.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
});

const router = Router();

// A sign-in request is tiny (an ID token is about 1 KB); anything bigger is refused before it is read.
router.use(express.json({ limit: '10kb' }));

/* POST /api/auth/google */
router.post('/google', authLimiter, async (req, res, next) => {
  try {
    const check = await checkGoogleToken(req.body?.idToken);
    if (!check.ok) {
      // `reason` is for whoever is debugging (the Network tab, the Render logs); the app only shows `message`.
      return res.status(check.code === 'not-gmail' ? 403 : 400).json({ message: check.message, reason: check.reason });
    }

    const { email } = check;
    let user = await User.findOne({ email });
    let isNew = false;

    if (!user) {
      try {
        user = await User.create({
          ...namesFrom(check.name, email),
          email,
          emailVerified: true,
          lastLoginAt: new Date(),
        });
        isNew = true;
      } catch (err) {
        // Two sign-ins with the same address can both pass the check above; the unique index stops the second one,
        // which then simply signs in to the account the first one made.
        if (err?.code !== 11000) throw err;
        user = await User.findOne({ email });
        if (!user) throw err;
      }
    }

    if (!isNew) {
      await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date(), emailVerified: true } });
    }

    return res.status(isNew ? 201 : 200).json({ token: issueToken(user), user, isNew });
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
