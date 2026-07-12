const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const tenantResolver = require('./middleware/tenantResolver');
const { churchContext } = require('./middleware/churchContext');
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
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.API_ORIGIN].filter(Boolean),
      frameSrc: ["'none"],
      objectSrc: ["'none"],
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

// Request ID middleware for distributed tracing
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

app.use(pinoHttp({ logger }));



// Per-endpoint rate limiting (using enhanced rate limiting)

// Enhanced CORS configuration for mobile apps and APIs (Phase 6 - Tenant-Aware)
const allowedOrigins = [
  'http://localhost:5180',
  process.env.DEV_IP_ADDRESS,
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
// churchContext disabled for single-tenant deployment (RLS session vars not configured)
// app.use(churchContext);

// Identity Protection (Phase 5)
// Note: We don't apply it globally here yet to allow public routes
// It will be used in specific route modules or as a secondary middleware

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d'
}));

// Health check endpoint (mount before static files to avoid conflicts)
app.use('/api/health', require('./routes/health'));

// Static files for frontend build (Phase 7 - Single-Process Serving)
if (!isDevelopment) {
  app.use(express.static(path.join(__dirname, '../frontend/dist'), {
    maxAge: '1d',
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));

  // SPA fallback - serve index.html for non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      const indexPath = path.join(__dirname, '../frontend/dist/index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(503).json({ success: false, error: 'Frontend not built' });
      }
    } else {
      res.status(404).json({ success: false, error: 'API endpoint not found' });
    }
  });
}

// CSRF protection for state-changing methods (before API routes)
app.use(csrfTokenMiddleware);

// CSRF Token Endpoint
app.get('/api/csrf-token', getCsrfToken);

// API routes - consolidated via index router
app.use('/api', require('./routes/index.routes'));



// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(secureErrorHandler);

module.exports = app;
