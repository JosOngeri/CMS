const BaseController = require('./BaseController');
const SecurityRepository = require('../repositories/SecurityRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Security Controller
 * Handles security logs, IP blocking, session management, and security settings
 */
class SecurityController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('SecurityController');
  }

  /**
   * Get security logs
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.limit=50] - Number of logs to return
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSecurityLogs(req, res) {
    try {
      const { limit = 50 } = req.query;
      const logs = await SecurityRepository.getSecurityLogs(limit);
      res.json({ success: true, logs });
    } catch (error) {
      this.logger.error('getSecurityLogs', error);
      res.status(500).json({ success: false, error: 'Failed to fetch logs' });
    }
  }

  /**
   * Get failed login attempts
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getFailedLoginAttempts(req, res) {
    try {
      const attempts = await SecurityRepository.getFailedLoginAttempts();
      res.json({ success: true, attempts });
    } catch (error) {
      this.logger.error('getFailedLoginAttempts', error);
      res.status(500).json({ success: false, error: 'Failed to fetch attempts' });
    }
  }

  /**
   * Get blocked IP addresses
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getBlockedIPs(req, res) {
    try {
      const blockedIPs = await SecurityRepository.getBlockedIPs();
      res.json({ success: true, blockedIPs });
    } catch (error) {
      this.logger.error('getBlockedIPs', error);
      res.status(500).json({ success: false, error: 'Failed to fetch blocked IPs' });
    }
  }

  /**
   * Block an IP address
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.ipAddress - IP address to block
   * @param {string} req.body.reason - Reason for blocking
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async blockIP(req, res) {
    try {
      const { ipAddress, reason } = req.body;
      await SecurityRepository.blockIP(ipAddress, reason, req.user.id);
      res.json({ success: true });
    } catch (error) {
      this.logger.error('blockIP', error);
      res.status(500).json({ success: false, error: 'Failed to block IP' });
    }
  }

  /**
   * Unblock an IP address
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.ipAddress - IP address to unblock
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async unblockIP(req, res) {
    try {
      await SecurityRepository.unblockIP(req.params.ipAddress);
      res.json({ success: true });
    } catch (error) {
      this.logger.error('unblockIP', error);
      res.status(500).json({ success: false, error: 'Failed to unblock IP' });
    }
  }

  /**
   * Get active user sessions
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.userId - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getActiveSessions(req, res) {
    try {
      const sessions = await SecurityRepository.getActiveSessions(req.params.userId);
      res.json({ success: true, sessions });
    } catch (error) {
      this.logger.error('getActiveSessions', error);
      res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
    }
  }

  /**
   * Revoke all user sessions
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.userId - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async revokeAllUserSessions(req, res) {
    try {
      await SecurityRepository.revokeAllUserSessions(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      this.logger.error('revokeAllUserSessions', error);
      res.status(500).json({ success: false, error: 'Failed to revoke sessions' });
    }
  }

  /**
   * Get security settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSecuritySettings(req, res) {
    try {
      const settings = await SecurityRepository.getSecuritySettings();
      res.json({ success: true, settings });
    } catch (error) {
      this.logger.error('getSecuritySettings', error);
      res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
  }

  /**
   * Update security settings
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {Object} req.body.passwordPolicy - Password policy settings
   * @param {number} req.body.sessionTimeout - Session timeout in minutes
   * @param {boolean} req.body.mfaEnabled - MFA enabled flag
   * @param {Array} req.body.ipWhitelist - IP whitelist
   * @param {Array} req.body.ipBlacklist - IP blacklist
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateSecuritySettings(req, res) {
    try {
      const { passwordPolicy, sessionTimeout, mfaEnabled, ipWhitelist, ipBlacklist } = req.body;
      await SecurityRepository.updateSecuritySettings({
        passwordPolicy: JSON.stringify(passwordPolicy),
        sessionTimeout,
        mfaEnabled,
        ipWhitelist: JSON.stringify(ipWhitelist),
        ipBlacklist: JSON.stringify(ipBlacklist)
      });
      res.json({ success: true });
    } catch (error) {
      this.logger.error('updateSecuritySettings', error);
      res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
  }

  async getAnalytics(req, res) {
    try {
      const analytics = await SecurityRepository.getSecurityAnalytics();
      const recentEvents = await SecurityRepository.getRecentSecurityEvents();

      res.json({
        success: true,
        analytics,
        recentEvents
      });
    } catch (error) {
      this.logger.error('getSecurityAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
  }
}

module.exports = new SecurityController();
