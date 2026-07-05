const BaseController = require('./BaseController');
const FinancialAlertsRepository = require('../repositories/FinancialAlertsRepository');
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

      res.json({ success: true, data: alerts });
    } catch (error) {
      this.logger.error('getAllAlerts', error);
      res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
    }
  }

  async getAlertById(req, res) {
    try {
      const { id } = req.params;

      const alert = await FinancialAlertsRepository.findByIdWithUser(id);

      if (!alert) {
        return res.status(404).json({ success: false, error: 'Alert not found' });
      }

      res.json({ success: true, data: alert });
    } catch (error) {
      this.logger.error('getAlertById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch alert' });
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

      res.json({ success: true, data: alert });
    } catch (error) {
      this.logger.error('createAlert', error);
      res.status(500).json({ success: false, error: 'Failed to create alert' });
    }
  }

  async resolveAlert(req, res) {
    try {
      const { id } = req.params;
      const { resolution_notes } = req.body;

      const alert = await FinancialAlertsRepository.resolveAlert(id, resolution_notes, req.user.id);

      if (!alert) {
        return res.status(404).json({ success: false, error: 'Alert not found' });
      }

      res.json({ success: true, data: alert });
    } catch (error) {
      this.logger.error('resolveAlert', error);
      res.status(500).json({ success: false, error: 'Failed to resolve alert' });
    }
  }

  async deleteAlert(req, res) {
    try {
      const { id } = req.params;

      const alert = await FinancialAlertsRepository.deleteAlert(id);

      if (!alert) {
        return res.status(404).json({ success: false, error: 'Alert not found' });
      }

      res.json({ success: true, message: 'Alert deleted successfully' });
    } catch (error) {
      this.logger.error('deleteAlert', error);
      res.status(500).json({ success: false, error: 'Failed to delete alert' });
    }
  }

  async checkBudgetVarianceAlerts(req, res) {
    try {
      const { threshold_percentage = 10 } = req.query;
      const churchId = req.user.church_id;

      const threshold = parseFloat(threshold_percentage);

      // Check budgets with variance exceeding threshold
      const budgets = await FinancialAlertsRepository.checkBudgetAlerts(churchId, threshold, req.user.id);

      // Create alerts for budgets exceeding threshold
      const alertsCreated = [];
      for (const budget of budgets) {
        const existingAlert = await FinancialAlertsRepository.checkExistingAlert('budget', budget.id);

        if (!existingAlert) {
          const alert = await FinancialAlertsRepository.createAlert({
            alert_type: 'budget_variance',
            title: `Budget Variance Alert: ${budget.budget_name}`,
            message: `Budget variance of ${budget.variance_percentage.toFixed(2)}% exceeds threshold of ${threshold}%`,
            priority: Math.abs(budget.variance_percentage) > 20 ? 'high' : 'medium',
            entity_type: 'budget',
            entity_id: budget.id,
            threshold_value: threshold,
            current_value: budget.variance_percentage,
            created_by: req.user.id
          });
          alertsCreated.push(alert);
        }
      }

      res.json({
        success: true,
        data: {
          budgets_exceeding_threshold: budgets,
          alerts_created: alertsCreated
        }
      });
    } catch (error) {
      this.logger.error('checkBudgetVarianceAlerts', error);
      res.status(500).json({ success: false, error: 'Failed to check budget variance alerts' });
    }
  }

  async checkLowBalanceAlerts(req, res) {
    try {
      const { threshold = 1000 } = req.query;
      const churchId = req.user.church_id;

      const thresholdAmount = parseFloat(threshold);

      // Check funds with low balance
      const funds = await FinancialAlertsRepository.checkFundAlerts(churchId, thresholdAmount, req.user.id);

      // Create alerts for low balances
      const alertsCreated = [];
      for (const fund of funds) {
        const existingAlert = await FinancialAlertsRepository.checkExistingAlert('fund', fund.id);

        if (!existingAlert) {
          const alert = await FinancialAlertsRepository.createAlert({
            alert_type: 'low_balance',
            title: `Low Balance Alert: ${fund.fund_name}`,
            message: `Fund balance of ${fund.current_balance} is below threshold of ${thresholdAmount}`,
            priority: fund.current_balance < thresholdAmount / 2 ? 'high' : 'medium',
            entity_type: 'fund',
            entity_id: fund.id,
            threshold_value: thresholdAmount,
            current_value: fund.current_balance,
            created_by: req.user.id
          });
          alertsCreated.push(alert);
        }
      }

      res.json({
        success: true,
        data: {
          funds_below_threshold: funds,
          alerts_created: alertsCreated
        }
      });
    } catch (error) {
      this.logger.error('checkLowBalanceAlerts', error);
      res.status(500).json({ success: false, error: 'Failed to check low balance alerts' });
    }
  }

  async checkPendingPaymentAlerts(req, res) {
    try {
      const { days_overdue = 30 } = req.query;
      const churchId = req.user.church_id;

      const overdueDays = parseInt(days_overdue);

      // Check overdue payments
      const payments = await FinancialAlertsRepository.checkOverduePayments(churchId, overdueDays, req.user.id);

      // Create alerts for overdue payments
      const alertsCreated = [];
      for (const payment of payments) {
        const existingAlert = await FinancialAlertsRepository.checkExistingAlert('payment', payment.id);

        if (!existingAlert) {
          const alert = await FinancialAlertsRepository.createAlert({
            alert_type: 'overdue_payment',
            title: `Overdue Payment Alert: ${payment.description || 'Payment'}`,
            message: `Payment of ${payment.amount} has been pending for over ${overdueDays} days`,
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

      res.json({
        success: true,
        data: {
          overdue_payments: payments,
          alerts_created: alertsCreated
        }
      });
    } catch (error) {
      this.logger.error('checkPendingPaymentAlerts', error);
      res.status(500).json({ success: false, error: 'Failed to check pending payment alerts' });
    }
  }
}

module.exports = new FinancialAlertsController();
