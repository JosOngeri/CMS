/**
 * @audit User settings/preferences repository (per-user scope — intentionally not church-scoped).
 * @fixed createUserPreferencesWithFields' broken INSERT replaced by
 *        upsertUserPreferences (INSERT ... ON CONFLICT DO UPDATE); changePassword
 *        now uses bcryptjs cost 12, matching helpers/security.js.
 */
const BaseRepository = require('./BaseRepository');
const bcrypt = require('bcryptjs');
const { logAction } = require('../helpers/auditLog');

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
      SET ${updates.join(', ')}, updated_at = NOW()
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
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Upsert user preferences in one statement — the previous update-then-insert
   * path was double-broken (SET-clause strings used as column names + colliding
   * placeholders) and raced under concurrent requests (ledger L147/L571).
   * @param {string} userId
   * @param {Object} preferenceData - field → value; non-allowlisted keys dropped
   * @param {string} [churchId] - tenant id recorded on the audit_log row
   * @returns {Promise<Object| null>} upserted row or null when nothing to set
   */
  async upsertUserPreferences(userId, preferenceData, churchId = null) {
    const allowedFields = [
      'email_notifications', 'sms_notifications', 'announcement_notifications',
      'event_notifications', 'department_notifications', 'payment_notifications',
      'reminder_notifications', 'profile_visibility', 'show_email', 'show_phone',
      'show_departments', 'allow_messages', 'show_activity', 'theme', 'language', 'timezone'
    ];

    const fields = [];
    const values = [];
    for (const field of allowedFields) {
      if (preferenceData[field] !== undefined) {
        fields.push(field);
        values.push(preferenceData[field]);
      }
    }

    if (fields.length === 0) return null;

    const cols = fields.join(', ');
    const valuePlaceholders = fields.map((_, i) => `$${i + 2}`).join(', ');
    const updateSet = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');

    const result = await this.pool.query(
      `INSERT INTO user_preferences (user_id, ${cols})
       VALUES ($1, ${valuePlaceholders})
       ON CONFLICT (user_id)
       DO UPDATE SET ${updateSet}, updated_at = NOW()
       RETURNING *`,
      [userId, ...values]
    );

    // Audit trail: every preference mutation is recorded in audit_log.
    // logAction swallows its own errors so auditing can never break the write.
    const changed = {};
    fields.forEach((field, i) => { changed[field] = values[i]; });
    await logAction(this.pool, {
      actorId: userId,
      action: 'update_preferences',
      tableName: 'user_preferences',
      recordId: userId,
      churchId,
      after: changed
    });

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

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await this.updateUserPassword(userId, newPasswordHash);

    return { success: true };
  }

  async getUserActivityHistory(userId, limit = 50, churchId = null) {
    return this.getActivityFeed(userId, limit, 0, churchId);
  }

  // There is no physical activity_feed/user_activity_history table — the feed is
  // derived from real user-scoped rows across the schema. When churchId is
  // provided every source is also tenant-filtered (defence in depth on top of
  // the user_id scope — a user can never straddle tenants, but this keeps the
  // query correct if membership data ever does).
  async getActivityFeed(userId, limit = 20, offset = 0, churchId = null) {
    const params = [userId, limit, offset];
    const scope = (column) => {
      if (!churchId) return '';
      params.push(churchId);
      return ` AND ${column} = $${params.length}`;
    };

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
         WHERE al.user_id = $1${scope('al.church_id')}
         UNION ALL
         SELECT 'payment',
                CONCAT('Payment of KES ', COALESCE(p.amount::text, '0'), ' — ', COALESCE(p.status, 'recorded')),
                p.created_at
         FROM payments p
         WHERE COALESCE(p.user_id, p.member_id) = $1${scope('p.church_id')}
         UNION ALL
         SELECT 'event_rsvp',
                CONCAT('RSVP ''', COALESCE(ea.rsvp_status, 'registered'), ''' for ', e.title),
                ea.registered_at
         FROM event_attendance ea
         JOIN events e ON e.id = ea.event_id
         WHERE ea.member_id = $1${scope('ea.church_id')}
         UNION ALL
         SELECT 'department',
                CONCAT('Joined ', d.name),
                dm.joined_at
         FROM department_members dm
         JOIN departments d ON d.id = dm.department_id
         WHERE dm.user_id = $1${scope('dm.church_id')}
         UNION ALL
         SELECT 'favorite',
                'Favourited a gallery photo',
                gf.created_at
         FROM gallery_favorites gf
         JOIN gallery_photos gp ON gp.id = gf.photo_id
         WHERE gf.user_id = $1${scope('gp.church_id')}
         UNION ALL
         SELECT 'approval',
                CONCAT('Submitted approval request: ', ar.title),
                ar.created_at
         FROM approval_requests ar
         WHERE ar.requester_id = $1${scope('ar.church_id')}
       ) feed
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      params
    );
    return result.rows;
  }

  async getActivityFeedCount(userId, churchId = null) {
    const params = [userId];
    const scope = (column) => {
      if (!churchId) return '';
      params.push(churchId);
      return ` AND ${column} = $${params.length}`;
    };

    const result = await this.pool.query(
      `SELECT (
         (SELECT COUNT(*) FROM audit_log WHERE user_id = $1${scope('audit_log.church_id')}) +
         (SELECT COUNT(*) FROM payments WHERE COALESCE(user_id, member_id) = $1${scope('payments.church_id')}) +
         (SELECT COUNT(*) FROM event_attendance WHERE member_id = $1${scope('event_attendance.church_id')}) +
         (SELECT COUNT(*) FROM department_members WHERE user_id = $1${scope('department_members.church_id')}) +
         (SELECT COUNT(*) FROM gallery_favorites gf JOIN gallery_photos gp ON gp.id = gf.photo_id WHERE gf.user_id = $1${scope('gp.church_id')}) +
         (SELECT COUNT(*) FROM approval_requests WHERE requester_id = $1${scope('approval_requests.church_id')})
       ) AS total`,
      params
    );
    return parseInt(result.rows[0].total);
  }
}

module.exports = new UserSettingsRepository();
