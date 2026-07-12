/**
 * Account Repository
 * Handles data access for Chart of Accounts
 */

const BaseRepository = require('../../../repositories/base.repository');
const Account = require('../models/Account');

class AccountRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'accounts', 'id');
  }

  /**
   * Find all accounts with optional filtering
   */
  async findAll(options = {}) {
    const { account_type, is_active, include_balance } = options;
    
    const joins = [];
    let selectFields = 'a.*';
    
    if (include_balance) {
      // Include calculated balance from journal entries
      selectFields += `, 
        COALESCE((
          SELECT SUM(jel.debit_amount - jel.credit_amount)
          FROM journal_entry_lines jel
          WHERE jel.account_id = a.id
        ), 0) as calculated_balance`;
    }
    
    joins.push({
      table: 'accounts p',
      type: 'LEFT',
      condition: 'a.parent_account_id = p.id',
      select: 'p.account_name as parent_account_name'
    });
    
    joins.push({
      table: 'funds f',
      type: 'LEFT',
      condition: 'a.fund_id = f.id',
      select: 'f.fund_name'
    });
    
    const where = {};
    if (account_type) where['a.account_type'] = account_type;
    if (is_active !== undefined) where['a.is_active'] = is_active;
    
    const query = this.buildQuery({
      alias: 'a',
      select: selectFields,
      joins,
      where,
      orderBy: 'a.account_number ASC'
    });
    
    const result = await this.pool.query(query.sql, query.params);
    return result.rows.map(row => Account.fromDatabase(row));
  }

  /**
   * Find account by ID with related data
   */
  async findById(id) {
    const joins = [
      {
        table: 'accounts p',
        type: 'LEFT',
        condition: 'a.parent_account_id = p.id',
        select: 'p.account_name as parent_account_name'
      },
      {
        table: 'funds f',
        type: 'LEFT',
        condition: 'a.fund_id = f.id',
        select: 'f.fund_name'
      }
    ];
    
    const query = this.buildQuery({
      alias: 'a',
      where: { 'a.id': id },
      joins,
      single: true
    });
    
    const result = await this.pool.query(query.sql, query.params);
    return result.rows[0] ? Account.fromDatabase(result.rows[0]) : null;
  }

  /**
   * Find account by account number
   */
  async findByAccountNumber(accountNumber) {
    const result = await this.pool.query(
      'SELECT * FROM accounts WHERE account_number = $1',
      [accountNumber]
    );
    return result.rows[0] ? Account.fromDatabase(result.rows[0]) : null;
  }

  /**
   * Find child accounts by parent ID
   */
  async findByParentId(parentId) {
    const result = await this.pool.query(
      'SELECT * FROM accounts WHERE parent_account_id = $1 ORDER BY account_number',
      [parentId]
    );
    return result.rows.map(row => Account.fromDatabase(row));
  }

  /**
   * Find accounts by fund ID
   */
  async findByFundId(fundId) {
    const result = await this.pool.query(
      'SELECT * FROM accounts WHERE fund_id = $1 ORDER BY account_number',
      [fundId]
    );
    return result.rows.map(row => Account.fromDatabase(row));
  }

  /**
   * Get account hierarchy
   */
  async getHierarchy() {
    const query = `
      WITH RECURSIVE account_tree AS (
        SELECT 
          a.*,
          0 as level,
          a.id::text as path
        FROM accounts a
        WHERE parent_account_id IS NULL
        
        UNION ALL
        
        SELECT 
          a.*,
          at.level + 1,
          at.path || ',' || a.id::text
        FROM accounts a
        INNER JOIN account_tree at ON a.parent_account_id = at.id
      )
      SELECT * FROM account_tree ORDER BY path;
    `;
    
    const result = await this.pool.query(query);
    return result.rows.map(row => ({
      ...Account.fromDatabase(row),
      level: row.level,
      path: row.path
    }));
  }

  /**
   * Get trial balance (all accounts with balances)
   */
  async getTrialBalance(asOfDate = null) {
    const dateCondition = asOfDate 
      ? 'AND je.entry_date <= $1' 
      : '';
    const params = asOfDate ? [asOfDate] : [];
    
    const query = `
      SELECT 
        a.id,
        a.account_number,
        a.account_name,
        a.account_type,
        COALESCE(SUM(jel.debit_amount), 0) as total_debits,
        COALESCE(SUM(jel.credit_amount), 0) as total_credits,
        COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as balance
      FROM accounts a
      LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted' ${dateCondition}
      WHERE a.is_active = true
      GROUP BY a.id, a.account_number, a.account_name, a.account_type
      ORDER BY a.account_number;
    `;
    
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Create new account
   */
  async create(account) {
    const validation = account.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    const data = account.toDatabase();
    const query = `
      INSERT INTO accounts (
        account_number, account_name, account_type, sub_type,
        parent_account_id, fund_id, description, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      data.account_number,
      data.account_name,
      data.account_type,
      data.sub_type,
      data.parent_account_id,
      data.fund_id,
      data.description,
      data.is_active
    ]);
    
    return Account.fromDatabase(result.rows[0]);
  }

  /**
   * Update account
   */
  async update(id, account) {
    const data = account.toDatabase();
    const query = `
      UPDATE accounts SET
        account_number = $1,
        account_name = $2,
        account_type = $3,
        sub_type = $4,
        parent_account_id = $5,
        fund_id = $6,
        description = $7,
        is_active = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      data.account_number,
      data.account_name,
      data.account_type,
      data.sub_type,
      data.parent_account_id,
      data.fund_id,
      data.description,
      data.is_active,
      id
    ]);
    
    return result.rows[0] ? Account.fromDatabase(result.rows[0]) : null;
  }

  /**
   * Delete account (only if no transactions)
   */
  async delete(id) {
    // Check for transactions first
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM journal_entry_lines 
      WHERE account_id = $1
    `;
    const checkResult = await this.pool.query(checkQuery, [id]);
    
    if (parseInt(checkResult.rows[0].count) > 0) {
      throw new Error('Cannot delete account with transactions. Deactivate instead.');
    }
    
    const result = await this.pool.query(
      'DELETE FROM accounts WHERE id = $1 RETURNING *',
      [id]
    );
    
    return result.rows[0] ? Account.fromDatabase(result.rows[0]) : null;
  }

  /**
   * Build SQL query helper
   */
  buildQuery({ alias = null, select = '*', joins = [], where = {}, orderBy = null, single = false }) {
    const table = alias ? `${this.tableName} ${alias}` : this.tableName;
    const tableAlias = alias || this.tableName;
    
    let sql = `SELECT ${select} FROM ${table}`;
    let params = [];
    let paramIndex = 1;
    
    // Add joins
    joins.forEach(join => {
      sql += ` ${join.type || 'LEFT'} JOIN ${join.table} ON ${join.condition}`;
    });
    
    // Add where clause
    const whereKeys = Object.keys(where);
    if (whereKeys.length > 0) {
      const whereConditions = whereKeys.map(key => {
        if (Array.isArray(where[key])) {
          const placeholders = where[key].map(() => `$${paramIndex++}`).join(', ');
          params.push(...where[key]);
          return `${key} IN (${placeholders})`;
        } else if (where[key] === null) {
          return `${key} IS NULL`;
        } else {
          params.push(where[key]);
          return `${key} = $${paramIndex++}`;
        }
      });
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Add order by
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    
    // Add limit for single result
    if (single) {
      sql += ' LIMIT 1';
    }
    
    return { sql, params };
  }
}

module.exports = AccountRepository;
