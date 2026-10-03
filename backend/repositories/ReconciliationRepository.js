const BaseRepository = require('./BaseRepository');

class ReconciliationRepository extends BaseRepository {
  constructor() {
    super('reconciliation_queue');
  }

  async pushTransaction(transactionData) {
    const { church_id, transaction_code, sender_name, amount, source_type } = transactionData;
    const query = `
      INSERT INTO reconciliation_queue
      (id, church_id, transaction_code, sender_name, amount, source_type)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      ON CONFLICT (transaction_code) DO NOTHING
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      church_id,
      transaction_code,
      sender_name,
      amount,
      source_type
    ]);
    return result.rows[0];
  }

  /**
   * Push a batch of relay transactions atomically — either all land in the
   * queue or none do. Each row is deduplicated on transaction_code.
   */
  async pushTransactions(transactions) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const tx of transactions) {
        await client.query(
          `INSERT INTO reconciliation_queue
           (id, church_id, transaction_code, sender_name, amount, source_type)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
           ON CONFLICT (transaction_code) DO NOTHING`,
          [tx.church_id, tx.transaction_code, tx.sender_name, tx.amount, tx.source_type]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getPendingTransactions(churchId) {
    const query = `
      SELECT * FROM reconciliation_queue
      WHERE church_id = $1 AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const result = await this.pool.query(query, [churchId]);
    return result.rows;
  }

  async verifyTransaction(id, status, notes, userId, editHistory, churchId) {
    const query = `
      UPDATE reconciliation_queue
      SET status = $1, is_verified = true, verified_by = $2, edit_history = $3, notes = $4
      WHERE id = $5 AND church_id = $6
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      status,
      userId,
      JSON.stringify(editHistory),
      notes,
      id,
      churchId
    ]);
    return result.rows[0];
  }

  async findById(id, churchId) {
    const query = 'SELECT * FROM reconciliation_queue WHERE id = $1 AND church_id = $2';
    const result = await this.pool.query(query, [id, churchId]);
    return result.rows[0];
  }

  /**
   * Verify a transaction while appending a forensic edit-history entry.
   * Audit trail assembly lives here so controllers stay HTTP-only.
   */
  async verifyWithAuditTrail(id, status, notes, userId, churchId) {
    const currentTx = await this.findById(id, churchId);
    if (!currentTx) return null;

    const editHistory = currentTx.edit_history || [];
    editHistory.push({
      editor_id: userId,
      timestamp: new Date().toISOString(),
      old_status: currentTx.status
    });

    return this.verifyTransaction(id, status, notes, userId, editHistory, churchId);
  }
}

module.exports = new ReconciliationRepository();
