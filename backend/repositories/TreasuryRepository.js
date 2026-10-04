const BaseRepository = require('./BaseRepository');

class TreasuryRepository extends BaseRepository {
  constructor() {
    super('transactions');
  }

  async getAccountBalance(accountId, churchId) {
    const result = await this.pool.query(
      'SELECT balance FROM church_accounts WHERE id = $1 AND church_id = $2',
      [accountId, churchId]
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

  async getFilteredTransactions(filters = {}, churchId) {
    if (!churchId) throw new Error('getFilteredTransactions: churchId is required');
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

  async getAccounts(churchId) {
    const query = `SELECT * FROM church_accounts WHERE is_active = true AND church_id = $1 ORDER BY account_name`;
    const result = await this.pool.query(query, [churchId]);
    return result.rows;
  }

  async getIncomeCategories(churchId) {
    const query = `SELECT * FROM income_categories WHERE is_active = true AND church_id = $1 ORDER BY name`;
    const result = await this.pool.query(query, [churchId]);
    return result.rows;
  }

  async getExpenseCategories(churchId) {
    const query = `SELECT * FROM expense_categories WHERE is_active = true AND church_id = $1 ORDER BY name`;
    const result = await this.pool.query(query, [churchId]);
    return result.rows;
  }

  async getFinancialSummary(churchId, startDate = null, endDate = null) {
    let query = `
      SELECT
        SUM(CASE WHEN transaction_type = 'income' AND status = 'approved' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN transaction_type = 'expense' AND status = 'approved' THEN amount ELSE 0 END) as total_expense,
        SUM(CASE WHEN transaction_type = 'income' AND status = 'pending' THEN amount ELSE 0 END) as pending_income,
        SUM(CASE WHEN transaction_type = 'expense' AND status = 'pending' THEN amount ELSE 0 END) as pending_expense
      FROM transactions
      WHERE church_id = $1
    `;
    const params = [churchId];

    if (startDate && endDate) {
      query += ` AND transaction_date BETWEEN $2 AND $3`;
      params.push(startDate, endDate);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getTotalBalance(churchId) {
    const query = `SELECT COALESCE(SUM(balance), 0) as total_balance FROM church_accounts WHERE is_active = true AND church_id = $1`;
    const result = await this.pool.query(query, [churchId]);
    return parseFloat(result.rows[0]?.total_balance || 0);
  }

  // ---------------------------------------------------------------------------
  // Account management
  // ---------------------------------------------------------------------------

  async createAccount(data, churchId) {
    // Check for duplicate account number within the same church
    const existing = await this.pool.query(
      'SELECT id FROM church_accounts WHERE account_number = $1 AND church_id = $2',
      [data.accountNumber, churchId]
    );
    if (existing.rows.length > 0) {
      throw new Error('Account number already exists for this church');
    }

    const result = await this.pool.query(
      `INSERT INTO church_accounts (account_name, account_number, bank_name, account_type, balance, currency, church_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.accountName,
        data.accountNumber,
        data.bankName,
        data.accountType || 'checking',
        data.balance || 0,
        data.currency || 'KES',
        churchId
      ]
    );
    return result.rows[0];
  }

  async findAccountById(id, churchId) {
    if (!churchId) throw new Error('findAccountById: churchId is required');
    const result = await this.pool.query(
      `SELECT * FROM church_accounts WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
    return result.rows[0];
  }

  // NOTE: updateAccount/deleteAccount were defined twice in this class — the
  // later (CRUD-section) definitions won silently. The dead duplicates were
  // removed; the live scoped versions live near the bottom of the file.

  // ---------------------------------------------------------------------------
  // Transaction management
  // ---------------------------------------------------------------------------

  async createTransaction(data, churchId) {
    if (!churchId) throw new Error('createTransaction: churchId is required');
    const result = await this.pool.query(
      `INSERT INTO transactions (transaction_type, category_id, account_id, amount, description, reference_number, transaction_date, recorded_by, payment_method, church_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        data.paymentMethod,
        churchId
      ]
    );
    return result.rows[0];
  }

  async findTransactionById(id, churchId) {
    if (!churchId) throw new Error('findTransactionById: churchId is required');
    const result = await this.pool.query(
      `SELECT * FROM transactions WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
    return result.rows[0];
  }

  async approveTransaction(id, userId, churchId) {
    if (!churchId) throw new Error('approveTransaction: churchId is required');
    const result = await this.pool.query(
      `UPDATE transactions
       SET status = 'approved',
           approved_by = $1,
           approved_at = CURRENT_TIMESTAMP
       WHERE id = $2${churchId ? ' AND church_id = $3' : ''}
       RETURNING *`,
      churchId ? [userId, id, churchId] : [userId, id]
    );
    return result.rows[0];
  }

  async rejectTransaction(id, userId, reason, churchId) {
    if (!churchId) throw new Error('rejectTransaction: churchId is required');
    const result = await this.pool.query(
      `UPDATE transactions
       SET status = 'rejected',
           rejected_by = $1,
           rejected_at = CURRENT_TIMESTAMP,
           rejection_reason = $2
       WHERE id = $3${churchId ? ' AND church_id = $4' : ''}
       RETURNING *`,
      churchId ? [userId, reason, id, churchId] : [userId, reason, id]
    );
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Budget management
  // ---------------------------------------------------------------------------

  async getBudgets(fiscalYear = null, status = null, churchId) {
    if (!churchId) throw new Error('getBudgets: churchId is required');
    let query = 'SELECT * FROM budgets WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (churchId) {
      paramCount++;
      query += ` AND church_id = $${paramCount}`;
      params.push(churchId);
    }

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

  async createBudget(data, churchId) {
    if (!churchId) throw new Error('createBudget: churchId is required');
    const result = await this.pool.query(
      `INSERT INTO budgets (name, fiscal_year, start_date, end_date, total_income_budget, total_expense_budget, created_by, church_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.name,
        data.fiscalYear,
        data.startDate,
        data.endDate,
        data.totalIncomeBudget || 0,
        data.totalExpenseBudget || 0,
        data.createdBy,
        churchId
      ]
    );
    return result.rows[0];
  }

  async findBudgetById(id, churchId) {
    if (!churchId) throw new Error('findBudgetById: churchId is required');
    const result = await this.pool.query(
      `SELECT * FROM budgets WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
    return result.rows[0];
  }

  async getBudgetItems(budgetId, churchId) {
    if (!churchId) throw new Error('getBudgetItems: churchId is required');
    const result = await this.pool.query(
      `SELECT bi.*,
         COALESCE(ic.name, ec.name) as category_name
       FROM budget_items bi
       LEFT JOIN income_categories ic ON bi.category_id = ic.id AND bi.category_type = 'income'
       LEFT JOIN expense_categories ec ON bi.category_id = ec.id AND bi.category_type = 'expense'
       WHERE bi.budget_id = $1${churchId ? ' AND bi.church_id = $2' : ''}
       ORDER BY bi.category_type, bi.amount DESC`,
      churchId ? [budgetId, churchId] : [budgetId]
    );
    return result.rows;
  }

  async createBudgetItem(data, churchId) {
    if (!churchId) throw new Error('createBudgetItem: churchId is required');
    const result = await this.pool.query(
      `INSERT INTO budget_items (budget_id, category_id, category_type, amount, notes, church_id)
       SELECT $1, $2, $3, $4, $5, $6
       WHERE $6::uuid IS NULL OR EXISTS (SELECT 1 FROM budgets WHERE id = $1 AND church_id = $6)
       RETURNING *`,
      [data.budgetId, data.categoryId, data.categoryType, data.amount, data.notes, churchId]
    );
    return result.rows[0];
  }

  // NOTE: updateBudgetItem/deleteBudgetItem were duplicated — the CRUD-section
  // definitions (below) are the live ones and are church-scoped there.

  async getBudgetAlerts(churchId) {
    if (!churchId) throw new Error('getBudgetAlerts: churchId is required');
    const result = await this.pool.query(
      `SELECT b.*,
              (SELECT SUM(amount) FROM budget_items WHERE budget_id = b.id AND category_type = 'expense') as total_expense,
              (SELECT SUM(amount) FROM budget_items WHERE budget_id = b.id AND category_type = 'income') as total_income
       FROM budgets b
       WHERE b.status = 'active'
       AND b.end_date >= CURRENT_DATE
       ${churchId ? 'AND b.church_id = $1' : ''}
       ORDER BY b.end_date ASC`,
      churchId ? [churchId] : []
    );
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Vendors
  // ---------------------------------------------------------------------------

  async updateVendor(id, data, churchId) {
    if (!churchId) throw new Error('updateVendor: churchId is required');
    const result = await this.pool.query(
      `UPDATE vendors SET name = $1, contact_person = $2, email = $3, phone = $4, address = $5 WHERE id = $6${churchId ? ' AND church_id = $7' : ''} RETURNING *`,
      churchId ? [data.name, data.contactPerson, data.email, data.phone, data.address, id, churchId]
               : [data.name, data.contactPerson, data.email, data.phone, data.address, id]
    );
    return result.rows[0];
  }

  async deleteVendor(id, churchId) {
    if (!churchId) throw new Error('deleteVendor: churchId is required');
    await this.pool.query(
      `DELETE FROM vendors WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
  }

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------

  async getAnalytics(dateFrom = null, dateTo = null, churchId) {
    if (!churchId) throw new Error('getAnalytics: churchId is required');
    const result = await this.pool.query(
      `SELECT transaction_type, SUM(amount) as total, COUNT(*) as count
       FROM transactions
       WHERE status = 'approved'
       AND ($1::date IS NULL OR transaction_date >= $1)
       AND ($2::date IS NULL OR transaction_date <= $2)
       ${churchId ? 'AND church_id = $3' : ''}
       GROUP BY transaction_type`,
      churchId ? [dateFrom, dateTo, churchId] : [dateFrom, dateTo]
    );
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Recurring payments
  // ---------------------------------------------------------------------------

  async updateRecurringPayment(id, data, churchId) {
    if (!churchId) throw new Error('updateRecurringPayment: churchId is required');
    const result = await this.pool.query(
      `UPDATE recurring_payments SET name = $1, amount = $2, frequency = $3, start_date = $4, description = $5, status = $6 WHERE id = $7${churchId ? ' AND church_id = $8' : ''} RETURNING *`,
      churchId ? [data.name, data.amount, data.frequency, data.startDate, data.description, data.status, id, churchId]
               : [data.name, data.amount, data.frequency, data.startDate, data.description, data.status, id]
    );
    return result.rows[0];
  }

  async deleteRecurringPayment(id, churchId) {
    if (!churchId) throw new Error('deleteRecurringPayment: churchId is required');
    await this.pool.query(
      `DELETE FROM recurring_payments WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
  }

  // ---------------------------------------------------------------------------
  // Receipts
  // ---------------------------------------------------------------------------

  async getReceipts() {
    const result = await this.pool.query('SELECT * FROM receipts ORDER BY created_at DESC');
    return result.rows;
  }

  // Completed payments double as contribution records and member receipts.
  async getContributions(churchId) {
    const result = await this.pool.query(
      `SELECT p.id,
              COALESCE(p.user_id, p.member_id) AS member_id,
              COALESCE(m.first_name || ' ' || m.last_name, u.first_name || ' ' || u.last_name) AS member_name,
              p.amount, p.payment_type AS category, p.notes AS description,
              COALESCE(p.completed_at, p.payment_date) AS date,
              EXTRACT(YEAR FROM COALESCE(p.completed_at, p.payment_date))::int AS year
       FROM payments p
       LEFT JOIN members m ON p.member_id = m.id
       LEFT JOIN users u ON p.member_id = u.id OR p.user_id = u.id
       WHERE p.church_id = $1 AND p.status = 'completed'
       ORDER BY date DESC`,
      [churchId]
    );
    return result.rows;
  }

  async getPaymentReceipts(churchId) {
    const result = await this.pool.query(
      `SELECT p.id,
              COALESCE(p.mpesa_receipt_number, p.reference_number, 'REC-' || p.id::text) AS receipt_number,
              COALESCE(m.first_name || ' ' || m.last_name, u.first_name || ' ' || u.last_name) AS member_name,
              p.amount, p.notes AS description, p.payment_type,
              pm.name AS payment_method,
              COALESCE(p.completed_at, p.payment_date) AS receipt_date
       FROM payments p
       LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
       LEFT JOIN members m ON p.member_id = m.id
       LEFT JOIN users u ON p.member_id = u.id OR p.user_id = u.id
       WHERE p.church_id = $1 AND p.status = 'completed'
       ORDER BY receipt_date DESC`,
      [churchId]
    );
    return result.rows;
  }

  async findPaymentReceiptById(id, churchId) {
    const result = await this.pool.query(
      `SELECT p.id,
              COALESCE(p.mpesa_receipt_number, p.reference_number, 'REC-' || p.id::text) AS receipt_number,
              COALESCE(m.first_name || ' ' || m.last_name, u.first_name || ' ' || u.last_name) AS member_name,
              p.amount, p.notes AS description, p.payment_type,
              pm.name AS payment_method, p.reference_number, p.status,
              COALESCE(p.completed_at, p.payment_date) AS receipt_date
       FROM payments p
       LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
       LEFT JOIN members m ON p.member_id = m.id
       LEFT JOIN users u ON p.member_id = u.id OR p.user_id = u.id
       WHERE p.id = $1 AND p.church_id = $2`,
      [id, churchId]
    );
    return result.rows[0];
  }

  async findReceiptById(id) {
    const result = await this.pool.query('SELECT * FROM receipts WHERE id = $1', [id]);
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------

  async getProjects(churchId) {
    if (!churchId) throw new Error('getProjects: churchId is required');
    const result = await this.pool.query(
      `SELECT * FROM projects${churchId ? ' WHERE church_id = $1' : ''} ORDER BY created_at DESC`,
      churchId ? [churchId] : []
    );
    return result.rows;
  }

  // projects schema: project_code (NN), project_name (NN), target_amount,
  // assigned_to, fund_id — the old write used dead columns (name/budget).
  // Accepts both the Projects.jsx form fields and the legacy {name,budget} set.
  async createProject(data, churchId, createdBy = null) {
    if (!churchId) throw new Error('createProject: churchId is required');
    const projectName = data.project_name || data.name;
    if (!projectName) throw new Error('createProject: project_name is required');
    const projectCode = data.project_code || `PRJ-${Date.now().toString(36).toUpperCase()}`;
    const result = await this.pool.query(
      `INSERT INTO projects (project_code, project_name, description, start_date, end_date, target_amount, fund_id, assigned_to, status, created_by, church_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        projectCode, projectName, data.description || null,
        data.start_date || data.startDate || null, data.end_date || data.endDate || null,
        data.budgeted_amount || data.target_amount || data.budget || null,
        data.fund_id || null, data.managed_by || data.assigned_to || null,
        data.status || 'active', createdBy, churchId
      ]
    );
    return result.rows[0];
  }

  async updateProject(id, data, churchId) {
    if (!churchId) throw new Error('updateProject: churchId is required');
    const result = await this.pool.query(
      `UPDATE projects SET
         project_name = COALESCE($1, project_name),
         project_code = COALESCE($2, project_code),
         description = COALESCE($3, description),
         start_date = COALESCE($4, start_date),
         end_date = COALESCE($5, end_date),
         target_amount = COALESCE($6, target_amount),
         fund_id = COALESCE($7, fund_id),
         assigned_to = COALESCE($8, assigned_to),
         status = COALESCE($9, status),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND church_id = $11 RETURNING *`,
      [
        data.project_name || data.name || null,
        data.project_code || null,
        data.description ?? null,
        data.start_date || data.startDate || null,
        data.end_date || data.endDate || null,
        data.budgeted_amount || data.target_amount || data.budget || null,
        data.fund_id || null,
        data.managed_by || data.assigned_to || null,
        data.status || null,
        id, churchId
      ]
    );
    return result.rows[0];
  }

  async deleteProject(id, churchId) {
    if (!churchId) throw new Error('deleteProject: churchId is required');
    const result = await this.pool.query(
      `DELETE FROM projects WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
    return result.rowCount > 0;
  }

  // ---------------------------------------------------------------------------
  // Pledges
  // ---------------------------------------------------------------------------

  async getPledges(churchId) {
    if (!churchId) throw new Error('getPledges: churchId is required');
    const result = await this.pool.query(
      `SELECT * FROM pledges${churchId ? ' WHERE church_id = $1' : ''} ORDER BY created_at DESC`,
      churchId ? [churchId] : []
    );
    return result.rows;
  }

  async createPledge(data, churchId) {
    if (!churchId) throw new Error('createPledge: churchId is required');
    const result = await this.pool.query(
      'INSERT INTO pledges (member_id, amount, pledge_type, start_date, end_date, frequency, church_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [data.memberId, data.amount, data.pledgeType, data.startDate, data.endDate, data.frequency, churchId]
    );
    return result.rows[0];
  }

  async updatePledge(id, data, churchId) {
    if (!churchId) throw new Error('updatePledge: churchId is required');
    const result = await this.pool.query(
      `UPDATE pledges SET amount = $1, pledge_type = $2, start_date = $3, end_date = $4, frequency = $5, status = $6 WHERE id = $7${churchId ? ' AND church_id = $8' : ''} RETURNING *`,
      churchId ? [data.amount, data.pledgeType, data.startDate, data.endDate, data.frequency, data.status, id, churchId]
               : [data.amount, data.pledgeType, data.startDate, data.endDate, data.frequency, data.status, id]
    );
    return result.rows[0];
  }

  async deletePledge(id, churchId) {
    if (!churchId) throw new Error('deletePledge: churchId is required');
    const result = await this.pool.query(
      `DELETE FROM pledges WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
    return result.rowCount > 0;
  }

  // ---------------------------------------------------------------------------
  // Pledge campaigns
  // ---------------------------------------------------------------------------

  async getCampaigns(churchId) {
    if (!churchId) throw new Error('getCampaigns: churchId is required');
    const result = await this.pool.query(
      `SELECT * FROM pledge_campaigns${churchId ? ' WHERE church_id = $1' : ''} ORDER BY created_at DESC`,
      churchId ? [churchId] : []
    );
    return result.rows;
  }

  async createCampaign(data, churchId) {
    if (!churchId) throw new Error('createCampaign: churchId is required');
    const result = await this.pool.query(
      'INSERT INTO pledge_campaigns (name, description, target_amount, start_date, end_date, church_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [data.name, data.description, data.targetAmount, data.startDate, data.endDate, churchId]
    );
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Budget alerts
  // ---------------------------------------------------------------------------

  async getBudgetAlertsDetailed(churchId) {
    if (!churchId) throw new Error('getBudgetAlertsDetailed: churchId is required');
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
       ${churchId ? 'AND b.church_id = $1' : ''}
       GROUP BY b.id, b.name, bi.id, bi.category_name, bi.amount
       HAVING (bi.amount - COALESCE(SUM(t.amount), 0)) < (bi.amount * 0.2)
       ORDER BY remaining ASC`,
      churchId ? [churchId] : []
    );
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Financial Reporting
  // ---------------------------------------------------------------------------

  async getTrialBalance(asOfDate = null, churchId) {
    if (!churchId) throw new Error('getTrialBalance: churchId is required');
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
    let paramCount = 0;

    if (churchId) {
      paramCount++;
      query += ` AND coa.church_id = $${paramCount}`;
      params.push(churchId);
    }

    if (asOfDate) {
      paramCount++;
      query += ` AND je.entry_date <= $${paramCount}`;
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

  async getIncomeStatementAccounts(accountType, startDate, endDate, churchId) {
    if (!churchId) throw new Error('getIncomeStatementAccounts: churchId is required');
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
      AND je.entry_date >= $2
      AND je.entry_date <= $3
    `;
    const params = [accountType, startDate, endDate];

    if (churchId) {
      query += ` AND coa.church_id = $4`;
      params.push(churchId);
    }

    query += `
      GROUP BY coa.id, coa.account_code, coa.account_name
      ORDER BY coa.account_code ASC
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getBalanceSheetAccounts(accountType, asOfDate = null, churchId) {
    if (!churchId) throw new Error('getBalanceSheetAccounts: churchId is required');
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

    if (churchId) {
      query += ` AND coa.church_id = $2`;
      params.push(churchId);
    }

    if (asOfDate) {
      query += ` AND je.entry_date <= $${params.length + 1}`;
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

  async updateAccount(id, data, churchId) {
    if (!churchId) throw new Error('updateAccount: churchId is required');
    const result = await this.pool.query(
      `UPDATE church_accounts SET account_name = COALESCE($1, account_name), account_number = COALESCE($2, account_number), bank_name = COALESCE($3, bank_name), account_type = COALESCE($4, account_type), balance = COALESCE($5, balance), currency = COALESCE($6, currency) WHERE id = $7${churchId ? ' AND church_id = $8' : ''} RETURNING *`,
      churchId ? [data.accountName, data.accountNumber, data.bankName, data.accountType, data.balance, data.currency, id, churchId]
               : [data.accountName, data.accountNumber, data.bankName, data.accountType, data.balance, data.currency, id]
    );
    return result.rows[0];
  }

  async deleteAccount(id, churchId) {
    if (!churchId) throw new Error('deleteAccount: churchId is required');
    await this.pool.query(
      `DELETE FROM church_accounts WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
  }

  // ---------------------------------------------------------------------------
  // Transaction CRUD
  // ---------------------------------------------------------------------------

  async updateTransaction(id, data, churchId) {
    if (!churchId) throw new Error('updateTransaction: churchId is required');
    const result = await this.pool.query(
      `UPDATE transactions SET amount = COALESCE($1, amount), description = COALESCE($2, description), category_id = COALESCE($3, category_id), account_id = COALESCE($4, account_id), status = COALESCE($5, status), transaction_date = COALESCE($6, transaction_date) WHERE id = $7${churchId ? ' AND church_id = $8' : ''} RETURNING *`,
      churchId ? [data.amount, data.description, data.categoryId, data.accountId, data.status, data.transactionDate, id, churchId]
               : [data.amount, data.description, data.categoryId, data.accountId, data.status, data.transactionDate, id]
    );
    return result.rows[0];
  }

  async deleteTransaction(id, churchId) {
    if (!churchId) throw new Error('deleteTransaction: churchId is required');
    await this.pool.query(
      `DELETE FROM transactions WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
  }

  // ---------------------------------------------------------------------------
  // Budget CRUD
  // ---------------------------------------------------------------------------

  async updateBudget(id, data, churchId) {
    if (!churchId) throw new Error('updateBudget: churchId is required');
    const result = await this.pool.query(
      `UPDATE budgets SET budget_name = COALESCE($1, budget_name), fiscal_year = COALESCE($2, fiscal_year), fund_id = COALESCE($3, fund_id), account_id = COALESCE($4, account_id), budgeted_amount = COALESCE($5, budgeted_amount), actual_amount = COALESCE($6, actual_amount), status = COALESCE($7, status) WHERE id = $8${churchId ? ' AND church_id = $9' : ''} RETURNING *`,
      churchId ? [data.budgetName, data.fiscalYear, data.fundId, data.accountId, data.budgetedAmount, data.actualAmount, data.status, id, churchId]
               : [data.budgetName, data.fiscalYear, data.fundId, data.accountId, data.budgetedAmount, data.actualAmount, data.status, id]
    );
    return result.rows[0];
  }

  async deleteBudget(id, churchId) {
    if (!churchId) throw new Error('deleteBudget: churchId is required');
    await this.pool.query(
      `DELETE FROM budgets WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
  }

  async updateBudgetItem(id, data, churchId) {
    if (!churchId) throw new Error('updateBudgetItem: churchId is required');
    const result = await this.pool.query(
      `UPDATE budget_items SET item_name = COALESCE($1, item_name), budgeted_amount = COALESCE($2, budgeted_amount), actual_amount = COALESCE($3, actual_amount), description = COALESCE($4, description) WHERE id = $5${churchId ? ' AND church_id = $6' : ''} RETURNING *`,
      churchId ? [data.itemName, data.budgetedAmount, data.actualAmount, data.description, id, churchId]
               : [data.itemName, data.budgetedAmount, data.actualAmount, data.description, id]
    );
    return result.rows[0];
  }

  async deleteBudgetItem(id, churchId) {
    if (!churchId) throw new Error('deleteBudgetItem: churchId is required');
    await this.pool.query(
      `DELETE FROM budget_items WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
  }

  // ---------------------------------------------------------------------------
  // Fund CRUD
  // ---------------------------------------------------------------------------

  async getFunds(churchId) {
    if (!churchId) throw new Error('getFunds: churchId is required');
    let query = 'SELECT * FROM funds WHERE 1=1';
    const params = [];
    if (churchId) {
      query += ' AND church_id = $1';
      params.push(churchId);
    }
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async createFund(data, churchId) {
    if (!churchId) throw new Error('createFund: churchId is required');
    const result = await this.pool.query(
      'INSERT INTO funds (fund_name, fund_code, description, fund_type, church_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [data.fundName, data.fundCode, data.description, data.fundType, churchId]
    );
    return result.rows[0];
  }

  async updateFund(id, data, churchId) {
    if (!churchId) throw new Error('updateFund: churchId is required');
    const result = await this.pool.query(
      `UPDATE funds SET fund_name = COALESCE($1, fund_name), fund_code = COALESCE($2, fund_code), description = COALESCE($3, description), fund_type = COALESCE($4, fund_type), is_active = COALESCE($5, is_active) WHERE id = $6${churchId ? ' AND church_id = $7' : ''} RETURNING *`,
      churchId ? [data.fundName, data.fundCode, data.description, data.fundType, data.isActive, id, churchId]
               : [data.fundName, data.fundCode, data.description, data.fundType, data.isActive, id]
    );
    return result.rows[0];
  }

  async deleteFund(id, churchId) {
    if (!churchId) throw new Error('deleteFund: churchId is required');
    await this.pool.query(
      `DELETE FROM funds WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
  }

  // ---------------------------------------------------------------------------
  // Cash Flow Statement
  // ---------------------------------------------------------------------------

  async getCashFlowStatement(churchId, startDate = null, endDate = null) {
    if (!churchId) throw new Error('getCashFlowStatement: churchId is required');
    let query = `
      SELECT
        'Operating Activities' as section,
        CASE
          WHEN coa.account_name ILIKE '%tithe%' OR coa.account_name ILIKE '%offering%' THEN 'Operating - Tithes & Offerings'
          WHEN coa.account_name ILIKE '%expense%' OR coa.account_name ILIKE '%payment%' THEN 'Operating - Expenses'
          ELSE 'Operating - Other'
        END as category,
        coa.account_name,
        COALESCE(SUM(jel.debit_amount), 0) as total_debits,
        COALESCE(SUM(jel.credit_amount), 0) as total_credits,
        COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as net_flow
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE je.status = 'posted'
    `;
    const params = [];
    let paramCount = 0;

    if (churchId) {
      paramCount++;
      query += ` AND coa.church_id = $${paramCount}`;
      params.push(churchId);
    }

    if (startDate) {
      paramCount++;
      query += ` AND je.entry_date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND je.entry_date <= $${paramCount}`;
      params.push(endDate);
    }

    query += `
      GROUP BY coa.account_name
      ORDER BY coa.account_name
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Fund Balance Report
  // ---------------------------------------------------------------------------

  async getFundBalance(churchId, startDate = null, endDate = null) {
    if (!churchId) throw new Error('getFundBalance: churchId is required');
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

  async updateCampaign(id, data, churchId) {
    if (!churchId) throw new Error('updateCampaign: churchId is required');
    const result = await this.pool.query(
      `UPDATE pledge_campaigns SET name = COALESCE($1, name), description = COALESCE($2, description), target_amount = COALESCE($3, target_amount), start_date = COALESCE($4, start_date), end_date = COALESCE($5, end_date), status = COALESCE($6, status) WHERE id = $7${churchId ? ' AND church_id = $8' : ''} RETURNING *`,
      churchId ? [data.campaignName, data.description, data.goalAmount, data.startDate, data.endDate, data.status, id, churchId]
               : [data.campaignName, data.description, data.goalAmount, data.startDate, data.endDate, data.status, id]
    );
    return result.rows[0];
  }

  async deleteCampaign(id, churchId) {
    if (!churchId) throw new Error('deleteCampaign: churchId is required');
    await this.pool.query(
      `DELETE FROM pledge_campaigns WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
  }

  // ---------------------------------------------------------------------------
  // Fixed Assets CRUD
  // ---------------------------------------------------------------------------

  async getFixedAssets(churchId) {
    if (!churchId) throw new Error('getFixedAssets: churchId is required');
    const result = await this.pool.query('SELECT * FROM fixed_assets WHERE church_id = $1', [churchId]);
    return result.rows;
  }

  async createFixedAsset(data, churchId) {
    if (!churchId) throw new Error('createFixedAsset: churchId is required');
    const result = await this.pool.query(
      'INSERT INTO fixed_assets (asset_name, asset_code, purchase_price, purchase_date, useful_life, location, church_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [data.assetName, data.assetCode, data.purchasePrice, data.purchaseDate, data.usefulLife ?? data.depreciationRate, data.location, churchId]
    );
    return result.rows[0];
  }

  async updateFixedAsset(id, data, churchId) {
    if (!churchId) throw new Error('updateFixedAsset: churchId is required');
    const result = await this.pool.query(
      `UPDATE fixed_assets SET asset_name = COALESCE($1, asset_name), asset_code = COALESCE($2, asset_code), purchase_price = COALESCE($3, purchase_price), purchase_date = COALESCE($4, purchase_date), useful_life = COALESCE($5, useful_life), location = COALESCE($6, location), current_value = COALESCE($7, current_value), status = COALESCE($8, status) WHERE id = $9 AND church_id = $10 RETURNING *`,
      [data.assetName, data.assetCode, data.purchasePrice, data.purchaseDate, data.usefulLife ?? data.depreciationRate, data.location, data.currentValue, data.status, id, churchId]
    );
    return result.rows[0];
  }

  async deleteFixedAsset(id, churchId) {
    if (!churchId) throw new Error('deleteFixedAsset: churchId is required');
    const result = await this.pool.query(
      'DELETE FROM fixed_assets WHERE id = $1 AND church_id = $2',
      [id, churchId]
    );
    return result.rowCount > 0;
  }

  // ---------------------------------------------------------------------------
  // Bank Reconciliations CRUD
  // ---------------------------------------------------------------------------

  async getReconciliations(churchId) {
    if (!churchId) throw new Error('getReconciliations: churchId is required');
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

  async createReconciliation(data, churchId) {
    if (!churchId) throw new Error('createReconciliation: churchId is required');
    const result = await this.pool.query(
      `INSERT INTO bank_reconciliations (account_id, statement_date, statement_balance, book_balance, notes, church_id)
       SELECT $1, $2, $3, $4, $5, $6
       WHERE $6::uuid IS NULL OR EXISTS (SELECT 1 FROM church_accounts WHERE id = $1 AND church_id = $6)
       RETURNING *`,
      [data.accountId, data.statementDate, data.statementBalance, data.bookBalance, data.notes, churchId]
    );
    return result.rows[0];
  }

  async updateReconciliation(id, data, churchId) {
    if (!churchId) throw new Error('updateReconciliation: churchId is required');
    const result = await this.pool.query(
      `UPDATE bank_reconciliations SET statement_date = COALESCE($1, statement_date), statement_balance = COALESCE($2, statement_balance), book_balance = COALESCE($3, book_balance), notes = COALESCE($4, notes), status = COALESCE($5, status) WHERE id = $6${churchId ? ' AND church_id = $7' : ''} RETURNING *`,
      churchId ? [data.statementDate, data.statementBalance, data.bookBalance, data.notes, data.status, id, churchId]
               : [data.statementDate, data.statementBalance, data.bookBalance, data.notes, data.status, id]
    );
    return result.rows[0];
  }

  async deleteReconciliation(id, churchId) {
    if (!churchId) throw new Error('deleteReconciliation: churchId is required');
    await this.pool.query(
      `DELETE FROM bank_reconciliations WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
  }
}

module.exports = new TreasuryRepository();
