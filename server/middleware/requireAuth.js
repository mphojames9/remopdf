import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const ID_RE = /^[0-9a-f]{24}$/i;

// Protects a route: expects "Authorization: Bearer <token>" and puts the account id on req.userId.
// Besides the signature and expiry, the account must still exist and must not be suspended, so a deleted or
// suspended account is signed out everywhere.
export default async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Please sign in to continue.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }

  try {
    if (typeof payload.sub !== 'string' || !ID_RE.test(payload.sub)) {
      return res.status(401).json({ message: 'Please sign in to continue.' });
    }
    const account = await User.findById(payload.sub).select('disabled').lean();
    if (!account) {
      return res.status(401).json({ message: 'Please sign in to continue.' });
    }
    if (account.disabled) {
      // 401 (not 403) so the app clears its saved sign-in instead of keeping a token that can never work again.
      return res.status(401).json({ message: 'This account has been suspended. Please contact support.' });
    }

    req.userId = payload.sub;
    return next();
  } catch (err) {
    return next(err);
  }
}
