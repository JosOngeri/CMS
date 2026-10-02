/**
 * CSRF middleware — SECURITY THEATER: any 64-char string passes; tokens are never bound to a session.
 * Real protection currently comes from SameSite cookies + the Bearer-header exemption.
 * @exports {csrfTokenMiddleware, getCsrfToken}
 * @known Replace with a session-bound double-submit token or remove — ledger Batch-1 re-audit.
 */
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

  // Skip CSRF for server-to-server webhooks — Daraja posts the M-Pesa
  // callback with no Bearer/CSRF token; it is authenticated by signature.
  if (req.path.startsWith('/api/mpesa/callback')) {
    return next();
  }

  // Skip CSRF for Bearer-token API clients (mobile app) — CSRF only protects
  // cookie-based sessions; browsers never attach Authorization headers cross-site.
  // Only bypass when Bearer is the ONLY credential: if a session cookie is also
  // present the request could be cookie-authenticated, so CSRF still applies.
  const authHeader = req.headers.authorization || '';
  const hasSessionCookie = !!(req.cookies && req.cookies.jwt);
  if (authHeader.startsWith('Bearer ') && !hasSessionCookie) {
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
