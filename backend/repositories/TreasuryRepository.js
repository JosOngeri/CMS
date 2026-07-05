const BaseRepository = require('./BaseRepository');

class TreasuryRepository extends BaseRepository {
  constructor() {
    super('transactions');
  }

  async getAccountBalance(accountId) {
    const result = await this.pool.query(
      'SELECT balance FROM church_accounts WHERE id = $1',
      [accountId]
    );
    return result.rows[0]?.balance || 0;
  }

  async getRecentTransactions(churchId, limit = 10) {
    const result = await this.pool.query(
      `SELECT t.*, c.name as category_name
       FROM transactions t
       LEFT JOIN income_categories c ON t.category_id = c.id
       WHERE t.church_id = $1
       ORDER BY t.transaction_date DESC
       LIMIT $2`,
      [churchId, limit]
    );
    return result.rows;
  }

  async getFilteredTransactions(filters = {}, churchId = null) {
    let query = `
      SELECT t.*,
             COALESCE(ic.name, ec.name) as category_name,
             ca.account_name,
             u.first_name || ' ' || u.last_name as recorded_by_name
      FROM transactions t
      LEFT JOIN income_categories ic ON t.category_id = ic.id AND t.transaction_type = 'income'
      LEFT JOIN expense_categories ec ON t.category_id = ec.id AND t.transaction_type = 'expense'
      LEFT JOIN church_accounts ca ON t.account_id = ca.id
      LEFT JOIN users u ON t.recorded_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (churchId) {
      paramCount++;
      query += ` AND t.church_id = $${paramCount}`;
      params.push(churchId);
    }

    if (filters.type) {
      paramCount++;
      query += ` AND t.transaction_type = $${paramCount}`;
      params.push(filters.type);
    }

    if (filters.categoryId) {
      paramCount++;
      query += ` AND t.category_id = $${paramCount}`;
      params.push(filters.categoryId);
    }

    if (filters.accountId) {
      paramCount++;
      query += ` AND t.account_id = $${paramCount}`;
      params.push(filters.accountId);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.startDate) {
      paramCount++;
      query += ` AND t.transaction_date >= $${paramCount}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      query += ` AND t.transaction_date <= $${paramCount}`;
      params.push(filters.endDate);
    }

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    query += ` ORDER BY t.transaction_date DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAccounts(churchId = null) {
    let query = `SELECT * FROM church_accounts WHERE is_active = true`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY account_name`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getIncomeCategories(churchId = null) {
    let query = `SELECT * FROM income_categories WHERE is_active = true`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY name`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getExpenseCategories(churchId = null) {
    let query = `SELECT * FROM expense_categories WHERE is_active = true`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY name`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getFinancialSummary(churchId = null, startDate = null, endDate = null) {
    let query = `
      SELECT
        SUM(CASE WHEN transaction_type = 'income' AND status = 'approved' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN transaction_type = 'expense' AND status = 'approved' THEN amount ELSE 0 END) as total_expense,
        SUM(CASE WHEN transaction_type = 'income' AND status = 'pending' THEN amount ELSE 0 END) as pending_income,
        SUM(CASE WHEN transaction_type = 'expense' AND status = 'pending' THEN amount ELSE 0 END) as pending_expense
      FROM transactions
      WHERE 1=1
    `;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $${params.length + 1}`;
      params.push(churchId);
    }

    if (startDate && endDate) {
      query += ` AND transaction_date BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(startDate, endDate);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getTotalBalance(churchId = null) {
    let query = `SELECT COALESCE(SUM(balance), 0) as total_balance FROM church_accounts WHERE is_active = true`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseFloat(result.rows[0]?.total_balance || 0);
  }

  // ---------------------------------------------------------------------------
  // Account management
  // ---------------------------------------------------------------------------

  async createAccount(data) {
    const result = await this.pool.query(
      `INSERT INTO church_accounts (account_name, account_number, bank_name, account_type, balance, currency)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.accountName,
        data.accountNumber,
        data.bankName,
        data.accountType || 'checking',
        data.balance || 0,
        data.currency || 'KES'
      ]
    );
    return result.rows[0];
  }

  async findAccountById(id) {
    const result = await this.pool.query('SELECT * FROM church_accounts WHERE id = $1', [id]);
    return result.rows[0];
  }

  async updateAccount(id, data) {
    const result = await this.pool.query(
      `UPDATE church_accounts
       SET account_name = COALESCE($1, account_name),
           account_number = COALESCE($2, account_number),
           bank_name = COALESCE($3, bank_name),
           account_type = COALESCE($4, account_type),
           balance = COALESCE($5, balance),
           currency = COALESCE($6, currency),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        data.accountName,
        data.accountNumber,
        data.bankName,
        data.accountType,
        data.balance,
        data.currency,
        id
      ]
    );
    return result.rows[0];
  }

  async deleteAccount(id) {
    await this.pool.query('DELETE FROM church_accounts WHERE id = $1', [id]);
  }

  // ---------------------------------------------------------------------------
  // Transaction management
  // ---------------------------------------------------------------------------

  async createTransaction(data) {
    const result = await this.pool.query(
      `INSERT INTO transactions (transaction_type, category_id, account_id, amount, description, reference_number, transaction_date, recorded_by, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.transactionType,
        data.categoryId,
        data.accountId,
        data.amount,
        data.description,
        data.referenceNumber,
        data.transactionDate,
        data.recordedBy,
        data.paymentMethod
      ]
    );
    return result.rows[0];
  }

  async findTransactionById(id) {
    const result = await this.pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
    return result.rows[0];
  }

  async approveTransaction(id, userId) {
    const result = await this.pool.query(
      `UPDATE transactions
       SET status = 'approved',
           approved_by = $1,
           approved_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [userId, id]
    );
    return result.rows[0];
  }

  async rejectTransaction(id, userId, reason) {
    const result = await this.pool.query(
      `UPDATE transactions
       SET status = 'rejected',
           rejected_by = $1,
           rejected_at = CURRENT_TIMESTAMP,
           rejection_reason = $2
       WHERE id = $3
       RETURNING *`,
      [userId, reason, id]
    );
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Budget management
  // ---------------------------------------------------------------------------

  async getBudgets(fiscalYear = null, status = null) {
    let query = 'SELECT * FROM budgets WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (fiscalYear) {
      paramCount++;
      query += ` AND fiscal_year = $${paramCount}`;
      params.push(fiscalYear);
    }

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    query += ' ORDER BY fiscal_year DESC, start_date DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async createBudget(data) {
    const result = await this.pool.query(
      `INSERT INTO budgets (name, fiscal_year, start_date, end_date, total_income_budget, total_expense_budget, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.name,
        data.fiscalYear,
        data.startDate,
        data.endDate,
        data.totalIncomeBudget || 0,
        data.totalExpenseBudget || 0,
        data.createdBy
      ]
    );
    return result.rows[0];
  }

  async findBudgetById(id) {
    const result = await this.pool.query('SELECT * FROM budgets WHERE id = $1', [id]);
    return result.rows[0];
  }

  async getBudgetItems(budgetId) {
    const result = await this.pool.query(
      `SELECT bi.*, 
         COALESCE(ic.name, ec.name) as category_name
       FROM budget_items bi
       LEFT JOIN income_categories ic ON bi.category_id = ic.id AND bi.category_type = 'income'
       LEFT JOIN expense_categories ec ON bi.category_id = ec.id AND bi.category_type = 'expense'
       WHERE bi.budget_id = $1
       ORDER BY bi.category_type, bi.amount DESC`,
      [budgetId]
    );
    return result.rows;
  }

  async createBudgetItem(data) {
    const result = await this.pool.query(
      `INSERT INTO budget_items (budget_id, category_id, category_type, amount, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.budgetId, data.categoryId, data.categoryType, data.amount, data.notes]
    );
    return result.rows[0];
  }

  async updateBudgetItem(id, data) {
    const result = await this.pool.query(
      `UPDATE budget_items
       SET category_id = COALESCE($1, category_id),
           category_type = COALESCE($2, category_type),
           amount = COALESCE($3, amount),
           notes = COALESCE($4, notes)
       WHERE id = $5
       RETURNING *`,
      [data.categoryId, data.categoryType, data.amount, data.notes, id]
    );
    return result.rows[0];
  }

  async deleteBudgetItem(id) {
    await this.pool.query('DELETE FROM budget_items WHERE id = $1', [id]);
  }

  // ---------------------------------------------------------------------------
  // Budget alerts
  // ---------------------------------------------------------------------------

  async getBudgetAlerts() {
    const result = await this.pool.query(
      `SELECT b.*,
              (SELECT SUM(amount) FROM budget_items WHERE budget_id = b.id AND category_type = 'expense') as total_expense,
              (SELECT SUM(amount) FROM budget_items WHERE budget_id = b.id AND category_type = 'income') as total_income
       FROM budgets b
       WHERE b.status = 'active'
       AND b.end_date >= CURRENT_DATE
       ORDER BY b.end_date ASC`
    );
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Vendors
  // ---------------------------------------------------------------------------

  async updateVendor(id, data) {
    const result = await this.pool.query(
      'UPDATE vendors SET name = $1, contact_person = $2, email = $3, phone = $4, address = $5 WHERE id = $6 RETURNING *',
      [data.name, data.contactPerson, data.email, data.phone, data.address, id]
    );
    return result.rows[0];
  }

  async deleteVendor(id) {
    await this.pool.query('DELETE FROM vendors WHERE id = $1', [id]);
  }

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------

  async getAnalytics(dateFrom = null, dateTo = null) {
    const result = await this.pool.query(
      `SELECT transaction_type, SUM(amount) as total, COUNT(*) as count
       FROM transactions
       WHERE status = 'approved'
       AND ($1::date IS NULL OR transaction_date >= $1)
       AND ($2::date IS NULL OR transaction_date <= $2)
       GROUP BY transaction_type`,
      [dateFrom, dateTo]
    );
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Recurring payments
  // ---------------------------------------------------------------------------

  async updateRecurringPayment(id, data) {
    const result = await this.pool.query(
      'UPDATE recurring_payments SET name = $1, amount = $2, frequency = $3, start_date = $4, description = $5, status = $6 WHERE id = $7 RETURNING *',
      [data.name, data.amount, data.frequency, data.startDate, data.description, data.status, id]
    );
    return result.rows[0];
  }

  async deleteRecurringPayment(id) {
    await this.pool.query('DELETE FROM recurring_payments WHERE id = $1', [id]);
  }

  // ---------------------------------------------------------------------------
  // Receipts
  // ---------------------------------------------------------------------------

  async getReceipts() {
    const result = await this.pool.query('SELECT * FROM receipts ORDER BY created_at DESC');
    return result.rows;
  }

  async findReceiptById(id) {
    const result = await this.pool.query('SELECT * FROM receipts WHERE id = $1', [id]);
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------

  async getProjects() {
    const result = await this.pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    return result.rows;
  }

  async createProject(data) {
    const result = await this.pool.query(
      'INSERT INTO projects (name, description, budget, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [data.name, data.description, data.budget, data.startDate, data.endDate, data.status || 'active']
    );
    return result.rows[0];
  }

  async updateProject(id, data) {
    const result = await this.pool.query(
      'UPDATE projects SET name = $1, description = $2, budget = $3, start_date = $4, end_date = $5, status = $6 WHERE id = $7 RETURNING *',
      [data.name, data.description, data.budget, data.startDate, data.endDate, data.status, id]
    );
    return result.rows[0];
  }

  async deleteProject(id) {
    await this.pool.query('DELETE FROM projects WHERE id = $1', [id]);
  }

  // ---------------------------------------------------------------------------
  // Pledges
  // ---------------------------------------------------------------------------

  async getPledges() {
    const result = await this.pool.query('SELECT * FROM pledges ORDER BY created_at DESC');
    return result.rows;
  }

  async createPledge(data) {
    const result = await this.pool.query(
      'INSERT INTO pledges (member_id, amount, pledge_type, start_date, end_date, frequency) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [data.memberId, data.amount, data.pledgeType, data.startDate, data.endDate, data.frequency]
    );
    return result.rows[0];
  }

  async updatePledge(id, data) {
    const result = await this.pool.query(
      'UPDATE pledges SET amount = $1, pledge_type = $2, start_date = $3, end_date = $4, frequency = $5, status = $6 WHERE id = $7 RETURNING *',
      [data.amount, data.pledgeType, data.startDate, data.endDate, data.frequency, data.status, id]
    );
    return result.rows[0];
  }

  async deletePledge(id) {
    await this.pool.query('DELETE FROM pledges WHERE id = $1', [id]);
  }

  // ---------------------------------------------------------------------------
  // Pledge campaigns
  // ---------------------------------------------------------------------------

  async getCampaigns() {
    const result = await this.pool.query('SELECT * FROM pledge_campaigns ORDER BY created_at DESC');
    return result.rows;
  }

  async createCampaign(data) {
    const result = await this.pool.query(
      'INSERT INTO pledge_campaigns (name, description, target_amount, start_date, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [data.name, data.description, data.targetAmount, data.startDate, data.endDate]
    );
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Budget alerts
  // ---------------------------------------------------------------------------

  async getBudgetAlertsDetailed() {
    const result = await this.pool.query(
      `SELECT b.name as budget_name, bi.category_name, bi.amount as budgeted,
       COALESCE(SUM(t.amount), 0) as spent,
       (bi.amount - COALESCE(SUM(t.amount), 0)) as remaining
       FROM budgets b
       JOIN budget_items bi ON b.id = bi.budget_id
       LEFT JOIN transactions t ON bi.category_id = t.category_id
         AND t.transaction_type = bi.category_type
         AND t.status = 'approved'
         AND t.transaction_date >= b.start_date
         AND t.transaction_date <= b.end_date
       WHERE b.status = 'active'
       GROUP BY b.id, b.name, bi.id, bi.category_name, bi.amount
       HAVING (bi.amount - COALESCE(SUM(t.amount), 0)) < (bi.amount * 0.2)
       ORDER BY remaining ASC`
    );
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Financial Reporting
  // ---------------------------------------------------------------------------

  async getTrialBalance(asOfDate = null) {
    let query = `
      SELECT
        coa.account_code,
        coa.account_name,
        coa.account_type,
        COALESCE(SUM(jel.debit_amount), 0) as total_debits,
        COALESCE(SUM(jel.credit_amount), 0) as total_credits
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE coa.is_active = true
    `;

    const params = [];

    if (asOfDate) {
      query += ` AND je.entry_date <= $1`;
      params.push(asOfDate);
    }

    query += ` AND je.status = 'posted'`;

    if (!asOfDate) {
      query += ` AND (je.entry_date IS NOT NULL)`;
    }

    query += `
      GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
      ORDER BY coa.account_code ASC
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getIncomeStatementAccounts(accountType, startDate, endDate) {
    const query = `
      SELECT
        coa.account_code,
        coa.account_name,
        COALESCE(SUM(jel.debit_amount), 0) as total_debits,
        COALESCE(SUM(jel.credit_amount), 0) as total_credits
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE coa.account_type = $1
      AND coa.is_active = true
      AND je.status = 'posted'
      AND je.entry_date >= $2
      AND je.entry_date <= $3
      GROUP BY coa.id, coa.account_code, coa.account_name
      ORDER BY coa.account_code ASC
    `;

    const result = await this.pool.query(query, [accountType, startDate, endDate]);
    return result.rows;
  }

  async getBalanceSheetAccounts(accountType, asOfDate = null) {
    let query = `
      SELECT
        coa.account_code,
        coa.account_name,
        COALESCE(SUM(jel.debit_amount), 0) as total_debits,
        COALESCE(SUM(jel.credit_amount), 0) as total_credits
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE coa.account_type = $1
      AND coa.is_active = true
      AND je.status = 'posted'
    `;

    const params = [accountType];

    if (asOfDate) {
      query += ` AND je.entry_date <= $2`;
      params.push(asOfDate);
    }

    query += `
      GROUP BY coa.id, coa.account_code, coa.account_name
      ORDER BY coa.account_code ASC
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Account CRUD
  // ---------------------------------------------------------------------------

  async updateAccount(id, data) {
    const result = await this.pool.query(
      'UPDATE church_accounts SET account_name = COALESCE($1, account_name), account_number = COALESCE($2, account_number), bank_name = COALESCE($3, bank_name), account_type = COALESCE($4, account_type), balance = COALESCE($5, balance), currency = COALESCE($6, currency) WHERE id = $7 RETURNING *',
      [data.accountName, data.accountNumber, data.bankName, data.accountType, data.balance, data.currency, id]
    );
    return result.rows[0];
  }

  async deleteAccount(id) {
    await this.pool.query('DELETE FROM church_accounts WHERE id = $1', [id]);
  }

  // ---------------------------------------------------------------------------
  // Transaction CRUD
  // ---------------------------------------------------------------------------

  async updateTransaction(id, data) {
    const result = await this.pool.query(
      'UPDATE transactions SET amount = COALESCE($1, amount), description = COALESCE($2, description), category_id = COALESCE($3, category_id), account_id = COALESCE($4, account_id), status = COALESCE($5, status), transaction_date = COALESCE($6, transaction_date) WHERE id = $7 RETURNING *',
      [data.amount, data.description, data.categoryId, data.accountId, data.status, data.transactionDate, id]
    );
    return result.rows[0];
  }

  async deleteTransaction(id) {
    await this.pool.query('DELETE FROM transactions WHERE id = $1', [id]);
  }

  // ---------------------------------------------------------------------------
  // Budget CRUD
  // ---------------------------------------------------------------------------

  async updateBudget(id, data) {
    const result = await this.pool.query(
      'UPDATE budgets SET budget_name = COALESCE($1, budget_name), fiscal_year = COALESCE($2, fiscal_year), fund_id = COALESCE($3, fund_id), account_id = COALESCE($4, account_id), budgeted_amount = COALESCE($5, budgeted_amount), actual_amount = COALESCE($6, actual_amount), status = COALESCE($7, status) WHERE id = $8 RETURNING *',
      [data.budgetName, data.fiscalYear, data.fundId, data.accountId, data.budgetedAmount, data.actualAmount, data.status, id]
    );
    return result.rows[0];
  }

  async deleteBudget(id) {
    await this.pool.query('DELETE FROM budgets WHERE id = $1', [id]);
  }

  async updateBudgetItem(id, data) {
    const result = await this.pool.query(
      'UPDATE budget_items SET item_name = COALESCE($1, item_name), budgeted_amount = COALESCE($2, budgeted_amount), actual_amount = COALESCE($3, actual_amount), description = COALESCE($4, description) WHERE id = $5 RETURNING *',
      [data.itemName, data.budgetedAmount, data.actualAmount, data.description, id]
    );
    return result.rows[0];
  }

  async deleteBudgetItem(id) {
    await this.pool.query('DELETE FROM budget_items WHERE id = $1', [id]);
  }

  // ---------------------------------------------------------------------------
  // Fund CRUD
  // ---------------------------------------------------------------------------

  async getFunds(churchId = null) {
    let query = 'SELECT * FROM funds WHERE 1=1';
    const params = [];
    if (churchId) {
      query += ' AND church_id = $1';
      params.push(churchId);
    }
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async createFund(data) {
    const result = await this.pool.query(
      'INSERT INTO funds (fund_name, fund_code, description, fund_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [data.fundName, data.fundCode, data.description, data.fundType]
    );
    return result.rows[0];
  }

  async updateFund(id, data) {
    const result = await this.pool.query(
      'UPDATE funds SET fund_name = COALESCE($1, fund_name), fund_code = COALESCE($2, fund_code), description = COALESCE($3, description), fund_type = COALESCE($4, fund_type), is_active = COALESCE($5, is_active) WHERE id = $6 RETURNING *',
      [data.fundName, data.fundCode, data.description, data.fundType, data.isActive, id]
    );
    return result.rows[0];
  }

  async deleteFund(id) {
    await this.pool.query('DELETE FROM funds WHERE id = $1', [id]);
  }

  // ---------------------------------------------------------------------------
  // Cash Flow Statement
  // ---------------------------------------------------------------------------

  async getCashFlowStatement(churchId = null, startDate = null, endDate = null) {
    let query = `
      SELECT
        'Operating Activities' as section,
        t.transaction_type,
        SUM(t.amount) as total
      FROM transactions t
      WHERE t.status = 'approved'
    `;
    const params = [];
    let paramCount = 0;

    if (churchId) {
      paramCount++;
      query += ` AND t.church_id = $${paramCount}`;
      params.push(churchId);
    }

    if (startDate) {
      paramCount++;
      query += ` AND t.transaction_date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND t.transaction_date <= $${paramCount}`;
      params.push(endDate);
    }

    query += ` GROUP BY t.transaction_type ORDER BY t.transaction_type`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Fund Balance Report
  // ---------------------------------------------------------------------------

  async getFundBalance(churchId = null, startDate = null, endDate = null) {
    let query = `
      SELECT
        f.id,
        f.fund_name,
        f.fund_code,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0) as balance
      FROM funds f
      LEFT JOIN transactions t ON f.id = t.fund_id AND t.status = 'approved'
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (churchId) {
      paramCount++;
      query += ` AND f.church_id = $${paramCount}`;
      params.push(churchId);
    }

    if (startDate) {
      paramCount++;
      query += ` AND t.transaction_date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND t.transaction_date <= $${paramCount}`;
      params.push(endDate);
    }

    query += ` GROUP BY f.id, f.fund_name, f.fund_code ORDER BY f.fund_code`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Campaign CRUD
  // ---------------------------------------------------------------------------

  async updateCampaign(id, data) {
    const result = await this.pool.query(
      'UPDATE pledge_campaigns SET name = COALESCE($1, name), description = COALESCE($2, description), target_amount = COALESCE($3, target_amount), start_date = COALESCE($4, start_date), end_date = COALESCE($5, end_date), status = COALESCE($6, status) WHERE id = $7 RETURNING *',
      [data.campaignName, data.description, data.goalAmount, data.startDate, data.endDate, data.status, id]
    );
    return result.rows[0];
  }

  async deleteCampaign(id) {
    await this.pool.query('DELETE FROM pledge_campaigns WHERE id = $1', [id]);
  }

  // ---------------------------------------------------------------------------
  // Fixed Assets CRUD
  // ---------------------------------------------------------------------------

  async getFixedAssets(churchId = null) {
    let query = 'SELECT * FROM fixed_assets WHERE 1=1';
    const params = [];
    if (churchId) {
      query += ' AND church_id = $1';
      params.push(churchId);
    }
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async createFixedAsset(data) {
    const result = await this.pool.query(
      'INSERT INTO fixed_assets (asset_name, asset_code, purchase_price, purchase_date, depreciation_rate, location) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [data.assetName, data.assetCode, data.purchasePrice, data.purchaseDate, data.depreciationRate, data.location]
    );
    return result.rows[0];
  }

  async updateFixedAsset(id, data) {
    const result = await this.pool.query(
      'UPDATE fixed_assets SET asset_name = COALESCE($1, asset_name), asset_code = COALESCE($2, asset_code), purchase_price = COALESCE($3, purchase_price), purchase_date = COALESCE($4, purchase_date), depreciation_rate = COALESCE($5, depreciation_rate), location = COALESCE($6, location), current_value = COALESCE($7, current_value), status = COALESCE($8, status) WHERE id = $9 RETURNING *',
      [data.assetName, data.assetCode, data.purchasePrice, data.purchaseDate, data.depreciationRate, data.location, data.currentValue, data.status, id]
    );
    return result.rows[0];
  }

  async deleteFixedAsset(id) {
    await this.pool.query('DELETE FROM fixed_assets WHERE id = $1', [id]);
  }

  // ---------------------------------------------------------------------------
  // Bank Reconciliations CRUD
  // ---------------------------------------------------------------------------

  async getReconciliations(churchId = null) {
    let query = `
      SELECT r.*, ca.account_name
      FROM bank_reconciliations r
      LEFT JOIN church_accounts ca ON r.account_id = ca.id
      WHERE 1=1
    `;
    const params = [];
    if (churchId) {
      query += ' AND r.church_id = $1';
      params.push(churchId);
    }
    query += ' ORDER BY r.statement_date DESC';
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async createReconciliation(data) {
    const result = await this.pool.query(
      'INSERT INTO bank_reconciliations (account_id, statement_date, statement_balance, book_balance, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [data.accountId, data.statementDate, data.statementBalance, data.bookBalance, data.notes]
    );
    return result.rows[0];
  }

  async updateReconciliation(id, data) {
    const result = await this.pool.query(
      'UPDATE bank_reconciliations SET statement_date = COALESCE($1, statement_date), statement_balance = COALESCE($2, statement_balance), book_balance = COALESCE($3, book_balance), notes = COALESCE($4, notes), status = COALESCE($5, status) WHERE id = $6 RETURNING *',
      [data.statementDate, data.statementBalance, data.bookBalance, data.notes, data.status, id]
    );
    return result.rows[0];
  }

  async deleteReconciliation(id) {
    await this.pool.query('DELETE FROM bank_reconciliations WHERE id = $1', [id]);
  }
}

module.exports = new TreasuryRepository();
