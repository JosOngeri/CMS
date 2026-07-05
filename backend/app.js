const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');
const rateLimit = require('express-rate-limit');
const tenantResolver = require('./middleware/tenantResolver');
const churchContext = require('./middleware/churchContext');
const identityGuard = require('./middleware/identityGuard');
const { ErrorHandler } = require('./utils/errorHandler');
const { errorHandler: secureErrorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./config/logging');
const {
  authLimiter,
  passwordResetLimiter,
  apiLimiter,
  uploadLimiter,
  generalLimiter,
  strictLimiter
} = require('./middleware/rateLimiter');
const { csrfTokenMiddleware, getCsrfToken } = require('./middleware/csrf');

const app = express();

// Development mode check
const isDevelopment = process.env.NODE_ENV === 'development';

// Security & Performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.example.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  xssFilter: true,
  frameguard: {
    action: 'deny'
  }
}));
app.use(compression());
app.use(cookieParser());
app.use(pinoHttp({ logger }));

// Additional custom security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Per-endpoint rate limiting (using enhanced rate limiting)

// Enhanced CORS configuration for mobile apps and APIs (Phase 6 - Tenant-Aware)
const allowedOrigins = [
  'http://localhost:5180',
  'http://192.168.1.178:5180',
  'https://kiserian-main-sda-church-website-c7u7oiydk.vercel.app',
  process.env.FRONTEND_ORIGIN,
  process.env.PRODUCTION_FRONTEND_URL,
].filter(Boolean);

// Extract base domain for tenant subdomain support (Phase 6)
const getBaseDomain = (origin) => {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    // Handle subdomains like kiserian-main-sda.kmaincms.org
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      // Return base domain for subdomain matching
      return parts.slice(-2).join('.');
    }
    return hostname;
  } catch {
    return null;
  }
};

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);

    // In development, allow any localhost origin AND IP addresses
    if (isDevelopment) {
      // Allow localhost
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
      // Allow all private network IP addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      if (origin.match(/^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$/)) {
        return callback(null, true);
      }
    }

    // Allow explicitly configured origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Phase 6: Tenant-aware CORS - Allow church subdomains
    // e.g., kiserian-main-sda.kmaincms.org, another-church.kmaincms.org
    const baseDomain = getBaseDomain(origin);
    const allowedBaseDomains = [
      'kmaincms.org',
      process.env.BASE_DOMAIN,
      process.env.PRODUCTION_BASE_DOMAIN
    ].filter(Boolean);

    if (baseDomain && allowedBaseDomains.includes(baseDomain)) {
      // Extract potential church slug from subdomain
      const url = new URL(origin);
      const subdomain = url.hostname.split('.')[0];
      // Validate subdomain format (lowercase letters, numbers, hyphens)
      if (subdomain.match(/^[a-z0-9-]+$/)) {
        logger.info(`Tenant-aware CORS allowed: ${origin} (church: ${subdomain})`);
        return callback(null, true);
      }
    }

    // Block unauthorized origins in production
    if (!isDevelopment) {
      logger.warn(`CORS blocked request from: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }

    // In development, allow unknown origins for flexibility
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Origin', 'Accept', 'X-Requested-With'],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Tenant Isolation (Phase 6)
app.use(tenantResolver);
app.use(churchContext);

// Identity Protection (Phase 5)
// Note: We don't apply it globally here yet to allow public routes
// It will be used in specific route modules or as a secondary middleware

// Static files with Cache-Control (Phase 2)
const staticOptions = {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
};

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticOptions));

// CSRF protection for state-changing methods (before API routes)
app.use(csrfTokenMiddleware);

// CSRF Token Endpoint
app.get('/api/csrf-token', getCsrfToken);

// API routes with appropriate rate limiting (using enhanced rate limiters)
app.use('/api/health', require('./routes/health'));
app.use('/api/auth', authLimiter, require('./routes/auth.routes'));
app.use('/api/auth/reset-password', passwordResetLimiter, require('./routes/auth.routes'));
app.use('/api/churches', identityGuard, generalLimiter, require('./routes/church.routes'));
app.use('/api/users', identityGuard, generalLimiter, require('./routes/users.routes'));
app.use('/api/user-settings', identityGuard, generalLimiter, require('./routes/userSettings.routes'));
app.use('/api/announcements', generalLimiter, require('./routes/announcements.routes'));
app.use('/api/departments', identityGuard, generalLimiter, require('./routes/departments.routes'));
app.use('/api/department', identityGuard, generalLimiter, require('./routes/department.routes'));
app.use('/api/department-features', generalLimiter, require('./routes/departmentFeatures.routes'));
app.use('/api/department-categories', identityGuard, generalLimiter, require('./routes/department-categories.routes'));
app.use('/api/payments', identityGuard, strictLimiter, require('./routes/payments.routes'));
app.use('/api/payment', identityGuard, strictLimiter, require('./routes/payment.routes'));
app.use('/api/members', identityGuard, generalLimiter, require('./routes/members.routes'));
app.use('/api/events', generalLimiter, require('./routes/events.routes'));
app.use('/api/sms', identityGuard, strictLimiter, require('./routes/sms.routes'));
app.use('/api/dashboard', identityGuard, generalLimiter, require('./routes/dashboard.routes'));
app.use('/api/treasury', identityGuard, strictLimiter, require('./modules/treasury/routes'));
app.use('/api/settings', generalLimiter, require('./routes/settings.routes'));
app.use('/api/gallery', generalLimiter, require('./routes/gallery.routes'));
app.use('/api/palettes', generalLimiter, require('./routes/palette.routes'));
app.use('/api/notifications', identityGuard, generalLimiter, require('./routes/notifications.routes'));
app.use('/api/approvals', identityGuard, strictLimiter, require('./routes/approvals.routes'));
app.use('/api/comments', generalLimiter, require('./routes/comments.routes'));
app.use('/api/field-permissions', identityGuard, generalLimiter, require('./routes/fieldPermissions.routes'));
app.use('/api/audit-logs', identityGuard, strictLimiter, require('./routes/audit-logs.routes'));
app.use('/api/security', identityGuard, strictLimiter, require('./routes/security.routes'));
app.use('/api/collections', identityGuard, generalLimiter, require('./routes/collections.routes'));
app.use('/api/reports', identityGuard, generalLimiter, require('./routes/reports.routes'));
app.use('/api/documents', identityGuard, uploadLimiter, require('./routes/documents.routes'));
app.use('/api/telegram', identityGuard, generalLimiter, require('./routes/telegram.routes'));
app.use('/api/telegramAuth', identityGuard, generalLimiter, require('./routes/telegramAuth.routes'));
app.use('/api/content', generalLimiter, require('./routes/content.routes'));
// app.use('/api/sda-content', generalLimiter, require('./routes/sdaContent.routes'));
app.use('/api/reconciliation', identityGuard, strictLimiter, require('./routes/reconciliation.routes'));
app.use('/api/mpesa', generalLimiter, require('./routes/mpesa.routes'));
app.use('/api/manual-payments', identityGuard, strictLimiter, require('./routes/manualPayment.routes'));
app.use('/api/gateway', identityGuard, generalLimiter, require('./routes/gateway.routes'));
app.use('/api/sms-hub', identityGuard, strictLimiter, require('./routes/smsHub.routes'));
app.use('/api/document-approval', identityGuard, strictLimiter, require('./routes/documentApproval.routes'));
app.use('/api/analytics', identityGuard, generalLimiter, require('./routes/analytics.routes'));
app.use('/api/ai', identityGuard, strictLimiter, require('./routes/ai.routes'));
app.use('/api/chat', identityGuard, generalLimiter, require('./routes/chat.routes'));
app.use('/api/sync', identityGuard, generalLimiter, require('./routes/sync.routes'));

// Single-Process Static Serving (Phase 7)
// Fallback to React app for any non-API routes
if (!isDevelopment) {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    } else {
      res.status(404).json({ success: false, error: 'API endpoint not found' });
    }
  });
}

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(secureErrorHandler);

module.exports = app;
