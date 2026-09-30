const BaseController = require('./BaseController');
const TreasuryDashboardRepository = require('../repositories/TreasuryDashboardRepository');
const ResponseHandler = require('../utils/ResponseHandler');
const { createLogger } = require('../helpers/controllerLogger');
const {
  calculateTrialBalance,
  calculateIncomeStatement,
  calculateBalanceSheet
} = require('../helpers/finance');

/**
 * Treasury Dashboard Controller
 * Handles treasury dashboard statistics and analytics
 */
class TreasuryDashboardController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('TreasuryDashboardController');
  }

  async getDashboardSummary(req, res) {
    try {
      const { year, month } = req.query;
      const targetYear = year || new Date().getFullYear();
      const targetMonth = month || new Date().getMonth() + 1;
      const churchId = req.user.church_id;

      const summary = await TreasuryDashboardRepository.getDashboardSummary(targetYear, targetMonth, churchId);

      // Repository now handles net cash flow calculation using CTEs
      return ResponseHandler.success(res, {
        period: { year: targetYear, month: targetMonth },
        financial_summary: {
          total_income: parseFloat(summary.total_income),
          total_expenses: parseFloat(summary.total_expenses),
          net_cash_flow: parseFloat(summary.net_cash_flow),
          total_fund_balance: parseFloat(summary.total_fund_balance)
        },
        operational_summary: {
          pending_approvals: parseInt(summary.pending_approvals),
          active_projects: parseInt(summary.active_projects),
          pending_pledges: parseInt(summary.pending_pledges),
          total_pledged_amount: parseFloat(summary.total_pledged_amount)
        }
      });
    } catch (error) {
      this.logger.error('getDashboardSummary', error);
      return ResponseHandler.error(res, 'Failed to fetch dashboard summary');
    }
  }

  async getIncomeVsExpense(req, res) {
    try {
      const { days = 30 } = req.query;
      const churchId = req.user.church_id;

      const trend = await TreasuryDashboardRepository.getIncomeExpenseTrend(days, churchId);

      return ResponseHandler.success(res, { trend });
    } catch (error) {
      this.logger.error('getIncomeVsExpense', error);
      return ResponseHandler.error(res, 'Failed to fetch income vs expense data');
    }
  }

  async getTopExpenseCategories(req, res) {
    try {
      const { limit = 5 } = req.query;
      const churchId = req.user.church_id;

      const categories = await TreasuryDashboardRepository.getTopExpenseCategories(limit, churchId);

      return ResponseHandler.success(res, { categories });
    } catch (error) {
      this.logger.error('getTopExpenseCategories', error);
      return ResponseHandler.error(res, 'Failed to fetch top expense categories');
    }
  }

  async getRecentTransactions(req, res) {
    try {
      const { limit = 10 } = req.query;
      const churchId = req.user.church_id;

      const transactions = await TreasuryDashboardRepository.getRecentTransactions(limit, churchId);

      return ResponseHandler.success(res, { transactions });
    } catch (error) {
      this.logger.error('getRecentTransactions', error);
      return ResponseHandler.error(res, 'Failed to fetch recent transactions');
    }
  }

  async getBudgetStatus(req, res) {
    try {
      const { year } = req.query;
      const targetYear = year || new Date().getFullYear();

      const budgets = await TreasuryDashboardRepository.getBudgetStatus(targetYear);

      return ResponseHandler.success(res, {
        year: targetYear,
        budgets: budgets
      });
    } catch (error) {
      this.logger.error('getBudgetStatus', error);
      return ResponseHandler.error(res, 'Failed to fetch budget status');
    }
  }

  async getAlertSummary(req, res) {
    try {
      const alerts = await TreasuryDashboardRepository.getAlertSummary();

      return ResponseHandler.success(res, { alerts });
    } catch (error) {
      this.logger.error('getAlertSummary', error);
      return ResponseHandler.error(res, 'Failed to fetch alert summary');
    }
  }

  async getTopExpenses(req, res) {
    try {
      const { year, limit = 5 } = req.query;
      const targetYear = year || new Date().getFullYear();

      const topExpenses = await TreasuryDashboardRepository.getTopExpenses(targetYear, limit);

      return ResponseHandler.success(res, {
        year: targetYear,
        top_expenses: topExpenses
      });
    } catch (error) {
      this.logger.error('getTopExpenses', error);
      return ResponseHandler.error(res, 'Failed to fetch top expenses');
    }
  }

  async getFinancialReports(req, res) {
    try {
      const { report_type, start_date, end_date } = req.query;

      let data;

      switch (report_type) {
        case 'trial_balance':
          data = await calculateTrialBalance(end_date);
          break;
        case 'income_statement':
          data = await calculateIncomeStatement(start_date, end_date);
          break;
        case 'balance_sheet':
          data = await calculateBalanceSheet(end_date);
          break;
        default:
          return ResponseHandler.validationError(res, [{
            field: 'report_type',
            message: 'Invalid report type. Must be trial_balance, income_statement, or balance_sheet'
          }]);
      }

      return ResponseHandler.success(res, { data });
    } catch (error) {
      this.logger.error('getFinancialReports', error);
      return ResponseHandler.error(res, 'Failed to generate financial report');
    }
  }
}

module.exports = new TreasuryDashboardController();
