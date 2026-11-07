import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const ID_RE = /^[0-9a-f]{24}$/i;

// Protects a route: expects "Authorization: Bearer <token>" and puts the account id on req.userId.
// Besides the signature and expiry, the account must still exist, so a deleted account is signed out everywhere.
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
    if (!(await User.exists({ _id: payload.sub }))) {
      return res.status(401).json({ message: 'Please sign in to continue.' });
    }

    req.userId = payload.sub;
    return next();
  } catch (err) {
    return next(err);
  }
}
