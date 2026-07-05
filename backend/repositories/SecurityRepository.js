const BaseRepository = require('./BaseRepository');

class SecurityRepository extends BaseRepository {
  constructor() {
    super('security_logs');
  }

  async getSecurityLogs(limit = 50) {
    const result = await this.pool.query(
      'SELECT * FROM security_logs ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }

  async getFailedLoginAttempts() {
    const result = await this.pool.query(
      `SELECT * FROM failed_login_attempts
       WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  async getBlockedIPs() {
    const result = await this.pool.query('SELECT * FROM blocked_ips ORDER BY blocked_at DESC');
    return result.rows;
  }

  async blockIP(ipAddress, reason, blockedBy) {
    const result = await this.pool.query(
      'INSERT INTO blocked_ips (ip_address, reason, blocked_by) VALUES ($1, $2, $3)',
      [ipAddress, reason, blockedBy]
    );
    return result.rows[0];
  }

  async unblockIP(ipAddress) {
    const result = await this.pool.query('DELETE FROM blocked_ips WHERE ip_address = $1', [ipAddress]);
    return result.rowCount > 0;
  }

  async getActiveSessions(userId) {
    const result = await this.pool.query(
      'SELECT * FROM user_sessions WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP',
      [userId]
    );
    return result.rows;
  }

  async revokeAllUserSessions(userId) {
    const result = await this.pool.query(
      'UPDATE user_sessions SET expires_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );
    return result.rowCount > 0;
  }

  async getSecuritySettings() {
    const result = await this.pool.query('SELECT * FROM security_settings WHERE id = 1');
    return result.rows[0] || {};
  }

  async updateSecuritySettings(data) {
    const { passwordPolicy, sessionTimeout, mfaEnabled, ipWhitelist, ipBlacklist } = data;

    const result = await this.pool.query(
      `UPDATE security_settings
       SET password_policy = $1, session_timeout = $2, mfa_enabled = $3,
           ip_whitelist = $4, ip_blacklist = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = 1
       RETURNING *`,
      [passwordPolicy, sessionTimeout, mfaEnabled, ipWhitelist, ipBlacklist]
    );
    return result.rows[0];
  }

  async getSecurityAnalytics() {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) as total_events,
         COUNT(CASE WHEN blocked = true THEN 1 END) as blocked_attempts,
         COUNT(CASE WHEN suspicious = true THEN 1 END) as suspicious_activity,
         85 as compliance_score
       FROM security_logs
       WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`
    );
    return result.rows[0];
  }

  async getRecentSecurityEvents() {
    const result = await this.pool.query(
      `SELECT type, description, severity, timestamp
       FROM security_logs
       ORDER BY timestamp DESC
       LIMIT 10`
    );
    return result.rows;
  }
}

module.exports = new SecurityRepository();
