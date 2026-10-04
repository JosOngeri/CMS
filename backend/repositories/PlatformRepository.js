const BaseRepository = require('./BaseRepository');

/**
 * PlatformRepository — platform-owned tables (platform_settings,
 * platform_users, platform_audit_logs) plus read-only aggregates over
 * churches for the superadmin dashboard. Tenant-row access stays in
 * ChurchRepository; this only aggregates.
 */
class PlatformRepository extends BaseRepository {
  constructor() {
    super('platform_settings');
  }

  async getSettings() {
    const result = await this.pool.query('SELECT key, value FROM platform_settings');
    return result.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  async upsertSettings(entries) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const [key, value] of entries) {
        await client.query(
          `INSERT INTO platform_settings (key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [key, JSON.stringify(value)]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Live platform aggregates — replaces the stale platform_stats snapshot
   * table which nothing refreshes. tierPricing maps tier -> monthly KES and
   * drives the MRR estimate.
   */
  async getLiveStats() {
    const result = await this.pool.query(`
      SELECT
        COUNT(*) AS total_churches,
        COUNT(*) FILTER (WHERE is_active IS NOT FALSE) AS active_churches,
        COUNT(*) FILTER (WHERE is_active IS FALSE) AS suspended_churches,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) AS new_this_month,
        COUNT(*) FILTER (
          WHERE is_active IS FALSE
            AND (settings->>'archived_at')::timestamp >= date_trunc('month', CURRENT_DATE)
        ) AS churned_this_month,
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM members) AS total_members
      FROM churches
    `);

    const tierResult = await this.pool.query(`
      SELECT COALESCE(settings->>'subscription_tier', subscription_tier::text, 'basic') AS tier,
             COUNT(*) FILTER (WHERE is_active IS NOT FALSE) AS active_count
      FROM churches
      GROUP BY 1
    `);

    return { ...result.rows[0], tierBreakdown: tierResult.rows };
  }

  async getAuditLogs({ action, resourceType, actor, ip, from, to, page, limit }) {
    const conditions = [];
    const values = [];

    if (action) {
      values.push(`%${action}%`);
      conditions.push(`pa.action ILIKE $${values.length}`);
    }
    if (resourceType) {
      values.push(resourceType);
      conditions.push(`pa.resource_type = $${values.length}`);
    }
    if (actor) {
      values.push(`%${actor}%`);
      conditions.push(`(pu.email ILIKE $${values.length} OR pu.name ILIKE $${values.length})`);
    }
    if (ip) {
      values.push(ip);
      conditions.push(`pa.ip_address::text = $${values.length}`);
    }
    if (from) {
      values.push(from);
      conditions.push(`pa.created_at >= $${values.length}`);
    }
    if (to) {
      values.push(to);
      conditions.push(`pa.created_at <= $${values.length}`);
    }

    values.push(limit, (page - 1) * limit);
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.pool.query(
      `SELECT pa.id, pa.action, pa.resource_type, pa.resource_id, pa.details,
              pa.ip_address::text, pa.created_at,
              pu.name AS actor_name, pu.email AS actor_email,
              COUNT(*) OVER() AS total_count
       FROM platform_audit_logs pa
       LEFT JOIN platform_users pu ON pa.user_id = pu.id
       ${whereClause}
       ORDER BY pa.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return {
      logs: result.rows.map(({ total_count, ...log }) => log),
      total: Number(result.rows[0]?.total_count || 0)
    };
  }

  async getAuditActions() {
    const result = await this.pool.query(
      'SELECT DISTINCT action FROM platform_audit_logs ORDER BY action'
    );
    return result.rows.map(row => row.action);
  }

  /**
   * Forensic pivot (8.4) — for a time window: every actor/IP combo with
   * counts, plus the action histogram. Lets an operator answer "what did
   * X do from Y between these dates" without paging raw rows.
   */
  async getAuditForensics({ from, to }) {
    const conditions = [];
    const values = [];
    if (from) {
      values.push(from);
      conditions.push(`pa.created_at >= $${values.length}`);
    }
    if (to) {
      values.push(to);
      conditions.push(`pa.created_at <= $${values.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [byActor, byIp, byAction] = await Promise.all([
      this.pool.query(
        `SELECT pa.user_id, COALESCE(pu.email, 'system') AS actor, COUNT(*)::int AS events
         FROM platform_audit_logs pa LEFT JOIN platform_users pu ON pa.user_id = pu.id
         ${where}
         GROUP BY pa.user_id, pu.email ORDER BY events DESC LIMIT 20`,
        values
      ),
      this.pool.query(
        `SELECT pa.ip_address::text AS ip, COUNT(*)::int AS events,
                COUNT(DISTINCT user_id)::int AS actors
         FROM platform_audit_logs pa ${where}
         GROUP BY pa.ip_address ORDER BY events DESC LIMIT 20`,
        values
      ),
      this.pool.query(
        `SELECT pa.action, COUNT(*)::int AS events
         FROM platform_audit_logs pa ${where}
         GROUP BY pa.action ORDER BY events DESC LIMIT 30`,
        values
      ),
    ]);

    return { byActor: byActor.rows, byIp: byIp.rows, byAction: byAction.rows };
  }

  /** All rows matching the filters, no pagination — CSV export only. */
  async getAuditLogsForExport({ action, resourceType, actor, ip, from, to }) {
    const conditions = [];
    const values = [];
    if (action) { values.push(`%${action}%`); conditions.push(`pa.action ILIKE $${values.length}`); }
    if (resourceType) { values.push(resourceType); conditions.push(`pa.resource_type = $${values.length}`); }
    if (actor) { values.push(`%${actor}%`); conditions.push(`(pu.email ILIKE $${values.length} OR pu.name ILIKE $${values.length})`); }
    if (ip) { values.push(ip); conditions.push(`pa.ip_address::text = $${values.length}`); }
    if (from) { values.push(from); conditions.push(`pa.created_at >= $${values.length}`); }
    if (to) { values.push(to); conditions.push(`pa.created_at <= $${values.length}`); }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.pool.query(
      `SELECT pa.id, pa.action, pa.resource_type, pa.resource_id, pa.details,
              pa.ip_address::text, pa.created_at,
              pu.name AS actor_name, pu.email AS actor_email
       FROM platform_audit_logs pa
       LEFT JOIN platform_users pu ON pa.user_id = pu.id
       ${whereClause}
       ORDER BY pa.created_at DESC
       LIMIT 10000`,
      values
    );
    return result.rows;
  }

  async getPlatformUsers() {
    const result = await this.pool.query(
      `SELECT id, email, name, role, is_active, last_login, created_at, mfa_required, mfa_enabled
       FROM platform_users ORDER BY created_at ASC`
    );
    return result.rows;
  }

  async getPlatformUserById(id) {
    const result = await this.pool.query(
      'SELECT id, email, name, role, is_active FROM platform_users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async getPlatformUserByEmail(email) {
    const result = await this.pool.query(
      'SELECT id FROM platform_users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return result.rows[0];
  }

  async createPlatformUser({ email, name, role, passwordHash, permissions }) {
    const result = await this.pool.query(
      `INSERT INTO platform_users (email, name, role, permissions, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, email, name, role, is_active, created_at`,
      [email, name, role, JSON.stringify(permissions), passwordHash]
    );
    return result.rows[0];
  }

  async updatePlatformUser(id, fields) {
    const allowed = ['name', 'role', 'is_active', 'mfa_required'];
    const keys = Object.keys(fields).filter(k => allowed.includes(k) && fields[k] !== undefined);
    if (keys.length === 0) return null;

    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const result = await this.pool.query(
      `UPDATE platform_users SET ${setClause}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${keys.length + 1}
       RETURNING id, email, name, role, is_active, mfa_required, mfa_enabled, updated_at`,
      [...keys.map(k => fields[k]), id]
    );
    return result.rows[0];
  }

  async setPlatformUserPassword(id, passwordHash) {
    const result = await this.pool.query(
      `UPDATE platform_users
       SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING id`,
      [passwordHash, id]
    );
    return result.rows[0];
  }

  async countActiveOwners(excludeId = null) {
    const result = await this.pool.query(
      `SELECT COUNT(*) AS count FROM platform_users
       WHERE role = 'platform_owner' AND is_active = true
         AND ($1::int IS NULL OR id != $1)`,
      [excludeId]
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = new PlatformRepository();
