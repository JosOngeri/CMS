const { pool } = require('../config/database');
const logger = require('../config/logging');

/**
 * Reconciliation Service (Phase 12)
 * Financial reconciliation system for payment tracking and audit
 * Handles payment matching, discrepancy detection, and financial reporting
 */
class ReconciliationService {
  constructor() {
    this.matchThreshold = 0.01; // 1% tolerance for amount matching
  }

  /**
   * Reconcile payment with bank transaction
   * @param {string} paymentId - Payment ID
   * @param {object} transaction - Bank transaction data
   * @param {string} churchId - Church ID
   * @returns {Promise<object>} Reconciliation result
   */
  async reconcilePayment(paymentId, transaction, churchId) {
    try {
      // Get payment details
      const payment = await this.getPaymentDetails(paymentId, churchId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Check if already reconciled
      if (payment.reconciled_at) {
        return { status: 'already_reconciled', payment };
      }

      // Match payment with transaction
      const match = this.matchPaymentWithTransaction(payment, transaction);

      if (match.isMatch) {
        // Begin transaction
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Lock payment row for update to prevent race conditions
          const lockQuery = `
            SELECT id, reconciled_at
            FROM payments
            WHERE id = $1 AND church_id = $2
            FOR UPDATE
          `;
          await client.query(lockQuery, [paymentId, churchId]);

          // Update payment as reconciled
          await this.markPaymentReconciled(paymentId, transaction.transaction_id, match.discrepancy, client);

          // Update transaction as matched
          await this.markTransactionMatched(transaction.transaction_id, paymentId, client);

          // Add audit log entry
          const auditQuery = `
            INSERT INTO audit_log (table_name, record_id, action, performed_by, church_id, timestamp)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
          `;
          await client.query(auditQuery, ['payments', paymentId, 'reconcile', 'system', churchId]);

          await client.query('COMMIT');
          client.release();

          logger.info(`Payment ${paymentId} reconciled with transaction ${transaction.transaction_id}`);
          return { status: 'reconciled', payment, transaction, match };
        } catch (error) {
          await client.query('ROLLBACK');
          client.release();
          throw error;
        }
      } else {
        // Record discrepancy
        await this.recordDiscrepancy(paymentId, transaction, match.reason);
        
        logger.warn(`Payment ${paymentId} has discrepancy with transaction ${transaction.transaction_id}: ${match.reason}`);
        return { status: 'discrepancy', payment, transaction, match };
      }
    } catch (error) {
      logger.error('Reconciliation error:', error);
      throw error;
    }
  }

  /**
   * Get payment details
   * @param {string} paymentId - Payment ID
   * @param {string} churchId - Church ID
   * @returns {Promise<object>} Payment details
   */
  async getPaymentDetails(paymentId, churchId) {
    const query = `
      SELECT id, amount, transaction_code, payment_date, member_id, church_id, reconciled_at
      FROM payments
      WHERE id = $1 AND church_id = $2
    `;
    const result = await pool.query(query, [paymentId, churchId]);
    return result.rows[0] || null;
  }

  /**
   * Match payment with transaction
   * @param {object} payment - Payment data
   * @param {object} transaction - Transaction data
   * @returns {object} Match result
   */
  matchPaymentWithTransaction(payment, transaction) {
    // Check amount match with tolerance
    const amountDiff = Math.abs(parseFloat(payment.amount) - parseFloat(transaction.amount));
    const amountMatch = amountDiff <= (parseFloat(payment.amount) * this.matchThreshold);

    // Check date match (within 3 days)
    const paymentDate = new Date(payment.payment_date);
    const transactionDate = new Date(transaction.date);
    const dateDiff = Math.abs(paymentDate - transactionDate) / (1000 * 60 * 60 * 24);
    const dateMatch = dateDiff <= 3;

    // Check transaction code match
    const codeMatch = payment.transaction_code === transaction.code;

    if (amountMatch && dateMatch && codeMatch) {
      return {
        isMatch: true,
        discrepancy: amountDiff,
        reason: null
      };
    }

    let reason = [];
    if (!amountMatch) reason.push('amount');
    if (!dateMatch) reason.push('date');
    if (!codeMatch) reason.push('code');

    return {
      isMatch: false,
      discrepancy: amountDiff,
      reason: reason.join(', ')
    };
  }

  /**
   * Mark payment as reconciled
   * @param {string} paymentId - Payment ID
   * @param {string} transactionId - Transaction ID
   * @param {number} discrepancy - Amount discrepancy
   * @param {object} client - Optional database client for transactions
   */
  async markPaymentReconciled(paymentId, transactionId, discrepancy, client = null) {
    const query = `
      UPDATE payments
      SET reconciled_at = CURRENT_TIMESTAMP,
          transaction_id = $2,
          discrepancy = $3
      WHERE id = $1
    `;
    const db = client || pool;
    await db.query(query, [paymentId, transactionId, discrepancy]);
  }

  /**
   * Mark transaction as matched
   * @param {string} transactionId - Transaction ID
   * @param {string} paymentId - Payment ID
   * @param {object} client - Optional database client for transactions
   */
  async markTransactionMatched(transactionId, paymentId, client = null) {
    const query = `
      UPDATE bank_transactions
      SET matched_payment_id = $2,
          matched_at = CURRENT_TIMESTAMP
      WHERE transaction_id = $1
    `;
    const db = client || pool;
    await db.query(query, [transactionId, paymentId]);
  }

  /**
   * Record discrepancy
   * @param {string} paymentId - Payment ID
   * @param {object} transaction - Transaction data
   * @param {string} reason - Discrepancy reason
   */
  async recordDiscrepancy(paymentId, transaction, reason) {
    const query = `
      INSERT INTO payment_discrepancies (payment_id, transaction_id, reason, amount_diff, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `;
    await pool.query(query, [paymentId, transaction.id, reason, transaction.amount_diff || 0]);
  }

  /**
   * Get unreconciled payments
   * @param {string} churchId - Church ID
   * @param {object} filters - Filter options
   * @returns {Promise<object[]>} Unreconciled payments
   */
  async getUnreconciledPayments(churchId, filters = {}) {
    const conditions = ['church_id = $1', 'reconciled_at IS NULL'];
    const params = [churchId];
    let paramCount = 2;

    if (filters.start_date) {
      conditions.push(`payment_date >= $${paramCount++}`);
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push(`payment_date <= $${paramCount++}`);
      params.push(filters.end_date);
    }

    const query = `
      SELECT id, amount, transaction_code, payment_date, member_id
      FROM payments
      WHERE ${conditions.join(' AND ')}
      ORDER BY payment_date DESC
      LIMIT ${filters.limit || 100}
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get reconciliation statistics
   * @param {string} churchId - Church ID
   * @param {object} filters - Date filters
   * @returns {Promise<object>} Reconciliation statistics
   */
  async getReconciliationStats(churchId, filters = {}) {
    const conditions = ['church_id = $1'];
    const params = [churchId];
    let paramCount = 2;

    if (filters.start_date) {
      conditions.push(`payment_date >= $${paramCount++}`);
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push(`payment_date <= $${paramCount++}`);
      params.push(filters.end_date);
    }

    const query = `
      SELECT
        COUNT(*) as total_payments,
        COUNT(*) FILTER (WHERE reconciled_at IS NOT NULL) as reconciled,
        COUNT(*) FILTER (WHERE reconciled_at IS NULL) as unreconciled,
        SUM(amount) as total_amount,
        SUM(amount) FILTER (WHERE reconciled_at IS NOT NULL) as reconciled_amount,
        SUM(amount) FILTER (WHERE reconciled_at IS NULL) as unreconciled_amount
      FROM payments
      WHERE ${conditions.join(' AND ')}
    `;

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Auto-reconcile payments with matching transactions
   * @param {string} churchId - Church ID
   * @returns {Promise<object>} Auto-reconciliation result
   */
  async autoReconcile(churchId) {
    try {
      // Get unreconciled payments
      const payments = await this.getUnreconciledPayments(churchId);

      let reconciled = 0;
      let discrepancies = 0;

      for (const payment of payments) {
        // Find matching transaction
        const transaction = await this.findMatchingTransaction(payment);
        
        if (transaction) {
          const result = await this.reconcilePayment(payment.id, transaction);
          if (result.status === 'reconciled') {
            reconciled++;
          } else {
            discrepancies++;
          }
        }
      }

      logger.info(`Auto-reconciliation completed: ${reconciled} reconciled, ${discrepancies} discrepancies`);
      return { reconciled, discrepancies, total: payments.length };
    } catch (error) {
      logger.error('Auto-reconciliation error:', error);
      throw error;
    }
  }

  /**
   * Find matching transaction for payment
   * @param {object} payment - Payment data
   * @returns {Promise<object>} Matching transaction
   */
  async findMatchingTransaction(payment) {
    const query = `
      SELECT transaction_id, amount, date, code
      FROM bank_transactions
      WHERE matched_payment_id IS NULL
        AND code = $1
        AND ABS(amount - $2) <= (amount * 0.01)
        AND date >= $3
        AND date <= $4
      ORDER BY date DESC
      LIMIT 1
    `;

    const paymentDate = new Date(payment.payment_date);
    const startDate = new Date(paymentDate.setDate(paymentDate.getDate() - 3));
    const endDate = new Date(paymentDate.setDate(paymentDate.getDate() + 6));

    const result = await pool.query(query, [
      payment.transaction_code,
      payment.amount,
      startDate,
      endDate
    ]);

    return result.rows[0] || null;
  }

  /**
   * Get discrepancy report
   * @param {string} churchId - Church ID
   * @param {object} filters - Filter options
   * @returns {Promise<object[]>} Discrepancies
   */
  async getDiscrepancyReport(churchId, filters = {}) {
    const conditions = ['pd.church_id = $1'];
    const params = [churchId];
    let paramCount = 2;

    if (filters.start_date) {
      conditions.push(`pd.created_at >= $${paramCount++}`);
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push(`pd.created_at <= $${paramCount++}`);
      params.push(filters.end_date);
    }

    const query = `
      SELECT
        pd.id,
        pd.payment_id,
        pd.transaction_id,
        pd.reason,
        pd.amount_diff,
        pd.created_at,
        p.amount as payment_amount,
        p.transaction_code,
        p.payment_date,
        bt.amount as transaction_amount,
        bt.date as transaction_date
      FROM payment_discrepancies pd
      LEFT JOIN payments p ON pd.payment_id = p.id
      LEFT JOIN bank_transactions bt ON pd.transaction_id = bt.transaction_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY pd.created_at DESC
      LIMIT ${filters.limit || 100}
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = new ReconciliationService();
