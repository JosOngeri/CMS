const BaseRepository = require('./BaseRepository');

class PledgesRepository extends BaseRepository {
  constructor() {
    super('pledges');
  }

  async getAllWithDetails(filters = {}) {
    let query = `
      SELECT p.*,
             m.first_name || ' ' || m.last_name as member_name,
             pr.project_name,
             f.fund_name
      FROM pledges p
      LEFT JOIN users m ON p.member_id = m.id
      LEFT JOIN projects pr ON p.project_id = pr.id
      LEFT JOIN funds f ON p.fund_id = f.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (filters.status) {
      paramCount++;
      query += ` AND p.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.member_id) {
      paramCount++;
      query += ` AND p.member_id = $${paramCount}`;
      params.push(filters.member_id);
    }

    if (filters.project_id) {
      paramCount++;
      query += ` AND p.project_id = $${paramCount}`;
      params.push(filters.project_id);
    }

    if (filters.fund_id) {
      paramCount++;
      query += ` AND p.fund_id = $${paramCount}`;
      params.push(filters.fund_id);
    }

    query += ` ORDER BY p.pledged_date DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getWithDetails(id) {
    const query = `
      SELECT p.*,
             m.first_name || ' ' || m.last_name as member_name,
             pr.project_name,
             f.fund_name
      FROM pledges p
      LEFT JOIN users m ON p.member_id = m.id
      LEFT JOIN projects pr ON p.project_id = pr.id
      LEFT JOIN funds f ON p.fund_id = f.id
      WHERE p.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async createPledge(pledgeData) {
    const {
      pledge_number, member_id, project_id, fund_id, pledge_amount,
      pledged_date, start_date, end_date, frequency, notes, created_by
    } = pledgeData;

    const query = `
      INSERT INTO pledges (pledge_number, member_id, project_id, fund_id, pledge_amount, pledged_date, start_date, end_date, frequency, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      pledge_number, member_id, project_id, fund_id, pledge_amount,
      pledged_date, start_date, end_date, frequency, notes, created_by
    ]);
    return result.rows[0];
  }

  async updatePledge(id, pledgeData) {
    const {
      pledge_amount, start_date, end_date, frequency, status, notes
    } = pledgeData;

    const query = `
      UPDATE pledges
      SET pledge_amount = COALESCE($1, pledge_amount),
          start_date = COALESCE($2, start_date),
          end_date = COALESCE($3, end_date),
          frequency = COALESCE($4, frequency),
          status = COALESCE($5, status),
          notes = COALESCE($6, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      pledge_amount, start_date, end_date, frequency, status, notes, id
    ]);
    return result.rows[0];
  }

  async updateAmountPaid(id, newAmountPaid, pledgeAmount) {
    const query = `
      UPDATE pledges
      SET amount_paid = $1,
          status = CASE WHEN $1 >= $2 THEN 'completed' ELSE status END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await this.pool.query(query, [newAmountPaid, pledgeAmount, id]);
    return result.rows[0];
  }

  async delete(id) {
    const query = 'DELETE FROM pledges WHERE id = $1 RETURNING *';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async findById(id) {
    const query = 'SELECT * FROM pledges WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = new PledgesRepository();
