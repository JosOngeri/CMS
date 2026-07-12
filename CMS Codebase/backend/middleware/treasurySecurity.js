const { pool } = require('../config/database');
const logger = require('../config/logging');
const ipaddr = require('ipaddr.js');

class TreasurySecurityMiddleware {
  // Helper function to check if an IP is in a CIDR range
  static isIPInCIDR(clientIP, cidrRange) {
    try {
      const addr = ipaddr.parse(clientIP);
      const range = ipaddr.parseCIDR(cidrRange);
      return addr.match(range);
    } catch (error) {
      logger.error(`CIDR validation error for ${cidrRange}:`, error);
      return false;
    }
  }

  // Helper function to check if IP is whitelisted (supports both single IPs and CIDR ranges)
  static isIPWhitelisted(clientIP, allowedEntries) {
    for (const entry of allowedEntries) {
      // Check if entry is a CIDR range (contains '/')
      if (entry.includes('/')) {
        if (this.isIPInCIDR(clientIP, entry)) {
          return true;
        }
      } else {
        // Direct IP match
        if (clientIP === entry) {
          return true;
        }
      }
    }
    return false;
  }

  // Check if user has treasury access
  static async hasTreasuryAccess(req, res, next) {
    try {
      const treasuryRoles = process.env.TREASURY_ROLES?.split(',') || ['Super Admin', 'Pastor', 'First Elder', 'Treasurer'];
      
      if (!req.user || !req.user.roles) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const hasAccess = req.user.roles.some(role => treasuryRoles.includes(role));

      if (!hasAccess) {
        logger.warn(`Unauthorized treasury access attempt by user ${req.user.id}`);
        return res.status(403).json({ error: 'Access denied. Treasury access required.' });
      }

      next();
    } catch (error) {
      logger.error('Treasury access check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // IP Whitelisting for treasury access (supports both single IPs and CIDR ranges)
  static ipWhitelist(allowedEntries = []) {
    return (req, res, next) => {
      const clientIP = req.socket.remoteAddress || req.ip;

      if (allowedEntries.length > 0 && !this.isIPWhitelisted(clientIP, allowedEntries)) {
        logger.warn(`IP whitelist violation: ${clientIP} attempted treasury access`);
        return res.status(403).json({ error: 'Access denied from this IP address' });
      }

      next();
    };
  }

  // Validate IP against CIDR ranges (standalone validation method)
  static validateIPRange(clientIP, cidrRanges) {
    if (!Array.isArray(cidrRanges) || cidrRanges.length === 0) {
      return false;
    }

    return this.isIPWhitelisted(clientIP, cidrRanges);
  }

  // Log treasury actions
  static async logTreasuryAction(req, res, next) {
    const originalSend = res.send;

    res.send = function(data) {
      // Log the action after response is sent
      setImmediate(async () => {
        try {
          const logData = {
            user_id: req.user?.id,
            action: `${req.method} ${req.path}`,
            method: req.method,
            path: req.path,
            ip: req.ip,
            status_code: res.statusCode,
            timestamp: new Date()
          };

          const query = `
            INSERT INTO audit_log (user_id, action, method, path, ip, status_code, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `;

          await pool.query(query, [
            logData.user_id,
            logData.action,
            logData.method,
            logData.path,
            logData.ip,
            logData.status_code,
            logData.timestamp
          ]);

          logger.info('Treasury action logged:', logData);
        } catch (error) {
          logger.error('Failed to log treasury action:', error);
        }
      });

      originalSend.call(this, data);
    };

    next();
  }

  // Require MFA for sensitive treasury operations
  static requireMFA(req, res, next) {
    const sensitivePaths = [
      '/api/treasury/journal-entries',
      '/api/treasury/expenses',
      '/api/treasury/budgets',
      '/api/treasury/funds'
    ];

    const isSensitive = sensitivePaths.some(path => req.path.startsWith(path));

    if (isSensitive) {
      // Check if user has MFA verified
      // This blocks unauthorized sensitive operations based on the mfa_verified flag
      if (!req.user || !req.user.mfaVerified) {
        logger.warn(`MFA required but not verified for sensitive operation: ${req.path} by user ${req.user?.id}`);
        return res.status(403).json({
          success: false,
          error: 'MFA verification required for this operation'
        });
      }
      logger.info(`MFA verified for sensitive operation: ${req.path} by user ${req.user?.id}`);
    }

    next();
  }

  // Rate limiting for treasury operations
  static treasuryRateLimit(maxRequests = 50, windowMs = 15 * 60 * 1000) {
    const requestCounts = new Map();

    return (req, res, next) => {
      const clientIP = req.socket.remoteAddress || req.ip;
      const now = Date.now();

      // Clean old entries
      for (const [ip, data] of requestCounts.entries()) {
        if (now - data.timestamp > windowMs) {
          requestCounts.delete(ip);
        }
      }

      const userRequests = requestCounts.get(clientIP) || { count: 0, timestamp: now };

      if (userRequests.count >= maxRequests) {
        logger.warn(`Rate limit exceeded for IP: ${clientIP}`);
        return res.status(429).json({ 
          error: 'Too many treasury requests. Please try again later.' 
        });
      }

      userRequests.count++;
      userRequests.timestamp = now;
      requestCounts.set(clientIP, userRequests);

      next();
    };
  }

  // Validate sensitive data access
  static validateSensitiveDataAccess(req, res, next) {
    const sensitivePaths = [
      '/api/treasury/reports',
      '/api/treasury/export',
      '/api/treasury/contributions'
    ];

    const isSensitive = sensitivePaths.some(path => req.path.startsWith(path));

    if (isSensitive) {
      // Log access to sensitive data
      logger.info(`Sensitive data access: ${req.path} by user ${req.user?.id} from ${req.ip}`);
    }

    next();
  }
}

module.exports = TreasurySecurityMiddleware;
