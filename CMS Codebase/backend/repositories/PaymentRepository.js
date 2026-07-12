const BaseRepository = require('./BaseRepository');

class PaymentRepository extends BaseRepository {
  constructor() {
    super('payments');
  }

  async create(data, churchId = null) {
    const { amount, phone_number, category, member_id, description, payment_method, status, transaction_id } = data;

    let query = `
      INSERT INTO ${this.tableName} (amount, phone_number, category, member_id, description, payment_method, status, transaction_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [amount, phone_number, category, member_id, description, payment_method, status, transaction_id];

    if (churchId) {
      query = `
        INSERT INTO ${this.tableName} (amount, phone_number, category, member_id, description, payment_method, status, transaction_id, church_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updateStatus(paymentId, status, transactionId = null, churchId = null) {
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
    return result.rows[0];
  }

  async getById(paymentId, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const params = [paymentId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getByTransactionId(transactionId, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE transaction_id = $1`;
    const params = [transactionId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getByMember(memberId, churchId = null, limit = 50) {
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

  async getPaymentStats(churchId = null) {
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

  async updateStatusWithFailureReason(paymentId, status, failureReason) {
    const result = await this.pool.query(
      'UPDATE payments SET status = $1, failure_reason = $2 WHERE id = $3',
      [status, failureReason, paymentId]
    );
    return result.rows[0];
  }

  async getPaymentsWithFilters(filters, churchId = null, limit = 20, offset = 0) {
    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];
    let paramCount = 0;

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

  async getRefundById(refundId) {
    const result = await this.pool.query('SELECT * FROM refunds WHERE id = $1', [refundId]);
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

  async createRefundWithNumber(paymentId, amount, reason, refundNumber, userId) {
    const query = `
      INSERT INTO refunds (payment_id, amount, reason, refund_number, status, initiated_by)
      VALUES ($1, $2, $3, $4, 'pending', $5)
      RETURNING *
    `;
    const result = await this.pool.query(query, [paymentId, amount, reason, refundNumber, userId]);
    return result.rows[0];
  }

  async createApprovalRequest(requestType, module, amount, description, userId, metadata) {
    const query = `
      INSERT INTO approval_requests (request_type, module, amount, description, requested_by, status, metadata)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6)
      RETURNING id
    `;
    const result = await this.pool.query(query, [requestType, module, amount, description, userId, JSON.stringify(metadata)]);
    return result.rows[0].id;
  }

  async getPaymentByIdSimple(paymentId) {
    const result = await this.pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
    return result.rows[0];
  }

  async updatePaymentStatus(paymentId, status) {
    const result = await this.pool.query(
      'UPDATE payments SET status = $2 WHERE id = $1',
      [paymentId, status]
    );
    return result.rows[0];
  }

  async rejectRefund(refundId, userId, reason, rejectionReason) {
    const result = await this.pool.query(
      `UPDATE refunds 
       SET status = 'rejected', 
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          reason = COALESCE($2, reason) || ' - Rejected: ' || $3
       WHERE id = $4`,
      [userId, reason, rejectionReason, refundId]
    );
    return result.rows[0];
  }

  async getRefundsWithStatus(status) {
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

    query += ` ORDER BY r.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getPaymentAnalyticsByCategory(start, end) {
    const query = `
      SELECT 
        category,
        SUM(amount) as total_amount,
        COUNT(*) as count,
        AVG(amount) as average_amount
      FROM payments
      WHERE status = 'completed'
        AND created_at >= $1
        AND created_at <= $2
      GROUP BY category
      ORDER BY total_amount DESC
    `;
    const result = await this.pool.query(query, [start, end]);
    return result.rows;
  }

  async approveRefund(refundId, kopokopoRefundId, userId) {
    const result = await this.pool.query(
      `UPDATE refunds 
       SET status = 'approved', 
          refund_id = $1,
          approved_by = $2,
          approved_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [kopokopoRefundId, userId, refundId]
    );
    return result.rows[0];
  }
}

module.exports = new PaymentRepository();
