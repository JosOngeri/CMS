const BaseController = require('./BaseController');
const RecurringPaymentsRepository = require('../repositories/RecurringPaymentsRepository');
const ResponseHandler = require('../utils/ResponseHandler');
const SchedulingService = require('../services/SchedulingService');
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

      return ResponseHandler.success(res, { payments });
    } catch (error) {
      this.logger.error('getAllRecurringPayments', error);
      return ResponseHandler.error(res, 'Failed to fetch recurring payments');
    }
  }

  async getRecurringPaymentById(req, res) {
    try {
      const { id } = req.params;

      const payment = await RecurringPaymentsRepository.getWithDetails(id);

      if (!payment) {
        return ResponseHandler.notFound(res, 'Recurring payment not found');
      }

      return ResponseHandler.success(res, { payment });
    } catch (error) {
      this.logger.error('getRecurringPaymentById', error);
      return ResponseHandler.error(res, 'Failed to fetch recurring payment');
    }
  }

  async createRecurringPayment(req, res) {
    try {
      const {
        member_id, project_id, fund_id, amount, frequency,
        start_date, end_date, payment_method, auto_charge, notes
      } = req.body;

      // Validate frequency
      if (!SchedulingService.isValidFrequency(frequency)) {
        return ResponseHandler.validationError(res, [{
          field: 'frequency',
          message: 'Invalid frequency. Must be one of: weekly, bi_weekly, monthly, quarterly, semi_annual, annual'
        }]);
      }

      // Generate recurring number using service
      const recurringNumber = this.generateRecurringNumber();

      // Calculate next payment date using SchedulingService
      const nextPaymentDate = SchedulingService.calculateNextPaymentDate(start_date, frequency);

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

      return ResponseHandler.success(res, { payment }, 'Recurring payment created successfully', 201);
    } catch (error) {
      this.logger.error('createRecurringPayment', error);
      return ResponseHandler.error(res, 'Failed to create recurring payment');
    }
  }

  async updateRecurringPayment(req, res) {
    try {
      const { id } = req.params;
      const {
        amount, frequency, start_date, end_date, payment_method,
        auto_charge, status, notes
      } = req.body;

      // Validate frequency if provided
      if (frequency && !SchedulingService.isValidFrequency(frequency)) {
        return ResponseHandler.validationError(res, [{
          field: 'frequency',
          message: 'Invalid frequency. Must be one of: weekly, bi_weekly, monthly, quarterly, semi_annual, annual'
        }]);
      }

      // Recalculate next payment date if frequency or start date changed
      let nextPaymentDate = null;
      if (frequency || start_date) {
        const current = await RecurringPaymentsRepository.getStartDateAndFrequency(id);
        if (current) {
          nextPaymentDate = SchedulingService.calculateNextPaymentDate(
            start_date || current.start_date, 
            frequency || current.frequency
          );
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
        return ResponseHandler.notFound(res, 'Recurring payment not found');
      }

      return ResponseHandler.success(res, { payment }, 'Recurring payment updated successfully');
    } catch (error) {
      this.logger.error('updateRecurringPayment', error);
      return ResponseHandler.error(res, 'Failed to update recurring payment');
    }
  }

  async deleteRecurringPayment(req, res) {
    try {
      const { id } = req.params;

      const payment = await RecurringPaymentsRepository.delete(id);

      if (!payment) {
        return ResponseHandler.notFound(res, 'Recurring payment not found');
      }

      return ResponseHandler.success(res, null, 'Recurring payment deleted successfully');
    } catch (error) {
      this.logger.error('deleteRecurringPayment', error);
      return ResponseHandler.error(res, 'Failed to delete recurring payment');
    }
  }

  async pauseRecurringPayment(req, res) {
    try {
      const { id } = req.params;

      const payment = await RecurringPaymentsRepository.updateStatus(id, 'paused');

      if (!payment) {
        return ResponseHandler.notFound(res, 'Recurring payment not found');
      }

      return ResponseHandler.success(res, { payment }, 'Recurring payment paused successfully');
    } catch (error) {
      this.logger.error('pauseRecurringPayment', error);
      return ResponseHandler.error(res, 'Failed to pause recurring payment');
    }
  }

  async resumeRecurringPayment(req, res) {
    try {
      const { id } = req.params;

      const payment = await RecurringPaymentsRepository.updateStatus(id, 'active');

      if (!payment) {
        return ResponseHandler.notFound(res, 'Recurring payment not found');
      }

      return ResponseHandler.success(res, { payment }, 'Recurring payment resumed successfully');
    } catch (error) {
      this.logger.error('resumeRecurringPayment', error);
      return ResponseHandler.error(res, 'Failed to resume recurring payment');
    }
  }

  /**
   * Handle payment failure with retry logic
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async handlePaymentFailure(req, res) {
    try {
      const { id } = req.params;
      const { failureReason } = req.body;

      const payment = await RecurringPaymentsRepository.getWithDetails(id);

      if (!payment) {
        return ResponseHandler.notFound(res, 'Recurring payment not found');
      }

      // Process failure and determine next action using SchedulingService
      const failureAction = SchedulingService.processPaymentFailure(payment);

      // Update payment based on failure action
      if (failureAction.shouldCancel) {
        await RecurringPaymentsRepository.updateStatus(id, 'cancelled');
        await RecurringPaymentsRepository.updateRetryCount(id, failureAction.retryCount);
        
        return ResponseHandler.success(res, { 
          action: 'cancelled',
          reason: failureAction.reason,
          retryCount: failureAction.retryCount
        }, 'Recurring payment cancelled due to payment failures');
      } else {
        await RecurringPaymentsRepository.updateNextRetryDate(id, failureAction.nextRetryDate);
        await RecurringPaymentsRepository.updateRetryCount(id, failureAction.retryCount);
        
        return ResponseHandler.success(res, { 
          action: 'retry_scheduled',
          nextRetryDate: failureAction.nextRetryDate,
          retryCount: failureAction.retryCount,
          reason: failureAction.reason
        }, 'Payment retry scheduled');
      }
    } catch (error) {
      this.logger.error('handlePaymentFailure', error);
      return ResponseHandler.error(res, 'Failed to handle payment failure');
    }
  }

  /**
   * Generate recurring payment number
   * @returns {string} Recurring payment number
   */
  generateRecurringNumber() {
    const year = new Date().getFullYear();
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `REC-${year}-${random}`;
  }
}

module.exports = new RecurringPaymentsController();
