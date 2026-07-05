const BaseController = require('./BaseController');
const RecurringPaymentsRepository = require('../repositories/RecurringPaymentsRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Recurring Payments Controller
 * Handles recurring payment/gift management
 */
class RecurringPaymentsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('RecurringPaymentsController');
  }

  async getAllRecurringPayments(req, res) {
    try {
      const { status, member_id, frequency } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (member_id) filters.member_id = member_id;
      if (frequency) filters.frequency = frequency;

      const payments = await RecurringPaymentsRepository.getAllWithDetails(filters);

      res.json({ success: true, data: payments });
    } catch (error) {
      this.logger.error('getAllRecurringPayments', error);
      res.status(500).json({ success: false, error: 'Failed to fetch recurring payments' });
    }
  }

  async getRecurringPaymentById(req, res) {
    try {
      const { id } = req.params;

      const payment = await RecurringPaymentsRepository.getWithDetails(id);

      if (!payment) {
        return res.status(404).json({ success: false, error: 'Recurring payment not found' });
      }

      res.json({ success: true, data: payment });
    } catch (error) {
      this.logger.error('getRecurringPaymentById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch recurring payment' });
    }
  }

  async createRecurringPayment(req, res) {
    try {
      const {
        member_id, project_id, fund_id, amount, frequency,
        start_date, end_date, payment_method, auto_charge, notes
      } = req.body;

      const recurringNumber = `REC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      // Calculate next payment date based on frequency
      const nextPaymentDate = this.calculateNextPaymentDate(start_date, frequency);

      const payment = await RecurringPaymentsRepository.createRecurringPayment({
        recurring_number: recurringNumber,
        member_id,
        project_id,
        fund_id,
        amount,
        frequency,
        start_date,
        end_date,
        next_payment_date: nextPaymentDate,
        payment_method,
        auto_charge,
        notes,
        created_by: req.user.id
      });

      res.json({ success: true, data: payment });
    } catch (error) {
      this.logger.error('createRecurringPayment', error);
      res.status(500).json({ success: false, error: 'Failed to create recurring payment' });
    }
  }

  async updateRecurringPayment(req, res) {
    try {
      const { id } = req.params;
      const {
        amount, frequency, start_date, end_date, payment_method,
        auto_charge, status, notes
      } = req.body;

      // Recalculate next payment date if frequency or start date changed
      let nextPaymentDate = null;
      if (frequency || start_date) {
        const current = await RecurringPaymentsRepository.getStartDateAndFrequency(id);
        if (current) {
          nextPaymentDate = this.calculateNextPaymentDate(start_date || current.start_date, frequency || current.frequency);
        }
      }

      const payment = await RecurringPaymentsRepository.updateRecurringPayment(id, {
        amount,
        frequency,
        start_date,
        end_date,
        next_payment_date: nextPaymentDate,
        payment_method,
        auto_charge,
        status,
        notes
      });

      if (!payment) {
        return res.status(404).json({ success: false, error: 'Recurring payment not found' });
      }

      res.json({ success: true, data: payment });
    } catch (error) {
      this.logger.error('updateRecurringPayment', error);
      res.status(500).json({ success: false, error: 'Failed to update recurring payment' });
    }
  }

  async deleteRecurringPayment(req, res) {
    try {
      const { id } = req.params;

      const payment = await RecurringPaymentsRepository.delete(id);

      if (!payment) {
        return res.status(404).json({ success: false, error: 'Recurring payment not found' });
      }

      res.json({ success: true, message: 'Recurring payment deleted successfully' });
    } catch (error) {
      this.logger.error('deleteRecurringPayment', error);
      res.status(500).json({ success: false, error: 'Failed to delete recurring payment' });
    }
  }

  async pauseRecurringPayment(req, res) {
    try {
      const { id } = req.params;

      const payment = await RecurringPaymentsRepository.updateStatus(id, 'paused');

      if (!payment) {
        return res.status(404).json({ success: false, error: 'Recurring payment not found' });
      }

      res.json({ success: true, data: payment });
    } catch (error) {
      this.logger.error('pauseRecurringPayment', error);
      res.status(500).json({ success: false, error: 'Failed to pause recurring payment' });
    }
  }

  async resumeRecurringPayment(req, res) {
    try {
      const { id } = req.params;

      const payment = await RecurringPaymentsRepository.updateStatus(id, 'active');

      if (!payment) {
        return res.status(404).json({ success: false, error: 'Recurring payment not found' });
      }

      res.json({ success: true, data: payment });
    } catch (error) {
      this.logger.error('resumeRecurringPayment', error);
      res.status(500).json({ success: false, error: 'Failed to resume recurring payment' });
    }
  }

  calculateNextPaymentDate(startDate, frequency) {
    const date = new Date(startDate);
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'bi_weekly':
        date.setDate(date.getDate() + 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'annual':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }
    return date.toISOString().split('T')[0];
  }
}

module.exports = new RecurringPaymentsController();
