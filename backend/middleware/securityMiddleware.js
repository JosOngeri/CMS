const helmet = require('helmet');
const xss = require('xss');

class SecurityMiddleware {
  static sanitizeInput(req, res, next) {
    if (req.body) {
      for (const key in req.body) {
        if (typeof req.body[key] === 'string') {
          req.body[key] = xss(req.body[key]);
        }
      }
    }
    if (req.query) {
      for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
          req.query[key] = xss(req.query[key]);
        }
      }
    }
    next();
  }

  static validateSQLInput(req, res, next) {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|UNION|SCRIPT)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(\b(;|--)\b)/gi,
      /(\b(\/\*|\*\/)\b)/gi
    ];

    const checkInput = (input) => {
      if (typeof input === 'string') {
        for (const pattern of sqlPatterns) {
          if (pattern.test(input)) {
            return true;
          }
        }
      }
      return false;
    };

    const checkObject = (obj) => {
      for (const key in obj) {
        if (checkInput(key) || checkInput(obj[key])) {
          return true;
        }
      }
      return false;
    };

    if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input detected'
      });
    }

    next();
  }

  static corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };

  static securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Content-Security-Policy', "default-src 'self'");
    next();
  }
}

module.exports = SecurityMiddleware;