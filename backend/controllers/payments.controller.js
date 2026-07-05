const BaseController = require('./BaseController');
const PaymentsRepository = require('../repositories/PaymentsRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Payments Controller
 * Handles payment methods, payment records, and payment processing
 */
class PaymentsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('PaymentsController');
  }

  /**
   * Get all active payment methods
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPaymentMethods(req, res) {
    try {
      const paymentMethods = await PaymentsRepository.getPaymentMethods();
      res.json({ success: true, data: paymentMethods });
    } catch (error) {
      this.logger.error('getPaymentMethods', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payment methods' });
    }
  }

  /**
   * Get payments with filtering and pagination
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.memberId] - Filter by member ID
   * @param {string} [req.query.paymentMethodId] - Filter by payment method ID
   * @param {string} [req.query.paymentType] - Filter by payment type
   * @param {string} [req.query.status] - Filter by status
   * @param {string} [req.query.startDate] - Filter by start date
   * @param {string} [req.query.endDate] - Filter by end date
   * @param {number} [req.query.limit=50] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPayments(req, res) {
    try {
      const { memberId, paymentMethodId, paymentType, status, startDate, endDate, limit = 50, offset = 0 } = req.query;

      const payments = await PaymentsRepository.getPaymentsWithFilters({
        memberId,
        paymentMethodId,
        paymentType,
        status,
        startDate,
        endDate,
        limit,
        offset
      });

      res.json({ success: true, data: payments });
    } catch (error) {
      this.logger.error('getPayments', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payments' });
    }
  }

  /**
   * Create a new payment record
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.paymentMethodId - Payment method ID
   * @param {string} req.body.memberId - Member ID
   * @param {number} req.body.amount - Payment amount
   * @param {string} req.body.paymentType - Payment type
   * @param {string} [req.body.referenceNumber] - Reference number
   * @param {string} [req.body.transactionId] - Transaction ID
   * @param {string} [req.body.notes] - Payment notes
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createPayment(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.church_id;
      const churchSlug = req.user.church_slug;
      let payment;

      // Support the frontend M-Pesa payment form (phone_number + payment_items)
      if (req.body.phone_number && Array.isArray(req.body.payment_items)) {
        const totalAmount = req.body.payment_items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        const categoryNames = req.body.payment_items.map(item => item.category_name).filter(Boolean);
        const category = categoryNames.length > 0 ? categoryNames.join(', ') : 'general';

        payment = await PaymentsRepository.createPaymentFromFrontend({
          userId,
          churchId,
          churchSlug,
          phoneNumber: req.body.phone_number,
          amount: totalAmount,
          category,
          notes: req.body.notes || null,
          paymentType: 'mpesa',
          currency: 'KES'
        });
      } else {
        const { paymentMethodId, memberId, amount, paymentType, referenceNumber, transactionId, notes } = req.body;
        payment = await PaymentsRepository.createPayment(
          paymentMethodId,
          memberId,
          amount,
          paymentType,
          referenceNumber,
          transactionId,
          userId,
          notes
        );
      }

      res.status(201).json({
        success: true,
        message: 'Payment initiated successfully',
        data: payment
      });
    } catch (error) {
      this.logger.error('createPayment', error);
      res.status(500).json({ success: false, error: 'Failed to create payment', details: error.message });
    }
  }

  /**
   * Update payment status
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Payment ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.status - New status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updatePaymentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const payment = await PaymentsRepository.updatePaymentStatus(id, status);

      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }

      res.json({
        success: true,
        message: 'Payment status updated successfully',
        data: payment
      });
    } catch (error) {
      this.logger.error('updatePaymentStatus', error);
      res.status(500).json({ success: false, error: 'Failed to update payment status' });
    }
  }

  /**
   * Get pledges with filtering
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.memberId] - Filter by member ID
   * @param {string} [req.query.status] - Filter by status
   * @param {string} [req.query.pledgeType] - Filter by pledge type
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPledges(req, res) {
    try {
      const { memberId, status, pledgeType } = req.query;

      const pledges = await PaymentsRepository.getPledgesWithFilters({
        memberId,
        status,
        pledgeType
      });

      res.json({ success: true, data: pledges });
    } catch (error) {
      this.logger.error('getPledges', error);
      res.status(500).json({ success: false, error: 'Failed to fetch pledges' });
    }
  }

  /**
   * Create a new pledge
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.memberId - Member ID
   * @param {number} req.body.amount - Pledge amount
   * @param {string} req.body.pledgeType - Pledge type
   * @param {string} [req.body.startDate] - Start date
   * @param {string} [req.body.endDate] - End date
   * @param {string} [req.body.frequency] - Payment frequency
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createPledge(req, res) {
    try {
      const { memberId, amount, pledgeType, startDate, endDate, frequency } = req.body;

      const pledge = await PaymentsRepository.createPledge(
        memberId,
        amount,
        pledgeType,
        startDate,
        endDate,
        frequency
      );

      res.status(201).json({
        success: true,
        message: 'Pledge created successfully',
        data: pledge
      });
    } catch (error) {
      this.logger.error('createPledge', error);
      res.status(500).json({ success: false, error: 'Failed to create pledge' });
    }
  }

  /**
   * Add payment to a pledge
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.pledgeId - Pledge ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.paymentId - Payment ID
   * @param {number} req.body.amount - Payment amount
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async addPledgePayment(req, res) {
    try {
      const { pledgeId } = req.params;
      const { paymentId, amount } = req.body;

      const pledgePayment = await PaymentsRepository.addPledgePayment(pledgeId, paymentId, amount);

      res.status(201).json({
        success: true,
        message: 'Pledge payment added successfully',
        data: pledgePayment
      });
    } catch (error) {
      this.logger.error('addPledgePayment', error);
      res.status(500).json({ success: false, error: 'Failed to add pledge payment' });
    }
  }

  /**
   * Get payment summary for a date range
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.startDate] - Start date
   * @param {string} [req.query.endDate] - End date
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPaymentSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const summary = await PaymentsRepository.getPaymentSummary(startDate, endDate);

      res.json({ success: true, data: summary });
    } catch (error) {
      this.logger.error('getPaymentSummary', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payment summary' });
    }
  }

  /**
   * Get payment categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPaymentCategories(req, res) {
    try {
      const categories = await PaymentsRepository.getPaymentCategories();
      res.json({ success: true, categories });
    } catch (error) {
      this.logger.error('getPaymentCategories', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payment categories' });
    }
  }

  /**
   * Get payments for the currently authenticated user
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.status] - Filter by status
   * @param {number} [req.query.limit=50] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMyPayments(req, res) {
    try {
      const userId = req.user.id;
      const { status, limit = 50, offset = 0 } = req.query;

      const payments = await PaymentsRepository.getMyPayments(userId, {
        status,
        limit,
        offset
      });

      res.json({ success: true, payments });
    } catch (error) {
      this.logger.error('getMyPayments', error);
      res.status(500).json({ success: false, error: 'Failed to fetch your payments' });
    }
  }

  /**
   * Download/generate a receipt for a specific payment
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Payment ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async downloadReceipt(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const payment = await PaymentsRepository.getPaymentForReceipt(id, userId);

      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }

      res.json({
        success: true,
        receipt: {
          receiptNumber: `REC-${payment.id}`,
          paymentId: payment.id,
          memberName: payment.member_name,
          amount: payment.amount,
          paymentType: payment.payment_type,
          paymentMethod: payment.payment_method_name,
          status: payment.status,
          date: payment.payment_date,
          referenceNumber: payment.reference_number,
        }
      });
    } catch (error) {
      this.logger.error('downloadReceipt', error);
      res.status(500).json({ success: false, error: 'Failed to generate receipt' });
    }
  }

  /**
   * Get all refunds
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getRefunds(req, res) {
    try {
      const churchId = req.user.church_id;
      const refunds = await PaymentsRepository.getRefunds(churchId);

      res.json({ success: true, refunds });
    } catch (error) {
      this.logger.error('getRefunds', error);
      res.status(500).json({ success: false, error: 'Failed to fetch refunds' });
    }
  }

  /**
   * Request a refund for a payment
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.paymentId - Payment ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.reason - Refund reason
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async refundPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;
      const churchId = req.user.church_id;

      const payment = await PaymentsRepository.getPaymentById(paymentId, churchId);
      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }

      const refund = await PaymentsRepository.createRefund(paymentId, payment.amount, reason, userId, churchId);

      res.json({ success: true, refund });
    } catch (error) {
      this.logger.error('refundPayment', error);
      res.status(500).json({ success: false, error: 'Failed to request refund' });
    }
  }

  /**
   * Approve a refund request
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.refundId - Refund ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async approveRefund(req, res) {
    try {
      const { refundId } = req.params;
      const userId = req.user.id;
      const churchId = req.user.church_id;

      const refund = await PaymentsRepository.updateRefundStatus(refundId, 'approved', userId, churchId);

      if (!refund) {
        return res.status(404).json({ success: false, error: 'Refund not found' });
      }

      res.json({ success: true, refund });
    } catch (error) {
      this.logger.error('approveRefund', error);
      res.status(500).json({ success: false, error: 'Failed to approve refund' });
    }
  }

  /**
   * Reject a refund request
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.refundId - Refund ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async rejectRefund(req, res) {
    try {
      const { refundId } = req.params;
      const userId = req.user.id;
      const churchId = req.user.church_id;

      const refund = await PaymentsRepository.updateRefundStatus(refundId, 'rejected', userId, churchId);

      if (!refund) {
        return res.status(404).json({ success: false, error: 'Refund not found' });
      }

      res.json({ success: true, refund });
    } catch (error) {
      this.logger.error('rejectRefund', error);
      res.status(500).json({ success: false, error: 'Failed to reject refund' });
    }
  }

  async createPaymentMethod(req, res) {
    try {
      const { name, type, provider, config, isActive } = req.body;
      const paymentMethod = await PaymentsRepository.createPaymentMethod({
        name, type, provider, config, isActive
      });
      res.status(201).json({ success: true, data: paymentMethod });
    } catch (error) {
      this.logger.error('createPaymentMethod', error);
      res.status(500).json({ success: false, error: 'Failed to create payment method' });
    }
  }

  async updatePaymentMethod(req, res) {
    try {
      const { id } = req.params;
      const { name, type, provider, config, isActive } = req.body;
      const paymentMethod = await PaymentsRepository.updatePaymentMethod(id, {
        name, type, provider, config, isActive
      });
      res.json({ success: true, data: paymentMethod });
    } catch (error) {
      this.logger.error('updatePaymentMethod', error);
      res.status(500).json({ success: false, error: 'Failed to update payment method' });
    }
  }

  async deletePaymentMethod(req, res) {
    try {
      const { id } = req.params;
      await PaymentsRepository.deletePaymentMethod(id);
      res.json({ success: true, message: 'Payment method deleted' });
    } catch (error) {
      this.logger.error('deletePaymentMethod', error);
      res.status(500).json({ success: false, error: 'Failed to delete payment method' });
    }
  }

  async updatePayment(req, res) {
    try {
      const { id } = req.params;
      const { amount, paymentMethodId, paymentType, status, notes } = req.body;
      const payment = await PaymentsRepository.updatePayment(id, {
        amount, paymentMethodId, paymentType, status, notes
      });
      res.json({ success: true, data: payment });
    } catch (error) {
      this.logger.error('updatePayment', error);
      res.status(500).json({ success: false, error: 'Failed to update payment' });
    }
  }

  async deletePayment(req, res) {
    try {
      const { id } = req.params;
      await PaymentsRepository.deletePayment(id);
      res.json({ success: true, message: 'Payment deleted' });
    } catch (error) {
      this.logger.error('deletePayment', error);
      res.status(500).json({ success: false, error: 'Failed to delete payment' });
    }
  }

  async updatePledge(req, res) {
    try {
      const { id } = req.params;
      const { amount, pledgeType, startDate, endDate, frequency, status } = req.body;
      const pledge = await PaymentsRepository.updatePledge(id, {
        amount, pledgeType, startDate, endDate, frequency, status
      });
      res.json({ success: true, data: pledge });
    } catch (error) {
      this.logger.error('updatePledge', error);
      res.status(500).json({ success: false, error: 'Failed to update pledge' });
    }
  }

  async deletePledge(req, res) {
    try {
      const { id } = req.params;
      await PaymentsRepository.deletePledge(id);
      res.json({ success: true, message: 'Pledge deleted' });
    } catch (error) {
      this.logger.error('deletePledge', error);
      res.status(500).json({ success: false, error: 'Failed to delete pledge' });
    }
  }

  async getPledgePayments(req, res) {
    try {
      const { pledgeId } = req.params;
      const payments = await PaymentsRepository.getPledgePayments(pledgeId);
      res.json({ success: true, data: payments });
    } catch (error) {
      this.logger.error('getPledgePayments', error);
      res.status(500).json({ success: false, error: 'Failed to fetch pledge payments' });
    }
  }

  async getPaymentAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const churchId = req.user.church_id;
      const analytics = await PaymentsRepository.getPaymentAnalytics(startDate, endDate, churchId);
      res.json({ success: true, data: analytics });
    } catch (error) {
      this.logger.error('getPaymentAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payment analytics' });
    }
  }

  async getPaymentTrends(req, res) {
    try {
      const { months = 12 } = req.query;
      const churchId = req.user.church_id;
      const trends = await PaymentsRepository.getPaymentTrends(months, churchId);
      res.json({ success: true, data: trends });
    } catch (error) {
      this.logger.error('getPaymentTrends', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payment trends' });
    }
  }

  async verifyPayment(req, res) {
    try {
      const { id } = req.params;
      const payment = await PaymentsRepository.verifyPayment(id);
      res.json({ success: true, data: payment });
    } catch (error) {
      this.logger.error('verifyPayment', error);
      res.status(500).json({ success: false, error: 'Failed to verify payment' });
    }
  }

  async cancelPayment(req, res) {
    try {
      const { id } = req.params;
      const payment = await PaymentsRepository.cancelPayment(id);
      res.json({ success: true, data: payment });
    } catch (error) {
      this.logger.error('cancelPayment', error);
      res.status(500).json({ success: false, error: 'Failed to cancel payment' });
    }
  }

  async getPaymentById(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;
      const payment = await PaymentsRepository.getPaymentById(id, churchId);
      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }
      res.json({ success: true, data: payment });
    } catch (error) {
      this.logger.error('getPaymentById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payment' });
    }
  }
}

module.exports = new PaymentsController();