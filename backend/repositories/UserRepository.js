const BaseRepository = require('./BaseRepository');
const UserSettingsRepository = require('./UserSettingsRepository');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findByEmail(email, churchId = null) {
    // Case-insensitive: login identifiers come straight from user input.
    let query = 'SELECT * FROM users WHERE LOWER(email) = LOWER($1)';
    const params = [email];

    if (churchId) {
      query += ' AND church_id = $2';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async findByUsername(username, churchId = null) {
    let query = 'SELECT * FROM users WHERE LOWER(username) = LOWER($1)';
    const params = [username];

    if (churchId) {
      query += ' AND church_id = $2';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async findByUsernameGlobal(username) {
    // Check username globally across all churches
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await this.pool.query(query, [username]);
    return result.rows[0];
  }

  async isUsernameAvailable(username, excludeUserId = null) {
    // Check if username is available globally
    let query = 'SELECT id FROM users WHERE username = $1';
    const params = [username];

    if (excludeUserId) {
      query += ' AND id != $2';
      params.push(excludeUserId);
    }

    const result = await this.pool.query(query, params);
    return result.rows.length === 0;
  }

  async findByPhone(phone, churchId = null) {
    let query = 'SELECT * FROM users WHERE phone = $1 OR phone_number = $1';
    const params = [phone];

    if (churchId) {
      query += ' AND church_id = $2';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async findByIdentifier(identifier) {
    // Trim pasted/typed whitespace first — autofill and copy-paste regularly
    // add leading/trailing spaces, which previously caused 401s for valid users.
    identifier = String(identifier || '').trim();
    // Check if identifier is email, username, or phone
    const isEmail = identifier.includes('@');
    const cleanIdentifier = identifier.replace(/[\s\-()]/g, '');
    const isPhone = /^\d{10,15}$/.test(cleanIdentifier);

    if (isEmail) {
      return this.findByEmail(identifier);
    } else if (isPhone) {
      return this.findByPhone(cleanIdentifier);
    }
    return this.findByUsername(identifier);

  }

  async findByResetToken(token, churchId = null) {
    let query = 'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > CURRENT_TIMESTAMP';
    const params = [token];

    if (churchId) {
      query += ' AND church_id = $2';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async findBySlug(slug, churchId) {
    const result = await this.pool.query(
      'SELECT id FROM users WHERE slug = $1 AND church_id = $2',
      [slug, churchId]
    );
    return result.rows[0];
  }

  async findById(id, churchId = null) {
    let query = 'SELECT * FROM users WHERE id = $1';
    const params = [id];

    if (churchId) {
      query += ' AND church_id = $2';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updateResetToken(userId, token, expiry) {
    const result = await this.pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3 RETURNING *',
      [token, expiry, userId]
    );
    return result.rows[0];
  }

  async updatePassword(userId, hashedPassword) {
    const result = await this.pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2 RETURNING *',
      [hashedPassword, userId]
    );
    return result.rows[0];
  }

  async getMemberDirectory(filters = {}, churchId) {
    const { page = 1, limit = 50, role, department } = filters;
    const offset = (page - 1) * limit;
    const limitVal = parseInt(limit);
    const offsetVal = parseInt(offset);

    // Shared directory filter builder — the data and count queries reuse it
    // so church/department/role placeholder logic lives in exactly one place.
    const buildDirectoryQuery = (selectColumns) => {
      const params = [];
      let paramIndex = 1;

      let churchFilter = '';
      if (churchId) {
        churchFilter = `u.church_id = $${paramIndex} AND`;
        params.push(churchId);
        paramIndex++;
      }

      let deptFilter = '';
      if (department) {
        deptFilter = ` AND EXISTS (SELECT 1 FROM department_members dm WHERE dm.user_id = u.id AND dm.department_id = $${paramIndex})`;
        params.push(department);
        paramIndex++;
      }

      let roleFilter = '';
      if (role) {
        roleFilter = `AND $${paramIndex} = ANY(roles)`;
        params.push(role);
        paramIndex++;
      }

      const sql = `
        FROM (
          SELECT ${selectColumns},
                 COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as roles
          FROM users u
          LEFT JOIN user_roles ur ON u.id = ur.user_id
          LEFT JOIN roles r ON ur.role_id = r.id
          WHERE ${churchFilter} u.is_active = true ${deptFilter}
          GROUP BY u.id
        ) users_with_roles
        WHERE 1=1 ${roleFilter}
      `;

      return { sql, params, nextIndex: paramIndex };
    };

    const directorySelect = `u.id, u.username, u.email, u.first_name, u.last_name,
               u.phone, u.phone_number, u.is_active, u.created_at, u.slug,
               (SELECT COALESCE(array_agg(d.name), ARRAY[]::text[])
                FROM department_members dm
                JOIN departments d ON d.id = dm.department_id
                WHERE dm.user_id = u.id AND COALESCE(dm.is_active, true) = true) as departments`;

    const dataQuery = buildDirectoryQuery(directorySelect);
    const query = `
      SELECT * ${dataQuery.sql}
      ORDER BY created_at DESC
      LIMIT $${dataQuery.nextIndex} OFFSET $${dataQuery.nextIndex + 1}
    `;

    const result = await this.pool.query(query, [...dataQuery.params, limitVal, offsetVal]);

    // Get total count
    const countQuery = buildDirectoryQuery('u.id');
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total ${countQuery.sql}`,
      countQuery.params
    );
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

  async getAllUsers(filters = {}, churchId) {
    // Re-use member directory logic for admin user list
    return this.getMemberDirectory(filters, churchId);
  }

  async getUserWithDepartments(id, churchId) {
    const query = `
      SELECT u.id, u.username, u.email, u.first_name, u.last_name,
             u.phone, u.phone_number, u.is_active, u.created_at, u.slug,
             COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1 AND u.church_id = $2
      GROUP BY u.id
    `;

    const result = await this.pool.query(query, [id, churchId]);

    if (result.rows.length === 0) {
      return null;
    }

    // Get user's departments
    const deptQuery = `
      SELECT d.id, d.name, dm.role as role_in_department, dm.joined_at
      FROM departments d
      INNER JOIN department_members dm ON d.id = dm.department_id
      WHERE dm.user_id = $1 AND d.church_id = $2
      ORDER BY dm.joined_at ASC
    `;

    const deptResult = await this.pool.query(deptQuery, [id, churchId]);

    return {
      ...result.rows[0],
      departments: deptResult.rows
    };
  }

  async updateUserProfile(id, updates, churchId) {
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
      WHERE id = $6 AND church_id = $7
      RETURNING id, username, email, first_name, last_name, phone, phone_number, is_active, slug, updated_at
    `;

    const result = await this.pool.query(updateQuery, [
      first_name, last_name, phone, email, is_active, id, churchId
    ]);

    return result.rows[0];
  }

  async assignRole(userId, roleId, churchId) {
    // Verify user belongs to church before assigning role
    const userCheck = await this.pool.query(
      'SELECT id FROM users WHERE id = $1 AND church_id = $2',
      [userId, churchId]
    );

    if (userCheck.rows.length === 0) {
      throw new Error('User not found in this church');
    }

    const query = `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING
      RETURNING *
    `;

    const result = await this.pool.query(query, [userId, roleId]);
    return result.rows[0];
  }

  async assignRolesByNames(userId, roleNames, churchId) {
    // Get role IDs from role names
    const roleResult = await this.pool.query(
      'SELECT id, name FROM roles WHERE name = ANY($1::text[])',
      [roleNames]
    );

    if (roleResult.rows.length === 0) {
      throw new Error('No valid roles found');
    }

    // Assign each role
    const assignedRoles = [];
    for (const role of roleResult.rows) {
      const assignment = await this.assignRole(userId, role.id, churchId);
      assignedRoles.push(role);
    }

    return assignedRoles;
  }

  async removeRole(userId, roleId, churchId) {
    // Verify user belongs to church before removing role
    const userCheck = await this.pool.query(
      'SELECT id FROM users WHERE id = $1 AND church_id = $2',
      [userId, churchId]
    );

    if (userCheck.rows.length === 0) {
      throw new Error('User not found in this church');
    }

    const result = await this.pool.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 RETURNING *',
      [userId, roleId]
    );
    return result.rows[0];
  }

  async deactivateUser(id, churchId) {
    const result = await this.pool.query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND church_id = $2 RETURNING *',
      [id, churchId]
    );
    return result.rows[0];
  }

  async activateUser(id, churchId) {
    const result = await this.pool.query(
      'UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND church_id = $2 RETURNING *',
      [id, churchId]
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

  async getUserActivityHistory(userId, limit = 20, churchId = null) {
    // Single activity-feed implementation lives in UserSettingsRepository —
    // mapped here to this endpoint's {type, description, timestamp} shape.
    const rows = await UserSettingsRepository.getActivityFeed(userId, limit, 0, churchId);
    return rows.map(row => ({
      type: row.type,
      description: row.description,
      timestamp: row.created_at
    }));
  }

  async getUserById(id) {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  async softDeleteUser(id, churchId) {
    const result = await this.pool.query(
      'UPDATE users SET is_active = false, deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND church_id = $2 RETURNING id',
      [id, churchId]
    );
    return result.rows[0];
  }

  async updateProfile(userId, updates) {
    // Column-name allowlist — keys are interpolated into SQL, so any
    // key outside this set (e.g. church_id, roles, password_hash) is dropped.
    const ALLOWED_COLUMNS = new Set([
      'first_name', 'last_name', 'phone', 'phone_number', 'avatar_url',
      'email', 'username', 'bio', 'address', 'city', 'country',
      'date_of_birth', 'updated_at'
    ]);

    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (!ALLOWED_COLUMNS.has(key)) {continue;}
      if (value === 'CURRENT_TIMESTAMP') {
        fields.push(`${key} = CURRENT_TIMESTAMP`);
      } else {
        fields.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw new Error('updateProfile: no permitted fields to update');
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
      query += ' AND church_id = $1';
      params.push(churchId);
    }

    query += ' ORDER BY created_at DESC';

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
      query += ' WHERE u.church_id = $1';
      params.push(churchId);
    }

    query += ' GROUP BY u.id ORDER BY u.first_name, u.last_name';

    const result = await this.pool.query(query, params);
    return result.rows.map(user => ({
      ...user,
      roles: user.roles || []
    }));
  }

  async getProfile(userId) {
    let result;
    try {
      result = await this.pool.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.phone_number, u.avatar_url, u.is_active, u.email_verified, u.church_id, u.created_at,
                c.slug AS church_slug
         FROM users u
         LEFT JOIN churches c ON c.id = u.church_id
         WHERE u.id = $1`,
        [userId]
      );
    } catch (error) {
      // avatar_url may not exist before migration 026 runs
      result = await this.pool.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.phone_number, NULL AS avatar_url, u.is_active, u.email_verified, u.church_id, u.created_at,
                c.slug AS church_slug
         FROM users u
         LEFT JOIN churches c ON c.id = u.church_id
         WHERE u.id = $1`,
        [userId]
      );
    }

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
