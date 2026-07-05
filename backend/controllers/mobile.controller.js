const BaseController = require('./BaseController');
const MobileRepository = require('../repositories/MobileRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Mobile Controller
 * Handles mobile-optimized API endpoints
 */
class MobileController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('MobileController');
  }

  /**
   * Get mobile dashboard data
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMobileDashboard(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.church_id;

      const [
        unreadCount,
        pendingCount,
        quickStats
      ] = await Promise.all([
        MobileRepository.getUnreadNotificationsCount(userId, churchId),
        MobileRepository.getPendingApprovalsCount(userId, churchId),
        MobileRepository.getQuickStats(churchId)
      ]);

      res.json({
        success: true,
        data: {
          notifications: {
            unread: unreadCount
          },
          approvals: {
            pending: pendingCount
          },
          stats: quickStats
        }
      });
    } catch (error) {
      this.logger.error('getMobileDashboard', error);
      res.status(500).json({ success: false, error: 'Failed to fetch mobile dashboard' });
    }
  }

  /**
   * Get mobile content
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.limit=20] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMobileContent(req, res) {
    try {
      const churchId = req.user.church_id;

      const result = await MobileRepository.getMobileContent(churchId);

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('getMobileContent', error);
      res.status(500).json({ success: false, error: 'Failed to fetch mobile content' });
    }
  }

  /**
   * Get mobile announcements
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.limit=10] - Limit results
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMobileAnnouncements(req, res) {
    try {
      const churchId = req.user.church_id;

      const result = await MobileRepository.getMobileAnnouncements(churchId);

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('getMobileAnnouncements', error);
      res.status(500).json({ success: false, error: 'Failed to fetch mobile announcements' });
    }
  }

  /**
   * Get mobile departments
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMobileDepartments(req, res) {
    try {
      const churchId = req.user.church_id;

      const result = await MobileRepository.getMobileDepartments(churchId);

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('getMobileDepartments', error);
      res.status(500).json({ success: false, error: 'Failed to fetch mobile departments' });
    }
  }

  /**
   * Get mobile events
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.startDate] - Start date filter
   * @param {string} [req.query.endDate] - End date filter
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMobileEvents(req, res) {
    try {
      const churchId = req.user.church_id;

      const tableExists = await MobileRepository.checkEventsTable();

      if (!tableExists) {
        return res.json({ success: true, data: [] });
      }

      const result = await MobileRepository.getMobileEvents(churchId);
      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('getMobileEvents', error);
      res.status(500).json({ success: false, error: 'Failed to fetch mobile events' });
    }
  }

  /**
   * Sync mobile data
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} [req.body.lastSync] - Last sync timestamp
   * @param {string} [req.body.userId] - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async syncMobileData(req, res) {
    try {
      const { lastSync, userId } = req.body;
      const syncDate = lastSync ? new Date(lastSync) : new Date(0);
      const churchId = req.user.church_id;

      const syncData = await MobileRepository.getSyncData(syncDate, churchId);

      res.json({
        success: true,
        data: {
          lastSync: new Date().toISOString(),
          content: syncData.content,
          announcements: syncData.announcements,
          events: syncData.events,
          departments: syncData.departments
        }
      });
    } catch (error) {
      this.logger.error('syncMobileData', error);
      res.status(500).json({ success: false, error: 'Failed to sync mobile data' });
    }
  }

  // ==================== SMS INTEGRATION METHODS ====================

  /**
   * Sync contacts from CMS to mobile
   */
  async syncContacts(req, res) {
    try {
      const { lastSync } = req.query;
      const syncDate = lastSync ? new Date(lastSync) : new Date(0);
      const churchId = req.user.church_id;

      const contacts = await MobileRepository.getDeltaContacts(syncDate, churchId);

      res.json({
        success: true,
        data: {
          contacts,
          lastSync: new Date().toISOString(),
          count: contacts.length
        }
      });
    } catch (error) {
      this.logger.error('syncContacts', error);
      res.status(500).json({ success: false, error: 'Failed to sync contacts' });
    }
  }

  /**
   * Upload contact changes from mobile to CMS
   */
  async uploadContactChanges(req, res) {
    try {
      const { changes } = req.body;
      const churchId = req.user.church_id;
      const userId = req.user.id;

      const result = await MobileRepository.processContactChanges(changes, churchId, userId);

      res.json({
        success: true,
        data: {
          processed: result.processed,
          conflicts: result.conflicts,
          errors: result.errors
        }
      });
    } catch (error) {
      this.logger.error('uploadContactChanges', error);
      res.status(500).json({ success: false, error: 'Failed to upload contact changes' });
    }
  }

  /**
   * Get delta contacts for sync
   */
  async getDeltaContacts(req, res) {
    try {
      const { lastSync } = req.query;
      const syncDate = lastSync ? new Date(lastSync) : new Date(0);
      const churchId = req.user.church_id;

      const deltaContacts = await MobileRepository.getDeltaContacts(syncDate, churchId);

      res.json({
        success: true,
        data: deltaContacts
      });
    } catch (error) {
      this.logger.error('getDeltaContacts', error);
      res.status(500).json({ success: false, error: 'Failed to get delta contacts' });
    }
  }

  /**
   * Sync templates from CMS to mobile
   */
  async syncTemplates(req, res) {
    try {
      const { lastSync } = req.query;
      const syncDate = lastSync ? new Date(lastSync) : new Date(0);
      const churchId = req.user.church_id;

      const templates = await MobileRepository.getDeltaTemplates(syncDate, churchId);

      res.json({
        success: true,
        data: {
          templates,
          lastSync: new Date().toISOString(),
          count: templates.length
        }
      });
    } catch (error) {
      this.logger.error('syncTemplates', error);
      res.status(500).json({ success: false, error: 'Failed to sync templates' });
    }
  }

  /**
   * Upload template analytics from mobile
   */
  async uploadTemplateAnalytics(req, res) {
    try {
      const { analytics } = req.body;
      const churchId = req.user.church_id;

      const result = await MobileRepository.processTemplateAnalytics(analytics, churchId);

      res.json({
        success: true,
        data: {
          processed: result.processed
        }
      });
    } catch (error) {
      this.logger.error('uploadTemplateAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to upload template analytics' });
    }
  }

  /**
   * Get official templates from CMS
   */
  async getOfficialTemplates(req, res) {
    try {
      const churchId = req.user.church_id;

      const templates = await MobileRepository.getOfficialTemplates(churchId);

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      this.logger.error('getOfficialTemplates', error);
      res.status(500).json({ success: false, error: 'Failed to get official templates' });
    }
  }

  /**
   * Upload SMS logs from mobile
   */
  async uploadSmsLogs(req, res) {
    try {
      const { logs } = req.body;
      const churchId = req.user.church_id;
      const userId = req.user.id;

      const result = await MobileRepository.processSmsLogs(logs, churchId, userId);

      res.json({
        success: true,
        data: {
          processed: result.processed,
          errors: result.errors
        }
      });
    } catch (error) {
      this.logger.error('uploadSmsLogs', error);
      res.status(500).json({ success: false, error: 'Failed to upload SMS logs' });
    }
  }

  /**
   * Sync SMS logs from CMS to mobile
   */
  async syncSmsLogs(req, res) {
    try {
      const { lastSync, limit = 100 } = req.query;
      const syncDate = lastSync ? new Date(lastSync) : new Date(0);
      const churchId = req.user.church_id;

      const logs = await MobileRepository.getSmsLogs(syncDate, churchId, limit);

      res.json({
        success: true,
        data: {
          logs,
          lastSync: new Date().toISOString(),
          count: logs.length
        }
      });
    } catch (error) {
      this.logger.error('syncSmsLogs', error);
      res.status(500).json({ success: false, error: 'Failed to sync SMS logs' });
    }
  }

  /**
   * Get pending SMS logs for upload
   */
  async getPendingSmsLogs(req, res) {
    try {
      const churchId = req.user.church_id;
      const userId = req.user.id;

      const pendingLogs = await MobileRepository.getPendingSmsLogs(churchId, userId);

      res.json({
        success: true,
        data: pendingLogs
      });
    } catch (error) {
      this.logger.error('getPendingSmsLogs', error);
      res.status(500).json({ success: false, error: 'Failed to get pending SMS logs' });
    }
  }

  /**
   * Create mobile SMS campaign
   */
  async createMobileCampaign(req, res) {
    try {
      const { name, templateId, scheduledDate, targetAudience } = req.body;
      const churchId = req.user.church_id;
      const userId = req.user.id;

      const campaign = await MobileRepository.createMobileCampaign({
        name,
        templateId,
        scheduledDate,
        targetAudience,
        churchId,
        userId,
        source: 'mobile'
      });

      res.json({
        success: true,
        data: campaign
      });
    } catch (error) {
      this.logger.error('createMobileCampaign', error);
      res.status(500).json({ success: false, error: 'Failed to create mobile campaign' });
    }
  }

  /**
   * Get campaign progress
   */
  async getCampaignProgress(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const progress = await MobileRepository.getCampaignProgress(id, churchId);

      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      this.logger.error('getCampaignProgress', error);
      res.status(500).json({ success: false, error: 'Failed to get campaign progress' });
    }
  }

  /**
   * Get mobile campaigns
   */
  async getMobileCampaigns(req, res) {
    try {
      const { status, limit = 20 } = req.query;
      const churchId = req.user.church_id;

      const campaigns = await MobileRepository.getMobileCampaigns(churchId, status, limit);

      res.json({
        success: true,
        data: campaigns
      });
    } catch (error) {
      this.logger.error('getMobileCampaigns', error);
      res.status(500).json({ success: false, error: 'Failed to get mobile campaigns' });
    }
  }

  /**
   * Get unified analytics
   */
  async getUnifiedAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const churchId = req.user.church_id;

      const analytics = await MobileRepository.getUnifiedAnalytics(churchId, startDate, endDate);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      this.logger.error('getUnifiedAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to get unified analytics' });
    }
  }

  /**
   * Get SMS analytics
   */
  async getSmsAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const churchId = req.user.church_id;

      const analytics = await MobileRepository.getSmsAnalytics(churchId, startDate, endDate);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      this.logger.error('getSmsAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to get SMS analytics' });
    }
  }

  /**
   * Mobile login endpoint
   */
  async mobileLogin(req, res) {
    try {
      const { email, password, deviceId, deviceName } = req.body;

      const authResult = await MobileRepository.mobileLogin(email, password, deviceId, deviceName);

      res.json({
        success: true,
        data: authResult
      });
    } catch (error) {
      this.logger.error('mobileLogin', error);
      res.status(401).json({ success: false, error: 'Authentication failed' });
    }
  }

  /**
   * Refresh auth token
   */
  async refreshAuthToken(req, res) {
    try {
      const { refreshToken } = req.body;

      const tokens = await MobileRepository.refreshAuthToken(refreshToken);

      res.json({
        success: true,
        data: tokens
      });
    } catch (error) {
      this.logger.error('refreshAuthToken', error);
      res.status(401).json({ success: false, error: 'Token refresh failed' });
    }
  }

  /**
   * Mobile logout
   */
  async mobileLogout(req, res) {
    try {
      const { deviceId } = req.body;
      const userId = req.user.id;

      await MobileRepository.mobileLogout(userId, deviceId);

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      this.logger.error('mobileLogout', error);
      res.status(500).json({ success: false, error: 'Logout failed' });
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.church_id;

      const syncStatus = await MobileRepository.getSyncStatus(userId, churchId);

      res.json({
        success: true,
        data: syncStatus
      });
    } catch (error) {
      this.logger.error('getSyncStatus', error);
      res.status(500).json({ success: false, error: 'Failed to get sync status' });
    }
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(req, res) {
    try {
      const { syncType, status, timestamp } = req.body;
      const userId = req.user.id;
      const churchId = req.user.church_id;

      await MobileRepository.updateSyncStatus(userId, churchId, syncType, status, timestamp);

      res.json({
        success: true,
        message: 'Sync status updated'
      });
    } catch (error) {
      this.logger.error('updateSyncStatus', error);
      res.status(500).json({ success: false, error: 'Failed to update sync status' });
    }
  }

  /**
   * Reset sync (admin only)
   */
  async resetSync(req, res) {
    try {
      const { userId } = req.body;
      const churchId = req.user.church_id;

      await MobileRepository.resetSync(userId, churchId);

      res.json({
        success: true,
        message: 'Sync reset successfully'
      });
    } catch (error) {
      this.logger.error('resetSync', error);
      res.status(500).json({ success: false, error: 'Failed to reset sync' });
    }
  }

  /**
   * Get mobile devices
   */
  async getMobileDevices(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.church_id;

      const devices = await MobileRepository.getMobileDevices(userId, churchId);

      res.json({
        success: true,
        data: devices
      });
    } catch (error) {
      this.logger.error('getMobileDevices', error);
      res.status(500).json({ success: false, error: 'Failed to get mobile devices' });
    }
  }

  /**
   * Register mobile device
   */
  async registerMobileDevice(req, res) {
    try {
      const { deviceId, deviceName, platform, osVersion } = req.body;
      const userId = req.user.id;
      const churchId = req.user.church_id;

      const device = await MobileRepository.registerMobileDevice({
        deviceId,
        deviceName,
        platform,
        osVersion,
        userId,
        churchId
      });

      res.json({
        success: true,
        data: device
      });
    } catch (error) {
      this.logger.error('registerMobileDevice', error);
      res.status(500).json({ success: false, error: 'Failed to register device' });
    }
  }

  /**
   * Unregister mobile device
   */
  async unregisterMobileDevice(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await MobileRepository.unregisterMobileDevice(id, userId);

      res.json({
        success: true,
        message: 'Device unregistered successfully'
      });
    } catch (error) {
      this.logger.error('unregisterMobileDevice', error);
      res.status(500).json({ success: false, error: 'Failed to unregister device' });
    }
  }
}

module.exports = new MobileController();