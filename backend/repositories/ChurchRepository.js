const BaseRepository = require('./BaseRepository');

class ChurchRepository extends BaseRepository {
  constructor() {
    super('churches');
  }

  async getAllChurches() {
    const result = await this.pool.query(
      'SELECT id, name, slug, settings, is_active, created_at, updated_at FROM churches ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async getActiveChurches() {
    const result = await this.pool.query(
      'SELECT id, name, slug, settings, is_active, created_at, updated_at FROM churches WHERE is_active = true ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async getPlatformChurches({ search, status, tier, sortBy, sortOrder, page, limit }) {
    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(name ILIKE $${values.length} OR slug ILIKE $${values.length})`);
    }
    if (status === "active") {
      conditions.push("(is_active = true OR is_active IS NULL)");
    }
    if (status === "suspended") {
      conditions.push("is_active = false");
    }
    if (tier) {
      values.push(tier);
      conditions.push("COALESCE(settings->>'subscription_tier', 'basic') = $" + values.length);
    }

    const allowedSortFields = new Set(["created_at", "name", "updated_at"]);
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "created_at";
    const safeSortOrder = sortOrder === "ASC" ? "ASC" : "DESC";
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    values.push(limit, (page - 1) * limit);
    const query = [
      "SELECT c.id, c.name, c.slug, c.settings, c.is_active, c.created_at, c.updated_at,",
      "c.trial_ends_at, c.onboarding_state, c.quarantined, c.is_demo,",
      "COALESCE(uc.user_count, 0) AS user_count, COALESCE(mc.member_count, 0) AS member_count,",
      "COUNT(*) OVER() AS total_count",
      "FROM churches c",
      "LEFT JOIN (SELECT church_id, COUNT(*) AS user_count FROM users GROUP BY church_id) uc ON uc.church_id = c.id",
      "LEFT JOIN (SELECT church_id, COUNT(*) AS member_count FROM members GROUP BY church_id) mc ON mc.church_id = c.id",
      whereClause,
      `ORDER BY ${safeSortBy} ${safeSortOrder}`,
      `LIMIT $${values.length - 1} OFFSET $${values.length}`
    ].filter(Boolean).join(" ");
    const result = await this.pool.query(query, values);

    return {
      churches: result.rows,
      total: Number(result.rows[0]?.total_count || 0)
    };
  }

  async archiveChurch(id) {
    const result = await this.pool.query(
      `UPDATE churches
       SET is_active = false,
           settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{archived_at}', to_jsonb(CURRENT_TIMESTAMP::text), true),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  async getDefaultChurch() {
    const result = await this.pool.query(
      "SELECT id, slug FROM churches WHERE is_active = true OR is_active IS NULL ORDER BY created_at ASC LIMIT 1"
    );
    return result.rows[0];
  }

  async getChurchById(id) {
    const result = await this.pool.query(
      'SELECT * FROM churches WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async getChurchBySlug(slug) {
    const result = await this.pool.query(
      'SELECT * FROM churches WHERE slug = $1',
      [slug]
    );
    return result.rows[0];
  }

  async getChurchBySlugForCheck(slug) {
    const result = await this.pool.query(
      'SELECT id FROM churches WHERE slug = $1',
      [slug]
    );
    return result.rows[0];
  }

  async createChurch(data) {
    const { name, slug, settings } = data;

    const result = await this.pool.query(
      'INSERT INTO churches (name, slug, settings) VALUES ($1, $2, $3) RETURNING *',
      [name, slug, JSON.stringify(settings)]
    );
    return result.rows[0];
  }

  /**
   * Onboarding: create the church and its first Admin user atomically —
   * a church without an admin account can't be logged into. Rolls the
   * church insert back if the user insert fails (e.g. duplicate email).
   */
  async createChurchWithAdmin(tenant, admin) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const churchResult = await client.query(
        'INSERT INTO churches (name, slug, settings) VALUES ($1, $2, $3) RETURNING *',
        [tenant.name, tenant.slug, JSON.stringify(tenant.settings)]
      );
      const church = churchResult.rows[0];

      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, username, is_active, email_verified, church_id, church_slug, slug)
         VALUES ($1, $2, $3, $4, $5, true, true, $6, $7, $8)
         RETURNING id, email, first_name, last_name`,
        [admin.email, admin.passwordHash, admin.firstName, admin.lastName, admin.username, church.id, church.slug, admin.slug]
      );
      const adminUser = userResult.rows[0];

      const roleResult = await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT $1, id FROM roles WHERE name = 'Admin'
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [adminUser.id]
      );

      await client.query('COMMIT');
      return { church, adminUser, roleAssigned: roleResult.rowCount > 0 };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateChurch(id, updates, values) {
    const query = `
      UPDATE churches
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length + 1}
      RETURNING *
    `;
    const result = await this.pool.query(query, [...values, id]);
    return result.rows[0];
  }

  async checkSlugExists(slug, excludeId = null) {
    let query = 'SELECT id FROM churches WHERE slug = $1';
    const params = [slug];

    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async deleteChurch(id) {
    const result = await this.pool.query('DELETE FROM churches WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  async getUserCount(churchId) {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM users WHERE church_id = $1',
      [churchId]
    );
    return parseInt(result.rows[0].count);
  }

  async getMemberCount(churchId) {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM members WHERE church_id = $1',
      [churchId]
    );
    return parseInt(result.rows[0].count);
  }

  async getPaymentCount(churchId) {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM payments WHERE church_id = $1',
      [churchId]
    );
    return parseInt(result.rows[0].count);
  }

  async getDepartmentCount(churchId) {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM departments WHERE church_id = $1',
      [churchId]
    );
    return parseInt(result.rows[0].count);
  }

  async getTenantMetrics(churchId) {
    // Single aggregated scan replaces four sequential COUNT round-trips.
    const result = await this.pool.query(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE church_id = $1) AS "userCount",
        (SELECT COUNT(*) FROM members WHERE church_id = $1) AS "memberCount",
        (SELECT COUNT(*) FROM payments WHERE church_id = $1) AS "paymentCount",
        (SELECT COUNT(*) FROM departments WHERE church_id = $1) AS "departmentCount"`,
      [churchId]
    );
    const row = result.rows[0];
    return {
      userCount: parseInt(row.userCount),
      memberCount: parseInt(row.memberCount),
      paymentCount: parseInt(row.paymentCount),
      departmentCount: parseInt(row.departmentCount)
    };
  }

  async getTenantActivity(churchId, limit) {
    const result = await this.pool.query(
      `SELECT
        'user' AS type,
        CONCAT('User ', name, ' logged in') AS title,
        'User activity' AS description,
        last_login AS created_at
      FROM users
      WHERE church_id = $1 AND last_login IS NOT NULL
      ORDER BY last_login DESC
      LIMIT $2`,
      [churchId, limit]
    );
    return result.rows;
  }

  async updateChurchSettings(id, settings) {
    const result = await this.pool.query(
      'UPDATE churches SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [JSON.stringify(settings), id]
    );
    return result.rows[0];
  }
}

module.exports = new ChurchRepository();
