const BaseRepository = require('./BaseRepository');

class AccountingExportRepository extends BaseRepository {
  constructor() {
    super('accounting_exports');
  }

  async getAllExports(filters = {}) {
    const { export_format, status } = filters;
    
    let query = `
      SELECT ae.*, 
             u.first_name || ' ' || u.last_name as created_by_name
      FROM ${this.tableName} ae
      LEFT JOIN users u ON ae.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (export_format) {
      paramCount++;
      query += ` AND ae.export_format = $${paramCount}`;
      params.push(export_format);
    }

    if (status) {
      paramCount++;
      query += ` AND ae.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY ae.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getExportById(id) {
    const result = await this.pool.query(
      `SELECT ae.,
              u.first_name || ' ' || u.last_name as created_by_name
       FROM ${this.tableName} ae
       LEFT JOIN users u ON ae.created_by = u.id
       WHERE ae.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Journal Entries
  // ---------------------------------------------------------------------------

  async getJournalEntries(filters) {
    const { start_date, end_date, status } = filters;

    let query = `
      SELECT je.*,
             u.first_name || ' ' || u.last_name as created_by_name
      FROM journal_entries je
      LEFT JOIN users u ON je.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

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

    if (status) {
      paramCount++;
      query += ` AND je.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY je.entry_date ASC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getJournalEntryLines(entryIds) {
    const result = await this.pool.query(
      `SELECT jel.*, coa.account_name, coa.account_code
       FROM journal_entry_lines jel
       LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
       WHERE jel.journal_entry_id = ANY($1)
       ORDER BY jel.journal_entry_id, jel.id`,
      [entryIds]
    );
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Chart of Accounts
  // ---------------------------------------------------------------------------

  async getChartOfAccounts() {
    const result = await this.pool.query(
      `SELECT coa.*,
              p.account_name as parent_name
       FROM chart_of_accounts coa
       LEFT JOIN chart_of_accounts p ON coa.parent_id = p.id
       WHERE coa.is_active = true
       ORDER BY coa.account_code ASC`
    );
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  async getTransactions(filters) {
    const { start_date, end_date, transaction_type } = filters;

    let query = `
      SELECT t.*,
             u.first_name || ' ' || u.last_name as created_by_name
      FROM transactions t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      query += ` AND t.transaction_date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND t.transaction_date <= $${paramCount}`;
      params.push(end_date);
    }

    if (transaction_type) {
      paramCount++;
      query += ` AND t.transaction_type = $${paramCount}`;
      params.push(transaction_type);
    }

    query += ` ORDER BY t.transaction_date ASC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Export Records
  // ---------------------------------------------------------------------------

  async createExportRecord(data) {
    const { export_type, export_format, date_range_start, date_range_end, record_count, file_path, created_by } = data;
    const result = await this.pool.query(
      `INSERT INTO accounting_exports (export_type, export_format, date_range_start, date_range_end, record_count, file_path, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7)
       RETURNING *`,
      [export_type, export_format, date_range_start, date_range_end, record_count, file_path, created_by]
    );
    return result.rows[0];
  }

  async createExportRecordWithoutDateRange(data) {
    const { export_type, export_format, record_count, file_path, created_by } = data;
    const result = await this.pool.query(
      `INSERT INTO accounting_exports (export_type, export_format, record_count, file_path, status, created_by)
       VALUES ($1, $2, $3, $4, 'completed', $5)
       RETURNING *`,
      [export_type, export_format, record_count, file_path, created_by]
    );
    return result.rows[0];
  }
}

module.exports = new AccountingExportRepository();
