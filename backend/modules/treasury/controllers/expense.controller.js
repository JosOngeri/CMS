/**
 * Expense Controller
 * Handles expense operations
 */

const { validationResult } = require('express-validator');
const ExpenseRepository = require('../repositories/expense.repository');
const Expense = require('../models/Expense');
const logger = require('../../../config/logging');

class ExpenseController {
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
      const expense = await this.expenseRepo.findById(id);
      
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

      const expense = new Expense({
        ...req.body,
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
      
      const created = await this.expenseRepo.create(expense);
      
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
      
      const existing = await this.expenseRepo.findById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      
      if (!existing.canEdit()) {
        return res.status(400).json({ 
          error: `Cannot edit expense with status: ${existing.status}` 
        });
      }

      const expense = new Expense({ ...req.body, id });
      
      const updated = await this.expenseRepo.update(id, expense);
      
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
      
      const existing = await this.expenseRepo.findById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      
      if (!existing.canApprove()) {
        return res.status(400).json({ 
          error: `Cannot approve expense with status: ${existing.status}` 
        });
      }
      
      const approved = await this.expenseRepo.approve(id, req.user.id);
      
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
      
      const existing = await this.expenseRepo.findById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      
      if (!existing.canReject()) {
        return res.status(400).json({ 
          error: `Cannot reject expense with status: ${existing.status}` 
        });
      }
      
      const rejected = await this.expenseRepo.reject(id, reason);
      
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
      
      const existing = await this.expenseRepo.findById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      
      if (!existing.canPay()) {
        return res.status(400).json({ 
          error: `Cannot pay expense with status: ${existing.status}` 
        });
      }
      
      const paid = await this.expenseRepo.markAsPaid(id);
      
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
      const expenses = await this.expenseRepo.getPendingApprovals();
      
      const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
      res.json({ 
        expenses,
        summary: {
          count: expenses.length,
          total_amount: totalAmount
        }
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
      const summary = await this.expenseRepo.getExpensesByStatus();
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
      
      const report = await this.expenseRepo.getExpenseSummary(start_date, end_date);
      
      const totalAmount = report.reduce((sum, item) => sum + parseFloat(item.total_amount), 0);
      
      res.json({ 
        report,
        summary: {
          total_amount: totalAmount,
          categories: report.length
        },
        period: { start_date, end_date }
      });
    } catch (error) {
      logger.error('Get expense report error:', error);
      res.status(500).json({ error: 'Failed to generate expense report' });
    }
  }
}

module.exports = ExpenseController;
