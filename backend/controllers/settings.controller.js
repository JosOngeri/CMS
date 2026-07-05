const BaseController = require('./BaseController');
const SettingsRepository = require('../repositories/SettingsRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Settings Controller
 * Handles application settings, including CRUD operations, export/import, and audit logging
 */
class SettingsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('SettingsController');
  }

  /**
   * Get all settings grouped by category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllSettings(req, res) {
    try {
      const churchId = req.user.church_id;
      const settings = await SettingsRepository.getAll(churchId);

      res.json({ success: true, settings });
    } catch (error) {
      this.logger.error('getAllSettings', error);
      res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
  }

  /**
   * Get public settings (accessible without authentication)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPublicSettings(req, res) {
    try {
      const churchId = req.user?.church_id;

      const settings = await SettingsRepository.getPublicSettings(churchId);

      res.json({ success: true, settings });
    } catch (error) {
      this.logger.error('getPublicSettings', error);
      res.status(500).json({ success: false, error: 'Failed to fetch public settings' });
    }
  }

  /**
   * Get a setting by key
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.key - Setting key
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSettingByKey(req, res) {
    try {
      const { key } = req.params;
      const churchId = req.user.church_id;

      const setting = await SettingsRepository.getByKey(key, churchId);

      if (!setting) {
        return res.status(404).json({ success: false, error: 'Setting not found' });
      }

      res.json({ success: true, setting });
    } catch (error) {
      this.logger.error('getSettingByKey', error);
      res.status(500).json({ success: false, error: 'Failed to fetch setting' });
    }
  }

  /**
   * Create a new setting
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.key - Setting key
   * @param {string} req.body.value - Setting value
   * @param {string} req.body.value_type - Value type (string/number/boolean/json)
   * @param {string} req.body.category - Setting category
   * @param {string} req.body.label - Setting label
   * @param {string} [req.body.description] - Setting description
   * @param {boolean} [req.body.is_public] - Public accessibility
   * @param {boolean} [req.body.is_editable] - Editable status
   * @param {Object} [req.body.validation_rules] - Validation rules
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createSetting(req, res) {
    try {
      const { key, value, value_type, category, label, description, is_public, is_editable, validation_rules } = req.body;

      const setting = await SettingsRepository.createSetting({
        key, value, value_type, category, label, description, is_public, is_editable, validation_rules
      });

      res.status(201).json({ success: true, setting });
    } catch (error) {
      this.logger.error('createSetting', error);
      if (error.code === '23505') {
        return res.status(400).json({ success: false, error: 'Setting with this key already exists' });
      }
      res.status(500).json({ success: false, error: 'Failed to create setting' });
    }
  }

  /**
   * Update a setting
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.key - Setting key
   * @param {Object} req.body - Request body with fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateSetting(req, res) {
    try {
      const { key } = req.params;
      const { value, label, description, is_public, is_editable, validation_rules } = req.body;

      const setting = await SettingsRepository.getSettingByKeySimple(key);

      if (!setting) {
        return res.status(404).json({ success: false, error: 'Setting not found' });
      }

      if (!setting.is_editable) {
        return res.status(403).json({ success: false, error: 'This setting cannot be edited' });
      }

      const updatedSetting = await SettingsRepository.updateSetting(key, {
        value, label, description, is_public, is_editable, validation_rules
      });

      res.json({ success: true, setting: updatedSetting });
    } catch (error) {
      this.logger.error('updateSetting', error);
      res.status(500).json({ success: false, error: 'Failed to update setting' });
    }
  }

  /**
   * Update multiple settings at once
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {Array} req.body.settings - Array of settings to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateMultipleSettings(req, res) {
    try {
      const { settings } = req.body;

      if (!Array.isArray(settings)) {
        return res.status(400).json({ success: false, error: 'Settings must be an array' });
      }

      const updated = [];
      const errors = [];

      for (const settingData of settings) {
        try {
          const { key, value } = settingData;

          const setting = await SettingsRepository.getSettingByKeySimple(key);

          if (!setting) {
            // Create setting if it doesn't exist
            const newSetting = await SettingsRepository.createSettingSimple(
              key,
              value,
              key.replace('_', ' ').toUpperCase()
            );
            updated.push(newSetting);
            continue;
          }

          if (!setting.is_editable) {
            errors.push({ key, error: 'This setting cannot be edited' });
            continue;
          }

          const result = await SettingsRepository.updateSettingValue(key, value);
          updated.push(result);
        } catch (error) {
          errors.push({ key: settingData.key, error: error.message });
        }
      }

      res.json({
        success: true,
        updated,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      this.logger.error('updateMultipleSettings', error);
      res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
  }

  /**
   * Delete a setting
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.key - Setting key
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteSetting(req, res) {
    try {
      const { key } = req.params;

      const setting = await SettingsRepository.getSettingByKeySimple(key);

      if (!setting) {
        return res.status(404).json({ success: false, error: 'Setting not found' });
      }

      if (!setting.is_editable) {
        return res.status(403).json({ success: false, error: 'This setting cannot be deleted' });
      }

      await SettingsRepository.deleteSettingByKey(key);

      res.json({ success: true, message: 'Setting deleted successfully' });
    } catch (error) {
      this.logger.error('deleteSetting', error);
      res.status(500).json({ success: false, error: 'Failed to delete setting' });
    }
  }

  /**
   * Export settings
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.category] - Filter by category
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async exportSettings(req, res) {
    try {
      const { category } = req.query;

      const settings = await SettingsRepository.exportSettings(category);

      const exportData = {
        exported_at: new Date().toISOString(),
        settings
      };

      res.json({ success: true, data: exportData });
    } catch (error) {
      this.logger.error('exportSettings', error);
      res.status(500).json({ success: false, error: 'Failed to export settings' });
    }
  }

  /**
   * Import settings
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {Array} req.body.settings - Array of settings to import
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async importSettings(req, res) {
    try {
      const { settings } = req.body;

      if (!Array.isArray(settings)) {
        return res.status(400).json({ success: false, error: 'Settings must be an array' });
      }

      const imported = [];
      const errors = [];

      for (const settingData of settings) {
        try {
          const { key, value, value_type, category, label, description, is_public, is_editable, validation_rules } = settingData;

          const result = await SettingsRepository.importSetting({
            key, value, value_type, category, label, description, is_public, is_editable, validation_rules
          });

          imported.push(result);
        } catch (error) {
          errors.push({ key: settingData.key, error: error.message });
        }
      }

      res.json({
        success: true,
        imported,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      this.logger.error('importSettings', error);
      res.status(500).json({ success: false, error: 'Failed to import settings' });
    }
  }

  /**
   * Reset settings to default values
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.category] - Filter by category
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async resetToDefaults(req, res) {
    try {
      const { category } = req.query;

      const rowCount = await SettingsRepository.resetToDefaults(category);

      res.json({
        success: true,
        message: `Reset ${rowCount} settings to defaults`
      });
    } catch (error) {
      this.logger.error('resetToDefaults', error);
      res.status(500).json({ success: false, error: 'Failed to reset settings' });
    }
  }

  /**
   * Get settings change history
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.key] - Filter by setting key
   * @param {number} [req.query.limit=50] - Limit results
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSettingsHistory(req, res) {
    try {
      const { key, limit = 50 } = req.query;

      const history = await SettingsRepository.getSettingsHistory(key, limit);
      res.json({ success: true, data: history });
    } catch (error) {
      this.logger.error('getSettingsHistory', error);
      res.status(500).json({ success: false, error: 'Failed to fetch settings history' });
    }
  }

  /**
   * Get system health status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSystemHealth(req, res) {
    try {
      // Check database connection
      const dbHealthy = await SettingsRepository.checkDatabaseConnection();

      // Check disk space (simulated)
      const diskUsage = {
        total: 1000000000000, // 1TB
        used: 500000000000, // 500GB
        available: 500000000000 // 500GB
      };

      // Check memory (simulated)
      const memoryUsage = {
        total: 8589934592, // 8GB
        used: 4294967296, // 4GB
        available: 4294967296 // 4GB
      };

      // Check uptime
      const uptime = process.uptime();

      res.json({
        success: true,
        data: {
          database: { healthy: dbHealthy, last_check: new Date() },
          disk: diskUsage,
          memory: memoryUsage,
          uptime: uptime,
          status: 'healthy'
        }
      });
    } catch (error) {
      this.logger.error('getSystemHealth', error);
      res.status(500).json({ success: false, error: 'Failed to fetch system health' });
    }
  }

  /**
   * Create backup
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} [req.body.type] - Backup type (full, incremental)
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createBackup(req, res) {
    try {
      const { type = 'full' } = req.body;
      const userId = req.user.id;

      const backupLog = await SettingsRepository.createBackupLog(type, userId);

      res.json({ success: true, data: backupLog });
    } catch (error) {
      this.logger.error('createBackup', error);
      res.status(500).json({ success: false, error: 'Failed to create backup' });
    }
  }

  /**
   * Get backup logs
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.status] - Filter by status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getBackupLogs(req, res) {
    try {
      const { status } = req.query;

      const logs = await SettingsRepository.getBackupLogs(status);

      res.json({ success: true, data: logs });
    } catch (error) {
      this.logger.error('getBackupLogs', error);
      res.status(500).json({ success: false, error: 'Failed to fetch backup logs' });
    }
  }

  /**
   * Set maintenance mode
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {boolean} req.body.enabled - Enable/disable maintenance mode
   * @param {string} [req.body.message] - Maintenance message
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async setMaintenanceMode(req, res) {
    try {
      const { enabled, message } = req.body;
      const userId = req.user.id;

      await SettingsRepository.setMaintenanceSetting('maintenance_mode', enabled.toString(), userId);

      if (message) {
        await SettingsRepository.setMaintenanceMessage(message, userId);
      }

      res.json({ success: true, message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}` });
    } catch (error) {
      this.logger.error('setMaintenanceMode', error);
      res.status(500).json({ success: false, error: 'Failed to set maintenance mode' });
    }
  }

  /**
   * Get maintenance mode status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMaintenanceMode(req, res) {
    try {
      const maintenanceSettings = await SettingsRepository.getMaintenanceModeSettings();

      res.json({
        success: true,
        data: {
          enabled: maintenanceSettings.enabled,
          message: maintenanceSettings.message
        }
      });
    } catch (error) {
      this.logger.error('getMaintenanceMode', error);
      res.status(500).json({ success: false, error: 'Failed to get maintenance mode status' });
    }
  }

  /**
   * Schedule maintenance
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.scheduled_at - Scheduled maintenance time
   * @param {string} [req.body.duration] - Expected duration
   * @param {string} [req.body.message] - Maintenance message
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async scheduleMaintenance(req, res) {
    try {
      const { scheduled_at, duration, message } = req.body;
      const userId = req.user.id;

      const schedule = await SettingsRepository.createMaintenanceSchedule({
        scheduledAt: scheduled_at,
        duration,
        message,
        createdBy: userId
      });

      res.json({ success: true, data: schedule });
    } catch (error) {
      this.logger.error('scheduleMaintenance', error);
      res.status(500).json({ success: false, error: 'Failed to schedule maintenance' });
    }
  }

  /**
   * Get maintenance schedules
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMaintenanceSchedules(req, res) {
    try {
      const schedules = await SettingsRepository.getMaintenanceSchedules();

      res.json({ success: true, data: schedules });
    } catch (error) {
      this.logger.error('getMaintenanceSchedules', error);
      res.status(500).json({ success: false, error: 'Failed to fetch maintenance schedules' });
    }
  }
}

module.exports = new SettingsController();
