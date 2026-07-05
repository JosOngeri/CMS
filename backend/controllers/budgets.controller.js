const BaseController = require('./BaseController');
const BudgetsRepository = require('../repositories/BudgetsRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Budgets Controller
 * Handles budget planning, tracking, and variance analysis
 */
class BudgetsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('BudgetsController');
  }

  async getAllBudgets(req, res) {
    try {
      const { fiscal_year, department_id, fund_id, status } = req.query;

      const filters = {};
      if (fiscal_year) filters.fiscal_year = fiscal_year;
      if (department_id) filters.department_id = department_id;
      if (fund_id) filters.fund_id = fund_id;
      if (status) filters.status = status;

      const budgets = await BudgetsRepository.getAllWithDetails(filters);

      res.json({ success: true, data: budgets });
    } catch (error) {
      this.logger.error('getAllBudgets', error);
      res.status(500).json({ success: false, error: 'Failed to fetch budgets' });
    }
  }

  async getBudgetById(req, res) {
    try {
      const { id } = req.params;

      const budget = await BudgetsRepository.getBudgetByIdWithDetails(id);

      if (!budget) {
        return res.status(404).json({ success: false, error: 'Budget not found' });
      }

      // Get budget line items
      const lineItems = await BudgetsRepository.getBudgetLineItems(id);

      res.json({
        success: true,
        data: {
          ...budget,
          line_items: lineItems
        }
      });
    } catch (error) {
      this.logger.error('getBudgetById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch budget' });
    }
  }

  async createBudget(req, res) {
    try {
      const {
        budget_code, budget_name, description, fiscal_year, period,
        start_date, end_date, department_id, fund_id, account_id,
        budgeted_amount, line_items
      } = req.body;

      const budget = await BudgetsRepository.createBudgetWithLineItems(
        {
          budget_code,
          budget_name,
          description,
          fiscal_year,
          period,
          start_date,
          end_date,
          department_id,
          fund_id,
          account_id,
          budgeted_amount,
          created_by: req.user.id
        },
        line_items
      );

      res.json({ success: true, data: budget });
    } catch (error) {
      this.logger.error('createBudget', error);
      res.status(500).json({ success: false, error: 'Failed to create budget' });
    }
  }

  async updateBudget(req, res) {
    try {
      const { id } = req.params;
      const {
        budget_name, description, period, start_date, end_date,
        department_id, fund_id, account_id, budgeted_amount,
        actual_amount, status, line_items
      } = req.body;

      const budget = await BudgetsRepository.updateBudgetWithLineItems(id, {
        budget_name,
        description,
        period,
        start_date,
        end_date,
        department_id,
        fund_id,
        account_id,
        budgeted_amount,
        actual_amount,
        status
      }, line_items);

      res.json({ success: true, data: budget });
    } catch (error) {
      this.logger.error('updateBudget', error);
      res.status(500).json({ success: false, error: 'Failed to update budget' });
    }
  }

  async approveBudget(req, res) {
    try {
      const { id } = req.params;

      const budget = await BudgetsRepository.approveBudget(id, req.user.id);

      if (!budget) {
        return res.status(404).json({ success: false, error: 'Budget not found' });
      }

      res.json({ success: true, data: budget });
    } catch (error) {
      this.logger.error('approveBudget', error);
      res.status(500).json({ success: false, error: 'Failed to approve budget' });
    }
  }

  async deleteBudget(req, res) {
    try {
      const { id } = req.params;

      const budget = await BudgetsRepository.delete(id);

      if (!budget) {
        return res.status(404).json({ success: false, error: 'Budget not found' });
      }

      res.json({ success: true, message: 'Budget deleted successfully' });
    } catch (error) {
      this.logger.error('deleteBudget', error);
      res.status(500).json({ success: false, error: 'Failed to delete budget' });
    }
  }

  async updateBudgetActuals(req, res) {
    try {
      const { id } = req.params;
      const { actual_amount } = req.body;

      const budget = await BudgetsRepository.updateBudgetActuals(id, actual_amount);

      if (!budget) {
        return res.status(404).json({ success: false, error: 'Budget not found' });
      }

      res.json({ success: true, data: budget });
    } catch (error) {
      this.logger.error('updateBudgetActuals', error);
      res.status(500).json({ success: false, error: 'Failed to update budget actuals' });
    }
  }

  async getBudgetVariance(req, res) {
    try {
      const { id } = req.params;

      const budget = await BudgetsRepository.getBudgetByIdWithDetails(id);

      if (!budget) {
        return res.status(404).json({ success: false, error: 'Budget not found' });
      }

      // Get budget variance
      const variance = await BudgetsRepository.getBudgetVariance(id);

      // Get line items variance
      const lineItems = await BudgetsRepository.getBudgetLineItemsVariance(id);

      res.json({
        success: true,
        data: {
          budget: budget,
          variance: variance?.actual_spent,
          variance_percentage: variance?.variance_percentage,
          line_items: lineItems
        }
      });
    } catch (error) {
      this.logger.error('getBudgetVariance', error);
      res.status(500).json({ success: false, error: 'Failed to get budget variance' });
    }
  }
}

module.exports = new BudgetsController();
