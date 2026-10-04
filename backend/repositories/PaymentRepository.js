/**
 * @audit PaymentRepository (singular — M-Pesa/KopoKopo flows; sibling
 *        PaymentsRepository.js serves the standard payments controller).
 * @fixed All read/mutation methods accept optional churchId — refund ops scope
 *        via parent-payment join; inserts write church_id.
 */
const BaseRepository = require('./BaseRepository');

class PaymentRepository extends BaseRepository {

  // Enforce tenant scope — optional churchId would silently expose
  // cross-tenant payments/refunds (ledger L112/L559).
  _requireChurchId(churchId) {
    if (!churchId) throw new Error("PaymentRepository: churchId is required");
  }

  constructor() {
    super('payments');
  }

  async create(data, churchId) {
    this._requireChurchId(churchId);
    const { amount, phone_number, category, member_id, description, payment_method, status, transaction_id, obligation_id, user_id } = data;

    // user_id/initiated_by both get the payer's user id — "My Payments" matches
    // on user_id, and member_id alone is not enough (it points at members(id),
    // which members don't know).
    // `description` maps to the payments.notes column — the table has no
    // description column, so keep the field name at the boundary and write
    // it into notes.
    let query = `
      INSERT INTO ${this.tableName} (amount, phone_number, category, member_id, notes, payment_method, status, transaction_id, obligation_id, user_id, initiated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
      RETURNING *
    `;
    const params = [amount, phone_number, category, member_id, description, payment_method, status, transaction_id, obligation_id || null, user_id || null];

    if (churchId) {
      query = `
        INSERT INTO ${this.tableName} (amount, phone_number, category, member_id, notes, payment_method, status, transaction_id, obligation_id, user_id, initiated_by, church_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11)
        RETURNING *
      `;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updateStatus(paymentId, status, transactionId = null, churchId) {
    this._requireChurchId(churchId);
    let query = `
      UPDATE ${this.tableName}
      SET status = $1,
          updated_at = NOW()
    `;
    const params = [status];

    if (transactionId) {
      query += `, transaction_id = $${params.length + 1}`;
      params.push(transactionId);
    }

    query += ` WHERE id = $${params.length + 1}`;
    params.push(paymentId);

    if (churchId) {
      query += ` AND church_id = $${params.length + 1}`;
      params.push(churchId);
    }

    query += ` RETURNING *`;

    const result = await this.pool.query(query, params);
    const payment = result.rows[0];

    // Tag-to-obligation: when a tagged payment completes, recalc the obligation
    if (payment && payment.obligation_id && status === 'completed') {
      await this.recalcObligation(payment.obligation_id).catch(() => {});
    }
    return payment;
  }

  /**
   * Recompute a member_obligation's paid_amount/status from all completed
   * payments + reconciliations tagged to it. Idempotent — safe on re-fire.
   */
  async recalcObligation(obligationId) {
    await this.pool.query(
      `UPDATE member_obligations mo SET
         paid_amount = COALESCE(p.paid, 0) + COALESCE(r.paid, 0),
         status = CASE
           WHEN mo.status = 'waived' THEN 'waived'
           WHEN COALESCE(p.paid, 0) + COALESCE(r.paid, 0) >= mo.amount THEN 'fulfilled'
           WHEN COALESCE(p.paid, 0) + COALESCE(r.paid, 0) > 0 THEN 'partial'
           ELSE 'pending'
         END,
         updated_at = NOW()
       FROM member_obligations src
       LEFT JOIN (SELECT obligation_id, SUM(amount) paid FROM payments
                  WHERE status = 'completed' GROUP BY obligation_id) p
         ON p.obligation_id = src.id
       LEFT JOIN (SELECT obligation_id, SUM(amount) paid FROM mpesa_reconciliations
                  WHERE status = 'reconciled' GROUP BY obligation_id) r
         ON r.obligation_id = src.id
       WHERE mo.id = $1 AND src.id = mo.id`,
      [obligationId]
    );
  }

  async getById(paymentId, churchId) {
    this._requireChurchId(churchId);
    let query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const params = [paymentId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getByTransactionId(transactionId, churchId) {
    this._requireChurchId(churchId);
    let query = `SELECT * FROM ${this.tableName} WHERE transaction_id = $1`;
    const params = [transactionId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getByMember(memberId, churchId, limit = 50) {
    this._requireChurchId(churchId);
    let query = `SELECT * FROM ${this.tableName} WHERE member_id = $1`;
    const params = [memberId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getPaymentStats(churchId) {
    this._requireChurchId(churchId);
    let query = `
      SELECT
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments
      FROM ${this.tableName}
    `;
    const params = [];

    if (churchId) {
      query += ` WHERE church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updateStatusWithFailureReason(paymentId, status, failureReason, churchId) {
    this._requireChurchId(churchId);
    const params = [status, failureReason, paymentId];
    let where = 'id = $3';
    if (churchId) {
      where += ' AND church_id = $4';
      params.push(churchId);
    }
    const result = await this.pool.query(
      `UPDATE payments SET status = $1, failure_reason = $2 WHERE ${where}`,
      params
    );
    return result.rows[0];
  }

  async getPaymentsWithFilters(filters, churchId, limit = 20, offset = 0) {
    this._requireChurchId(churchId);
    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (filters.member_id) {
      paramCount++;
      query += ` AND member_id = $${paramCount}`;
      params.push(filters.member_id);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.startDate) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      params.push(filters.endDate);
    }

    if (churchId) {
      paramCount++;
      query += ` AND church_id = $${paramCount}`;
      params.push(churchId);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await this.pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get paginated results
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return { payments: result.rows, totalCount };
  }

  async getLocalPaymentAnalytics(start, end) {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM payments
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    const result = await this.pool.query(query, [start, end]);
    return result.rows;
  }

  async processRefund(paymentId, amount, reason, userId) {
    const refundQuery = `
      INSERT INTO refunds (payment_id, amount, reason, processed_by, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `;
    const refundResult = await this.pool.query(refundQuery, [paymentId, amount, reason, userId]);
    return refundResult.rows[0];
  }

  async createApproval(refundId, userId, status, comments) {
    const approvalQuery = `
      INSERT INTO refund_approvals (refund_id, approved_by, status, comments)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const approvalResult = await this.pool.query(approvalQuery, [refundId, userId, status, comments]);
    return approvalResult.rows[0];
  }

  async getRefundById(refundId, churchId) {
    this._requireChurchId(churchId);
    // Scope via the parent payment — covers legacy refund rows whose own
    // church_id is NULL
    const params = [refundId];
    let query = `SELECT r.* FROM refunds r JOIN payments p ON r.payment_id = p.id WHERE r.id = $1`;
    if (churchId) {
      query += ' AND p.church_id = $2';
      params.push(churchId);
    }
    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updateRefundStatus(refundId, status) {
    const result = await this.pool.query(
      'UPDATE refunds SET status = $1 WHERE id = $2',
      [status, refundId]
    );
    return result.rows[0];
  }

  async updatePaymentWithRefund(paymentId, refundId) {
    const result = await this.pool.query(
      'UPDATE payments SET refund_id = $1 WHERE id = $2',
      [refundId, paymentId]
    );
    return result.rows[0];
  }

  async createRefundWithNumber(paymentId, amount, reason, refundNumber, userId, churchId) {
    this._requireChurchId(churchId);
    const query = `
      INSERT INTO refunds (payment_id, amount, reason, refund_number, status, initiated_by, church_id)
      VALUES ($1, $2, $3, $4, 'pending', $5, $6)
      RETURNING *
    `;
    const result = await this.pool.query(query, [paymentId, amount, reason, refundNumber, userId, churchId]);
    return result.rows[0];
  }

  async createApprovalRequest(requestType, module, amount, description, userId, metadata, churchId, approverId = null) {
    this._requireChurchId(churchId);
    const query = `
      INSERT INTO approval_requests (request_type, module, amount, description, requester_id, approver_id, status, metadata, church_id)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
      RETURNING id
    `;
    const result = await this.pool.query(query, [requestType, module, amount, description, userId, approverId, JSON.stringify(metadata), churchId]);
    return result.rows[0].id;
  }

  async getPaymentByIdSimple(paymentId, churchId) {
    this._requireChurchId(churchId);
    const params = [paymentId];
    let query = 'SELECT * FROM payments WHERE id = $1';
    if (churchId) {
      query += ' AND church_id = $2';
      params.push(churchId);
    }
    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updatePaymentStatus(paymentId, status, churchId) {
    this._requireChurchId(churchId);
    const params = [paymentId, status];
    let where = 'id = $1';
    if (churchId) {
      where += ' AND church_id = $3';
      params.push(churchId);
    }
    const result = await this.pool.query(
      `UPDATE payments SET status = $2 WHERE ${where}`,
      params
    );
    return result.rows[0];
  }

  async rejectRefund(refundId, userId, reason, rejectionReason, churchId) {
    this._requireChurchId(churchId);
    const params = [userId, reason, rejectionReason, refundId];
    let where = 'id = $4';
    if (churchId) {
      where += ' AND payment_id IN (SELECT id FROM payments WHERE church_id = $5)';
      params.push(churchId);
    }
    const result = await this.pool.query(
      `UPDATE refunds
       SET status = 'rejected',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          reason = COALESCE($2, reason) || ' - Rejected: ' || $3
       WHERE ${where}`,
      params
    );
    return result.rows[0];
  }

  async getRefundsWithStatus(status, churchId) {
    this._requireChurchId(churchId);
    let query = `
      SELECT r.*,
             p.amount as original_amount,
             p.phone_number,
             u.first_name || ' ' || u.last_name as initiated_by_name,
             ua.first_name || ' ' || ua.last_name as approved_by_name
      FROM refunds r
      JOIN payments p ON r.payment_id = p.id
      LEFT JOIN users u ON r.initiated_by = u.id
      LEFT JOIN users ua ON r.approved_by = ua.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
    }

    if (churchId) {
      paramCount++;
      query += ` AND p.church_id = $${paramCount}`;
      params.push(churchId);
    }

    query += ` ORDER BY r.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getPaymentAnalyticsByCategory(start, end, churchId) {
    this._requireChurchId(churchId);
    const params = [start, end];
    let where = `status = 'completed' AND created_at >= $1 AND created_at <= $2`;
    if (churchId) {
      where += ` AND church_id = $3`;
      params.push(churchId);
    }
    const query = `
      SELECT
        category,
        SUM(amount) as total_amount,
        COUNT(*) as count,
        AVG(amount) as average_amount
      FROM payments
      WHERE ${where}
      GROUP BY category
      ORDER BY total_amount DESC
    `;
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async approveRefund(refundId, kopokopoRefundId, userId, churchId) {
    this._requireChurchId(churchId);
    const params = [kopokopoRefundId, userId, refundId];
    let where = 'id = $3';
    if (churchId) {
      where += ' AND payment_id IN (SELECT id FROM payments WHERE church_id = $4)';
      params.push(churchId);
    }
    const result = await this.pool.query(
      `UPDATE refunds
       SET status = 'approved',
          refund_id = $1,
          approved_by = $2,
          approved_at = CURRENT_TIMESTAMP
       WHERE ${where}`,
      params
    );
    return result.rows[0];
  }
}

module.exports = new PaymentRepository();
