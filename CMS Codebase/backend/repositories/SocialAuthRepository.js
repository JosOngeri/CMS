const BaseRepository = require('./BaseRepository');

class SocialAuthRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async getUserByGoogleId(googleId) {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );
    return result.rows[0];
  }

  async getUserByFacebookId(facebookId) {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE facebook_id = $1',
      [facebookId]
    );
    return result.rows[0];
  }

  async getUserByEmail(email) {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async linkGoogleAccount(userId, googleId, picture) {
    const result = await this.pool.query(
      'UPDATE users SET google_id = $1, avatar_url = $2 WHERE id = $3',
      [googleId, picture, userId]
    );
    return result.rows[0];
  }

  async linkFacebookAccount(userId, facebookId, picture) {
    const result = await this.pool.query(
      'UPDATE users SET facebook_id = $1, avatar_url = $2 WHERE id = $3',
      [facebookId, picture, userId]
    );
    return result.rows[0];
  }

  async unlinkGoogleAccount(userId) {
    const result = await this.pool.query(
      'UPDATE users SET google_id = NULL WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  }

  async unlinkFacebookAccount(userId) {
    const result = await this.pool.query(
      'UPDATE users SET facebook_id = NULL WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  }

  async createUser(data) {
    const { email, passwordHash, firstName, lastName, googleId, facebookId, picture, emailVerified } = data;

    const result = await this.pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, google_id, facebook_id, avatar_url, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [email, passwordHash, firstName, lastName, googleId, facebookId, picture, emailVerified]
    );
    return result.rows[0];
  }

  async getRoleByName(roleName) {
    const result = await this.pool.query(
      'SELECT id FROM roles WHERE name = $1',
      [roleName]
    );
    return result.rows[0];
  }

  async assignUserRole(userId, roleId) {
    const result = await this.pool.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) RETURNING *',
      [userId, roleId]
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

  async insertRefreshToken(userId, token) {
    const result = await this.pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days') RETURNING *`,
      [userId, token]
    );
    return result.rows[0];
  }

  async logAuthAudit(userId, action, details) {
    const result = await this.pool.query(
      `INSERT INTO auth_audit_log (user_id, action, details)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, action, JSON.stringify(details)]
    );
    return result.rows[0];
  }
}

module.exports = new SocialAuthRepository();
