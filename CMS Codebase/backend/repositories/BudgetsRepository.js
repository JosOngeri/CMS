const BaseRepository = require('./BaseRepository');

class BudgetsRepository extends BaseRepository {
  constructor() {
    super('budgets');
  }

  async getAllWithDetails(filters = {}) {
    let query = `
      SELECT b.*,
             d.name as department_name,
             f.fund_name,
             coa.account_name,
             coa.account_code,
             u.first_name || ' ' || u.last_name as created_by_name,
             ua.first_name || ' ' || ua.last_name as approved_by_name
      FROM budgets b
      LEFT JOIN departments d ON b.department_id = d.id
      LEFT JOIN funds f ON b.fund_id = f.id
      LEFT JOIN chart_of_accounts coa ON b.account_id = coa.id
      LEFT JOIN users u ON b.created_by = u.id
      LEFT JOIN users ua ON b.approved_by = ua.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (filters.fiscal_year) {
      paramCount++;
      query += ` AND b.fiscal_year = $${paramCount}`;
      params.push(filters.fiscal_year);
    }

    if (filters.department_id) {
      paramCount++;
      query += ` AND b.department_id = $${paramCount}`;
      params.push(filters.department_id);
    }

    if (filters.fund_id) {
      paramCount++;
      query += ` AND b.fund_id = $${paramCount}`;
      params.push(filters.fund_id);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND b.status = $${paramCount}`;
      params.push(filters.status);
    }

    query += ` ORDER BY b.fiscal_year DESC, b.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getBudgetByIdWithDetails(id) {
    const query = `
      SELECT b.*,
             d.name as department_name,
             f.fund_name,
             coa.account_name,
             coa.account_code
      FROM budgets b
      LEFT JOIN departments d ON b.department_id = d.id
      LEFT JOIN funds f ON b.fund_id = f.id
      LEFT JOIN chart_of_accounts coa ON b.account_id = coa.id
      WHERE b.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async getBudgetLineItems(budgetId) {
    const query = `
      SELECT bli.*, coa.account_name, coa.account_code
      FROM budget_line_items bli
      LEFT JOIN chart_of_accounts coa ON bli.account_id = coa.id
      WHERE bli.budget_id = $1
      ORDER BY bli.created_at ASC
    `;
    const result = await this.pool.query(query, [budgetId]);
    return result.rows;
  }

  async createBudget(budgetData) {
    const {
      budget_code, budget_name, description, fiscal_year, period,
      start_date, end_date, department_id, fund_id, account_id,
      budgeted_amount, created_by
    } = budgetData;

    const query = `
      INSERT INTO budgets (budget_code, budget_name, description, fiscal_year, period, start_date, end_date, department_id, fund_id, account_id, budgeted_amount, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      budget_code, budget_name, description, fiscal_year, period,
      start_date, end_date, department_id, fund_id, account_id,
      budgeted_amount, created_by
    ]);
    return result.rows[0];
  }

  async createBudgetLineItem(lineItemData) {
    const { budget_id, account_id, category, description, budgeted_amount } = lineItemData;
    const query = `
      INSERT INTO budget_line_items (budget_id, account_id, category, description, budgeted_amount)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await this.pool.query(query, [budget_id, account_id, category, description, budgeted_amount]);
    return result.rows[0];
  }

  async updateBudget(id, budgetData) {
    const {
      budget_name, description, period, start_date, end_date,
      department_id, fund_id, account_id, budgeted_amount,
      actual_amount, status
    } = budgetData;

    const query = `
      UPDATE budgets
      SET budget_name = COALESCE($1, budget_name),
          description = COALESCE($2, description),
          period = COALESCE($3, period),
          start_date = COALESCE($4, start_date),
          end_date = COALESCE($5, end_date),
          department_id = COALESCE($6, department_id),
          fund_id = COALESCE($7, fund_id),
          account_id = COALESCE($8, account_id),
          budgeted_amount = COALESCE($9, budgeted_amount),
          actual_amount = COALESCE($10, actual_amount),
          status = COALESCE($11, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      budget_name, description, period, start_date, end_date,
      department_id, fund_id, account_id, budgeted_amount,
      actual_amount, status, id
    ]);
    return result.rows[0];
  }

  async deleteBudgetLineItems(budgetId) {
    const query = 'DELETE FROM budget_line_items WHERE budget_id = $1';
    await this.pool.query(query, [budgetId]);
  }

  async delete(id) {
    const query = 'DELETE FROM budgets WHERE id = $1 RETURNING *';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async approveBudget(id, approvedBy) {
    const query = `
      UPDATE budgets
      SET status = 'approved',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [approvedBy, id]);
    return result.rows[0];
  }

  async rejectBudget(id, approvedBy, rejectionReason) {
    const query = `
      UPDATE budgets
      SET status = 'rejected',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          rejection_reason = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await this.pool.query(query, [approvedBy, rejectionReason, id]);
    return result.rows[0];
  }

  async getBudgetVariance(budgetId) {
    const query = `
      SELECT
        b.budgeted_amount,
        COALESCE(SUM(t.amount), 0) as actual_spent,
        b.budgeted_amount - COALESCE(SUM(t.amount), 0) as remaining,
        CASE
          WHEN b.budgeted_amount > 0 THEN
            ROUND(((b.budgeted_amount - COALESCE(SUM(t.amount), 0)) / b.budgeted_amount) * 100, 2)
          ELSE 0
        END as variance_percentage
      FROM budgets b
      LEFT JOIN transactions t ON b.id = t.budget_id AND t.status = 'approved'
      WHERE b.id = $1
      GROUP BY b.id, b.budgeted_amount
    `;
    const result = await this.pool.query(query, [budgetId]);
    return result.rows[0];
  }

  async updateBudgetActuals(id, actualAmount) {
    const query = `
      UPDATE budgets
      SET actual_amount = COALESCE($1, actual_amount),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [actualAmount, id]);
    return result.rows[0];
  }

  async getBudgetLineItemsVariance(budgetId) {
    const query = `
      SELECT bli.*, coa.account_name, coa.account_code,
             (bli.budgeted_amount - bli.actual_amount) as variance,
             CASE WHEN bli.budgeted_amount > 0
               THEN ((bli.budgeted_amount - bli.actual_amount) / bli.budgeted_amount) * 100
               ELSE 0
             END as variance_percentage
      FROM budget_line_items bli
      LEFT JOIN chart_of_accounts coa ON bli.account_id = coa.id
      WHERE bli.budget_id = $1
      ORDER BY bli.created_at ASC
    `;
    const result = await this.pool.query(query, [budgetId]);
    return result.rows;
  }

  async findById(id) {
    const query = 'SELECT * FROM budgets WHERE id = $1';
    const result = await this.pool.query(query, [id]);
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

  async createBudgetWithLineItems(budgetData, lineItems) {
    const client = await this.beginTransaction();
    try {
      const code = budgetData.budget_code || `BUD-${budgetData.fiscal_year}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      const budget = await this.createBudget({
        ...budgetData,
        budget_code: code
      });

      const budgetId = budget.id;

      if (lineItems && Array.isArray(lineItems)) {
        for (const item of lineItems) {
          await this.createBudgetLineItem({
            budget_id: budgetId,
            account_id: item.account_id,
            category: item.category,
            description: item.description,
            budgeted_amount: item.budgeted_amount
          });
        }
      }

      await this.commitTransaction(client);
      return budget;
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }

  async updateBudgetWithLineItems(id, budgetData, lineItems) {
    const client = await this.beginTransaction();
    try {
      const budget = await this.updateBudget(id, budgetData);

      if (lineItems && Array.isArray(lineItems)) {
        await this.deleteBudgetLineItems(id);

        for (const item of lineItems) {
          await this.createBudgetLineItem({
            budget_id: id,
            account_id: item.account_id,
            category: item.category,
            description: item.description,
            budgeted_amount: item.budgeted_amount
          });
        }
      }

      await this.commitTransaction(client);
      return budget;
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }
}

module.exports = new BudgetsRepository();
