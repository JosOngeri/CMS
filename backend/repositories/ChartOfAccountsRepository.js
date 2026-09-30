const BaseRepository = require('./BaseRepository');

class ChartOfAccountsRepository extends BaseRepository {
  constructor() {
    super('chart_of_accounts');
  }

  async getAllWithHierarchy(churchId = null) {
    let query = `
      SELECT coa.*,
             parent.account_name as parent_name,
             parent.account_code as parent_code,
             (SELECT COUNT(*) FROM chart_of_accounts WHERE parent_id = coa.id) as child_count,
             (SELECT COALESCE(SUM(debit), 0) FROM journal_entries WHERE account_id = coa.id) as total_debit,
             (SELECT COALESCE(SUM(credit), 0) FROM journal_entries WHERE account_id = coa.id) as total_credit
      FROM ${this.tableName} coa
      LEFT JOIN chart_of_accounts parent ON coa.parent_id = parent.id
      WHERE 1=1
    `;
    const params = [];

    if (churchId) {
      query += ` AND coa.church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY coa.account_code`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getByType(accountType, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE account_type = $1`;
    const params = [accountType];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY account_number`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getByCategory(category, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE category = $1`;
    const params = [category];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY account_number`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAccountBalance(accountId, churchId = null) {
    let query = `
      SELECT
        (SELECT COALESCE(SUM(debit), 0) FROM journal_entries WHERE account_id = $1) as total_debit,
        (SELECT COALESCE(SUM(credit), 0) FROM journal_entries WHERE account_id = $1) as total_credit
    `;
    const params = [accountId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getActiveAccounts(churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE is_active = true`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY account_number`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async findAll(filters = {}, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (churchId) {
      paramCount++;
      query += ` AND church_id = $${paramCount}`;
      params.push(churchId);
    }

    if (filters.account_type) {
      paramCount++;
      query += ` AND account_type = $${paramCount}`;
      params.push(filters.account_type);
    }

    if (filters.is_active !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      params.push(filters.is_active);
    }

    query += ` ORDER BY account_number`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async create(data) {
    const {
      account_code, account_name, account_type, category,
      parent_id, is_active, description, church_id
    } = data;

    const query = `
      INSERT INTO chart_of_accounts (account_code, account_name, account_type, category, parent_id, is_active, description, church_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      account_code, account_name, account_type, category,
      parent_id, is_active, description, church_id
    ]);
    return result.rows[0];
  }

  async update(id, data) {
    const {
      account_code, account_name, account_type, category,
      parent_id, is_active, description
    } = data;

    const query = `
      UPDATE chart_of_accounts
      SET account_code = COALESCE($1, account_code),
          account_name = COALESCE($2, account_name),
          account_type = COALESCE($3, account_type),
          category = COALESCE($4, category),
          parent_id = COALESCE($5, parent_id),
          is_active = COALESCE($6, is_active),
          description = COALESCE($7, description),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      account_code, account_name, account_type, category,
      parent_id, is_active, description, id
    ]);
    return result.rows[0];
  }

  async delete(id) {
    const query = 'DELETE FROM chart_of_accounts WHERE id = $1 RETURNING *';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async getChildAccounts(parentId, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE parent_id = $1`;
    const params = [parentId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY account_code`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAccountById(id) {
    const query = `
      SELECT coa.*,
             parent.account_name as parent_name,
             parent.account_code as parent_code
      FROM chart_of_accounts coa
      LEFT JOIN chart_of_accounts parent ON coa.parent_id = parent.id
      WHERE coa.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async findByAccountCode(accountCode) {
    const query = 'SELECT id FROM chart_of_accounts WHERE account_code = $1';
    const result = await this.pool.query(query, [accountCode]);
    return result.rows[0];
  }

  async findById(id) {
    const query = 'SELECT * FROM chart_of_accounts WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async findByIdAndType(id) {
    const query = 'SELECT id, account_type FROM chart_of_accounts WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async countChildAccounts(parentId) {
    const query = 'SELECT COUNT(*) as count FROM chart_of_accounts WHERE parent_id = $1';
    const result = await this.pool.query(query, [parentId]);
    return parseInt(result.rows[0].count);
  }

  async countJournalEntryLines(accountId) {
    const query = 'SELECT COUNT(*) as count FROM journal_entry_lines WHERE account_id = $1';
    const result = await this.pool.query(query, [accountId]);
    return parseInt(result.rows[0].count);
  }

  async getAccountBalance(accountId, asOfDate = null) {
    let query = `
      SELECT
        COALESCE(SUM(debit_amount), 0) as total_debits,
        COALESCE(SUM(credit_amount), 0) as total_credits
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE jel.account_id = $1
      AND je.status = 'posted'
    `;
    const params = [accountId];

    if (asOfDate) {
      query += ` AND je.entry_date <= $2`;
      params.push(asOfDate);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getAccountType(accountId) {
    const query = 'SELECT account_type FROM chart_of_accounts WHERE id = $1';
    const result = await this.pool.query(query, [accountId]);
    return result.rows[0]?.account_type;
  }
}

module.exports = new ChartOfAccountsRepository();
