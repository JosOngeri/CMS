/**
 * Budget Controller
 * Handles budget operations
 */

const { validationResult } = require('express-validator');
const BudgetRepository = require('../repositories/budget.repository');
const Budget = require('../models/Budget');
const logger = require('../../../config/logging');

class BudgetController {
  constructor(pool) {
    this.budgetRepo = new BudgetRepository(pool);
  }

  /**
   * Get all budgets
   */
  async getBudgets(req, res) {
    try {
      const { fiscal_year, status, department_id, fund_id, limit = 50, offset = 0 } = req.query;
      
      const budgets = await this.budgetRepo.findAll({
        fiscal_year: fiscal_year ? parseInt(fiscal_year) : undefined,
        status,
        department_id,
        fund_id,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.json({ 
        budgets,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: budgets.length
        }
      });
    } catch (error) {
      logger.error('Get budgets error:', error);
      res.status(500).json({ error: 'Failed to fetch budgets' });
    }
  }

  /**
   * Get budget by ID
   */
  async getBudgetById(req, res) {
    try {
      const { id } = req.params;
      const budget = await this.budgetRepo.findById(id);
      
      if (!budget) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      
      res.json({ budget });
    } catch (error) {
      logger.error('Get budget by ID error:', error);
      res.status(500).json({ error: 'Failed to fetch budget' });
    }
  }

  /**
   * Create new budget
   */
  async createBudget(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const budget = new Budget({
        ...req.body,
        created_by: req.user.id,
        status: 'draft'
      });

      const validation = budget.validate();
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Budget validation failed', 
          details: validation.errors 
        });
      }
      
      const created = await this.budgetRepo.create(budget);
      
      logger.info(`Budget created: ${created.budget_name} by ${req.user.email}`);
      res.status(201).json({ budget: created });
    } catch (error) {
      logger.error('Create budget error:', error);
      res.status(500).json({ error: error.message || 'Failed to create budget' });
    }
  }

  /**
   * Update budget
   */
  async updateBudget(req, res) {
    try {
      const { id } = req.params;
      
      const existing = await this.budgetRepo.findById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      
      if (!existing.canEdit()) {
        return res.status(400).json({ 
          error: `Cannot edit budget with status: ${existing.status}` 
        });
      }

      const budget = new Budget({ ...req.body, id });
      
      const updated = await this.budgetRepo.update(id, budget);
      
      logger.info(`Budget updated: ${id}`);
      res.json({ budget: updated });
    } catch (error) {
      logger.error('Update budget error:', error);
      res.status(500).json({ error: error.message || 'Failed to update budget' });
    }
  }

  /**
   * Activate budget
   */
  async activateBudget(req, res) {
    try {
      const { id } = req.params;
      
      const existing = await this.budgetRepo.findById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      
      existing.activate();
      
      const updated = await this.budgetRepo.update(id, existing);
      
      logger.info(`Budget activated: ${id} by ${req.user.email}`);
      res.json({ budget: updated });
    } catch (error) {
      logger.error('Activate budget error:', error);
      res.status(400).json({ error: error.message || 'Failed to activate budget' });
    }
  }

  /**
   * Close budget
   */
  async closeBudget(req, res) {
    try {
      const { id } = req.params;
      
      const existing = await this.budgetRepo.findById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      
      existing.close();
      
      const updated = await this.budgetRepo.update(id, existing);
      
      logger.info(`Budget closed: ${id} by ${req.user.email}`);
      res.json({ budget: updated });
    } catch (error) {
      logger.error('Close budget error:', error);
      res.status(400).json({ error: error.message || 'Failed to close budget' });
    }
  }

  /**
   * Get budget alerts
   */
  async getBudgetAlerts(req, res) {
    try {
      const { threshold = 80 } = req.query;
      
      const alerts = await this.budgetRepo.getBudgetAlerts(parseInt(threshold));
      
      const categorized = alerts.reduce((acc, budget) => {
        if (budget.isOverBudget()) {
          acc.over.push(budget);
        } else if (budget.isAtRisk()) {
          acc.at_risk.push(budget);
        }
        return acc;
      }, { over: [], at_risk: [] });
      
      res.json({ 
        alerts: categorized,
        summary: {
          total_alerts: alerts.length,
          over_budget: categorized.over.length,
          at_risk: categorized.at_risk.length
        },
        threshold: parseInt(threshold)
      });
    } catch (error) {
      logger.error('Get budget alerts error:', error);
      res.status(500).json({ error: 'Failed to fetch budget alerts' });
    }
  }

  /**
   * Get budget comparison report
   */
  async getBudgetComparison(req, res) {
    try {
      const { fiscal_year = new Date().getFullYear() } = req.query;
      
      // First update all actual spending
      const budgets = await this.budgetRepo.findAll({ 
        fiscal_year: parseInt(fiscal_year),
        status: 'active'
      });
      
      for (const budget of budgets) {
        await this.budgetRepo.updateActualSpending(budget.id);
      }
      
      const comparison = await this.budgetRepo.getBudgetComparison(parseInt(fiscal_year));
      
      const summary = comparison.reduce((acc, item) => {
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
      
      res.json({ 
        comparison,
        summary,
        fiscal_year: parseInt(fiscal_year)
      });
    } catch (error) {
      logger.error('Get budget comparison error:', error);
      res.status(500).json({ error: 'Failed to generate budget comparison' });
    }
  }
}

module.exports = BudgetController;
