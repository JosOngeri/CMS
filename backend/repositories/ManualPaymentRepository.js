const BaseRepository = require('./BaseRepository');

class ManualPaymentRepository extends BaseRepository {
  constructor() {
    super('payments');
  }

  /**
   * Create manual payment entry
   */
  async createManualPayment(data) {
    const {
      member_id,
      church_id,
      amount,
      payment_method,
      reference_number,
      notes,
      payment_date,
      payment_type,
      receipt_number,
      recorded_by,
      status
    } = data;

    // Live payments schema: reference_number (searchable), initiated_by,
    // notes — there is no receipt_number or recorded_by column. The generated
    // receipt number is the canonical lookup key; an external reference
    // (cheque/bank ref) is preserved in notes so it stays searchable.
    const mergedNotes = [reference_number ? `External ref: ${reference_number}` : null, notes]
      .filter(Boolean).join(' — ') || null;

    const result = await this.pool.query(
      `INSERT INTO payments
       (member_id, church_id, amount, payment_method, reference_number,
        notes, payment_date, payment_type, initiated_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        member_id || null,
        church_id,
        amount,
        payment_method,
        receipt_number || reference_number || null,
        mergedNotes,
        payment_date || new Date().toISOString(),
        payment_type,
        recorded_by,
        status || 'verified'
      ]
    );
    return result.rows[0];
  }

  /**
   * Atomic daily receipt sequence — a single upsert increments the per-church
   * per-day counter, so concurrent requests can never read the same count
   * (replaces the getTodayPaymentCount + 1 race). Requires
   * payment_receipt_counters (migration 072).
   */
  async getNextReceiptSequence(churchId) {
    const result = await this.pool.query(
      `INSERT INTO payment_receipt_counters (church_id, receipt_date, seq)
       VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (church_id, receipt_date)
       DO UPDATE SET seq = payment_receipt_counters.seq + 1
       RETURNING seq`,
      [churchId]
    );
    return parseInt(result.rows[0].seq);
  }

  /**
   * Get sequential number for today's payments
   * @deprecated racy for receipt numbering — use getNextReceiptSequence
   */
  async getTodayPaymentCount(churchId) {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count 
       FROM payments 
       WHERE church_id = $1 
       AND DATE(created_at) = CURRENT_DATE`,
      [churchId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Get manual payments with filters
   */
  async getManualPayments(churchId, filters = {}) {
    const { limit = 50, offset = 0, payment_method, start_date, end_date } = filters;

    let query = `
      SELECT p.*, 
             m.first_name || ' ' || m.last_name as member_name,
             u.first_name || ' ' || u.last_name as recorded_by_name
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.id
      LEFT JOIN users u ON p.initiated_by = u.id
      WHERE p.church_id = $1
      AND p.payment_method IN ('cash', 'bank_transfer', 'cheque', 'mobile_money_manual')
    `;
    const params = [churchId];
    let paramCount = 2;

    if (payment_method) {
      query += ` AND p.payment_method = $${paramCount++}`;
      params.push(payment_method);
    }

    if (start_date) {
      query += ` AND p.payment_date >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND p.payment_date <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get payment by receipt number
   */
  async getPaymentByReceipt(receiptNumber, churchId) {
    const result = await this.pool.query(
      `SELECT p.*, 
             m.first_name || ' ' || m.last_name as member_name,
             m.phone as member_phone,
             u.first_name || ' ' || u.last_name as recorded_by_name,
             c.name as church_name
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.id
      LEFT JOIN users u ON p.initiated_by = u.id
      LEFT JOIN churches c ON p.church_id = c.id
      WHERE p.reference_number = $1 AND p.church_id = $2`,
      [receiptNumber, churchId]
    );
    return result.rows[0];
  }

  /**
   * Get payment with full details for receipt generation
   */
  async getPaymentWithDetails(receiptNumber, churchId) {
    const result = await this.pool.query(
      `SELECT p.*, 
             m.first_name || ' ' || m.last_name as member_name,
             m.phone as member_phone,
             m.address as member_address,
             u.first_name || ' ' || u.last_name as recorded_by_name,
             c.name as church_name,
             c.address as church_address,
             c.phone as church_phone
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.id
      LEFT JOIN users u ON p.initiated_by = u.id
      LEFT JOIN churches c ON p.church_id = c.id
      WHERE p.reference_number = $1 AND p.church_id = $2`,
      [receiptNumber, churchId]
    );
    return result.rows[0];
  }

  /**
   * Find payment by ID and church
   */
  async findById(id, churchId) {
    const result = await this.pool.query(
      'SELECT * FROM payments WHERE id = $1 AND church_id = $2',
      [id, churchId]
    );
    return result.rows[0];
  }

  /**
   * Update payment
   */
  async updatePayment(id, churchId, data) {
    const { amount, payment_method, reference_number, notes, payment_date } = data;

    const result = await this.pool.query(
      `UPDATE payments
       SET amount = COALESCE($1, amount),
           payment_method = COALESCE($2, payment_method),
           reference_number = COALESCE($3, reference_number),
           notes = COALESCE($4, notes),
           payment_date = COALESCE($5, payment_date),
           updated_at = NOW()
       WHERE id = $6 AND church_id = $7
       RETURNING *`,
      [amount, payment_method, reference_number, notes, payment_date, id, churchId]
    );
    return result.rows[0];
  }

  /**
   * Delete payment
   */
  async deletePayment(id, churchId) {
    // Scoped delete — the prior findById check is TOCTOU-unsafe on its own.
    const result = await this.pool.query(
      'DELETE FROM payments WHERE id = $1 AND church_id = $2', [id, churchId]);
    return result.rowCount > 0;
  }

  /**
   * Get church members for name matching
   */
  async getChurchMembers(churchId) {
    const result = await this.pool.query(
      'SELECT id, first_name, last_name, phone FROM members WHERE church_id = $1',
      [churchId]
    );
    return result.rows;
  }

  /**
   * Update payment with matched member
   */
  async updatePaymentMember(paymentId, memberId, churchId) {
    // Both the payment AND the target member must belong to the church.
    const result = await this.pool.query(
      `UPDATE payments SET member_id = $1
       WHERE id = $2 AND church_id = $3
         AND EXISTS (SELECT 1 FROM members m WHERE m.id = $1 AND m.church_id = $3)
       RETURNING id`,
      [memberId, paymentId, churchId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(churchId, startDate, endDate) {
    let query = `
      SELECT
         COUNT(*) as total_payments,
         SUM(amount) as total_amount,
         AVG(amount) as average_amount,
         COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_count,
         SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as cash_total,
         COUNT(CASE WHEN payment_method = 'bank_transfer' THEN 1 END) as bank_count,
         SUM(CASE WHEN payment_method = 'bank_transfer' THEN amount ELSE 0 END) as bank_total,
         COUNT(CASE WHEN payment_method = 'cheque' THEN 1 END) as cheque_count,
         SUM(CASE WHEN payment_method = 'cheque' THEN amount ELSE 0 END) as cheque_total
       FROM payments
       WHERE church_id = $1
       AND payment_method IN ('cash', 'bank_transfer', 'cheque', 'mobile_money_manual')
    `;
    const params = [churchId];
    let paramCount = 2;

    if (startDate) {
      query += ` AND payment_date >= $${paramCount++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND payment_date <= $${paramCount++}`;
      params.push(endDate);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }
}

module.exports = new ManualPaymentRepository();
