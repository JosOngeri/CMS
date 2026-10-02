/**
 * @audit User settings/preferences repository (per-user scope — intentionally not church-scoped).
 * @known ISSUE: createUserPreferencesWithFields builds the INSERT column list from SET-clause
 *        strings ("field = $n") AND its placeholders collide with $1=user_id -> always fails;
 *        changePassword uses bcrypt cost 10 while helpers/security.js uses bcryptjs 12.
 */
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
    return this.getActivityFeed(userId, limit, 0);
  }

  // There is no physical activity_feed/user_activity_history table — the feed is
  // derived from real user-scoped rows across the schema.
  async getActivityFeed(userId, limit = 20, offset = 0) {
    const result = await this.pool.query(
      `SELECT * FROM (
         SELECT CASE
                  WHEN al.action ILIKE '%login%' THEN 'login'
                  WHEN al.action ILIKE '%password%' THEN 'password_change'
                  WHEN al.action ILIKE '%profile%' OR al.table_name = 'users' THEN 'profile_update'
                  ELSE 'activity'
                END AS type,
                al.action AS description,
                al.created_at
         FROM audit_log al
         WHERE al.user_id = $1
         UNION ALL
         SELECT 'payment',
                CONCAT('Payment of KES ', COALESCE(p.amount::text, '0'), ' — ', COALESCE(p.status, 'recorded')),
                p.created_at
         FROM payments p
         WHERE COALESCE(p.user_id, p.member_id) = $1
         UNION ALL
         SELECT 'event_rsvp',
                CONCAT('RSVP ''', COALESCE(ea.rsvp_status, 'registered'), ''' for ', e.title),
                ea.registered_at
         FROM event_attendance ea
         JOIN events e ON e.id = ea.event_id
         WHERE ea.member_id = $1
         UNION ALL
         SELECT 'department',
                CONCAT('Joined ', d.name),
                dm.joined_at
         FROM department_members dm
         JOIN departments d ON d.id = dm.department_id
         WHERE dm.user_id = $1
         UNION ALL
         SELECT 'favorite',
                'Favourited a gallery photo',
                gf.created_at
         FROM gallery_favorites gf
         WHERE gf.user_id = $1
         UNION ALL
         SELECT 'approval',
                CONCAT('Submitted approval request: ', ar.title),
                ar.created_at
         FROM approval_requests ar
         WHERE ar.requester_id = $1
       ) feed
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  async getActivityFeedCount(userId) {
    const result = await this.pool.query(
      `SELECT (
         (SELECT COUNT(*) FROM audit_log WHERE user_id = $1) +
         (SELECT COUNT(*) FROM payments WHERE COALESCE(user_id, member_id) = $1) +
         (SELECT COUNT(*) FROM event_attendance WHERE member_id = $1) +
         (SELECT COUNT(*) FROM department_members WHERE user_id = $1) +
         (SELECT COUNT(*) FROM gallery_favorites WHERE user_id = $1) +
         (SELECT COUNT(*) FROM approval_requests WHERE requester_id = $1)
       ) AS total`,
      [userId]
    );
    return parseInt(result.rows[0].total);
  }
}

module.exports = new UserSettingsRepository();
