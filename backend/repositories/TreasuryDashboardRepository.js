const BaseRepository = require('./BaseRepository');

class TreasuryDashboardRepository extends BaseRepository {
  constructor() {
    super('treasury_dashboard');
  }

  async getDashboardStats(churchId = null) {
    let query = `
      SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM accounts WHERE is_active = true) as total_balance,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'income' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days') as income_30_days,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'expense' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days') as expense_30_days,
        (SELECT COUNT(*) FROM transactions WHERE transaction_date >= CURRENT_DATE - INTERVAL '30 days') as transactions_30_days
    `;
    const params = [];

    if (churchId) {
      query = `
        SELECT
          (SELECT COALESCE(SUM(amount), 0) FROM accounts WHERE is_active = true AND church_id = $1) as total_balance,
          (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'income' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days' AND church_id = $1) as income_30_days,
          (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'expense' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days' AND church_id = $1) as expense_30_days,
          (SELECT COUNT(*) FROM transactions WHERE transaction_date >= CURRENT_DATE - INTERVAL '30 days' AND church_id = $1) as transactions_30_days
      `;
      params.push(churchId);
    }

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
    let query = `
      SELECT
        DATE(transaction_date) as date,
        SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE transaction_date >= CURRENT_DATE - INTERVAL '${days} days'
    `;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` GROUP BY DATE(transaction_date) ORDER BY date`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getTopExpenseCategories(limit = 5, churchId = null) {
    let query = `
      SELECT
        c.category_name,
        COALESCE(SUM(t.amount), 0) as total_amount
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id AND t.transaction_type = 'expense'
      WHERE 1=1
    `;
    const params = [];

    if (churchId) {
      query += ` AND t.church_id = $1`;
      params.push(churchId);
    }

    query += ` GROUP BY c.category_name ORDER BY total_amount DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getDashboardSummary(year, month, churchId = null) {
    const params = [year, month];
    let query = `
      WITH financial_data AS (
        SELECT
          (SELECT COALESCE(SUM(amount), 0)
           FROM payments
           WHERE status = 'completed'
           AND EXTRACT(YEAR FROM payment_date) = $1
           AND EXTRACT(MONTH FROM payment_date) = $2) as total_income,
          (SELECT COALESCE(SUM(amount), 0)
           FROM transactions
           WHERE transaction_type = 'expense'
           AND status = 'approved'
           AND EXTRACT(YEAR FROM transaction_date) = $1
           AND EXTRACT(MONTH FROM transaction_date) = $2) as total_expenses
      )
      SELECT
        fd.total_income,
        fd.total_expenses,
        (fd.total_income - fd.total_expenses) as net_cash_flow,
        (SELECT COALESCE(SUM(balance), 0) FROM funds) as total_fund_balance,
        (SELECT COUNT(*)
         FROM approvals
         WHERE status = 'pending'
         AND module = 'treasury') as pending_approvals,
        (SELECT COUNT(*)
         FROM projects
         WHERE status = 'active'
         AND is_active = true) as active_projects,
        (SELECT COUNT(*)
         FROM pledges
         WHERE status = 'active') as pending_pledges,
        (SELECT COALESCE(SUM(amount_remaining), 0)
         FROM pledges
         WHERE status = 'active') as total_pledged_amount
      FROM financial_data fd
    `;

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getBudgetStatus(year) {
    const query = `
      SELECT b.*,
             d.name as department_name,
             f.fund_name
      FROM budgets b
      LEFT JOIN departments d ON b.department_id = d.id
      LEFT JOIN funds f ON b.fund_id = f.id
      WHERE b.fiscal_year = $1
      AND b.status = 'approved'
      ORDER BY ABS(b.variance_percentage) DESC
      LIMIT 10
    `;

    const result = await this.pool.query(query, [year]);
    return result.rows;
  }

  async getAlertSummary() {
    const query = `
      SELECT
        alert_type,
        COUNT(*) as count,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority,
        SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_priority
      FROM financial_alerts
      WHERE is_resolved = false
      GROUP BY alert_type
      ORDER BY count DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getTopExpenses(year, limit) {
    const query = `
      SELECT
        t.description,
        t.category,
        SUM(t.amount) as total_amount,
        COUNT(*) as transaction_count
      FROM transactions t
      WHERE t.transaction_type = 'expense'
      AND t.status = 'approved'
      AND EXTRACT(YEAR FROM t.transaction_date) = $1
      GROUP BY t.description, t.category
      ORDER BY total_amount DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [year, limit]);
    return result.rows;
  }
}

module.exports = new TreasuryDashboardRepository();
