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
    const { fiscal_year, status, department_id, fund_id, churchId, limit = 50, offset = 0 } = options;
    
    let query = `
      SELECT b.*,
        a.account_name, a.account_number,
        f.fund_name,
        d.name as department_name,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM budgets b
      LEFT JOIN accounts a ON b.account_id = a.id
      LEFT JOIN funds f ON b.fund_id = f.id
      LEFT JOIN departments d ON b.department_id = d.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE 1=1
    `;
    let params = [];
    let paramIndex = 1;

    if (churchId) {
      query += ` AND b.church_id = $${paramIndex++}`;
      params.push(churchId);
    }

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

  async findById(id, churchId) {
    if (!churchId) throw new Error('findById: churchId is required');
    const query = `
      SELECT b.*,
        a.account_name, a.account_number,
        f.fund_name,
        d.name as department_name,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM budgets b
      LEFT JOIN accounts a ON b.account_id = a.id
      LEFT JOIN funds f ON b.fund_id = f.id
      LEFT JOIN departments d ON b.department_id = d.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = $1  AND b.church_id = $2
    `;
    const result = await this.pool.query(query, [id, churchId]);
    return result.rows[0] ? Budget.fromDatabase(result.rows[0]) : null;
  }

  async create(budget, churchId) {
    if (!churchId) throw new Error('create: churchId is required');
    const validation = budget.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    const data = budget.toDatabase();
    const query = `
      INSERT INTO budgets (
        budget_name, budget_type, fiscal_year, account_id, fund_id, department_id,
        total_budgeted, status, start_date, end_date, notes, created_by, church_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      data.budget_name, data.budget_type, data.fiscal_year, data.account_id,
      data.fund_id, data.department_id, data.total_budgeted, data.status,
      data.start_date, data.end_date, data.notes, data.created_by, churchId
    ]);

    return this.findById(result.rows[0].id, churchId);
  }

  async update(id, budget, churchId) {
    if (!churchId) throw new Error('update: churchId is required');
    const data = budget.toDatabase();
    const query = `
      UPDATE budgets SET
        budget_name = $1, budget_type = $2, fiscal_year = $3, account_id = $4,
        fund_id = $5, department_id = $6, total_budgeted = $7, total_actual = $8,
        variance = $9, variance_percentage = $10, status = $11, start_date = $12,
        end_date = $13, notes = $14, updated_at = CURRENT_TIMESTAMP
      WHERE id = $15  AND church_id = $16
      RETURNING *
    `;

    const params = [
      data.budget_name, data.budget_type, data.fiscal_year, data.account_id,
      data.fund_id, data.department_id, data.total_budgeted, data.total_actual,
      data.variance, data.variance_percentage, data.status, data.start_date,
      data.end_date, data.notes, id
    ];
    if (churchId) params.push(churchId);

    const result = await this.pool.query(query, params);

    return result.rows[0] ? this.findById(id, churchId) : null;
  }

  async delete(id, churchId) {
    if (!churchId) throw new Error('delete: churchId is required');
    const query = 'DELETE FROM budgets WHERE id = $1 AND church_id = $2 RETURNING *';
    const result = await this.pool.query(query, [id, churchId]);
    return result.rows[0] || null;
  }

  async updateActualSpending(id, churchId) {
    if (!churchId) throw new Error('updateActualSpending: churchId is required');
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
      WHERE id = $1  AND church_id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [id, churchId]);
    return result.rows[0] ? Budget.fromDatabase(result.rows[0]) : null;
  }

  async getBudgetAlerts(threshold = 80, churchId) {
    if (!churchId) throw new Error('getBudgetAlerts: churchId is required');
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
      WHERE status = 'active'  AND church_id = $1
    `, [churchId]);
    
    const query = `
      SELECT b.*,
        a.account_name, a.account_number,
        f.fund_name,
        d.name as department_name
      FROM budgets b
      LEFT JOIN accounts a ON b.account_id = a.id
      LEFT JOIN funds f ON b.fund_id = f.id
      LEFT JOIN departments d ON b.department_id = d.id
      WHERE b.status = 'active'
        AND b.total_budgeted > 0
        AND (b.total_actual / b.total_budgeted) * 100 >= $1
         AND b.church_id = $2
      ORDER BY (b.total_actual / b.total_budgeted) DESC
    `;
    const result = await this.pool.query(query, [threshold, churchId]);
    return result.rows.map(row => Budget.fromDatabase(row));
  }

  async getBudgetComparison(fiscalYear, churchId) {
    if (!churchId) throw new Error('getBudgetComparison: churchId is required');
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
         AND b.church_id = $2
      ORDER BY ABS(b.variance) DESC
    `;
    const result = await this.pool.query(query, [fiscalYear, churchId]);
    return result.rows;
  }

  /**
   * Categorize budget alerts into over-budget and at-risk buckets
   * (uses Budget model rules; keeps categorization out of the controller)
   */
  categorizeAlerts(alerts) {
    return alerts.reduce((acc, budget) => {
      if (budget.isOverBudget()) {
        acc.over.push(budget);
      } else if (budget.isAtRisk()) {
        acc.at_risk.push(budget);
      }
      return acc;
    }, { over: [], at_risk: [] });
  }

  /**
   * Summarize a budget comparison report into totals and status counts
   * (keeps comparison math out of the controller)
   */
  summarizeComparison(comparison) {
    return comparison.reduce((acc, item) => {
      acc.total_budgeted += parseFloat(item.total_budgeted);
      acc.total_actual += parseFloat(item.total_actual);
      acc.total_variance += parseFloat(item.variance);

      if (item.status === 'over') acc.over_count++;
      else if (item.status === 'at_risk') acc.at_risk_count++;
      else acc.on_track_count++;

      return acc;
    }, {
      total_budgeted: 0,
      total_actual: 0,
      total_variance: 0,
      over_count: 0,
      at_risk_count: 0,
      on_track_count: 0
    });
  }
}

module.exports = BudgetRepository;
