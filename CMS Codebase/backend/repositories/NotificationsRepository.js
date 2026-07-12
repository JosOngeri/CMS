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
      query += ` AND church_id = $1`;
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

  async createNotification(data, churchId = null) {
    const { user_id, type_id, title, message, action_url, metadata } = data;

    let query = `
      INSERT INTO notifications (user_id, type_id, title, message, action_url, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const params = [user_id, type_id, title, message, action_url, JSON.stringify(metadata || {})];

    if (churchId) {
      query = `
        INSERT INTO notifications (user_id, type_id, title, message, action_url, metadata, church_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      params.push(churchId);
    }

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

  async createPushNotification(userId, title, message, metadata = {}) {
    const result = await this.pool.query(
      `INSERT INTO notifications (user_id, title, message, metadata, is_push)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [userId, title, message, JSON.stringify(metadata)]
    );
    return result.rows[0];
  }

  async createBulkNotifications(userIds, typeId, title, message) {
    const results = [];
    for (const userId of userIds) {
      const result = await this.pool.query(
        `INSERT INTO notifications (user_id, type_id, title, message)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, typeId, title, message]
      );
      results.push(result.rows[0]);
    }
    return results;
  }

  async getNotificationTemplates() {
    const result = await this.pool.query('SELECT * FROM notification_templates ORDER BY name');
    return result.rows;
  }

  async createTemplate(data) {
    const { name, subject, body, channel, created_by } = data;

    const result = await this.pool.query(
      `INSERT INTO notification_templates (name, subject, body, channel, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, subject, body, channel, created_by]
    );
    return result.rows[0];
  }

  async updateTemplate(templateId, data) {
    const { subject, body } = data;

    const result = await this.pool.query(
      `UPDATE notification_templates
       SET subject = COALESCE($1, subject),
           body = COALESCE($2, body),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [subject, body, templateId]
    );
    return result.rows[0];
  }

  async deleteTemplate(templateId) {
    const result = await this.pool.query(
      'DELETE FROM notification_templates WHERE id = $1 RETURNING *',
      [templateId]
    );
    return result.rows[0];
  }

  async getNotificationLog(filters = {}) {
    const { userId, typeId, startDate, endDate, limit = 100 } = filters;

    let query = `
      SELECT nl.*, u.first_name || ' ' || u.last_name as user_name, nt.name as type_name
      FROM notification_logs nl
      LEFT JOIN users u ON nl.user_id = u.id
      LEFT JOIN notification_types nt ON nl.type_id = nt.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

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
