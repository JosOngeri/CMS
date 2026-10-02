/**
 * Expense Repository
 * Handles data access for expenses
 * All queries are church-scoped via the churchId option/parameter.
 */

const BaseRepository = require('../../../repositories/base.repository');
const Expense = require('../models/Expense');

const SELECT_WITH_JOINS = `
  SELECT e.*,
    a.account_name, a.account_number,
    f.fund_name,
    v.vendor_name,
    d.name as department_name,
    p.project_name,
    u.first_name || ' ' || u.last_name as submitted_by_name,
    approver.first_name || ' ' || approver.last_name as approved_by_name
  FROM expenses e
  LEFT JOIN accounts a ON e.account_id = a.id
  LEFT JOIN funds f ON e.fund_id = f.id
  LEFT JOIN vendors v ON e.vendor_id = v.id
  LEFT JOIN departments d ON e.department_id = d.id
  LEFT JOIN projects p ON e.project_id = p.id
  LEFT JOIN users u ON e.submitted_by = u.id
  LEFT JOIN users approver ON e.approved_by = approver.id
`;

class ExpenseRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'expenses', 'id');
  }

  async findAll(options = {}) {
    const { status, department_id, vendor_id, fund_id, start_date, end_date, churchId, limit = 50, offset = 0 } = options;

    let query = `${SELECT_WITH_JOINS} WHERE 1=1`;
    let params = [];
    let paramIndex = 1;

    if (churchId) {
      query += ` AND e.church_id = $${paramIndex++}`;
      params.push(churchId);
    }

    if (status) {
      query += ` AND e.status = $${paramIndex++}`;
      params.push(status);
    }

    if (department_id) {
      query += ` AND e.department_id = $${paramIndex++}`;
      params.push(department_id);
    }

    if (vendor_id) {
      query += ` AND e.vendor_id = $${paramIndex++}`;
      params.push(vendor_id);
    }

    if (fund_id) {
      query += ` AND e.fund_id = $${paramIndex++}`;
      params.push(fund_id);
    }

    if (start_date) {
      query += ` AND e.expense_date >= $${paramIndex++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND e.expense_date <= $${paramIndex++}`;
      params.push(end_date);
    }

    query += ` ORDER BY e.expense_date DESC, e.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows.map(row => Expense.fromDatabase(row));
  }

  async findById(id, churchId = null) {
    const query = `${SELECT_WITH_JOINS} WHERE e.id = $1 ${churchId ? 'AND e.church_id = $2' : ''}`;
    const params = churchId ? [id, churchId] : [id];
    const result = await this.pool.query(query, params);
    return result.rows[0] ? Expense.fromDatabase(result.rows[0]) : null;
  }

  async create(expense, churchId = null) {
    const validation = expense.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const data = expense.toDatabase();
    const query = `
      INSERT INTO expenses (
        expense_date, description, amount, account_id, fund_id, vendor_id,
        department_id, project_id, receipt_url, status, payment_method,
        submitted_by, notes, church_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      data.expense_date, data.description, data.amount, data.account_id,
      data.fund_id, data.vendor_id, data.department_id, data.project_id,
      data.receipt_url, data.status, data.payment_method, data.submitted_by, data.notes,
      churchId
    ]);

    return this.findById(result.rows[0].id, churchId);
  }

  async update(id, expense, churchId = null) {
    const data = expense.toDatabase();
    const query = `
      UPDATE expenses SET
        expense_date = $1, description = $2, amount = $3, account_id = $4,
        fund_id = $5, vendor_id = $6, department_id = $7, project_id = $8,
        receipt_url = $9, status = $10, payment_method = $11, notes = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13 ${churchId ? 'AND church_id = $14' : ''}
      RETURNING *
    `;

    const params = [
      data.expense_date, data.description, data.amount, data.account_id,
      data.fund_id, data.vendor_id, data.department_id, data.project_id,
      data.receipt_url, data.status, data.payment_method, data.notes, id
    ];
    if (churchId) params.push(churchId);

    const result = await this.pool.query(query, params);
    return result.rows[0] ? this.findById(id, churchId) : null;
  }

  async delete(id, churchId = null) {
    const query = churchId
      ? 'DELETE FROM expenses WHERE id = $1 AND church_id = $2 RETURNING *'
      : 'DELETE FROM expenses WHERE id = $1 RETURNING *';
    const result = await this.pool.query(query, churchId ? [id, churchId] : [id]);
    return result.rows[0] || null;
  }

  async approve(id, approverId, churchId = null) {
    const query = `
      UPDATE expenses SET
        status = 'approved',
        approved_by = $1,
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status = 'pending' ${churchId ? 'AND church_id = $3' : ''}
      RETURNING *
    `;
    const params = churchId ? [approverId, id, churchId] : [approverId, id];
    const result = await this.pool.query(query, params);
    return result.rows[0] ? Expense.fromDatabase(result.rows[0]) : null;
  }

  async reject(id, reason, churchId = null) {
    const query = `
      UPDATE expenses SET
        status = 'rejected',
        rejection_reason = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status = 'pending' ${churchId ? 'AND church_id = $3' : ''}
      RETURNING *
    `;
    const params = churchId ? [reason, id, churchId] : [reason, id];
    const result = await this.pool.query(query, params);
    return result.rows[0] ? Expense.fromDatabase(result.rows[0]) : null;
  }

  async markAsPaid(id, churchId = null) {
    const query = `
      UPDATE expenses SET
        status = 'paid',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'approved' ${churchId ? 'AND church_id = $2' : ''}
      RETURNING *
    `;
    const params = churchId ? [id, churchId] : [id];
    const result = await this.pool.query(query, params);
    return result.rows[0] ? Expense.fromDatabase(result.rows[0]) : null;
  }

  async getPendingApprovals(churchId = null) {
    return this.findAll({ status: 'pending', churchId, limit: 100 });
  }

  async getExpensesByStatus(churchId = null) {
    const query = `
      SELECT status, COUNT(*) as count, SUM(amount) as total
      FROM expenses ${churchId ? 'WHERE church_id = $1' : ''}
      GROUP BY status
    `;
    const result = await this.pool.query(query, churchId ? [churchId] : []);
    return result.rows;
  }

  async getExpenseSummary(startDate, endDate, churchId = null) {
    const query = `
      SELECT
        a.account_name,
        COUNT(*) as expense_count,
        SUM(e.amount) as total_amount
      FROM expenses e
      JOIN accounts a ON e.account_id = a.id
      WHERE e.expense_date BETWEEN $1 AND $2
        AND e.status = 'paid'
        ${churchId ? 'AND e.church_id = $3' : ''}
      GROUP BY a.account_name
      ORDER BY total_amount DESC
    `;
    const params = churchId ? [startDate, endDate, churchId] : [startDate, endDate];
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Summarize pending-approval expenses into count + total amount
   * (keeps reporting aggregation out of the controller)
   */
  summarizePendingApprovals(expenses) {
    return {
      count: expenses.length,
      total_amount: expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
    };
  }

  /**
   * Summarize an expense report into total amount + category count
   * (keeps reporting aggregation out of the controller)
   */
  summarizeExpenseReport(report) {
    return {
      total_amount: report.reduce((sum, item) => sum + parseFloat(item.total_amount), 0),
      categories: report.length
    };
  }
}

module.exports = ExpenseRepository;
