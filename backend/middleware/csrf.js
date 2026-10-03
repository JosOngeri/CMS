/**
 * CSRF middleware — session-bound double-submit token.
 * Token = `nonce.signature` where signature = HMAC(CSRF_SECRET, nonce|sessionBinding).
 * sessionBinding = the request's jwt/platform_session cookie, or a csrf_sid
 * cookie minted for pre-login clients. A token minted for one session can
 * never validate against another session's cookies.
 * @exports {csrfTokenMiddleware, getCsrfToken}
 * @known Bearer-only clients are exempt (CSRF protects cookie sessions only);
 *         /api/auth/login|register and the signed mpesa callback are exempt.
 */
const crypto = require('crypto');

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET;
const SESSION_COOKIES = ['jwt', 'platform_session', 'csrf_sid'];

function sessionBinding(req) {
  for (const name of SESSION_COOKIES) {
    const value = req.cookies && req.cookies[name];
    if (value) return value;
  }
  return null;
}

function sign(nonce, binding) {
  return crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(`${nonce}|${binding}`)
    .digest('hex');
}

// Issue a token bound to the caller's session. Pre-login callers get an
// anonymous csrf_sid cookie so their tokens are still session-bound.
function getCsrfToken(req, res) {
  let binding = sessionBinding(req);
  if (!binding) {
    binding = crypto.randomBytes(16).toString('hex');
    res.cookie('csrf_sid', binding, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/api',
      maxAge: 24 * 60 * 60 * 1000
    });
  }
  const nonce = crypto.randomBytes(16).toString('hex');
  res.json({ csrfToken: `${nonce}.${sign(nonce, binding)}` });
}

// Validate `nonce.signature` against this request's session binding.
function validateCSRFToken(token, req) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot < 1) return false;
  const nonce = token.slice(0, dot);
  const presented = token.slice(dot + 1);
  const binding = sessionBinding(req);
  if (!nonce || !presented || !binding) return false;
  const expected = sign(nonce, binding);
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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
  if (!validateCSRFToken(token, req)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}

module.exports = {
  csrfTokenMiddleware,
  getCsrfToken
};
