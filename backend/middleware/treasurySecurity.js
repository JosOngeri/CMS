/**
 * Treasury guards — role check, IP whitelist, audit logging on response send, MFA/sensitive-path checks, in-memory limiter.
 * @exports TreasurySecurityMiddleware (static class)
 * @deps helpers/errorHandler, helpers/permissionChecker, config/database
 * @known Path checks now use router-relative paths (mounted-router fix); requireMFA only enforced for MFA-enabled users; audit insert writes real audit_log columns incl. church_id. IP checks still read remoteAddress behind Caddy; custom Map limiter duplicates express-rate-limit — ledger.
 */
const { pool } = require('../config/database');
const logger = require('../config/logging');
const ipaddr = require('ipaddr.js');
const { sendForbidden, sendError } = require('../helpers/errorHandler');
const { hasAnyRole } = require('../helpers/permissionChecker');

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
        return sendForbidden(res, 'Access denied');
      }

      const hasAccess = hasAnyRole(req.user.roles, treasuryRoles);

      if (!hasAccess) {
        logger.warn(`Unauthorized treasury access attempt by user ${req.user.id}`);
        return sendForbidden(res, 'Access denied. Treasury access required.');
      }

      next();
    } catch (error) {
      logger.error('Treasury access check error:', error);
      return sendError(res, new Error('Internal server error'), 500);
    }
  }

  // IP Whitelisting for treasury access (supports both single IPs and CIDR ranges)
  static ipWhitelist(allowedEntries = []) {
    return (req, res, next) => {
      const clientIP = req.socket.remoteAddress || req.ip;

      if (allowedEntries.length > 0 && !this.isIPWhitelisted(clientIP, allowedEntries)) {
        logger.warn(`IP whitelist violation: ${clientIP} attempted treasury access`);
        return sendForbidden(res, 'Access denied from this IP address');
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
            church_id: req.user?.church_id,
            action: `${req.method} ${req.baseUrl}${req.path}`,
            ip_address: req.ip,
            user_agent: req.get('user-agent')
          };

          // Real audit_log columns: church_id, user_id, action, table_name,
          // record_id, old_values, new_values, ip_address, user_agent, created_at
          await pool.query(
            `INSERT INTO audit_log (church_id, user_id, action, table_name, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [logData.church_id, logData.user_id, logData.action, 'treasury', logData.ip_address, logData.user_agent]
          );

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
  // NOTE: inside the mounted /api/treasury router req.path is already stripped
  // of the mount prefix — paths here are relative (was '/api/treasury/*' → the
  // startsWith never matched and the gate never fired).
  static requireMFA(req, res, next) {
    const sensitivePaths = [
      '/journal-entries',
      '/expenses',
      '/budgets',
      '/funds',
      '/module'
    ];

    const isSensitive = sensitivePaths.some(p => req.path === p || req.path.startsWith(p + '/'));

    // Only enforce for users who opted into MFA — otherwise every treasury
    // request by a non-MFA user would 403.
    if (isSensitive && req.user?.mfaEnabled) {
      const verified = req.user?.mfaVerified === true || req.user?.mfa_verified === true;
      if (!verified) {
        logger.warn(`MFA required but not verified for sensitive operation: ${req.path} by user ${req.user?.id}`);
        return sendForbidden(res, 'MFA verification required for this operation');
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
        return sendError(res, new Error('Too many treasury requests. Please try again later.'), 429);
      }

      userRequests.count++;
      userRequests.timestamp = now;
      requestCounts.set(clientIP, userRequests);

      next();
    };
  }

  // Validate sensitive data access — paths relative to the mounted router
  static validateSensitiveDataAccess(req, res, next) {
    const sensitivePaths = [
      '/reports',
      '/export',
      '/contributions'
    ];

    const isSensitive = sensitivePaths.some(p => req.path === p || req.path.startsWith(p + '/'));

    if (isSensitive) {
      // Log access to sensitive data
      logger.info(`Sensitive data access: ${req.path} by user ${req.user?.id} from ${req.ip}`);
    }

    next();
  }
}

module.exports = TreasurySecurityMiddleware;
