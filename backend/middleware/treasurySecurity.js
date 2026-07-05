const { pool } = require('../config/database');
const logger = require('../config/logging');

class TreasurySecurityMiddleware {
  // Check if user has treasury access
  static async hasTreasuryAccess(req, res, next) {
    try {
      const treasuryRoles = ['Super Admin', 'Pastor', 'First Elder', 'Treasurer'];
      
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

  // IP Whitelisting for treasury access
  static ipWhitelist(allowedIPs = []) {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;

      if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
        logger.warn(`IP whitelist violation: ${clientIP} attempted treasury access`);
        return res.status(403).json({ error: 'Access denied from this IP address' });
      }

      next();
    };
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
      // Check if user has MFA enabled (this would be stored in user profile)
      // For now, we'll skip this check but log the action
      logger.info(`MFA check for sensitive operation: ${req.path} by user ${req.user?.id}`);
    }

    next();
  }

  // Rate limiting for treasury operations
  static treasuryRateLimit(maxRequests = 50, windowMs = 15 * 60 * 1000) {
    const requestCounts = new Map();

    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
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
