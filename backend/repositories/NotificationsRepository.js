const BaseRepository = require('./BaseRepository');

class NotificationsRepository extends BaseRepository {
  constructor() {
    super('notifications');
  }

  async getUserNotifications(userId, churchId = null, unreadOnly = false, limit = 50, offset = 0) {
    let query = `
      SELECT n.*, nt.name as type_name, nt.icon as type_icon, nt.color as type_color
      FROM ${this.tableName} n
      LEFT JOIN notification_types nt ON n.type_id = nt.id
      WHERE n.user_id = $1
    `;
    const params = [userId];

    if (churchId) {
      query += ` AND n.church_id = $2`;
      params.push(churchId);
    }

    if (unreadOnly) {
      query += ` AND n.is_read = false`;
    }

    query += ` ORDER BY n.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getUnreadCount(userId, churchId = null) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE user_id = $1 AND is_read = false`;
    const params = [userId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async markAsRead(notificationId, userId) {
    const result = await this.pool.query(
      `UPDATE ${this.tableName} SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *`,
      [notificationId, userId]
    );
    return result.rows[0];
  }

  async markAllAsRead(userId, churchId = null) {
    let query = `UPDATE ${this.tableName} SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false`;
    const params = [userId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rowCount;
  }

  async getNotificationTypes(churchId = null) {
    let query = `SELECT * FROM notification_types WHERE is_active = true`;
    const params = [];

    if (churchId) {
      // global types (church_id NULL) belong to every church
      query += ` AND (church_id = $1 OR church_id IS NULL)`;
      params.push(churchId);
    }

    query += ` ORDER BY name`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getUserPreferences(userId, churchId = null) {
    let query = `SELECT * FROM notification_preferences WHERE user_id = $1`;
    const params = [userId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async updatePreferences(userId, preferences, churchId = null) {
    const { email_enabled, sms_enabled, push_enabled, in_app_enabled } = preferences;

    let query = `
      UPDATE notification_preferences
      SET email_enabled = COALESCE($1, email_enabled),
          sms_enabled = COALESCE($2, sms_enabled),
          push_enabled = COALESCE($3, push_enabled),
          in_app_enabled = COALESCE($4, in_app_enabled),
          updated_at = NOW()
      WHERE user_id = $5
      RETURNING *
    `;
    const params = [email_enabled, sms_enabled, push_enabled, in_app_enabled, userId];

    if (churchId) {
      query = `
        UPDATE notification_preferences
        SET email_enabled = COALESCE($1, email_enabled),
            sms_enabled = COALESCE($2, sms_enabled),
            push_enabled = COALESCE($3, push_enabled),
            in_app_enabled = COALESCE($4, in_app_enabled),
            updated_at = NOW()
        WHERE user_id = $5 AND church_id = $6
        RETURNING *
      `;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Filter a list of user IDs down to members of the given church.
   * Used to validate notification targets — arbitrary userIds from the
   * request body must not be able to reach another tenant (ledger L142).
   * @param {string[]} userIds
   * @param {string} churchId
   * @returns {Promise<string[]>} IDs that belong to the church
   */
  async filterUsersByChurch(userIds, churchId) {
    if (!churchId) throw new Error('filterUsersByChurch: churchId required');
    if (!Array.isArray(userIds) || userIds.length === 0) return [];
    const result = await this.pool.query(
      'SELECT id FROM users WHERE church_id = $1 AND id = ANY($2::uuid[])',
      [churchId, userIds]
    );
    return result.rows.map(r => r.id);
  }

  async createNotification(data, churchId = null) {
    if (!churchId) throw new Error('createNotification: churchId required');
    const { user_id, type_id, title, message, action_url, metadata } = data;

    // Target must be a member of this church — no cross-tenant notifications
    const valid = await this.filterUsersByChurch([user_id], churchId);
    if (valid.length === 0) {
      throw new Error('Target user does not belong to this church');
    }

    const query = `
      INSERT INTO notifications (user_id, type_id, title, message, action_url, metadata, church_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const params = [user_id, type_id, title, message, action_url, JSON.stringify(metadata || {}), churchId];

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async deleteNotification(notificationId, userId) {
    const result = await this.pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
    return result.rowCount > 0;
  }

  async createPushNotification(userId, title, message, metadata = {}, churchId = null) {
    if (!churchId) throw new Error('createPushNotification: churchId required');
    const valid = await this.filterUsersByChurch([userId], churchId);
    if (valid.length === 0) {
      throw new Error('Target user does not belong to this church');
    }
    const result = await this.pool.query(
      `INSERT INTO notifications (user_id, title, message, metadata, is_push, church_id)
       VALUES ($1, $2, $3, $4, true, $5)
       RETURNING *`,
      [userId, title, message, JSON.stringify(metadata), churchId]
    );
    return result.rows[0];
  }

  async createBulkNotifications(userIds, typeId, title, message, churchId = null) {
    if (!churchId) throw new Error('createBulkNotifications: churchId required');
    if (!Array.isArray(userIds) || userIds.length === 0) return [];
    // Only notify members of this church — foreign IDs are dropped, not sent
    const validIds = await this.filterUsersByChurch(userIds, churchId);
    if (validIds.length === 0) return [];
    // Single round-trip: unnest expands the id array into one multi-row INSERT
    const result = await this.pool.query(
      `INSERT INTO notifications (user_id, type_id, title, message, church_id)
       SELECT uid, $2, $3, $4, $5
       FROM unnest($1::uuid[]) AS uid
       RETURNING *`,
      [validIds, typeId, title, message, churchId]
    );
    return result.rows;
  }

  async getNotificationTemplates(churchId) {
    // Global templates (church_id NULL) plus this church's own
    const result = await this.pool.query(
      'SELECT * FROM notification_templates WHERE church_id = $1 OR church_id IS NULL ORDER BY name',
      [churchId]
    );
    return result.rows;
  }

  async createTemplate(data) {
    const { name, subject, body, channel, created_by, church_id } = data;

    const result = await this.pool.query(
      `INSERT INTO notification_templates (name, subject, body, channel, created_by, church_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, subject, body, channel, created_by, church_id]
    );
    return result.rows[0];
  }

  async updateTemplate(templateId, data, churchId) {
    if (!churchId) throw new Error('updateTemplate: churchId required');
    const { subject, body } = data;

    const result = await this.pool.query(
      `UPDATE notification_templates
       SET subject = COALESCE($1, subject),
           body = COALESCE($2, body),
           updated_at = NOW()
       WHERE id = $3 AND church_id = $4
       RETURNING *`,
      [subject, body, templateId, churchId]
    );
    return result.rows[0];
  }

  async deleteTemplate(templateId, churchId) {
    if (!churchId) throw new Error('deleteTemplate: churchId required');
    const result = await this.pool.query(
      'DELETE FROM notification_templates WHERE id = $1 AND church_id = $2 RETURNING *',
      [templateId, churchId]
    );
    return result.rows[0];
  }

  async getNotificationLog(filters = {}) {
    const { userId, typeId, startDate, endDate, limit = 100, churchId } = filters;

    let query = `
      SELECT nl.*, u.first_name || ' ' || u.last_name as user_name, nt.name as type_name
      FROM notification_logs nl
      LEFT JOIN users u ON nl.user_id = u.id
      LEFT JOIN notification_types nt ON nl.type_id = nt.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Tenant scope — logs only for users of this church (via the join;
    // notification_logs itself may not carry church_id)
    if (churchId) {
      query += ` AND u.church_id = $${paramCount++}`;
      params.push(churchId);
    }

    if (userId) {
      query += ` AND nl.user_id = $${paramCount++}`;
      params.push(userId);
    }

    if (typeId) {
      query += ` AND nl.type_id = $${paramCount++}`;
      params.push(typeId);
    }

    if (startDate) {
      query += ` AND nl.created_at >= $${paramCount++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND nl.created_at <= $${paramCount++}`;
      params.push(endDate);
    }

    query += ` ORDER BY nl.created_at DESC LIMIT $${paramCount++}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }
}

module.exports = new NotificationsRepository();
