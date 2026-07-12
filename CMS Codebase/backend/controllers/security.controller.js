const BaseController = require('./BaseController');
const SecurityRepository = require('../repositories/SecurityRepository');
const { createLogger } = require('../helpers/controllerLogger');
const auditService = require('../services/auditService');

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
      const logs = await SecurityRepository.getSecurityLogs(limit, req.user.church_id);
      return this.success(res, { logs });
    } catch (error) {
      this.logger.error('getSecurityLogs', error);
      return this.error(res, 'Failed to fetch logs');
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
      const attempts = await SecurityRepository.getFailedLoginAttempts(req.user.church_id);
      return this.success(res, { attempts });
    } catch (error) {
      this.logger.error('getFailedLoginAttempts', error);
      return this.error(res, 'Failed to fetch attempts');
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
      const blockedIPs = await SecurityRepository.getBlockedIPs(req.user.church_id);
      return this.success(res, { blockedIPs });
    } catch (error) {
      this.logger.error('getBlockedIPs', error);
      return this.error(res, 'Failed to fetch blocked IPs');
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

      await SecurityRepository.blockIP(ipAddress, reason, req.user.id, req.user.church_id);

      // Log audit event
      await auditService.log(
        req.user.church_id,
        req.user.id,
        'BLOCK_IP',
        'security',
        ipAddress,
        { blocked: false },
        { blocked: true, reason },
        req.ip,
        req.get('user-agent')
      );

      return this.success(res, null, 'IP blocked successfully');
    } catch (error) {
      this.logger.error('blockIP', error);
      if (error.message.includes('Invalid IP')) {
        return this.error(res, error.message, 400);
      }
      return this.error(res, 'Failed to block IP');
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
      const ipAddress = req.params.ipAddress;

      await SecurityRepository.unblockIP(ipAddress, req.user.church_id);

      // Log audit event
      await auditService.log(
        req.user.church_id,
        req.user.id,
        'UNBLOCK_IP',
        'security',
        ipAddress,
        { blocked: true },
        { blocked: false },
        req.ip,
        req.get('user-agent')
      );

      return this.success(res, null, 'IP unblocked successfully');
    } catch (error) {
      this.logger.error('unblockIP', error);
      return this.error(res, 'Failed to unblock IP');
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
      const sessions = await SecurityRepository.getActiveSessions(req.params.userId, req.user.church_id);
      return this.success(res, { sessions });
    } catch (error) {
      this.logger.error('getActiveSessions', error);
      return this.error(res, 'Failed to fetch sessions');
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
      await SecurityRepository.revokeAllUserSessions(req.params.userId, req.user.church_id);
      return this.success(res, null, 'Sessions revoked successfully');
    } catch (error) {
      this.logger.error('revokeAllUserSessions', error);
      return this.error(res, 'Failed to revoke sessions');
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
      const settings = await SecurityRepository.getSecuritySettings(req.user.church_id);
      return this.success(res, { settings });
    } catch (error) {
      this.logger.error('getSecuritySettings', error);
      return this.error(res, 'Failed to fetch settings');
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
      const churchId = req.user.church_id;

      // Get old settings for audit log
      const oldSettings = await SecurityRepository.getSecuritySettings(churchId);

      const newSettings = {
        passwordPolicy,
        sessionTimeout,
        mfaEnabled,
        ipWhitelist,
        ipBlacklist
      };

      await SecurityRepository.updateSecuritySettings(churchId, newSettings);

      // Log audit event
      await auditService.log(
        churchId,
        req.user.id,
        'UPDATE',
        'security_settings',
        churchId,
        oldSettings,
        newSettings,
        req.ip,
        req.get('user-agent')
      );

      return this.success(res, null, 'Security settings updated successfully');
    } catch (error) {
      this.logger.error('updateSecuritySettings', error);
      return this.error(res, 'Failed to update settings');
    }
  }

  async getAnalytics(req, res) {
    try {
      const analytics = await SecurityRepository.getSecurityAnalytics(req.user.church_id);
      const recentEvents = await SecurityRepository.getRecentSecurityEvents();

      return this.success(res, { analytics, recentEvents });
    } catch (error) {
      this.logger.error('getSecurityAnalytics', error);
      return this.error(res, 'Failed to fetch analytics');
    }
  }
}

module.exports = new SecurityController();
