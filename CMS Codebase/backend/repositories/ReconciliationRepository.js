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
}

module.exports = new ReconciliationRepository();
