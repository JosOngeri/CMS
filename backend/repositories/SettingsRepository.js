const BaseRepository = require('./BaseRepository');

class SettingsRepository extends BaseRepository {
  constructor() {
    super('settings');
  }

  // Reads merge global defaults (church_id IS NULL) with the caller's own
  // church overrides; the church-scoped row wins when both exist.
  // Writes with a churchId never touch global rows or other churches' rows —
  // they update the caller's override, or clone the global row into a new
  // override when only a global default exists.
  async getAll(churchId = null) {
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];

    if (churchId) {
      query += ` WHERE church_id = $1 OR church_id IS NULL
                 ORDER BY church_id NULLS LAST, category, key`;
      params.push(churchId);
    } else {
      query += ` ORDER BY category, key`;
    }

    const result = await this.pool.query(query, params);

    // Dedupe by key — the church-specific row sorts before its global twin.
    const seen = new Set();
    const rows = result.rows.filter(r => {
      if (seen.has(r.key)) return false;
      seen.add(r.key);
      return true;
    });

    // Group by category
    return rows.reduce((acc, setting) => {
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
      query += ` AND (church_id = $2 OR church_id IS NULL)
                 ORDER BY church_id NULLS LAST LIMIT 1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    const setting = result.rows[0];
    if (setting) {
      setting.value = this.parseValue(setting.value, setting.value_type);
    }
    return setting;
  }

  // Fetches only the caller's own church-scoped row (never the global row).
  async _getOwnRow(key, churchId) {
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE key = $1 AND church_id = $2`,
      [key, churchId]
    );
    return result.rows[0];
  }

  async _getGlobalRow(key) {
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE key = $1 AND church_id IS NULL`,
      [key]
    );
    return result.rows[0];
  }

  // Clones a global row into a per-church override with `overrides` applied.
  async _cloneToChurchRow(globalRow, churchId, overrides = {}) {
    const merged = { ...globalRow, ...overrides };
    const result = await this.pool.query(
      `INSERT INTO ${this.tableName}
         (key, value, value_type, category, label, description, is_public,
          is_editable, validation_rules, default_value, church_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [merged.key, merged.value, merged.value_type, merged.category,
       merged.label, merged.description, merged.is_public, merged.is_editable,
       merged.validation_rules, merged.default_value, churchId]
    );
    return result.rows[0];
  }

  async upsert(key, value, churchId = null) {
    if (churchId) {
      const own = await this._getOwnRow(key, churchId);
      if (own) {
        const result = await this.pool.query(
          `UPDATE ${this.tableName} SET value = $1, updated_at = CURRENT_TIMESTAMP
           WHERE key = $2 AND church_id = $3 RETURNING *`,
          [value, key, churchId]
        );
        return result.rows[0];
      }
      const global = await this._getGlobalRow(key);
      if (global) return this._cloneToChurchRow(global, churchId, { value });
      const result = await this.pool.query(
        `INSERT INTO ${this.tableName} (key, value, value_type, category, label, is_public, is_editable, church_id)
         VALUES ($1, $2, 'string', 'system', $1, false, true, $3)
         RETURNING *`,
        [key, value, churchId]
      );
      return result.rows[0];
    }

    const result = await this.pool.query(
      `UPDATE ${this.tableName} SET value = $1, updated_at = CURRENT_TIMESTAMP
       WHERE key = $2 AND church_id IS NULL RETURNING *`,
      [value, key]
    );
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

  async getPublicSettings(churchId = null, churchSlug = null) {
    // Resolve a slug to its church so that church's public overrides apply.
    if (!churchId && churchSlug) {
      const resolved = await this.pool.query(
        `SELECT id FROM churches WHERE slug = $1`, [churchSlug]
      );
      churchId = resolved.rows[0]?.id || null;
    }

    let query = `SELECT key, value, value_type FROM ${this.tableName} WHERE is_public = true`;
    const params = [];

    if (churchId) {
      query += ` AND (church_id = $1 OR church_id IS NULL)
                 ORDER BY church_id NULLS LAST, key`;
      params.push(churchId);
    } else {
      // Unauthenticated/no church context: only global public rows.
      query += ` AND church_id IS NULL ORDER BY key`;
    }

    const result = await this.pool.query(query, params);

    // Church-specific row sorts before its global twin — first wins.
    const settings = {};
    result.rows.forEach(row => {
      if (!(row.key in settings)) {
        settings[row.key] = this.parseValue(row.value, row.value_type);
      }
    });

    // Resolve church branding when a church is explicitly identified
    // (authenticated user's church_id or a ?church=<slug> query param).
    // Otherwise expose the list of active churches so the client can prompt
    // the visitor to choose one.
    if (churchId || churchSlug) {
      try {
        let churchRes;
        if (churchId) {
          churchRes = await this.pool.query(
            `SELECT id, name, slug FROM churches WHERE id = $1`,
            [churchId]
          );
        } else {
          churchRes = await this.pool.query(
            `SELECT id, name, slug FROM churches WHERE slug = $1`,
            [churchSlug]
          );
        }
        if (churchRes.rows[0]) {
          const church = churchRes.rows[0];
          settings.church_name = church.name;
          settings.church_slug = church.slug;
          settings.church_id = church.id;
        }
      } catch (e) {
        // Keep product fallback below.
      }
    }

    // Always expose the list of active churches so the public UI can let the
    // visitor pick a congregation. The selected church is driven by
    // churchId/churchSlug above; otherwise `church_name` stays unset.
    try {
      const churchRes = await this.pool.query(
        `SELECT id, name, slug FROM churches
         WHERE is_active = true
         ORDER BY created_at ASC`
      );
      settings.available_churches = churchRes.rows;
    } catch (e) {
      settings.available_churches = [];
    }

    // Neutral product name
    settings.product_name = 'Msabato CMS';
    settings.product_short_name = 'Msabato';

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
      query += ` AND (church_id = $2 OR church_id IS NULL)
                 ORDER BY church_id NULLS LAST LIMIT 1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updateSetting(key, data, churchId = null) {
    const { value, label, description, is_public, is_editable, validation_rules } = data;
    const setClause = `SET value = COALESCE($1, value),
           label = COALESCE($2, label),
           description = COALESCE($3, description),
           is_public = COALESCE($4, is_public),
           is_editable = COALESCE($5, is_editable),
           validation_rules = COALESCE($6, validation_rules),
           updated_at = CURRENT_TIMESTAMP`;

    if (churchId) {
      const own = await this._getOwnRow(key, churchId);
      if (own) {
        const result = await this.pool.query(
          `UPDATE settings ${setClause} WHERE key = $7 AND church_id = $8 RETURNING *`,
          [value, label, description, is_public, is_editable, validation_rules, key, churchId]
        );
        return result.rows[0];
      }
      // Only a global default exists — clone it into a church override.
      const global = await this._getGlobalRow(key);
      if (!global) return null;
      const overrides = {};
      for (const [k, v] of Object.entries({ value, label, description, is_public, is_editable, validation_rules })) {
        if (v !== undefined && v !== null) overrides[k] = v;
      }
      return this._cloneToChurchRow(global, churchId, overrides);
    }

    const result = await this.pool.query(
      `UPDATE settings ${setClause} WHERE key = $7 AND church_id IS NULL RETURNING *`,
      [value, label, description, is_public, is_editable, validation_rules, key]
    );
    return result.rows[0];
  }

  async updateSettingValue(key, value, churchId = null) {
    if (churchId) {
      const own = await this._getOwnRow(key, churchId);
      if (own) {
        const result = await this.pool.query(
          'UPDATE settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2 AND church_id = $3 RETURNING *',
          [value, key, churchId]
        );
        return result.rows[0];
      }
      const global = await this._getGlobalRow(key);
      if (!global) return null;
      return this._cloneToChurchRow(global, churchId, { value });
    }

    const result = await this.pool.query(
      'UPDATE settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2 AND church_id IS NULL RETURNING *',
      [value, key]
    );
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
    } else {
      query += ' AND church_id IS NULL';
    }

    const result = await this.pool.query(query, params);
    return result.rowCount;
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
      // Export merges global defaults with the church's own overrides.
      query += ` AND (church_id = $${paramIndex} OR church_id IS NULL)
                 ORDER BY church_id NULLS LAST, key`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    const seen = new Set();
    return result.rows.filter(r => {
      if (seen.has(r.key)) return false;
      seen.add(r.key);
      return true;
    });
  }

  async importSetting(data, churchId = null) {
    const { key, value, value_type, category, label, description, is_public, is_editable, validation_rules } = data;

    if (churchId) {
      const own = await this._getOwnRow(key, churchId);
      if (own) {
        const result = await this.pool.query(
          `UPDATE settings SET
             value = $1,
             label = COALESCE($2, label),
             description = COALESCE($3, description),
             is_public = COALESCE($4, is_public),
             is_editable = COALESCE($5, is_editable),
             validation_rules = COALESCE($6, validation_rules),
             updated_at = CURRENT_TIMESTAMP
           WHERE key = $7 AND church_id = $8
           RETURNING *`,
          [value, label, description, is_public, is_editable, validation_rules, key, churchId]
        );
        return result.rows[0];
      }
      // Import always creates the caller's own church-scoped row.
      const result = await this.pool.query(
        `INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules, church_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [key, value, value_type, category, label, description, is_public, is_editable, validation_rules, churchId]
      );
      return result.rows[0];
    }

    const global = await this._getGlobalRow(key);
    if (global) {
      const result = await this.pool.query(
        `UPDATE settings SET
           value = $1,
           label = COALESCE($2, label),
           description = COALESCE($3, description),
           is_public = COALESCE($4, is_public),
           is_editable = COALESCE($5, is_editable),
           validation_rules = COALESCE($6, validation_rules),
           updated_at = CURRENT_TIMESTAMP
         WHERE key = $7 AND church_id IS NULL
         RETURNING *`,
        [value, label, description, is_public, is_editable, validation_rules, key]
      );
      return result.rows[0];
    }
    const result = await this.pool.query(
      `INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules, church_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL)
       RETURNING *`,
      [key, value, value_type, category, label, description, is_public, is_editable, validation_rules]
    );
    return result.rows[0];
  }

  async resetToDefaults(category, churchId = null) {
    // For a church, "reset" removes its override rows so keys fall back to
    // the global defaults. Without a churchId it resets the global rows.
    if (churchId) {
      let query = 'DELETE FROM settings WHERE church_id = $1';
      const params = [churchId];
      if (category) {
        query += ' AND category = $2';
        params.push(category);
      }
      const result = await this.pool.query(query, params);
      return result.rowCount;
    }

    let query = 'UPDATE settings SET value = default_value, updated_at = CURRENT_TIMESTAMP WHERE default_value IS NOT NULL AND church_id IS NULL';
    const params = [];
    if (category) {
      query += ' AND category = $1';
      params.push(category);
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
      params.push(key);
      query += ` AND setting_key = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY changed_at DESC LIMIT $${params.length}`;

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
      `INSERT INTO settings (key, value, value_type, category, label)
       VALUES ($1, $2, 'boolean', 'system', $1)
       ON CONFLICT (key) WHERE church_id IS NULL
       DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );
  }

  async setMaintenanceMessage(message, userId) {
    await this.pool.query(
      `INSERT INTO settings (key, value, value_type, category, label)
       VALUES ('maintenance_message', $1, 'string', 'system', 'maintenance_message')
       ON CONFLICT (key) WHERE church_id IS NULL
       DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP`,
      [message]
    );
  }

  async getMaintenanceModeSettings() {
    const modeResult = await this.pool.query("SELECT value FROM settings WHERE key = 'maintenance_mode' AND church_id IS NULL");
    const messageResult = await this.pool.query("SELECT value FROM settings WHERE key = 'maintenance_message' AND church_id IS NULL");

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
