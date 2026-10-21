// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const prisma = require('../services/db');

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'embeddedindia_jwt_secret_token_key_9999';

async function requireAuth(req, res, next) {
  const token = req.cookies.admin_token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    return res.redirect('/admin/login?redirect=' + encodeURIComponent(req.originalUrl));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, email: true, role: true }
    });

    if (!user) {
      res.clearCookie('admin_token');
      return res.redirect('/admin/login');
    }

    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (err) {
    res.clearCookie('admin_token');
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session' });
    }
    return res.redirect('/admin/login');
  }
}

function optionalAuth(req, res, next) {
  const token = req.cookies.admin_token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, email: true, role: true }
      }).then(user => {
        if (user) {
          req.user = user;
          res.locals.currentUser = user;
        }
        next();
      }).catch(() => next());
      return;
    } catch (e) {
      // ignore
    }
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  JWT_SECRET
};
