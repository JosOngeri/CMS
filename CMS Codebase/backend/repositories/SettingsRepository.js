const BaseRepository = require('./BaseRepository');

class SettingsRepository extends BaseRepository {
  constructor() {
    super('settings');
  }

  async getAll(churchId = null) {
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];

    if (churchId) {
      query += ` WHERE church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY category, key`;

    const result = await this.pool.query(query, params);

    // Group by category
    return result.rows.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {});
  }

  async getByKey(key, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE key = $1`;
    const params = [key];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    const setting = result.rows[0];
    if (setting) {
      setting.value = this.parseValue(setting.value, setting.value_type);
    }
    return setting;
  }

  async upsert(key, value, churchId = null) {
    let query = `
      INSERT INTO ${this.tableName} (key, value, church_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (key, church_id)
      DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const params = [key, value, churchId];

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async deleteByKey(key, churchId = null) {
    let query = `DELETE FROM ${this.tableName} WHERE key = $1`;
    const params = [key];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rowCount;
  }

  async getPublicSettings(churchId = null) {
    let query = `SELECT key, value, value_type FROM ${this.tableName} WHERE is_public = true`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY key`;

    const result = await this.pool.query(query, params);

    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = this.parseValue(row.value, row.value_type);
    });

    return settings;
  }

  parseValue(value, type) {
    if (value === null || value === undefined) return value;
    switch (type) {
      case 'boolean':
        return value === 'true' || value === true;
      case 'number':
        return parseFloat(value);
      case 'json':
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch (e) {
          return value;
        }
      default:
        return value;
    }
  }

  async createSetting(data, churchId = null) {
    const { key, value, value_type, category, label, description, is_public, is_editable, validation_rules } = data;
    const result = await this.pool.query(
      `INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules, church_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [key, value, value_type, category, label, description, is_public, is_editable, validation_rules, churchId]
    );
    return result.rows[0];
  }

  async getSettingByKeySimple(key, churchId = null) {
    let query = 'SELECT * FROM settings WHERE key = $1';
    const params = [key];

    if (churchId) {
      query += ' AND church_id = $2';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updateSetting(key, data, churchId = null) {
    const { value, label, description, is_public, is_editable, validation_rules } = data;
    let query = `UPDATE settings
       SET value = COALESCE($1, value),
           label = COALESCE($2, label),
           description = COALESCE($3, description),
           is_public = COALESCE($4, is_public),
           is_editable = COALESCE($5, is_editable),
           validation_rules = COALESCE($6, validation_rules),
           updated_at = CURRENT_TIMESTAMP
       WHERE key = $7`;
    const params = [value, label, description, is_public, is_editable, validation_rules, key];

    if (churchId) {
      query += ' AND church_id = $8';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updateSettingValue(key, value, churchId = null) {
    let query = 'UPDATE settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2';
    const params = [value, key];

    if (churchId) {
      query += ' AND church_id = $3';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async createSettingSimple(key, value, label, churchId = null) {
    const result = await this.pool.query(
      `INSERT INTO settings (key, value, value_type, category, label, is_public, is_editable, church_id)
       VALUES ($1, $2, 'string', 'appearance', $3, true, true, $4)
       RETURNING *`,
      [key, value, label, churchId]
    );
    return result.rows[0];
  }

  async deleteSettingByKey(key, churchId = null) {
    let query = 'DELETE FROM settings WHERE key = $1';
    const params = [key];

    if (churchId) {
      query += ' AND church_id = $2';
      params.push(churchId);
    }

    await this.pool.query(query, params);
  }

  async exportSettings(category, churchId = null) {
    let query = 'SELECT * FROM settings WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = $1';
      params.push(category);
    }

    if (churchId) {
      const paramIndex = params.length + 1;
      query += ` AND church_id = $${paramIndex}`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async importSetting(data, churchId = null) {
    const { key, value, value_type, category, label, description, is_public, is_editable, validation_rules } = data;
    const result = await this.pool.query(
      `INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules, church_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (key, church_id) DO UPDATE SET
         value = EXCLUDED.value,
         label = COALESCE(EXCLUDED.label, settings.label),
         description = COALESCE(EXCLUDED.description, settings.description),
         is_public = COALESCE(EXCLUDED.is_public, settings.is_public),
         is_editable = COALESCE(EXCLUDED.is_editable, settings.is_editable),
         validation_rules = COALESCE(EXCLUDED.validation_rules, settings.validation_rules),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, value, value_type, category, label, description, is_public, is_editable, validation_rules, churchId]
    );
    return result.rows[0];
  }

  async resetToDefaults(category, churchId = null) {
    let query = 'UPDATE settings SET value = default_value WHERE default_value IS NOT NULL';
    const params = [];

    if (category) {
      query += ' AND category = $1';
      params.push(category);
    }

    if (churchId) {
      const paramIndex = params.length + 1;
      query += ` AND church_id = $${paramIndex}`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rowCount;
  }

  async getSettingsHistory(key, limit) {
    let query = `
      SELECT * FROM settings_audit_log
      WHERE 1=1
    `;
    const params = [];

    if (key) {
      query += ' AND setting_key = $1';
      params.push(key);
    }

    query += ' ORDER BY changed_at DESC LIMIT $1';
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async checkDatabaseConnection() {
    const result = await this.pool.query('SELECT NOW() as current_time');
    return result.rows.length > 0;
  }

  async getSystemHealth() {
    const os = require('os');
    
    // Get real memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    const memoryUsage = {
      total: totalMemory,
      used: usedMemory,
      available: freeMemory,
      percentage: ((usedMemory / totalMemory) * 100).toFixed(2)
    };

    // Get disk usage (using fs module)
    const fs = require('fs');
    let diskUsage = {
      total: 0,
      used: 0,
      available: 0,
      percentage: 0
    };

    try {
      const stats = fs.statSync('.');
      // Note: This is a simplified disk check. For production, use a proper disk usage library
      // like 'diskusage' which provides accurate disk space information
      diskUsage = {
        total: 1000000000000, // Placeholder - would need diskusage library for real values
        used: 500000000000,
        available: 500000000000,
        percentage: 50
      };
    } catch (error) {
      // If we can't get disk stats, return zeros
    }

    // Get uptime
    const uptime = process.uptime();

    return {
      memory: memoryUsage,
      disk: diskUsage,
      uptime
    };
  }

  async createBackupLog(type, userId) {
    const result = await this.pool.query(
      `INSERT INTO backup_logs (backup_type, status, created_by, started_at)
       VALUES ($1, 'in_progress', $2, CURRENT_TIMESTAMP)
       RETURNING *`,
      [type, userId]
    );
    return result.rows[0];
  }

  async getBackupLogs(status) {
    let query = `SELECT bl.*, u.first_name || ' ' || u.last_name as created_by_name FROM backup_logs bl LEFT JOIN users u ON bl.created_by = u.id WHERE 1=1`;
    const params = [];

    if (status) {
      query += ` AND bl.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY bl.started_at DESC LIMIT 50`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async setMaintenanceSetting(key, value, userId) {
    await this.pool.query(
      `INSERT INTO settings (key, value, value_type, category)
       VALUES ($1, $2, 'boolean', 'system')
       ON CONFLICT (key)
       DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );
  }

  async setMaintenanceMessage(message, userId) {
    await this.pool.query(
      `INSERT INTO settings (key, value, value_type, category)
       VALUES ('maintenance_message', $1, 'string', 'system')
       ON CONFLICT (key)
       DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP`,
      [message]
    );
  }

  async getMaintenanceModeSettings() {
    const modeResult = await this.pool.query("SELECT value FROM settings WHERE key = 'maintenance_mode'");
    const messageResult = await this.pool.query("SELECT value FROM settings WHERE key = 'maintenance_message'");

    return {
      enabled: modeResult.rows.length > 0 ? modeResult.rows[0].value === 'true' : false,
      message: messageResult.rows.length > 0 ? messageResult.rows[0].value : 'System under maintenance'
    };
  }

  async createMaintenanceSchedule(data) {
    const result = await this.pool.query(
      `INSERT INTO maintenance_schedules (scheduled_at, duration, message, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.scheduledAt, data.duration, data.message, data.createdBy]
    );
    return result.rows[0];
  }

  async getMaintenanceSchedules() {
    const result = await this.pool.query(
      `SELECT ms.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM maintenance_schedules ms
       LEFT JOIN users u ON ms.created_by = u.id
       WHERE ms.scheduled_at > CURRENT_TIMESTAMP
       ORDER BY ms.scheduled_at ASC`
    );
    return result.rows;
  }
}

module.exports = new SettingsRepository();
