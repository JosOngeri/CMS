/**
 * Budget Repository
 * Handles data access for budgets
 */

const BaseRepository = require('../../../repositories/base.repository');
const Budget = require('../models/Budget');

class BudgetRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'budgets', 'id');
  }

  async findAll(options = {}) {
    const { fiscal_year, status, department_id, fund_id, limit = 50, offset = 0 } = options;
    
    let query = `
      SELECT b.*,
        a.account_name, a.account_number,
        f.fund_name,
        d.department_name,
        u.full_name as created_by_name
      FROM budgets b
      LEFT JOIN accounts a ON b.account_id = a.id
      LEFT JOIN funds f ON b.fund_id = f.id
      LEFT JOIN departments d ON b.department_id = d.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE 1=1
    `;
    let params = [];
    let paramIndex = 1;
    
    if (fiscal_year) {
      query += ` AND b.fiscal_year = $${paramIndex++}`;
      params.push(fiscal_year);
    }
    
    if (status) {
      query += ` AND b.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (department_id) {
      query += ` AND b.department_id = $${paramIndex++}`;
      params.push(department_id);
    }
    
    if (fund_id) {
      query += ` AND b.fund_id = $${paramIndex++}`;
      params.push(fund_id);
    }
    
    query += ` ORDER BY b.fiscal_year DESC, b.budget_name LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    
    const result = await this.pool.query(query, params);
    return result.rows.map(row => Budget.fromDatabase(row));
  }

  async findById(id) {
    const query = `
      SELECT b.*,
        a.account_name, a.account_number,
        f.fund_name,
        d.department_name,
        u.full_name as created_by_name
      FROM budgets b
      LEFT JOIN accounts a ON b.account_id = a.id
      LEFT JOIN funds f ON b.fund_id = f.id
      LEFT JOIN departments d ON b.department_id = d.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] ? Budget.fromDatabase(result.rows[0]) : null;
  }

  async create(budget) {
    const validation = budget.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    const data = budget.toDatabase();
    const query = `
      INSERT INTO budgets (
        budget_name, budget_type, fiscal_year, account_id, fund_id, department_id,
        total_budgeted, status, start_date, end_date, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      data.budget_name, data.budget_type, data.fiscal_year, data.account_id,
      data.fund_id, data.department_id, data.total_budgeted, data.status,
      data.start_date, data.end_date, data.notes, data.created_by
    ]);
    
    return this.findById(result.rows[0].id);
  }

  async update(id, budget) {
    const data = budget.toDatabase();
    const query = `
      UPDATE budgets SET
        budget_name = $1, budget_type = $2, fiscal_year = $3, account_id = $4,
        fund_id = $5, department_id = $6, total_budgeted = $7, total_actual = $8,
        variance = $9, variance_percentage = $10, status = $11, start_date = $12,
        end_date = $13, notes = $14, updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      data.budget_name, data.budget_type, data.fiscal_year, data.account_id,
      data.fund_id, data.department_id, data.total_budgeted, data.total_actual,
      data.variance, data.variance_percentage, data.status, data.start_date,
      data.end_date, data.notes, id
    ]);
    
    return result.rows[0] ? this.findById(id) : null;
  }

  async updateActualSpending(id) {
    const query = `
      UPDATE budgets SET
        total_actual = COALESCE((
          SELECT SUM(e.amount)
          FROM expenses e
          WHERE e.account_id = budgets.account_id
            AND e.status = 'paid'
            AND e.expense_date BETWEEN budgets.start_date AND budgets.end_date
        ), 0),
        variance = budgets.total_budgeted - COALESCE((
          SELECT SUM(e.amount)
          FROM expenses e
          WHERE e.account_id = budgets.account_id
            AND e.status = 'paid'
            AND e.expense_date BETWEEN budgets.start_date AND budgets.end_date
        ), 0),
        variance_percentage = CASE 
          WHEN budgets.total_budgeted > 0 THEN
            ((budgets.total_budgeted - COALESCE((
              SELECT SUM(e.amount)
              FROM expenses e
              WHERE e.account_id = budgets.account_id
                AND e.status = 'paid'
                AND e.expense_date BETWEEN budgets.start_date AND budgets.end_date
            ), 0)) / budgets.total_budgeted) * 100
          ELSE 0
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] ? Budget.fromDatabase(result.rows[0]) : null;
  }

  async getBudgetAlerts(threshold = 80) {
    // Update all budget actuals first
    await this.pool.query(`
      UPDATE budgets SET
        total_actual = COALESCE((
          SELECT SUM(e.amount)
          FROM expenses e
          WHERE e.account_id = budgets.account_id
            AND e.status = 'paid'
            AND e.expense_date BETWEEN budgets.start_date AND budgets.end_date
        ), 0)
      WHERE status = 'active'
    `);
    
    const query = `
      SELECT b.*,
        a.account_name, a.account_number,
        f.fund_name,
        d.department_name
      FROM budgets b
      LEFT JOIN accounts a ON b.account_id = a.id
      LEFT JOIN funds f ON b.fund_id = f.id
      LEFT JOIN departments d ON b.department_id = d.id
      WHERE b.status = 'active'
        AND b.total_budgeted > 0
        AND (b.total_actual / b.total_budgeted) * 100 >= $1
      ORDER BY (b.total_actual / b.total_budgeted) DESC
    `;
    const result = await this.pool.query(query, [threshold]);
    return result.rows.map(row => Budget.fromDatabase(row));
  }

  async getBudgetComparison(fiscalYear) {
    const query = `
      SELECT 
        b.budget_name,
        b.total_budgeted,
        b.total_actual,
        b.variance,
        b.variance_percentage,
        a.account_name,
        CASE 
          WHEN b.total_actual > b.total_budgeted THEN 'over'
          WHEN (b.total_actual / b.total_budgeted) * 100 >= 80 THEN 'at_risk'
          ELSE 'on_track'
        END as status
      FROM budgets b
      LEFT JOIN accounts a ON b.account_id = a.id
      WHERE b.fiscal_year = $1 AND b.status = 'active'
      ORDER BY ABS(b.variance) DESC
    `;
    const result = await this.pool.query(query, [fiscalYear]);
    return result.rows;
  }
}

module.exports = BudgetRepository;
