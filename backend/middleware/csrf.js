const crypto = require('crypto');

const CSRF_COOKIE = 'csrf-token';

// Routes that don't need CSRF (public auth endpoints)
const EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health',
  '/api/csrf-token',
];

const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const csrfTokenMiddleware = (req, res, next) => {
  // Skip CSRF for exempt public paths
  if (EXEMPT_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Skip CSRF for requests with valid JWT Bearer token (inherently CSRF-safe)
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  const allowedMethods = ['GET', 'HEAD', 'OPTIONS', 'TRACE'];
  if (allowedMethods.includes(req.method)) {
    const token = req.cookies?.[CSRF_COOKIE];
    if (!token) {
      const newToken = generateToken();
      res.cookie(CSRF_COOKIE, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7200000
      });
    }
    return next();
  }

  const csrfCookie = req.cookies?.[CSRF_COOKIE];
  const csrfHeader = req.headers['x-csrf-token'];
  const csrfBody = req.body?._csrf;
  const csrfValue = csrfHeader || csrfBody;

  if (!csrfCookie || !csrfValue || csrfCookie !== csrfValue) {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token'
    });
  }

  next();
};

const getCsrfToken = (req, res) => {
  let token = req.cookies?.[CSRF_COOKIE];
  if (!token) {
    token = generateToken();
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7200000
    });
  }
  res.json({ csrfToken: token });
};

module.exports = {
  csrfTokenMiddleware,
  getCsrfToken
};
