import User from '../models/User.js';
import requireAuth from './requireAuth.js';
import { syncAdminRole } from '../lib/admins.js';

// Runs after requireAuth. The role is read from the database on every request (never from the token), so removing
// someone's admin access, suspending them or deleting them takes effect immediately.
async function checkAdmin(req, res, next) {
  try {
    const user = await User.findById(req.userId).select('email role');
    if (!user) return res.status(401).json({ message: 'Please sign in to continue.' });

    await syncAdminRole(user);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'This area is for administrators only.' });
    }
    req.adminEmail = user.email; // only used for the server log
    return next();
  } catch (err) {
    return next(err);
  }
}

// Use as: router.use(...requireAdmin)
export default [requireAuth, checkAdmin];
