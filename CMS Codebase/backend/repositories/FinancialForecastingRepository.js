const BaseRepository = require('./BaseRepository');

class FinancialForecastingRepository extends BaseRepository {
  constructor() {
    super('financial_forecasting');
  }

  async getRevenueHistoricalData(categoryId = null) {
    let query = `
      SELECT 
        EXTRACT(MONTH FROM payment_date) as month,
        SUM(amount) as total_amount
      FROM payments
      WHERE status = 'completed'
      AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
    `;
    const params = [];

    if (categoryId) {
      query += ` AND category_id = $1`;
      params.push(categoryId);
    }

    query += ` GROUP BY EXTRACT(MONTH FROM payment_date) ORDER BY month`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getExpenseHistoricalData(categoryId = null) {
    let query = `
      SELECT 
        EXTRACT(MONTH FROM transaction_date) as month,
        SUM(amount) as total_amount
      FROM transactions
      WHERE transaction_type = 'expense'
      AND status = 'approved'
      AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
    `;
    const params = [];

    if (categoryId) {
      query += ` AND category_id = $1`;
      params.push(categoryId);
    }

    query += ` GROUP BY EXTRACT(MONTH FROM transaction_date) ORDER BY month`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getBudgetById(budgetId) {
    const result = await this.pool.query(
      'SELECT * FROM budgets WHERE id = $1',
      [budgetId]
    );
    return result.rows[0];
  }

  async getBudgetHistoricalActuals(accountId = null) {
    let query = `
      SELECT 
        EXTRACT(MONTH FROM transaction_date) as month,
        SUM(amount) as total_amount
      FROM transactions
      WHERE status = 'approved'
      AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
    `;
    const params = [];

    if (accountId) {
      query += ` AND account_id = $1`;
      params.push(accountId);
    }

    query += ` GROUP BY EXTRACT(MONTH FROM transaction_date) ORDER BY month`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getCashFlowHistoricalData() {
    const query = `
      SELECT 
        EXTRACT(MONTH FROM payment_date) as month,
        SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as expense
      FROM (
        SELECT payment_date, amount, 'income' as transaction_type
        FROM payments WHERE status = 'completed'
        UNION ALL
        SELECT transaction_date, amount, 'expense' as transaction_type
        FROM transactions WHERE status = 'approved'
      ) combined
      WHERE EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
      GROUP BY EXTRACT(MONTH FROM payment_date)
      ORDER BY month
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }
}

module.exports = new FinancialForecastingRepository();
