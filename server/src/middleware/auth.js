const jwt = require('jsonwebtoken');
const db = require('../db');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await db.query('SELECT id, name, email, role, department, is_verified, is_banned FROM users WHERE id = $1', [decoded.id]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.is_banned) {
      return res.status(403).json({ error: 'Your account has been banned. Contact admin.' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email first' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired, please login again' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await db.query('SELECT id, name, email, role, department, is_verified, is_banned FROM users WHERE id = $1', [decoded.id]);
      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    }
  } catch (e) {
    // Ignore token errors for optional auth
  }
  next();
};

module.exports = { auth, adminOnly, optionalAuth };
