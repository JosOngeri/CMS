const BaseRepository = require('./BaseRepository');

class UserRepository extends BaseRepository {
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

  async findBySlug(slug) {
    const result = await this.pool.query(
      'SELECT id FROM users WHERE slug = $1',
      [slug]
    );
    return result.rows[0];
  }

  async findById(id) {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
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

  async getMemberDirectory(filters = {}) {
    const { page = 1, limit = 50, role, department } = filters;
    const offset = (page - 1) * limit;

    const params = [];
    let paramIndex = 1;

    let roleFilter = '';
    if (role) {
      roleFilter = `WHERE $${paramIndex} = ANY(roles)`;
      params.push(role);
      paramIndex++;
    }

    let deptJoin = '';
    let deptFilter = '';
    if (department) {
      deptFilter = ` AND EXISTS (SELECT 1 FROM department_members dm WHERE dm.user_id = u.id AND dm.department_id = $${paramIndex})`;
      params.push(department);
      paramIndex++;
    }

    const query = `
      SELECT * FROM (
        SELECT u.id, u.username, u.email, u.first_name, u.last_name, 
               u.phone, u.phone_number, u.is_active, u.created_at, u.slug,
               COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.is_active = true ${deptFilter}
        GROUP BY u.id
      ) users_with_roles
      ${roleFilter}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const limitVal = parseInt(limit);
    const offsetVal = parseInt(offset);
    params.push(limitVal, offsetVal);

    const result = await this.pool.query(query, params);

    // Get total count
    const countParams = [];
    let countParamIndex = 1;
    let countRoleFilter = '';
    if (role) {
      countRoleFilter = `WHERE $${countParamIndex} = ANY(roles)`;
      countParams.push(role);
      countParamIndex++;
    }

    let countDeptFilter = '';
    if (department) {
      countDeptFilter = ` AND EXISTS (SELECT 1 FROM department_members dm WHERE dm.user_id = u.id AND dm.department_id = $${countParamIndex})`;
      countParams.push(department);
      countParamIndex++;
    }

    const countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT u.id, COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.is_active = true ${countDeptFilter}
        GROUP BY u.id
      ) users_with_roles
      ${countRoleFilter}
    `;

    const countResult = await this.pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    return {
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: limitVal,
        total: total,
        pages: Math.ceil(total / limitVal)
      }
    };
  }

  async getAllUsers(filters = {}) {
    // Re-use member directory logic for admin user list
    return this.getMemberDirectory(filters);
  }

  async getUserWithDepartments(id) {
    const query = `
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, 
             u.phone, u.phone_number, u.is_active, u.created_at, u.slug,
             COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1
      GROUP BY u.id
    `;

    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    // Get user's departments
    const deptQuery = `
      SELECT d.id, d.name, dm.role as role_in_department, dm.joined_at
      FROM departments d
      INNER JOIN department_members dm ON d.id = dm.department_id
      WHERE dm.user_id = $1
      ORDER BY dm.joined_at ASC
    `;

    const deptResult = await this.pool.query(deptQuery, [id]);

    return {
      ...result.rows[0],
      departments: deptResult.rows
    };
  }

  async updateUserProfile(id, updates) {
    const { first_name, last_name, phone, email, is_active } = updates;

    const updateQuery = `
      UPDATE users
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          phone = COALESCE($3, phone),
          phone_number = COALESCE($3, phone_number),
          email = COALESCE($4, email),
          is_active = COALESCE($5, is_active),
          slug = CASE 
            WHEN ($1 IS NOT NULL OR $2 IS NOT NULL) THEN 
              generate_user_slug(COALESCE($1, first_name), COALESCE($2, last_name), id)
            ELSE slug
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, username, email, first_name, last_name, phone, phone_number, is_active, slug, updated_at
    `;

    const result = await this.pool.query(updateQuery, [
      first_name, last_name, phone, email, is_active, id
    ]);

    return result.rows[0];
  }

  async assignRole(userId, roleId) {
    const query = `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING
      RETURNING *
    `;

    const result = await this.pool.query(query, [userId, roleId]);
    return result.rows[0];
  }

  async removeRole(userId, roleId) {
    const result = await this.pool.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 RETURNING *',
      [userId, roleId]
    );
    return result.rows[0];
  }

  async deactivateUser(id) {
    const result = await this.pool.query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  async activateUser(id) {
    const result = await this.pool.query(
      'UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  async deleteUser(id) {
    const result = await this.pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  async resetPassword(id, hashedPassword) {
    const result = await this.pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [hashedPassword, id]
    );
    return result.rows[0];
  }

  async getUserActivityHistory(userId, limit = 20) {
    const activities = [];

    try {
      // Recent payments
      const paymentsQuery = `
        SELECT
          'payment' as type,
          'Payment made' as description,
          created_at as timestamp
        FROM payments
        WHERE member_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      const paymentsResult = await this.pool.query(paymentsQuery, [userId, limit]);
      activities.push(...paymentsResult.rows);

      // Profile updates (from user table updated_at)
      const profileQuery = `
        SELECT
          'profile_update' as type,
          'Profile updated' as description,
          updated_at as timestamp
        FROM users
        WHERE id = $1 AND updated_at > created_at
      `;
      const profileResult = await this.pool.query(profileQuery, [userId]);
      if (profileResult.rows.length > 0) {
        activities.push(...profileResult.rows);
      }
    } catch (err) {
      console.error('Error fetching activity history:', err);
    }

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit results
    return activities.slice(0, parseInt(limit));
  }

  async getUserById(id) {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  async softDeleteUser(id) {
    const result = await this.pool.query(
      'UPDATE users SET is_active = false, deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  }

  async updateProfile(userId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value === 'CURRENT_TIMESTAMP') {
        fields.push(`${key} = CURRENT_TIMESTAMP`);
      } else {
        fields.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    }

    values.push(userId);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await this.pool.query(query, values);
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
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone, u.phone_number,
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

  async getProfile(userId) {
    const result = await this.pool.query(
      `SELECT id, email, first_name, last_name, phone, phone_number, is_active, email_verified, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];

    // Get roles
    const rolesResult = await this.pool.query(
      `SELECT r.name FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );

    // Get permissions
    const permissionsResult = await this.pool.query(
      `SELECT DISTINCT p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );

    return {
      ...user,
      roles: rolesResult.rows.map(r => r.name),
      permissions: permissionsResult.rows.map(p => p.name),
    };
  }
}

module.exports = new UserRepository();
