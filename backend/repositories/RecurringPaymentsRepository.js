const BaseRepository = require('./BaseRepository');

class RecurringPaymentsRepository extends BaseRepository {
  constructor() {
    super('recurring_payments');
  }

  async getAllWithDetails(filters = {}) {
    let query = `
      SELECT rp.*,
             m.first_name || ' ' || m.last_name as member_name,
             pr.project_name,
             f.fund_name
      FROM recurring_payments rp
      LEFT JOIN users m ON rp.member_id = m.id
      LEFT JOIN projects pr ON rp.project_id = pr.id
      LEFT JOIN funds f ON rp.fund_id = f.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (filters.status) {
      paramCount++;
      query += ` AND rp.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.member_id) {
      paramCount++;
      query += ` AND rp.member_id = $${paramCount}`;
      params.push(filters.member_id);
    }

    if (filters.frequency) {
      paramCount++;
      query += ` AND rp.frequency = $${paramCount}`;
      params.push(filters.frequency);
    }

    query += ` ORDER BY rp.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getWithDetails(id) {
    const query = `
      SELECT rp.*,
             m.first_name || ' ' || m.last_name as member_name,
             pr.project_name,
             f.fund_name
      FROM recurring_payments rp
      LEFT JOIN users m ON rp.member_id = m.id
      LEFT JOIN projects pr ON rp.project_id = pr.id
      LEFT JOIN funds f ON rp.fund_id = f.id
      WHERE rp.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async createRecurringPayment(paymentData) {
    const {
      recurring_number, member_id, project_id, fund_id, amount, frequency,
      start_date, end_date, next_payment_date, payment_method, auto_charge, notes, created_by
    } = paymentData;

    const query = `
      INSERT INTO recurring_payments (recurring_number, member_id, project_id, fund_id, amount, frequency, start_date, end_date, next_payment_date, payment_method, auto_charge, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      recurring_number, member_id, project_id, fund_id, amount, frequency,
      start_date, end_date, next_payment_date, payment_method, auto_charge, notes, created_by
    ]);
    return result.rows[0];
  }

  async updateRecurringPayment(id, paymentData) {
    const {
      amount, frequency, start_date, end_date, next_payment_date,
      payment_method, auto_charge, status, notes
    } = paymentData;

    const query = `
      UPDATE recurring_payments
      SET amount = COALESCE($1, amount),
          frequency = COALESCE($2, frequency),
          start_date = COALESCE($3, start_date),
          end_date = COALESCE($4, end_date),
          next_payment_date = COALESCE($5, next_payment_date),
          payment_method = COALESCE($6, payment_method),
          auto_charge = COALESCE($7, auto_charge),
          status = COALESCE($8, status),
          notes = COALESCE($9, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      amount, frequency, start_date, end_date, next_payment_date,
      payment_method, auto_charge, status, notes, id
    ]);
    return result.rows[0];
  }

  async updateStatus(id, status) {
    const query = 'UPDATE recurring_payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
    const result = await this.pool.query(query, [status, id]);
    return result.rows[0];
  }

  async getStartDateAndFrequency(id) {
    const query = 'SELECT start_date, frequency FROM recurring_payments WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async delete(id) {
    const query = 'DELETE FROM recurring_payments WHERE id = $1 RETURNING *';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = new RecurringPaymentsRepository();
