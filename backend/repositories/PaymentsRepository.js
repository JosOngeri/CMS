const BaseRepository = require('./BaseRepository');

class PaymentsRepository extends BaseRepository {
  constructor() {
    super('payments');
  }

  async getRecent(churchId = null, limit = 50) {
    let query = `
      SELECT p.*, m.first_name || ' ' || m.last_name as member_name
      FROM ${this.tableName} p
      LEFT JOIN members m ON p.member_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (churchId) {
      query += ` AND p.church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getByStatus(status, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE status = $1`;
    const params = [status];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getByMember(memberId, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE member_id = $1`;
    const params = [memberId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getByType(type, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE payment_type = $1`;
    const params = [type];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getRefunds(churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE status = 'refunded'`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getPaymentStats(churchId = null) {
    let query = `
      SELECT
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_collected,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
      FROM ${this.tableName}
      WHERE 1=1
    `;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getRefunds(churchId = null) {
    let query = `
      SELECT r.*, p.amount as original_amount
      FROM refunds r
      LEFT JOIN payments p ON r.payment_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (churchId) {
      query += ` AND p.church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY r.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getPaymentMethods() {
    const result = await this.pool.query(
      'SELECT * FROM payment_methods WHERE is_active = true ORDER BY name'
    );
    return result.rows;
  }

  async getPaymentsWithFilters(filters) {
    const { memberId, paymentMethodId, paymentType, status, startDate, endDate, limit = 50, offset = 0 } = filters;

    let query = `
      SELECT p.*,
             pm.name as payment_method_name,
             m.first_name || ' ' || m.last_name as member_name,
             u.first_name || ' ' || u.last_name as processed_by_name
      FROM payments p
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      LEFT JOIN members m ON p.member_id = m.id
      LEFT JOIN users u ON p.processed_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (memberId) {
      paramCount++;
      query += ` AND p.member_id = $${paramCount}`;
      params.push(memberId);
    }

    if (paymentMethodId) {
      paramCount++;
      query += ` AND p.payment_method_id = $${paramCount}`;
      params.push(paymentMethodId);
    }

    if (paymentType) {
      paramCount++;
      query += ` AND p.payment_type = $${paramCount}`;
      params.push(paymentType);
    }

    if (status) {
      paramCount++;
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
    }

    if (startDate) {
      paramCount++;
      query += ` AND p.payment_date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND p.payment_date <= $${paramCount}`;
      params.push(endDate);
    }

    query += ` ORDER BY p.payment_date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async createPayment(paymentMethodId, memberId, amount, paymentType, referenceNumber, transactionId, processedBy, notes) {
    const result = await this.pool.query(
      `INSERT INTO payments (payment_method_id, member_id, amount, payment_type, reference_number, transaction_id, processed_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [paymentMethodId, memberId, amount, paymentType, referenceNumber, transactionId, processedBy, notes]
    );
    return result.rows[0];
  }

  async createPaymentFromFrontend({ userId, churchId, churchSlug, phoneNumber, amount, category, notes, paymentType, currency }) {
    const result = await this.pool.query(
      `INSERT INTO payments (
        user_id, church_id, church_slug, phone_number, amount, category, notes,
        payment_type, currency, status, payment_date, initiated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', CURRENT_TIMESTAMP, $1)
       RETURNING *`,
      [userId, churchId, churchSlug, phoneNumber, amount, category, notes, paymentType, currency]
    );
    return result.rows[0];
  }

  async updatePaymentStatus(id, status) {
    const result = await this.pool.query(
      `UPDATE payments
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    return result.rows[0];
  }

  async getPledgesWithFilters(filters) {
    const { memberId, status, pledgeType } = filters;

    let query = `
      SELECT p.*,
             m.first_name || ' ' || m.last_name as member_name,
             COALESCE(SUM(pp.amount), 0) as amount_paid
      FROM pledges p
      LEFT JOIN members m ON p.member_id = m.id
      LEFT JOIN pledge_payments pp ON p.id = pp.pledge_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (memberId) {
      paramCount++;
      query += ` AND p.member_id = $${paramCount}`;
      params.push(memberId);
    }

    if (status) {
      paramCount++;
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
    }

    if (pledgeType) {
      paramCount++;
      query += ` AND p.pledge_type = $${paramCount}`;
      params.push(pledgeType);
    }

    query += ' GROUP BY p.id, m.first_name, m.last_name ORDER BY p.created_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async createPledge(memberId, amount, pledgeType, startDate, endDate, frequency) {
    const result = await this.pool.query(
      `INSERT INTO pledges (member_id, amount, pledge_type, start_date, end_date, frequency)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [memberId, amount, pledgeType, startDate, endDate, frequency]
    );
    return result.rows[0];
  }

  async addPledgePayment(pledgeId, paymentId, amount) {
    const result = await this.pool.query(
      `INSERT INTO pledge_payments (pledge_id, payment_id, amount)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [pledgeId, paymentId, amount]
    );
    return result.rows[0];
  }

  async getPaymentSummary(startDate, endDate) {
    let dateFilter = "WHERE status = 'completed'";
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE payment_date BETWEEN $1 AND $2 AND status = \'completed\'';
      params.push(startDate, endDate);
    }

    const result = await this.pool.query(
      `SELECT
         payment_type,
         COUNT(*) as count,
         COALESCE(SUM(amount), 0) as total_amount
       FROM payments
       ${dateFilter}
       GROUP BY payment_type
       ORDER BY total_amount DESC`,
      params
    );
    return result.rows;
  }

  async getPaymentCategories() {
    const result = await this.pool.query(
      'SELECT id, name, description FROM payment_categories ORDER BY name'
    );
    return result.rows;
  }

  async getMyPayments(userId, filters) {
    const { status, limit = 50, offset = 0 } = filters;

    let query = `
      SELECT p.*,
             pm.name as payment_method_name
      FROM payments p
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      WHERE p.member_id = $1
    `;
    const params = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY p.payment_date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getPaymentForReceipt(id, userId) {
    const result = await this.pool.query(
      `SELECT p.*,
              pm.name as payment_method_name,
              m.first_name || ' ' || m.last_name as member_name
       FROM payments p
       LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
       LEFT JOIN members m ON p.member_id = m.id
       WHERE p.id = $1 AND p.member_id = $2`,
      [id, userId]
    );
    return result.rows[0];
  }

  async getPaymentById(paymentId, churchId = null) {
    let query = 'SELECT * FROM payments WHERE id = $1';
    const params = [paymentId];

    if (churchId) {
      query += ' AND church_id = $2';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async createRefund(paymentId, amount, reason, initiatedBy, churchId = null) {
    let query = `
      INSERT INTO refunds (payment_id, amount, reason, initiated_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const params = [paymentId, amount, reason, initiatedBy];

    if (churchId) {
      query = `
        INSERT INTO refunds (payment_id, amount, reason, initiated_by, church_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updateRefundStatus(refundId, status, processedBy, churchId = null) {
    let query = `UPDATE refunds SET status = $1, processed_by = $2 WHERE id = $3 RETURNING *`;
    const params = [status, processedBy, refundId];

    if (churchId) {
      query += ' AND church_id = $4';
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0] || null;
  }

  async createPaymentMethod(data) {
    const { name, type, provider, config, isActive } = data;
    const result = await this.pool.query(
      'INSERT INTO payment_methods (name, type, provider, config, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, type, provider, JSON.stringify(config), isActive !== false]
    );
    return result.rows[0];
  }

  async updatePaymentMethod(id, data) {
    const { name, type, provider, config, isActive } = data;
    const result = await this.pool.query(
      'UPDATE payment_methods SET name = COALESCE($1, name), type = COALESCE($2, type), provider = COALESCE($3, provider), config = COALESCE($4, config), is_active = COALESCE($5, is_active) WHERE id = $6 RETURNING *',
      [name, type, provider, config ? JSON.stringify(config) : null, isActive, id]
    );
    return result.rows[0];
  }

  async deletePaymentMethod(id) {
    await this.pool.query('DELETE FROM payment_methods WHERE id = $1', [id]);
  }

  async updatePayment(id, data) {
    const { amount, paymentMethodId, paymentType, status, notes } = data;
    const result = await this.pool.query(
      'UPDATE payments SET amount = COALESCE($1, amount), payment_method_id = COALESCE($2, payment_method_id), payment_type = COALESCE($3, payment_type), status = COALESCE($4, status), notes = COALESCE($5, notes) WHERE id = $6 RETURNING *',
      [amount, paymentMethodId, paymentType, status, notes, id]
    );
    return result.rows[0];
  }

  async deletePayment(id) {
    await this.pool.query('DELETE FROM payments WHERE id = $1', [id]);
  }

  async updatePledge(id, data) {
    const { amount, pledgeType, startDate, endDate, frequency, status } = data;
    const result = await this.pool.query(
      'UPDATE pledges SET amount = COALESCE($1, amount), pledge_type = COALESCE($2, pledge_type), start_date = COALESCE($3, start_date), end_date = COALESCE($4, end_date), frequency = COALESCE($5, frequency), status = COALESCE($6, status) WHERE id = $7 RETURNING *',
      [amount, pledgeType, startDate, endDate, frequency, status, id]
    );
    return result.rows[0];
  }

  async deletePledge(id) {
    await this.pool.query('DELETE FROM pledges WHERE id = $1', [id]);
  }

  async getPledgePayments(pledgeId) {
    const result = await this.pool.query(
      'SELECT pp.*, p.payment_date, p.amount as payment_amount FROM pledge_payments pp LEFT JOIN payments p ON pp.payment_id = p.id WHERE pp.pledge_id = $1 ORDER BY pp.created_at DESC',
      [pledgeId]
    );
    return result.rows;
  }

  async getPaymentAnalytics(startDate, endDate, churchId = null) {
    let query = `
      SELECT
        payment_type,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        AVG(amount) as average_amount
      FROM payments
      WHERE status = 'completed'
    `;
    const params = [];
    let paramCount = 0;

    if (startDate) {
      paramCount++;
      query += ` AND payment_date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND payment_date <= $${paramCount}`;
      params.push(endDate);
    }

    if (churchId) {
      paramCount++;
      query += ` AND church_id = $${paramCount}`;
      params.push(churchId);
    }

    query += ' GROUP BY payment_type ORDER BY total_amount DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getPaymentTrends(months = 12, churchId = null) {
    let query = `
      SELECT
        DATE_TRUNC('month', payment_date) as month,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM payments
      WHERE status = 'completed'
      AND payment_date >= CURRENT_DATE - INTERVAL '1 month' * $1
    `;
    const params = [months];

    if (churchId) {
      query += ' AND church_id = $2';
      params.push(churchId);
    }

    query += ' GROUP BY DATE_TRUNC(\'month\', payment_date) ORDER BY month DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async verifyPayment(id) {
    const result = await this.pool.query(
      'UPDATE payments SET status = \'verified\', verified_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  async cancelPayment(id) {
    const result = await this.pool.query(
      'UPDATE payments SET status = \'cancelled\', cancelled_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
}

module.exports = new PaymentsRepository();
