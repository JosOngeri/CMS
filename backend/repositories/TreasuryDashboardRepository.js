const BaseRepository = require('./BaseRepository');

class TreasuryDashboardRepository extends BaseRepository {
  constructor() {
    super('treasury_dashboard');
  }

  async getDashboardStats(churchId = null) {
    // Single scan per source: FILTERed aggregates over transactions replace
    // three separate subqueries; the accounts sum is one CTE cross-joined in.
    const churchFilter = churchId ? 'AND church_id = $1' : '';
    const params = churchId ? [churchId] : [];
    const query = `
      WITH tx AS (
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'income'), 0) AS income_30_days,
          COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'expense'), 0) AS expense_30_days,
          COUNT(*) AS transactions_30_days
        FROM transactions
        WHERE transaction_date >= CURRENT_DATE - INTERVAL '30 days'
        ${churchFilter}
      ),
      acct AS (
        SELECT COALESCE(SUM(amount), 0) AS total_balance
        FROM accounts
        WHERE is_active = true
        ${churchFilter}
      )
      SELECT
        acct.total_balance,
        tx.income_30_days,
        tx.expense_30_days,
        tx.transactions_30_days
      FROM tx CROSS JOIN acct
    `;

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getRecentTransactions(limit = 10, churchId = null) {
    let query = `
      SELECT t.*, a.account_name, c.category_name
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (churchId) {
      query += ` AND t.church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY t.transaction_date DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getIncomeExpenseTrend(days = 30, churchId = null) {
    // days arrives from req.query — coerce strictly before binding (was interpolated raw: SQLi).
    const safeDays = Math.max(1, Math.min(3650, Math.floor(Number(days)) || 30));
    let query = `
      SELECT
        DATE(transaction_date) as date,
        SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE transaction_date >= CURRENT_DATE - ($1 * INTERVAL '1 day')
    `;
    const params = [safeDays];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` GROUP BY DATE(transaction_date) ORDER BY date`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getTopExpenseCategories(limit = 5, churchId = null) {
    let query = `
      SELECT
        c.name as category_name,
        COALESCE(SUM(t.amount), 0) as total_amount
      FROM expense_categories c
      LEFT JOIN transactions t ON CAST(c.id AS text) = CAST(t.category_id AS text) AND t.transaction_type = 'expense'
      WHERE 1=1
    `;
    const params = [];

    if (churchId) {
      query += ` AND c.church_id = $1`;
      params.push(churchId);
    }

    query += ` GROUP BY c.name ORDER BY total_amount DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getDashboardSummary(year, month, churchId = null) {
    const params = [year, month];
    // $3 is bound when churchId is present; every subquery gets the same tenant filter.
    const scope = churchId ? `AND church_id = $3` : '';
    if (churchId) params.push(churchId);
    let query = `
      WITH financial_data AS (
        SELECT
          (SELECT COALESCE(SUM(amount), 0)
           FROM payments
           WHERE status = 'completed'
           AND EXTRACT(YEAR FROM payment_date) = $1
           AND EXTRACT(MONTH FROM payment_date) = $2
           ${scope}) as total_income,
          (SELECT COALESCE(SUM(amount), 0)
           FROM transactions
           WHERE transaction_type = 'expense'
           AND status = 'approved'
           AND EXTRACT(YEAR FROM transaction_date) = $1
           AND EXTRACT(MONTH FROM transaction_date) = $2
           ${scope}) as total_expenses
      )
      SELECT
        fd.total_income,
        fd.total_expenses,
        (fd.total_income - fd.total_expenses) as net_cash_flow,
        (SELECT COALESCE(SUM(current_balance), 0) FROM funds WHERE 1=1 ${scope}) as total_fund_balance,
        (SELECT COUNT(*)
         FROM approval_requests
         WHERE status = 'pending'
         AND module = 'treasury'
         ${scope}) as pending_approvals,
        (SELECT COUNT(*)
         FROM projects
         WHERE status = 'active'
         AND is_active = true
         ${scope}) as active_projects,
        (SELECT COUNT(*)
         FROM pledges
         WHERE status = 'active'
         ${scope}) as pending_pledges,
        (SELECT COALESCE(SUM(amount - COALESCE(amount_paid, 0)), 0)
         FROM pledges
         WHERE status = 'active'
         ${scope}) as total_pledged_amount
      FROM financial_data fd
    `;

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getBudgetStatus(year, churchId = null) {
    const params = [year];
    let query = `
      SELECT b.*,
             d.name as department_name,
             f.fund_name
      FROM budgets b
      LEFT JOIN departments d ON b.department_id = d.id
      LEFT JOIN funds f ON b.fund_id = f.id
      WHERE b.fiscal_year = $1
      AND b.status = 'approved'
    `;
    if (churchId) {
      query += ` AND b.church_id = $2`;
      params.push(churchId);
    }
    query += `
      ORDER BY ABS(b.variance_percentage) DESC
      LIMIT 10
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAlertSummary(churchId = null) {
    const params = [];
    let query = `
      SELECT
        alert_type,
        COUNT(*) as count,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority,
        SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_priority
      FROM financial_alerts
      WHERE is_resolved = false
    `;
    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }
    query += `
      GROUP BY alert_type
      ORDER BY count DESC
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getTopExpenses(year, limit, churchId = null) {
    const params = [year, limit];
    let query = `
      SELECT
        t.description,
        t.category_id as category,
        SUM(t.amount) as total_amount,
        COUNT(*) as transaction_count
      FROM transactions t
      WHERE t.transaction_type = 'expense'
      AND t.status = 'approved'
      AND EXTRACT(YEAR FROM t.transaction_date) = $1
    `;
    if (churchId) {
      query += ` AND t.church_id = $3`;
      params.push(churchId);
    }
    query += `
      GROUP BY t.description, t.category_id
      ORDER BY total_amount DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }
}

module.exports = new TreasuryDashboardRepository();
