const BaseRepository = require('./BaseRepository');

class MembersRepository extends BaseRepository {
  constructor() {
    super('members');
  }

  async getAll(filters = {}, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (churchId) {
      paramCount++;
      query += ` AND church_id = $${paramCount}`;
      params.push(churchId);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND membership_status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.filter === 'birthday_this_month') {
      paramCount++;
      query += ` AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)`;
    }

    query += ` ORDER BY created_at DESC`;

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async findByEmail(email) {
    const result = await this.pool.query(
      'SELECT * FROM members WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async findByPhone(phone) {
    const result = await this.pool.query(
      'SELECT * FROM members WHERE phone = $1',
      [phone]
    );
    return result.rows[0];
  }

  async count(filters = {}, churchId = null) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE 1=1`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    if (filters.status) {
      query += ` AND membership_status = $${params.length + 1}`;
      params.push(filters.status);
    }

    if (filters.filter === 'birthday_this_month') {
      query += ` AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)`;
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getWithContactsAndGroups(memberId, churchId = null) {
    let query = `
      SELECT m.*,
        (SELECT json_agg(json_build_object('id', c.id, 'type', c.contact_type, 'value', c.contact_value))
         FROM member_contacts c WHERE c.member_id = m.id) as contacts,
        (SELECT json_agg(json_build_object('id', g.id, 'name', g.name))
         FROM member_groups mg
         JOIN groups g ON mg.group_id = g.id
         WHERE mg.member_id = m.id) as groups
      FROM members m
      WHERE m.id = $1
    `;
    const params = [memberId];

    if (churchId) {
      query += ` AND m.church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getMemberStats(churchId = null) {
    let query = `
      SELECT
        COUNT(*) as total_members,
        COUNT(CASE WHEN membership_status = 'active' THEN 1 END) as active_members,
        COUNT(CASE WHEN membership_status = 'inactive' THEN 1 END) as inactive_members,
        COUNT(CASE WHEN membership_status = 'visitor' THEN 1 END) as visitors,
        COUNT(CASE WHEN joined_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_members_30_days
      FROM members
    `;
    const params = [];

    if (churchId) {
      query += ` WHERE church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async createMember(data) {
    const { first_name, last_name, date_of_birth, gender, marital_status, occupation, address, city, phone, email, baptism_date, membership_status, joined_date, notes } = data;

    const result = await this.pool.query(
      `INSERT INTO members (first_name, last_name, date_of_birth, gender, marital_status, occupation, address, city, phone, email, baptism_date, membership_status, joined_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [first_name, last_name, date_of_birth, gender, marital_status, occupation, address, city, phone, email, baptism_date, membership_status, joined_date, notes]
    );
    return result.rows[0];
  }

  async addMemberContact(memberId, contact) {
    const { contact_type, contact_value, is_primary } = contact;

    const result = await this.pool.query(
      `INSERT INTO member_contacts (member_id, contact_type, contact_value, is_primary)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [memberId, contact_type, contact_value, is_primary]
    );
    return result.rows[0];
  }

  async updateMember(id, data) {
    const { first_name, last_name, date_of_birth, gender, marital_status, occupation, address, city, phone, email, baptism_date, membership_status, joined_date, notes } = data;

    const result = await this.pool.query(
      `UPDATE members
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           date_of_birth = COALESCE($3, date_of_birth),
           gender = COALESCE($4, gender),
           marital_status = COALESCE($5, marital_status),
           occupation = COALESCE($6, occupation),
           address = COALESCE($7, address),
           city = COALESCE($8, city),
           phone = COALESCE($9, phone),
           email = COALESCE($10, email),
           baptism_date = COALESCE($11, baptism_date),
           membership_status = COALESCE($12, membership_status),
           joined_date = COALESCE($13, joined_date),
           notes = COALESCE($14, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $15
       RETURNING *`,
      [first_name, last_name, date_of_birth, gender, marital_status, occupation, address, city, phone, email, baptism_date, membership_status, joined_date, notes, id]
    );
    return result.rows[0];
  }

  async deleteMember(id) {
    const result = await this.pool.query('DELETE FROM members WHERE id = $1', [id]);
    return result.rowCount > 0;
  }
}

module.exports = new MembersRepository();
