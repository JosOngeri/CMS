/**
 * JournalEntry Repository
 * Handles data access for journal entries
 */

const BaseRepository = require('../../../repositories/base.repository');
const { JournalEntry, JournalEntryLine } = require('../models/JournalEntry');

class JournalEntryRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'journal_entries', 'id');
  }

  async findAll(options = {}) {
    const { status, start_date, end_date, reference_type, account_id, churchId, limit = 50, offset = 0 } = options;

    let query = `
      SELECT je.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM journal_entries je
      LEFT JOIN users u ON je.created_by = u.id
      WHERE 1=1
    `;
    let params = [];
    let paramIndex = 1;

    if (churchId) {
      query += ` AND je.church_id = $${paramIndex++}`;
      params.push(churchId);
    }

    if (status) {
      query += ` AND je.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (reference_type) {
      query += ` AND je.reference_type = $${paramIndex++}`;
      params.push(reference_type);
    }
    
    if (start_date) {
      query += ` AND je.entry_date >= $${paramIndex++}`;
      params.push(start_date);
    }
    
    if (end_date) {
      query += ` AND je.entry_date <= $${paramIndex++}`;
      params.push(end_date);
    }
    
    if (account_id) {
      query += ` AND EXISTS (
        SELECT 1 FROM journal_entry_lines jel 
        WHERE jel.journal_entry_id = je.id AND jel.account_id = $${paramIndex++}
      )`;
      params.push(account_id);
    }
    
    query += ` ORDER BY je.entry_date DESC, je.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    
    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) return [];

    // Batch-fetch all lines in one query (avoids N+1)
    const entryIds = result.rows.map(row => row.id);
    const linesResult = await this.pool.query(
      `SELECT jel.*, a.account_name, a.account_number
       FROM journal_entry_lines jel
       LEFT JOIN accounts a ON jel.account_id = a.id
       WHERE jel.journal_entry_id = ANY($1)
       ORDER BY jel.journal_entry_id, jel.line_number`,
      [entryIds]
    );

    const linesByEntry = new Map();
    for (const row of linesResult.rows) {
      if (!linesByEntry.has(row.journal_entry_id)) linesByEntry.set(row.journal_entry_id, []);
      linesByEntry.get(row.journal_entry_id).push(new JournalEntryLine(row));
    }

    return result.rows.map(row =>
      JournalEntry.fromDatabase(row, linesByEntry.get(row.id) || [])
    );
  }

  async findById(id, churchId) {
    if (!churchId) throw new Error('findById: churchId is required');
    const query = `
      SELECT je.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM journal_entries je
      LEFT JOIN users u ON je.created_by = u.id
      WHERE je.id = $1  AND je.church_id = $2
    `;
    const result = await this.pool.query(query, [id, churchId]);
    
    if (!result.rows[0]) return null;
    
    const lines = await this.getEntryLines(id);
    return JournalEntry.fromDatabase(result.rows[0], lines);
  }

  /**
   * Verify every line's account_id belongs to this church — prevents journal
   * entries posting debits/credits onto another tenant's chart of accounts.
   */
  async validateLineAccounts(entry, churchId, client = null) {
    const accountIds = [...new Set(entry.lines.map(l => l.account_id).filter(Boolean))];
    if (accountIds.length === 0) return;
    const executor = client || this.pool;
    const result = await executor.query(
      `SELECT COUNT(*)::int AS owned FROM accounts WHERE id = ANY($1) AND church_id = $2`,
      [accountIds, churchId]
    );
    if (result.rows[0].owned !== accountIds.length) {
      throw new Error('One or more line accounts do not belong to this church');
    }
  }

  async getEntryLines(journalEntryId) {
    const query = `
      SELECT jel.*, a.account_name, a.account_number
      FROM journal_entry_lines jel
      LEFT JOIN accounts a ON jel.account_id = a.id
      WHERE jel.journal_entry_id = $1
      ORDER BY jel.line_number
    `;
    const result = await this.pool.query(query, [journalEntryId]);
    return result.rows.map(row => new JournalEntryLine(row));
  }

  async create(entry, churchId, client = null) {
    if (!churchId) throw new Error('create: churchId is required');
    const validation = entry.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const data = entry.toDatabase();
    const queryExecutor = client || this.pool;

    await this.validateLineAccounts(entry, churchId, client);

    // Insert journal entry
    const entryQuery = `
      INSERT INTO journal_entries (
        entry_date, description, reference_type, reference_id,
        status, total_debits, total_credits, created_by, church_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const entryResult = await queryExecutor.query(entryQuery, [
      data.entry_date, data.description, data.reference_type, data.reference_id,
      data.status, entry.total_debits, entry.total_credits, data.created_by, churchId
    ]);
    
    const entryId = entryResult.rows[0].id;
    
    // Insert journal entry lines
    const lineQuery = `
      INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, debit_amount, credit_amount, description, line_number
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    for (const line of entry.lines) {
      await queryExecutor.query(lineQuery, [
        entryId, line.account_id, line.debit_amount, line.credit_amount,
        line.description, line.line_number
      ]);
    }
    
    return this.findById(entryId, churchId);
  }

  async update(id, entry, churchId) {
    if (!churchId) throw new Error('update: churchId is required');
    const data = entry.toDatabase();

    await this.transaction(async client => {
      await this.validateLineAccounts(entry, churchId, client);

      // Update journal entry (church-scoped)
      const entryQuery = `
        UPDATE journal_entries SET
          entry_date = $1, description = $2, reference_type = $3,
          reference_id = $4, status = $5, total_debits = $6, total_credits = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8 AND church_id = $9 AND status = 'draft'
      `;

      await client.query(entryQuery, [
        data.entry_date, data.description, data.reference_type, data.reference_id,
        data.status, entry.total_debits, entry.total_credits, id,
        ...([churchId])
      ]);
      
      // Delete existing lines
      await client.query('DELETE FROM journal_entry_lines WHERE journal_entry_id = $1', [id]);
      
      // Insert new lines
      const lineQuery = `
        INSERT INTO journal_entry_lines (
          journal_entry_id, account_id, debit_amount, credit_amount, description, line_number
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      for (const line of entry.lines) {
        await client.query(lineQuery, [
          id, line.account_id, line.debit_amount, line.credit_amount,
          line.description, line.line_number
        ]);
      }
    });
    
    return this.findById(id, churchId);
  }

  async reverse(id, userId, churchId) {
    if (!churchId) throw new Error('reverse: churchId is required');
    const original = await this.findById(id, churchId);
    if (!original) throw new Error('Journal entry not found');

    return this.transaction(async client => {
      // Mark original as reversed
      await client.query(
        `UPDATE journal_entries SET status = 'reversed' WHERE id = $1  AND church_id = $2`,
        [id, churchId]
      );
      
      // Create reversing entry
      const reversalLines = original.lines.map(line => ({
        ...line,
        debit_amount: line.credit_amount,
        credit_amount: line.debit_amount
      }));
      
      const reversal = new JournalEntry({
        entry_date: new Date().toISOString().split('T')[0],
        description: `Reversal of entry #${id}: ${original.description}`,
        reference_type: 'reversal',
        reference_id: id,
        status: 'posted',
        created_by: userId,
        lines: reversalLines
      });
      
      return this.create(reversal, churchId, client);
    });
  }

  async delete(id, churchId) {
    if (!churchId) throw new Error('delete: churchId is required');
    const query = 'DELETE FROM journal_entries WHERE id = $1 AND church_id = $2 RETURNING *';
    const result = await this.pool.query(query, [id, churchId]);
    return result.rows[0] || null;
  }

  async getAccountTransactions(accountId, options = {}) {
    const { start_date, end_date, churchId, limit = 50 } = options;
    
    let query = `
      SELECT 
        jel.id,
        jel.journal_entry_id,
        jel.debit_amount,
        jel.credit_amount,
        jel.description as line_description,
        je.entry_date,
        je.description as entry_description,
        je.reference_type,
        SUM(jel.debit_amount - jel.credit_amount) OVER (ORDER BY je.entry_date, je.id) as running_balance
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE jel.account_id = $1 AND je.status = 'posted'
    `;
    let params = [accountId];
    let paramIndex = 2;

    if (churchId) {
      query += ` AND je.church_id = $${paramIndex++}`;
      params.push(churchId);
    }
    
    if (start_date) {
      query += ` AND je.entry_date >= $${paramIndex++}`;
      params.push(start_date);
    }
    
    if (end_date) {
      query += ` AND je.entry_date <= $${paramIndex++}`;
      params.push(end_date);
    }
    
    query += ` ORDER BY je.entry_date DESC, je.id DESC LIMIT $${paramIndex++}`;
    params.push(limit);
    
    const result = await this.pool.query(query, params);
    return result.rows;
  }
}

module.exports = JournalEntryRepository;
