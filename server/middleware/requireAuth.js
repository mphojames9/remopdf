import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protects a route: expects "Authorization: Bearer <token>" and puts the account id on req.userId.
// Besides the signature and expiry, the account must still exist and the token must not be older than its last
// password reset, so resetting a password signs out every device that was signed in with the old one.
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
    const user = await User.findById(payload.sub).select('passwordChangedAt').lean();
    if (!user) return res.status(401).json({ message: 'Please sign in to continue.' });

    // `iat` is in whole seconds, so compare in seconds: a token issued in the same second as the reset still works.
    if (user.passwordChangedAt) {
      const changedAt = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
      if (!Number.isFinite(payload.iat) || payload.iat < changedAt) {
        return res.status(401).json({ message: 'Your password was changed. Please sign in again.' });
      }
    }

    req.userId = payload.sub;
    return next();
  } catch (err) {
    return next(err);
  }
}
