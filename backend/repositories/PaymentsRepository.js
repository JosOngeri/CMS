/**
 * @audit Payments repository (plural — standard payments/pledges/refunds).
 * @fixed duplicate getRefunds removed (kept refunds-table JOIN version); createPayment
 *        inserts church_id/payment_date; updatePaymentStatus takes optional churchId
 *        WHERE param. @known remaining: updatePayment/deletePayment/pledge mutations unscoped.
 *        transactionId slot; update/delete/verify/cancel/getPledgePayments unscoped.
 */
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
    const { memberId, paymentMethodId, paymentType, status, startDate, endDate, limit = 50, offset = 0, churchId } = filters;

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

    // Tenant scope first — the controller always passes churchId; without
    // this the listing leaks every church's payments to any finance role.
    if (churchId) {
      paramCount++;
      query += ` AND p.church_id = $${paramCount}`;
      params.push(churchId);
    }

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

  // Duplicate guard used by payments.controller before insert — same member + amount
  // + payment date created within the last 5 minutes.
  async checkDuplicatePayment(memberId, amount, paymentDate, churchId = null) {
    let query = `
      SELECT id FROM payments
      WHERE member_id = $1 AND amount = $2
        AND payment_date::date = $3::date
        AND created_at >= NOW() - INTERVAL '5 minutes'
    `;
    const params = [memberId, amount, paymentDate];
    if (churchId) {
      query += ` AND church_id = $4`;
      params.push(churchId);
    }
    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async createPayment(paymentMethodId, memberId, amount, paymentType, referenceNumber, transactionId, processedBy, notes, churchId = null, paymentDate = null) {
    const columns = 'payment_method_id, member_id, amount, payment_type, reference_number, transaction_id, processed_by, notes';
    const values = '$1, $2, $3, $4, $5, $6, $7, $8';
    const params = [paymentMethodId, memberId, amount, paymentType, referenceNumber, transactionId, processedBy, notes];

    let extraCols = '';
    let extraVals = '';
    if (churchId) {
      extraCols += ', church_id';
      extraVals += `, $${params.length + 1}`;
      params.push(churchId);
    }
    if (paymentDate) {
      extraCols += ', payment_date';
      extraVals += `, $${params.length + 1}`;
      params.push(paymentDate);
    }

    const result = await this.pool.query(
      `INSERT INTO payments (${columns}${extraCols})
       VALUES (${values}${extraVals})
       RETURNING *`,
      params
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

  async updatePaymentStatus(id, status, transactionId = null, churchId = null) {
    const params = [status, id, transactionId];
    let whereClause = 'id = $2';
    if (churchId) {
      whereClause += ' AND church_id = $4';
      params.push(churchId);
    }

    const result = await this.pool.query(
      `UPDATE payments
       SET status = $1, transaction_id = COALESCE($3, transaction_id)
       WHERE ${whereClause}
       RETURNING *`,
      params
    );
    const payment = result.rows[0];
    // Manual completion (treasurer marks an obligation payment paid) must recalc
    // the obligation too — same as the M-Pesa completion paths.
    if (payment?.obligation_id) {
      const PaymentRepository = require('./PaymentRepository');
      await PaymentRepository.recalcObligation(payment.obligation_id).catch(() => {});
    }
    return payment;
  }

  async getPledgesWithFilters(filters) {
    const { memberId, status, pledgeType, churchId } = filters;
    if (!churchId) throw new Error('getPledgesWithFilters: churchId is required');

    // amount_paid is cached on the pledge row (migration 074 trigger keeps it
    // in sync) — no per-fetch SUM over pledge_payments.
    let query = `
      SELECT p.*,
             m.first_name || ' ' || m.last_name as member_name,
             COALESCE(p.amount_paid, 0) as amount_paid
      FROM pledges p
      LEFT JOIN members m ON p.member_id = m.id
      WHERE p.church_id = $1
    `;
    const params = [churchId];
    let paramCount = 1;

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

    query += ' ORDER BY p.created_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async createPledge(memberId, amount, pledgeType, startDate, endDate, frequency, churchId) {
    if (!churchId) throw new Error('createPledge: churchId is required');
    const result = await this.pool.query(
      `INSERT INTO pledges (member_id, amount, pledge_type, start_date, end_date, frequency, church_id)
       SELECT $1, $2, $3, $4, $5, $6, $7
       WHERE EXISTS (SELECT 1 FROM members m WHERE m.id = $1 AND m.church_id = $7)
       RETURNING *`,
      [memberId, amount, pledgeType, startDate, endDate, frequency, churchId]
    );
    return result.rows[0];
  }

  async addPledgePayment(pledgeId, paymentId, amount, churchId) {
    if (!churchId) throw new Error('addPledgePayment: churchId is required');
    // Both the pledge and the payment must belong to the caller's church.
    const result = await this.pool.query(
      `INSERT INTO pledge_payments (pledge_id, payment_id, amount)
       SELECT $1, $2, $3
       WHERE EXISTS (SELECT 1 FROM pledges pl WHERE pl.id = $1 AND pl.church_id = $4)
         AND EXISTS (SELECT 1 FROM payments py WHERE py.id = $2 AND py.church_id = $4)
       RETURNING *`,
      [pledgeId, paymentId, amount, churchId]
    );
    return result.rows[0];
  }

  async getPaymentSummary(startDate, endDate, churchId = null) {
    let where = "status = 'completed'";
    const params = [];

    if (startDate && endDate) {
      where += ' AND payment_date BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }

    if (churchId) {
      where += ` AND church_id = $${params.length + 1}`;
      params.push(churchId);
    }

    const result = await this.pool.query(
      `SELECT
         payment_type,
         COUNT(*) as count,
         COALESCE(SUM(amount), 0) as total_amount
       FROM payments
       WHERE ${where}
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
    const { status, limit = 50, offset = 0, churchId } = filters;

    // payments.member_id points at members(id), not users(id) — a user id
    // never matches it directly. Resolve ownership three ways: the account
    // that initiated the payment, the user's member record, or an obligation
    // assigned to the user.
    let query = `
      SELECT p.*,
             pm.name as payment_method_name
      FROM payments p
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      WHERE (
        p.user_id = $1
        OR p.initiated_by = $1
        OR p.member_id IN (SELECT m.id FROM members m WHERE m.user_id = $1)
        OR p.obligation_id IN (SELECT mo.id FROM member_obligations mo WHERE mo.user_id = $1)
      )
    `;
    const params = [userId];
    let paramCount = 1;

    if (churchId) {
      paramCount++;
      query += ` AND (p.church_id = $${paramCount} OR p.church_id IS NULL)`;
      params.push(churchId);
    }

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
              COALESCE(m.first_name || ' ' || m.last_name, u.first_name || ' ' || u.last_name) as member_name
       FROM payments p
       LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
       LEFT JOIN members m ON p.member_id = m.id
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = $1 AND (
         p.user_id = $2
         OR p.initiated_by = $2
         OR p.member_id IN (SELECT mm.id FROM members mm WHERE mm.user_id = $2)
         OR p.obligation_id IN (SELECT mo.id FROM member_obligations mo WHERE mo.user_id = $2)
       )`,
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
    const params = [status, processedBy, refundId];
    // Only pending refunds may transition — prevents double approve/reject
    let where = "id = $3 AND status = 'pending'";
    if (churchId) {
      where += ' AND church_id = $4';
      params.push(churchId);
    }

    // AND clause must sit inside WHERE — the old code appended it after
    // RETURNING, which was invalid SQL whenever churchId was passed
    const result = await this.pool.query(
      `UPDATE refunds SET status = $1, processed_by = $2 WHERE ${where} RETURNING *`,
      params
    );
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

  async updatePayment(id, data, churchId = null) {
    const { amount, paymentMethodId, paymentType, status, notes } = data;
    const params = [amount, paymentMethodId, paymentType, status, notes, id];
    let where = 'id = $6';
    if (churchId) {
      where += ' AND church_id = $7';
      params.push(churchId);
    }
    const result = await this.pool.query(
      `UPDATE payments SET amount = COALESCE($1, amount), payment_method_id = COALESCE($2, payment_method_id), payment_type = COALESCE($3, payment_type), status = COALESCE($4, status), notes = COALESCE($5, notes) WHERE ${where} RETURNING *`,
      params
    );
    return result.rows[0];
  }

  async deletePayment(id, churchId = null) {
    const params = [id];
    let where = 'id = $1';
    if (churchId) {
      where += ' AND church_id = $2';
      params.push(churchId);
    }
    await this.pool.query(`DELETE FROM payments WHERE ${where}`, params);
  }

  async updatePledge(id, data, churchId) {
    if (!churchId) throw new Error('updatePledge: churchId is required');
    const { amount, pledgeType, startDate, endDate, frequency, status } = data;
    const params = [amount, pledgeType, startDate, endDate, frequency, status, id, churchId];
    const where = 'id = $7 AND church_id = $8';
    const result = await this.pool.query(
      `UPDATE pledges SET amount = COALESCE($1, amount), pledge_type = COALESCE($2, pledge_type), start_date = COALESCE($3, start_date), end_date = COALESCE($4, end_date), frequency = COALESCE($5, frequency), status = COALESCE($6, status) WHERE ${where} RETURNING *`,
      params
    );
    return result.rows[0];
  }

  async deletePledge(id, churchId) {
    if (!churchId) throw new Error('deletePledge: churchId is required');
    await this.pool.query('DELETE FROM pledges WHERE id = $1 AND church_id = $2', [id, churchId]);
  }

  async getPledgePayments(pledgeId, churchId) {
    if (!churchId) throw new Error('getPledgePayments: churchId is required');
    const params = [pledgeId, churchId];
    const where = 'pp.pledge_id = $1 AND pl.church_id = $2';
    const result = await this.pool.query(
      `SELECT pp.*, p.payment_date, p.amount as payment_amount
       FROM pledge_payments pp
       LEFT JOIN payments p ON pp.payment_id = p.id
       JOIN pledges pl ON pp.pledge_id = pl.id
       WHERE ${where} ORDER BY pp.created_at DESC`,
      params
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

  // payments has no verified_at/cancelled_at columns — updated_at only
  async verifyPayment(id, churchId = null) {
    const params = [id];
    let where = 'id = $1';
    if (churchId) {
      where += ' AND church_id = $2';
      params.push(churchId);
    }
    const result = await this.pool.query(
      `UPDATE payments SET status = 'verified', updated_at = CURRENT_TIMESTAMP WHERE ${where} RETURNING *`,
      params
    );
    return result.rows[0];
  }

  async cancelPayment(id, churchId = null) {
    const params = [id];
    let where = 'id = $1';
    if (churchId) {
      where += ' AND church_id = $2';
      params.push(churchId);
    }
    const result = await this.pool.query(
      `UPDATE payments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE ${where} RETURNING *`,
      params
    );
    return result.rows[0];
  }
}

module.exports = new PaymentsRepository();
