const BaseController = require('./BaseController');
const SettingsRepository = require('../repositories/SettingsRepository');
const SettingsService = require('../services/SettingsService');
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

      this.success(res, { settings });
    } catch (error) {
      this.logger.error('getAllSettings', error);
      this.error(res, 'Failed to fetch settings');
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

      this.success(res, { settings });
    } catch (error) {
      this.logger.error('getPublicSettings', error);
      this.error(res, 'Failed to fetch public settings');
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
        return this.notFound(res, 'Setting not found');
      }

      this.success(res, { setting });
    } catch (error) {
      this.logger.error('getSettingByKey', error);
      this.error(res, 'Failed to fetch setting');
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

      this.created(res, { setting });
    } catch (error) {
      this.logger.error('createSetting', error);
      if (error.code === '23505') {
        return this.badRequest(res, 'Setting with this key already exists');
      }
      this.error(res, 'Failed to create setting');
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
        return this.notFound(res, 'Setting not found');
      }

      if (!setting.is_editable) {
        return this.forbidden(res, 'This setting cannot be edited');
      }

      const updatedSetting = await SettingsRepository.updateSetting(key, {
        value, label, description, is_public, is_editable, validation_rules
      });

      this.success(res, { setting: updatedSetting });
    } catch (error) {
      this.logger.error('updateSetting', error);
      this.error(res, 'Failed to update setting');
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
        return this.badRequest(res, 'Settings must be an array');
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

      this.success(res, {
        updated,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      this.logger.error('updateMultipleSettings', error);
      this.error(res, 'Failed to update settings');
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
        return this.notFound(res, 'Setting not found');
      }

      if (!setting.is_editable) {
        return this.forbidden(res, 'This setting cannot be deleted');
      }

      await SettingsRepository.deleteSettingByKey(key);

      this.success(res, { message: 'Setting deleted successfully' });
    } catch (error) {
      this.logger.error('deleteSetting', error);
      this.error(res, 'Failed to delete setting');
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
      const exportData = SettingsService.formatExportData(settings);

      this.success(res, { data: exportData });
    } catch (error) {
      this.logger.error('exportSettings', error);
      this.error(res, 'Failed to export settings');
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
      const parsed = SettingsService.parseImportData(req.body);

      if (parsed.error) {
        return this.badRequest(res, parsed.error);
      }

      const { valid, invalid } = parsed;

      const imported = [];
      const errors = [...invalid];

      for (const settingData of valid) {
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

      this.success(res, {
        imported,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      this.logger.error('importSettings', error);
      this.error(res, 'Failed to import settings');
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

      this.success(res, { message: `Reset ${rowCount} settings to defaults` });
    } catch (error) {
      this.logger.error('resetToDefaults', error);
      this.error(res, 'Failed to reset settings');
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
      this.success(res, { data: history });
    } catch (error) {
      this.logger.error('getSettingsHistory', error);
      this.error(res, 'Failed to fetch settings history');
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

      // Get real system health metrics
      const systemMetrics = await SettingsRepository.getSystemHealth();

      // Determine overall status
      const status = dbHealthy ? 'healthy' : 'unhealthy';

      this.success(res, {
        data: {
          database: { healthy: dbHealthy, last_check: new Date() },
          disk: systemMetrics.disk,
          memory: systemMetrics.memory,
          uptime: systemMetrics.uptime,
          status
        }
      });
    } catch (error) {
      this.logger.error('getSystemHealth', error);
      this.error(res, 'Failed to fetch system health');
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

      this.success(res, { data: backupLog });
    } catch (error) {
      this.logger.error('createBackup', error);
      this.error(res, 'Failed to create backup');
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

      this.success(res, { data: logs });
    } catch (error) {
      this.logger.error('getBackupLogs', error);
      this.error(res, 'Failed to fetch backup logs');
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

      this.success(res, { message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}` });
    } catch (error) {
      this.logger.error('setMaintenanceMode', error);
      this.error(res, 'Failed to set maintenance mode');
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

      this.success(res, {
        data: {
          enabled: maintenanceSettings.enabled,
          message: maintenanceSettings.message
        }
      });
    } catch (error) {
      this.logger.error('getMaintenanceMode', error);
      this.error(res, 'Failed to get maintenance mode status');
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

      this.success(res, { data: schedule });
    } catch (error) {
      this.logger.error('scheduleMaintenance', error);
      this.error(res, 'Failed to schedule maintenance');
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

      this.success(res, { data: schedules });
    } catch (error) {
      this.logger.error('getMaintenanceSchedules', error);
      this.error(res, 'Failed to fetch maintenance schedules');
    }
  }
}

module.exports = new SettingsController();
