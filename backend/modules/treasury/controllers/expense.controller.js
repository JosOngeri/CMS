/**
 * @audit Treasury expense controller (modular surface — church-scoped).
 * @fixed updateExpense/createExpense whitelist editable fields via pickEditableFields;
 *        status/submitted_by/church_id are server-set only. approveExpense enforces
 *        separation of duties (submitter cannot approve own expense).
 */
/**
 * Expense Controller
 * Handles expense operations
 */

const { validationResult } = require('express-validator');
const ExpenseRepository = require('../repositories/expense.repository');
const Expense = require('../models/Expense');
const logger = require('../../../config/logging');

class ExpenseController {
  // Only these client fields may reach the Expense model — workflow fields
  // (status, submitted_by, approved_*, church_id) are always server-set.
  static EDITABLE_FIELDS = [
    'expense_date', 'description', 'amount', 'account_id', 'account_name',
    'fund_id', 'fund_name', 'vendor_id', 'vendor_name', 'department_id',
    'department_name', 'project_id', 'project_name', 'receipt_url',
    'payment_method', 'notes'
  ];

  static pickEditableFields(body) {
    const picked = {};
    for (const field of ExpenseController.EDITABLE_FIELDS) {
      if (body[field] !== undefined) picked[field] = body[field];
    }
    return picked;
  }

  constructor(pool) {
    this.expenseRepo = new ExpenseRepository(pool);
  }

  /**
   * Get all expenses
   */
  async getExpenses(req, res) {
    try {
      const { status, department_id, vendor_id, fund_id, start_date, end_date, limit = 50, offset = 0 } = req.query;
      
      const expenses = await this.expenseRepo.findAll({
        churchId: req.user.church_id,
        status,
        department_id,
        vendor_id,
        fund_id,
        start_date,
        end_date,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.json({ 
        expenses,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: expenses.length
        }
      });
    } catch (error) {
      logger.error('Get expenses error:', error);
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  }

  /**
   * Get expense by ID
   */
  async getExpenseById(req, res) {
    try {
      const { id } = req.params;
      const expense = await this.expenseRepo.findById(id, req.user.church_id);
      
      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      
      res.json({ expense });
    } catch (error) {
      logger.error('Get expense by ID error:', error);
      res.status(500).json({ error: 'Failed to fetch expense' });
    }
  }

  /**
   * Create new expense
   */
  async createExpense(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      // Whitelist editable fields — never spread raw req.body (injects
      // status/approved_by/church_id into the model's named fields)
      const expense = new Expense({
        ...ExpenseController.pickEditableFields(req.body),
        submitted_by: req.user.id,
        status: 'pending'
      });

      const validation = expense.validate();
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Expense validation failed', 
          details: validation.errors 
        });
      }
      
      const created = await this.expenseRepo.create(expense, req.user.church_id);
      
      logger.info(`Expense created: ${created.id} by ${req.user.email}`);
      res.status(201).json({ expense: created });
    } catch (error) {
      logger.error('Create expense error:', error);
      res.status(500).json({ error: error.message || 'Failed to create expense' });
    }
  }

  /**
   * Update expense
   */
  async updateExpense(req, res) {
    try {
      const { id } = req.params;
      
      const existing = await this.expenseRepo.findById(id, req.user.church_id);
      if (!existing) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      
      if (!existing.canEdit()) {
        return res.status(400).json({ 
          error: `Cannot edit expense with status: ${existing.status}` 
        });
      }

      // Merge current row + whitelisted edits (repo UPDATE writes every column —
      // absent fields would otherwise reset to model defaults). Status is
      // server-controlled: editing resubmits as pending (blocks PUT self-approval)
      const expense = new Expense({
        ...existing,
        ...ExpenseController.pickEditableFields(req.body),
        id,
        status: 'pending',
        submitted_by: existing.submitted_by,
        church_id: existing.church_id
      });
      
      const updated = await this.expenseRepo.update(id, expense, req.user.church_id);
      
      logger.info(`Expense updated: ${id}`);
      res.json({ expense: updated });
    } catch (error) {
      logger.error('Update expense error:', error);
      res.status(500).json({ error: error.message || 'Failed to update expense' });
    }
  }

  /**
   * Approve expense
   */
  async approveExpense(req, res) {
    try {
      const { id } = req.params;
      
      const existing = await this.expenseRepo.findById(id, req.user.church_id);
      if (!existing) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      
      if (!existing.canApprove()) {
        return res.status(400).json({
          error: `Cannot approve expense with status: ${existing.status}`
        });
      }

      // Separation of duties — the submitter cannot approve their own expense
      if (existing.submitted_by === req.user.id) {
        return res.status(403).json({ error: 'You cannot approve an expense you submitted' });
      }

      const approved = await this.expenseRepo.approve(id, req.user.id, req.user.church_id);
      
      logger.info(`Expense approved: ${id} by ${req.user.email}`);
      res.json({ expense: approved });
    } catch (error) {
      logger.error('Approve expense error:', error);
      res.status(500).json({ error: error.message || 'Failed to approve expense' });
    }
  }

  /**
   * Reject expense
   */
  async rejectExpense(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!reason || reason.trim() === '') {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }
      
      const existing = await this.expenseRepo.findById(id, req.user.church_id);
      if (!existing) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      
      if (!existing.canReject()) {
        return res.status(400).json({ 
          error: `Cannot reject expense with status: ${existing.status}` 
        });
      }
      
      const rejected = await this.expenseRepo.reject(id, reason, req.user.church_id);
      
      logger.info(`Expense rejected: ${id} by ${req.user.email}. Reason: ${reason}`);
      res.json({ expense: rejected });
    } catch (error) {
      logger.error('Reject expense error:', error);
      res.status(500).json({ error: error.message || 'Failed to reject expense' });
    }
  }

  /**
   * Mark expense as paid
   */
  async markExpensePaid(req, res) {
    try {
      const { id } = req.params;
      
      const existing = await this.expenseRepo.findById(id, req.user.church_id);
      if (!existing) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      
      if (!existing.canPay()) {
        return res.status(400).json({ 
          error: `Cannot pay expense with status: ${existing.status}` 
        });
      }
      
      const paid = await this.expenseRepo.markAsPaid(id, req.user.church_id);
      
      logger.info(`Expense paid: ${id} by ${req.user.email}`);
      res.json({ expense: paid });
    } catch (error) {
      logger.error('Mark expense paid error:', error);
      res.status(500).json({ error: error.message || 'Failed to mark expense as paid' });
    }
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(req, res) {
    try {
      const expenses = await this.expenseRepo.getPendingApprovals(req.user.church_id);

      const summary = this.expenseRepo.summarizePendingApprovals(expenses);

      res.json({
        expenses,
        summary
      });
    } catch (error) {
      logger.error('Get pending approvals error:', error);
      res.status(500).json({ error: 'Failed to fetch pending approvals' });
    }
  }

  /**
   * Get expense summary by status
   */
  async getExpenseSummary(req, res) {
    try {
      const summary = await this.expenseRepo.getExpensesByStatus(req.user.church_id);
      res.json({ summary });
    } catch (error) {
      logger.error('Get expense summary error:', error);
      res.status(500).json({ error: 'Failed to fetch expense summary' });
    }
  }

  /**
   * Get expense report
   */
  async getExpenseReport(req, res) {
    try {
      const { start_date, end_date } = req.query;
      
      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }
      
      const report = await this.expenseRepo.getExpenseSummary(start_date, end_date, req.user.church_id);

      const summary = this.expenseRepo.summarizeExpenseReport(report);

      res.json({
        report,
        summary,
        period: { start_date, end_date }
      });
    } catch (error) {
      logger.error('Get expense report error:', error);
      res.status(500).json({ error: 'Failed to generate expense report' });
    }
  }

  /**
   * Delete an expense. Only pending/rejected expenses can be deleted —
   * approved or paid expenses are part of the audit trail.
   */
  async deleteExpense(req, res) {
    try {
      const { id } = req.params;
      const expense = await this.expenseRepo.findById(id, req.user.church_id);

      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      if (['approved', 'paid'].includes(expense.status)) {
        return res.status(409).json({ error: 'Approved or paid expenses cannot be deleted' });
      }

      await this.expenseRepo.delete(id, req.user.church_id);
      logger.info(`Expense deleted: ${id} by ${req.user.email}`);
      res.json({ success: true });
    } catch (error) {
      logger.error('Delete expense error:', error);
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  }
}

module.exports = ExpenseController;
