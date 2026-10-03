const BaseRepository = require('./BaseRepository');

class AuthRepository extends BaseRepository {
  constructor() {
    super('refresh_tokens');
  }

  async getRefreshToken(token) {
    // Join users to verify the token's tenant still matches the owning user's
    // church (NULL church_id = legacy token predating migration 007 — accepted).
    const result = await this.pool.query(
      `SELECT rt.user_id, rt.expires_at, u.church_id
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
         AND (rt.church_id IS NULL OR rt.church_id = u.church_id)
       WHERE rt.token = $1 AND rt.expires_at > NOW() AND rt.used = false`,
      [token]
    );
    return result.rows[0];
  }

  async getUserRoles(userId) {
    const result = await this.pool.query(
      `SELECT r.name FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );
    return result.rows.map(r => r.name);
  }

  async markRefreshTokenAsUsed(token) {
    await this.pool.query(
      'UPDATE refresh_tokens SET used = true WHERE token = $1',
      [token]
    );
  }

  async deleteRefreshToken(token) {
    await this.pool.query(
      'DELETE FROM refresh_tokens WHERE token = $1',
      [token]
    );
  }

  async createRefreshToken(userId, token) {
    await this.pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, church_id)
       VALUES ($1, $2, NOW() + INTERVAL '30 days',
               (SELECT church_id FROM users WHERE id = $1))`,
      [userId, token]
    );
  }

  async logPasswordReset(email, ipAddress) {
    await this.pool.query(
      `INSERT INTO login_attempts (email, ip_address, success, attempted_at)
       VALUES ($1, $2, true, CURRENT_TIMESTAMP)`,
      [email, ipAddress]
    );
  }

  async logLoginAttempt(email, ipAddress, success) {
    await this.pool.query(
      `INSERT INTO login_attempts (email, ip_address, success, attempted_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [email, ipAddress, success]
    );
  }

  // Reset tokens are stored as SHA-256 hashes — a DB read alone cannot
  // reveal a usable token. Lookups accept the hash OR the legacy plaintext
  // value so tokens minted before this change still work for their 1h window.
  _hashResetToken(token) {
    return require('crypto').createHash('sha256').update(token).digest('hex');
  }

  async getPasswordResetToken(token) {
    const result = await this.pool.query(
      `SELECT prt.*, u.church_id AS user_church_id
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
         AND (prt.church_id IS NULL OR prt.church_id = u.church_id)
       WHERE (prt.token = $1 OR prt.token = $2) AND prt.expires_at > NOW() AND prt.used IS NOT TRUE`,
      [this._hashResetToken(token), token]
    );
    return result.rows[0];
  }

  async deletePasswordResetToken(token) {
    await this.pool.query(
      'DELETE FROM password_reset_tokens WHERE token = $1 OR token = $2',
      [this._hashResetToken(token), token]
    );
  }

  async createPasswordResetToken(userId, token) {
    await this.pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, church_id)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour',
               (SELECT church_id FROM users WHERE id = $1))`,
      [userId, this._hashResetToken(token)]
    );
  }

  async markPasswordResetTokenAsUsed(token) {
    await this.pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE token = $1 OR token = $2',
      [this._hashResetToken(token), token]
    );
  }

  async invalidateUserRefreshTokens(userId) {
    await this.pool.query(
      'UPDATE refresh_tokens SET used = true WHERE user_id = $1',
      [userId]
    );
  }

  async getUserSessions(userId) {
    const result = await this.pool.query(
      `SELECT id, RIGHT(token, 6) AS token_preview, created_at, expires_at,
       CASE WHEN used = true THEN 'Revoked' ELSE 'Active' END as status
       FROM refresh_tokens
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async verifyEmail(userId) {
    await this.pool.query(
      'UPDATE users SET email_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }

  async revokeSession(sessionId, userId) {
    await this.pool.query(
      'UPDATE refresh_tokens SET used = true WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );
  }

  async getUserEmail(userId) {
    const result = await this.pool.query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.email;
  }

  async updateMFASecret(userId, secret) {
    await this.pool.query(
      'UPDATE users SET mfa_secret = $1 WHERE id = $2',
      [secret, userId]
    );
  }

  async logAuthAudit(userId, action, details, ipAddress, userAgent) {
    await this.pool.query(
      `INSERT INTO auth_audit_log (user_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, details, ipAddress, userAgent]
    );
  }

  async getMFASecret(userId) {
    const result = await this.pool.query(
      'SELECT mfa_secret FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.mfa_secret;
  }

  async enableMFA(userId) {
    await this.pool.query(
      'UPDATE users SET mfa_enabled = true WHERE id = $1',
      [userId]
    );
  }

  async disableMFA(userId) {
    await this.pool.query(
      'UPDATE users SET mfa_enabled = false, mfa_secret = NULL WHERE id = $1',
      [userId]
    );
  }

  async getAuthAuditLog(userId, limit, offset) {
    const result = await this.pool.query(
      `SELECT * FROM auth_audit_log 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }
}

module.exports = new AuthRepository();