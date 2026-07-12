const BaseController = require('./BaseController');
const FinancialAlertsRepository = require('../repositories/FinancialAlertsRepository');
const FinancialAlertsService = require('../services/FinancialAlertsService');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Financial Alerts Controller
 * Handles financial alerts and notifications
 */
class FinancialAlertsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('FinancialAlertsController');
  }

  async getAllAlerts(req, res) {
    try {
      const { alert_type, is_resolved, priority } = req.query;
      const churchId = req.user.church_id;

      const filters = {};
      if (alert_type) filters.alert_type = alert_type;
      if (is_resolved !== undefined) filters.is_resolved = is_resolved === 'true';
      if (priority) filters.priority = priority;

      const alerts = await FinancialAlertsRepository.findAllWithUser(filters, churchId);

      this.success(res, { data: alerts });
    } catch (error) {
      this.logger.error('getAllAlerts', error);
      this.error(res, 'Failed to fetch alerts');
    }
  }

  async getAlertById(req, res) {
    try {
      const { id } = req.params;

      const alert = await FinancialAlertsRepository.findByIdWithUser(id);

      if (!alert) {
        return this.notFound(res, 'Alert not found');
      }

      this.success(res, { data: alert });
    } catch (error) {
      this.logger.error('getAlertById', error);
      this.error(res, 'Failed to fetch alert');
    }
  }

  async createAlert(req, res) {
    try {
      const { alert_type, title, message, priority, entity_type, entity_id, threshold_value, current_value } = req.body;

      const alert = await FinancialAlertsRepository.createAlert({
        alert_type,
        title,
        message,
        priority,
        entity_type,
        entity_id,
        threshold_value,
        current_value,
        created_by: req.user.id
      });

      this.created(res, { data: alert });
    } catch (error) {
      this.logger.error('createAlert', error);
      this.error(res, 'Failed to create alert');
    }
  }

  async resolveAlert(req, res) {
    try {
      const { id } = req.params;
      const { resolution_notes } = req.body;

      const alert = await FinancialAlertsRepository.resolveAlert(id, resolution_notes, req.user.id);

      if (!alert) {
        return this.notFound(res, 'Alert not found');
      }

      this.success(res, { data: alert });
    } catch (error) {
      this.logger.error('resolveAlert', error);
      this.error(res, 'Failed to resolve alert');
    }
  }

  async deleteAlert(req, res) {
    try {
      const { id } = req.params;

      const alert = await FinancialAlertsRepository.deleteAlert(id);

      if (!alert) {
        return this.notFound(res, 'Alert not found');
      }

      this.success(res, { message: 'Alert deleted successfully' });
    } catch (error) {
      this.logger.error('deleteAlert', error);
      this.error(res, 'Failed to delete alert');
    }
  }

  async checkBudgetVarianceAlerts(req, res) {
    try {
      const { threshold_percentage = 10 } = req.query;
      const churchId = req.user.church_id;

      const threshold = parseFloat(threshold_percentage);
      const budgets = await FinancialAlertsRepository.checkBudgetAlerts(churchId, threshold, req.user.id);

      const alertsCreated = [];
      for (const budget of budgets) {
        const existingAlert = await FinancialAlertsRepository.checkExistingAlert('budget', budget.id);

        if (!existingAlert) {
          const alert = await FinancialAlertsRepository.createAlert({
            alert_type: 'budget_variance',
            title: `Budget Variance Alert: ${budget.budget_name}`,
            message: FinancialAlertsService.generateBudgetVarianceMessage(budget.budget_name, budget.variance_percentage, threshold),
            priority: FinancialAlertsService.determineBudgetPriority(budget.variance_percentage, threshold),
            entity_type: 'budget',
            entity_id: budget.id,
            threshold_value: threshold,
            current_value: budget.variance_percentage,
            created_by: req.user.id
          });
          alertsCreated.push(alert);
        }
      }

      this.success(res, {
        data: {
          budgets_exceeding_threshold: budgets,
          alerts_created: alertsCreated
        }
      });
    } catch (error) {
      this.logger.error('checkBudgetVarianceAlerts', error);
      this.error(res, 'Failed to check budget variance alerts');
    }
  }

  async checkLowBalanceAlerts(req, res) {
    try {
      const { threshold = 1000 } = req.query;
      const churchId = req.user.church_id;

      const thresholdAmount = parseFloat(threshold);
      const funds = await FinancialAlertsRepository.checkFundAlerts(churchId, thresholdAmount, req.user.id);

      const alertsCreated = [];
      for (const fund of funds) {
        const existingAlert = await FinancialAlertsRepository.checkExistingAlert('fund', fund.id);

        if (!existingAlert) {
          const alert = await FinancialAlertsRepository.createAlert({
            alert_type: 'low_balance',
            title: `Low Balance Alert: ${fund.fund_name}`,
            message: FinancialAlertsService.generateLowBalanceMessage(fund.fund_name, fund.current_balance, thresholdAmount),
            priority: FinancialAlertsService.determineBalancePriority(fund.current_balance, thresholdAmount),
            entity_type: 'fund',
            entity_id: fund.id,
            threshold_value: thresholdAmount,
            current_value: fund.current_balance,
            created_by: req.user.id
          });
          alertsCreated.push(alert);
        }
      }

      this.success(res, {
        data: {
          funds_below_threshold: funds,
          alerts_created: alertsCreated
        }
      });
    } catch (error) {
      this.logger.error('checkLowBalanceAlerts', error);
      this.error(res, 'Failed to check low balance alerts');
    }
  }

  async checkPendingPaymentAlerts(req, res) {
    try {
      const { days_overdue = 30 } = req.query;
      const churchId = req.user.church_id;

      const overdueDays = parseInt(days_overdue);
      const payments = await FinancialAlertsRepository.checkOverduePayments(churchId, overdueDays, req.user.id);

      const alertsCreated = [];
      for (const payment of payments) {
        const existingAlert = await FinancialAlertsRepository.checkExistingAlert('payment', payment.id);

        if (!existingAlert) {
          const alert = await FinancialAlertsRepository.createAlert({
            alert_type: 'overdue_payment',
            title: `Overdue Payment Alert: ${payment.description || 'Payment'}`,
            message: FinancialAlertsService.generateOverduePaymentMessage(payment.description, payment.amount, overdueDays),
            priority: 'medium',
            entity_type: 'payment',
            entity_id: payment.id,
            threshold_value: overdueDays,
            current_value: overdueDays,
            created_by: req.user.id
          });
          alertsCreated.push(alert);
        }
      }

      this.success(res, {
        data: {
          overdue_payments: payments,
          alerts_created: alertsCreated
        }
      });
    } catch (error) {
      this.logger.error('checkPendingPaymentAlerts', error);
      this.error(res, 'Failed to check pending payment alerts');
    }
  }
}

module.exports = new FinancialAlertsController();
