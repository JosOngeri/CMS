const BaseRepository = require('./BaseRepository');

class JournalEntryRepository extends BaseRepository {
  constructor() {
    super('journal_entries');
  }

  async getAllJournalEntries(filters = {}) {
    const { status, start_date, end_date, limit = 50, offset = 0 } = filters;
    
    let query = `
      SELECT je.*, 
             u.first_name || ' ' || u.last_name as created_by_name,
             (SELECT COUNT(*) FROM journal_entry_lines WHERE journal_entry_id = je.id) as line_count,
             (SELECT SUM(debit_amount) FROM journal_entry_lines WHERE journal_entry_id = je.id) as total_debit,
             (SELECT SUM(credit_amount) FROM journal_entry_lines WHERE journal_entry_id = je.id) as total_credit
      FROM ${this.tableName} je
      LEFT JOIN users u ON je.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND je.status = $${paramCount}`;
      params.push(status);
    }

    if (start_date) {
      paramCount++;
      query += ` AND je.entry_date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND je.entry_date <= $${paramCount}`;
      params.push(end_date);
    }

    query += ` ORDER BY je.entry_date DESC, je.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getJournalEntryById(id) {
    const entryResult = await this.pool.query(
      `SELECT je.*, 
              u.first_name || ' ' || u.last_name as created_by_name
       FROM ${this.tableName} je
       LEFT JOIN users u ON je.created_by = u.id
       WHERE je.id = $1`,
      [id]
    );

    if (entryResult.rows.length === 0) {
      return null;
    }

    const linesResult = await this.pool.query(
      `SELECT jel.*, coa.account_code, coa.account_name, coa.account_type
       FROM journal_entry_lines jel
       LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
       WHERE jel.journal_entry_id = $1
       ORDER BY jel.id`,
      [id]
    );

    return {
      ...entryResult.rows[0],
      lines: linesResult.rows
    };
  }

  async createJournalEntry(client, data) {
    const { entry_number, entry_date, description, created_by } = data;

    const entryResult = await client.query(
      `INSERT INTO ${this.tableName} (entry_number, entry_date, description, created_by, status)
       VALUES ($1, $2, $3, $4, 'posted')
       RETURNING *`,
      [entry_number, entry_date, description, created_by]
    );

    return entryResult.rows[0];
  }

  async createJournalEntryLine(client, journalEntryId, line) {
    await client.query(
      `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [journalEntryId, line.account_id, line.debit_amount || 0, line.credit_amount || 0, line.description]
    );
  }

  async updateJournalEntry(client, id, data) {
    const { entry_date, description } = data;

    await client.query(
      'UPDATE journal_entries SET entry_date = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [entry_date, description, id]
    );
  }

  async deleteJournalEntryLines(client, journalEntryId) {
    await client.query(
      'DELETE FROM journal_entry_lines WHERE journal_entry_id = $1',
      [journalEntryId]
    );
  }

  async getJournalEntryStatus(id) {
    const result = await this.pool.query(
      'SELECT status FROM journal_entries WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async voidJournalEntry(id) {
    const result = await this.pool.query(
      'UPDATE journal_entries SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['void', id]
    );
    return result.rows[0];
  }

  async deleteJournalEntry(id) {
    const result = await this.pool.query(`DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`, [id]);
    return result.rows[0];
  }

  async beginTransaction() {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  async commitTransaction(client) {
    await client.query('COMMIT');
    client.release();
  }

  async rollbackTransaction(client) {
    await client.query('ROLLBACK');
    client.release();
  }

  async createJournalEntryWithLines(entryData, lines) {
    const client = await this.beginTransaction();
    try {
      const { entry_date, description, created_by } = entryData;

      const totalDebit = lines.reduce((sum, line) => sum + parseFloat(line.debit_amount || 0), 0);
      const totalCredit = lines.reduce((sum, line) => sum + parseFloat(line.credit_amount || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        await this.rollbackTransaction(client);
        return { error: 'Journal entry must balance. Total debits must equal total credits.', total_debit: totalDebit, total_credit: totalCredit };
      }

      const entryNumber = `JE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      const entryResult = await this.createJournalEntry(client, {
        entry_number: entryNumber,
        entry_date,
        description,
        created_by
      });

      const journalEntryId = entryResult.id;

      for (const line of lines) {
        await this.createJournalEntryLine(client, journalEntryId, line);
      }

      await this.commitTransaction(client);
      return entryResult;
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }

  async updateJournalEntryWithLines(id, entryData, lines) {
    const client = await this.beginTransaction();
    try {
      const { entry_date, description } = entryData;

      const existingEntry = await this.getJournalEntryStatus(id);

      if (!existingEntry) {
        await this.rollbackTransaction(client);
        return { error: 'Journal entry not found' };
      }

      if (existingEntry.status === 'posted') {
        await this.rollbackTransaction(client);
        return { error: 'Cannot update posted journal entry' };
      }

      const totalDebit = lines.reduce((sum, line) => sum + parseFloat(line.debit_amount || 0), 0);
      const totalCredit = lines.reduce((sum, line) => sum + parseFloat(line.credit_amount || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        await this.rollbackTransaction(client);
        return { error: 'Journal entry must balance. Total debits must equal total credits.' };
      }

      await this.updateJournalEntry(client, id, { entry_date, description });
      await this.deleteJournalEntryLines(client, id);

      for (const line of lines) {
        await this.createJournalEntryLine(client, id, line);
      }

      await this.commitTransaction(client);
      return { success: true };
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }
}

module.exports = new JournalEntryRepository();
