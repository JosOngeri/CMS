const BaseRepository = require('./BaseRepository');

class SecurityRepository extends BaseRepository {
  constructor() {
    super('security_logs');
  }

  async getSecurityLogs(limit = 50, churchId) {
    const result = await this.pool.query(
      'SELECT * FROM security_logs WHERE church_id = $1 ORDER BY created_at DESC LIMIT $2',
      [churchId, limit]
    );
    return result.rows;
  }

  async getFailedLoginAttempts(churchId) {
    const result = await this.pool.query(
      `SELECT * FROM failed_login_attempts
       WHERE church_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY created_at DESC`,
      [churchId]
    );
    return result.rows;
  }

  async getBlockedIPs(churchId) {
    const result = await this.pool.query(
      'SELECT * FROM blocked_ips WHERE church_id = $1 ORDER BY blocked_at DESC',
      [churchId]
    );
    return result.rows;
  }

  async blockIP(ipAddress, reason, blockedBy, churchId) {
    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipAddress || !ipRegex.test(ipAddress)) {
      throw new Error('Invalid IP address format');
    }

    const result = await this.pool.query(
      'INSERT INTO blocked_ips (ip_address, reason, blocked_by, church_id) VALUES ($1, $2, $3, $4)',
      [ipAddress, reason, blockedBy, churchId]
    );
    return result.rows[0];
  }

  async unblockIP(ipAddress, churchId) {
    const result = await this.pool.query(
      'DELETE FROM blocked_ips WHERE ip_address = $1 AND church_id = $2',
      [ipAddress, churchId]
    );
    return result.rowCount > 0;
  }

  async getActiveSessions(userId, churchId) {
    const result = await this.pool.query(
      'SELECT * FROM user_sessions WHERE user_id = $1 AND church_id = $2 AND expires_at > CURRENT_TIMESTAMP',
      [userId, churchId]
    );
    return result.rows;
  }

  async revokeAllUserSessions(userId, churchId) {
    const result = await this.pool.query(
      'UPDATE user_sessions SET expires_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND church_id = $2',
      [userId, churchId]
    );
    return result.rowCount > 0;
  }

  async getSecuritySettings(churchId) {
    const result = await this.pool.query(
      'SELECT * FROM security_settings WHERE church_id = $1',
      [churchId]
    );
    const row = result.rows[0];
    if (!row) return {};
    // Prefer the flexible JSONB payload; fall back to legacy columns
    return row.settings && Object.keys(row.settings).length
      ? row.settings
      : row;
  }

  async updateSecuritySettings(churchId, data) {
    const sessionTimeout = data.sessionTimeout ?? data.session_timeout;
    const mfaEnabled = data.mfaEnabled ?? data.requireMfaForAdmin ?? data.mfa_enabled;
    const ipWhitelist = data.ipWhitelist ?? data.ip_whitelist;
    const ipBlacklist = data.ipBlacklist ?? data.ip_blacklist;
    const passwordPolicy = data.passwordPolicy ?? data.password_policy;

    const result = await this.pool.query(
      `INSERT INTO security_settings
         (church_id, password_policy, session_timeout, mfa_enabled, ip_whitelist, ip_blacklist, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (church_id) DO UPDATE SET
         password_policy = COALESCE(EXCLUDED.password_policy, security_settings.password_policy),
         session_timeout = COALESCE(EXCLUDED.session_timeout, security_settings.session_timeout),
         mfa_enabled = COALESCE(EXCLUDED.mfa_enabled, security_settings.mfa_enabled),
         ip_whitelist = COALESCE(EXCLUDED.ip_whitelist, security_settings.ip_whitelist),
         ip_blacklist = COALESCE(EXCLUDED.ip_blacklist, security_settings.ip_blacklist),
         settings = EXCLUDED.settings,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        churchId,
        JSON.stringify(passwordPolicy || {}),
        sessionTimeout ?? null,
        mfaEnabled ?? null,
        JSON.stringify(ipWhitelist || []),
        JSON.stringify(ipBlacklist || []),
        JSON.stringify(data)
      ]
    );
    return result.rows[0];
  }

  async getSecurityAnalytics(churchId) {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) as total_events,
         COUNT(CASE WHEN blocked = true THEN 1 END) as blocked_attempts,
         COUNT(CASE WHEN suspicious = true THEN 1 END) as suspicious_activity,
         ROUND(
           (COUNT(CASE WHEN blocked = true THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)),
           2
         ) as compliance_score
       FROM security_logs
       WHERE church_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
      [churchId]
    );
    return result.rows[0];
  }

  async getRecentSecurityEvents(churchId) {
    if (!churchId) throw new Error('getRecentSecurityEvents: churchId is required');
    const result = await this.pool.query(
      `SELECT type, description, severity, created_at
       FROM security_logs
       WHERE church_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [churchId]
    );
    return result.rows;
  }
}

module.exports = new SecurityRepository();
