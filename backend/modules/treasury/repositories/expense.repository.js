/**
 * Expense Repository
 * Handles data access for expenses
 */

const BaseRepository = require('../../../repositories/base.repository');
const Expense = require('../models/Expense');

class ExpenseRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'expenses', 'id');
  }

  async findAll(options = {}) {
    const { status, department_id, vendor_id, fund_id, start_date, end_date, limit = 50, offset = 0 } = options;
    
    let query = `
      SELECT e.*, 
        a.account_name, a.account_number,
        f.fund_name,
        v.vendor_name,
        d.department_name,
        p.project_name,
        u.full_name as submitted_by_name,
        approver.full_name as approved_by_name
      FROM expenses e
      LEFT JOIN accounts a ON e.account_id = a.id
      LEFT JOIN funds f ON e.fund_id = f.id
      LEFT JOIN vendors v ON e.vendor_id = v.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN projects p ON e.project_id = p.id
      LEFT JOIN users u ON e.submitted_by = u.id
      LEFT JOIN users approver ON e.approved_by = approver.id
      WHERE 1=1
    `;
    let params = [];
    let paramIndex = 1;
    
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

  async findById(id) {
    const query = `
      SELECT e.*, 
        a.account_name, a.account_number,
        f.fund_name,
        v.vendor_name,
        d.department_name,
        p.project_name,
        u.full_name as submitted_by_name,
        approver.full_name as approved_by_name
      FROM expenses e
      LEFT JOIN accounts a ON e.account_id = a.id
      LEFT JOIN funds f ON e.fund_id = f.id
      LEFT JOIN vendors v ON e.vendor_id = v.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN projects p ON e.project_id = p.id
      LEFT JOIN users u ON e.submitted_by = u.id
      LEFT JOIN users approver ON e.approved_by = approver.id
      WHERE e.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] ? Expense.fromDatabase(result.rows[0]) : null;
  }

  async create(expense) {
    const validation = expense.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    const data = expense.toDatabase();
    const query = `
      INSERT INTO expenses (
        expense_date, description, amount, account_id, fund_id, vendor_id,
        department_id, project_id, receipt_url, status, payment_method,
        submitted_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      data.expense_date, data.description, data.amount, data.account_id,
      data.fund_id, data.vendor_id, data.department_id, data.project_id,
      data.receipt_url, data.status, data.payment_method, data.submitted_by, data.notes
    ]);
    
    return this.findById(result.rows[0].id);
  }

  async update(id, expense) {
    const data = expense.toDatabase();
    const query = `
      UPDATE expenses SET
        expense_date = $1, description = $2, amount = $3, account_id = $4,
        fund_id = $5, vendor_id = $6, department_id = $7, project_id = $8,
        receipt_url = $9, status = $10, payment_method = $11, notes = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      data.expense_date, data.description, data.amount, data.account_id,
      data.fund_id, data.vendor_id, data.department_id, data.project_id,
      data.receipt_url, data.status, data.payment_method, data.notes, id
    ]);
    
    return result.rows[0] ? this.findById(id) : null;
  }

  async approve(id, approverId) {
    const query = `
      UPDATE expenses SET
        status = 'approved',
        approved_by = $1,
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status = 'pending'
      RETURNING *
    `;
    const result = await this.pool.query(query, [approverId, id]);
    return result.rows[0] ? Expense.fromDatabase(result.rows[0]) : null;
  }

  async reject(id, reason) {
    const query = `
      UPDATE expenses SET
        status = 'rejected',
        rejection_reason = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status = 'pending'
      RETURNING *
    `;
    const result = await this.pool.query(query, [reason, id]);
    return result.rows[0] ? Expense.fromDatabase(result.rows[0]) : null;
  }

  async markAsPaid(id) {
    const query = `
      UPDATE expenses SET
        status = 'paid',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'approved'
      RETURNING *
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] ? Expense.fromDatabase(result.rows[0]) : null;
  }

  async getPendingApprovals() {
    return this.findAll({ status: 'pending', limit: 100 });
  }

  async getExpensesByStatus() {
    const query = `
      SELECT status, COUNT(*) as count, SUM(amount) as total
      FROM expenses
      GROUP BY status
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getExpenseSummary(startDate, endDate) {
    const query = `
      SELECT 
        a.account_name,
        COUNT(*) as expense_count,
        SUM(e.amount) as total_amount
      FROM expenses e
      JOIN accounts a ON e.account_id = a.id
      WHERE e.expense_date BETWEEN $1 AND $2
        AND e.status = 'paid'
      GROUP BY a.account_name
      ORDER BY total_amount DESC
    `;
    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows;
  }
}

module.exports = ExpenseRepository;
