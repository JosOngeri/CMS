const BaseRepository = require('./BaseRepository');
const bcrypt = require('bcryptjs');

class UserSettingsRepository extends BaseRepository {
  constructor() {
    super('user_preferences');
  }

  async getUserPreferences(userId) {
    const result = await this.pool.query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  }

  async createUserPreferences(userId) {
    const result = await this.pool.query(
      `INSERT INTO user_preferences (user_id)
       VALUES ($1)
       RETURNING *`,
      [userId]
    );
    return result.rows[0];
  }

  async updateUserPreferences(userId, updates, values) {
    const query = `
      UPDATE user_preferences
      SET ${updates.join(', ')}
      WHERE user_id = $${values.length + 1}
      RETURNING *
    `;
    const result = await this.pool.query(query, [...values, userId]);
    return result.rows[0];
  }

  async updatePreferencesDynamic(userId, preferenceData) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'email_notifications', 'sms_notifications', 'announcement_notifications',
      'event_notifications', 'department_notifications', 'payment_notifications',
      'reminder_notifications', 'profile_visibility', 'show_email', 'show_phone',
      'show_departments', 'allow_messages', 'show_activity', 'theme', 'language', 'timezone'
    ];

    for (const field of allowedFields) {
      if (preferenceData[field] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(preferenceData[field]);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return null;
    }

    values.push(userId);

    const query = `
      UPDATE user_preferences
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async createUserPreferencesWithFields(userId, updates, values) {
    const query = `
      INSERT INTO user_preferences (user_id, ${updates.join(', ')})
      VALUES ($1, ${updates.map((_, i) => `$${i + 2}`).join(', ')})
      RETURNING *
    `;
    const result = await this.pool.query(query, [userId, ...values]);
    return result.rows[0];
  }

  async getUserPasswordHash(userId) {
    const result = await this.pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  }

  async updateUserPassword(userId, passwordHash) {
    await this.pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId]
    );
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.getUserPasswordHash(userId);

    if (!user) {
      return { error: 'User not found', statusCode: 404 };
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return { error: 'Current password is incorrect', statusCode: 401 };
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await this.updateUserPassword(userId, newPasswordHash);

    return { success: true };
  }

  async getUserActivityHistory(userId, limit = 50) {
    const result = await this.pool.query(
      `SELECT * FROM user_activity_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  async getActivityFeed(userId, limit = 20, offset = 0) {
    const result = await this.pool.query(
      `SELECT * FROM activity_feed
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  async getActivityFeedCount(userId) {
    const result = await this.pool.query(
      'SELECT COUNT(*) FROM activity_feed WHERE user_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = new UserSettingsRepository();
