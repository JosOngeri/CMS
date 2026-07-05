const BaseRepository = require('./BaseRepository');

class UsersRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findByEmail(email) {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async findByUsername(username) {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  }

  async findByResetToken(token) {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > CURRENT_TIMESTAMP',
      [token]
    );
    return result.rows[0];
  }

  async updateResetToken(userId, token, expiry) {
    const result = await this.pool.query(
      `UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3 RETURNING *`,
      [token, expiry, userId]
    );
    return result.rows[0];
  }

  async updatePassword(userId, hashedPassword) {
    const result = await this.pool.query(
      `UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2 RETURNING *`,
      [hashedPassword, userId]
    );
    return result.rows[0];
  }

  async getActiveUsers(churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE is_active = true`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAllWithRoles(churchId = null) {
    let query = `
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone_number,
             u.is_active, u.created_at,
             COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
    `;
    const params = [];

    if (churchId) {
      query += ` WHERE u.church_id = $1`;
      params.push(churchId);
    }

    query += ` GROUP BY u.id ORDER BY u.first_name, u.last_name`;

    const result = await this.pool.query(query, params);
    return result.rows.map(user => ({
      ...user,
      roles: user.roles || []
    }));
  }

  async getUserByIdWithRoles(userId, churchId = null) {
    let query = `
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone_number,
             u.is_active, u.created_at,
             COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1
    `;
    const params = [userId];

    if (churchId) {
      query += ` AND u.church_id = $2`;
      params.push(churchId);
    }

    query += ` GROUP BY u.id`;

    const result = await this.pool.query(query, params);
    const user = result.rows[0];
    if (user) {
      user.roles = user.roles || [];
    }
    return user;
  }

  async updateUserRoles(userId, roleNames, churchId = null) {
    const roleId = await this.pool.query('SELECT id FROM roles WHERE name = $1', [roleNames[0]]);

    await this.pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);

    for (const roleName of roleNames) {
      const roleResult = await this.pool.query('SELECT id FROM roles WHERE name = $1', [roleName]);
      if (roleResult.rows.length > 0) {
        await this.pool.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
          [userId, roleResult.rows[0].id]
        );
      }
    }

    return this.getUserByIdWithRoles(userId, churchId);
  }

  async getUserStats(churchId = null) {
    let query = `
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_30_days
      FROM users
    `;
    const params = [];

    if (churchId) {
      query += ` WHERE church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async createUser(data, churchId = null) {
    const { username, email, password, first_name, last_name, phone_number } = data;

    let query = `
      INSERT INTO users (username, email, password, first_name, last_name, phone_number)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const params = [username, email, password, first_name, last_name, phone_number];

    if (churchId) {
      query = `
        INSERT INTO users (username, email, password, first_name, last_name, phone_number, church_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updateUser(userId, data, churchId = null) {
    const { email, first_name, last_name, phone_number } = data;

    let query = `
      UPDATE users
      SET email = COALESCE($1, email),
          first_name = COALESCE($2, first_name),
          last_name = COALESCE($3, last_name),
          phone_number = COALESCE($4, phone_number),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;
    const params = [email, first_name, last_name, phone_number, userId];

    if (churchId) {
      query = `
        UPDATE users
        SET email = COALESCE($1, email),
            first_name = COALESCE($2, first_name),
            last_name = COALESCE($3, last_name),
            phone_number = COALESCE($4, phone_number),
            updated_at = NOW()
        WHERE id = $5 AND church_id = $6
        RETURNING *
      `;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }
}

module.exports = new UsersRepository();
