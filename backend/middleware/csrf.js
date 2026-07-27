const crypto = require('crypto');

// Generate CSRF token
function getCsrfToken(req, res) {
  const token = crypto.randomBytes(32).toString('hex');
  res.json({ csrfToken: token });
}

// Validate CSRF token
function validateCSRFToken(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  return token.length === 64;
}

// CSRF protection middleware
function csrfTokenMiddleware(req, res, next) {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip in development mode
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // Skip CSRF for auth endpoints (mobile apps don't use CSRF)
  if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/register')) {
    return next();
  }

  // Validate CSRF token for state-changing requests
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  if (!validateCSRFToken(token)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}

module.exports = {
  csrfTokenMiddleware,
  getCsrfToken
};
