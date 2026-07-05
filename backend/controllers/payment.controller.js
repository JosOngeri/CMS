const kopokopoService = require('../services/kopokopo');
const BaseController = require('./BaseController');
const PaymentRepository = require('../repositories/PaymentRepository');
const { createLogger } = require('../helpers/controllerLogger');
const { sendPaymentCompletionSMS, sendPaymentFailureSMS, sendRefundStatusSMS } = require('../helpers/paymentSMSIntegration');

/**
 * Payment Controller
 * Handles M-Pesa payments via KopoKopo STK Push and payment link generation
 */
class PaymentController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('PaymentController');
  }

  /**
   * Initiate M-Pesa payment via KopoKopo STK Push
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {number} req.body.amount - Payment amount
   * @param {string} req.body.phoneNumber - Phone number (format: 2547XXXXXXXX)
   * @param {string} req.body.category - Payment category
   * @param {string} [req.body.memberId] - Member ID
   * @param {string} [req.body.description] - Payment description
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async initiatePayment(req, res) {
    try {
      const { amount, phoneNumber, category, memberId, description } = req.body;

      // Validate input
      if (!amount || !phoneNumber || !category) {
        return res.status(400).json({
          success: false,
          error: 'Amount, phone number, and category are required',
        });
      }

      // Validate phone number format
      if (!/^2547\d{8}$/.test(phoneNumber)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number format. Use 2547XXXXXXXX',
        });
      }

      // Create payment record
      const payment = await PaymentRepository.create({
        member_id: memberId,
        phone_number: phoneNumber,
        amount,
        category,
        description: description || `${category} payment`,
        payment_method: 'M-Pesa',
        status: 'pending',
        transaction_id: null
      }, req.user.church_id);

      const paymentId = payment.id;

      // Initiate STK Push
      const paymentResultData = await kopokopoService.initiateSTKPush({
        phoneNumber,
        amount,
        reference: `SDA-${paymentId}`,
        description: description || `${category} payment`,
      });

      if (!paymentResultData.success) {
        await PaymentRepository.updateStatus(paymentId, 'failed', null, req.user.church_id);
        
        return res.status(400).json({
          success: false,
          error: paymentResultData.error,
        });
      }

      // Update payment with transaction details
      await PaymentRepository.updateStatus(paymentId, 'pending', paymentResultData.transactionId, req.user.church_id);

      res.json({
        success: true,
        message: 'Payment initiated. Please check your phone for M-Pesa prompt.',
        data: {
          paymentId,
          transactionId: paymentResultData.transactionId,
          checkoutRequestID: paymentResultData.checkoutRequestID,
        },
      });
    } catch (error) {
      this.logger.error('initiatePayment', error);
      res.status(500).json({
        success: false,
        error: 'Payment initiation failed',
      });
    }
  }

  /**
   * Generate payment link
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {number} req.body.amount - Payment amount
   * @param {string} req.body.category - Payment category
   * @param {string} [req.body.memberId] - Member ID
   * @param {string} [req.body.description] - Payment description
   * @param {string} [req.body.eventId] - Event ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async generatePaymentLink(req, res) {
    try {
      const { amount, category, memberId, description, eventId } = req.body;

      const payment = await PaymentRepository.create({
        member_id: memberId,
        amount,
        category,
        description: description || `${category} payment`,
        payment_method: 'M-Pesa',
        status: 'pending',
        transaction_id: null
      }, req.user.church_id);

      const paymentId = payment.id;

      const linkResult = await kopokopoService.generatePaymentLink({
        amount,
        description: description || `${category} payment`,
        redirectUrl: `${process.env.FRONTEND_URL}/payment/success/${paymentId}`,
        memberId,
        category,
        eventId,
      });

      if (!linkResult.success) {
        await PaymentRepository.updateStatusWithFailureReason(paymentId, 'failed', linkResult.error);

        return res.status(400).json({
          success: false,
          error: linkResult.error,
        });
      }

      // Update payment with link details (we'll need to add these fields to the repository method)
      await PaymentRepository.updateStatus(paymentId, 'pending', linkResult.linkId, req.user.church_id);

      res.json({
        success: true,
        data: {
          paymentId,
          paymentUrl: linkResult.paymentUrl,
          expiresAt: linkResult.expiresAt,
        },
      });
    } catch (error) {
      this.logger.error('generatePaymentLink', error);
      res.status(500).json({
        success: false,
        error: 'Payment link generation failed',
      });
    }
  }

  /**
   * Generate QR code for payments
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {number} req.body.amount - Payment amount
   * @param {string} req.body.category - Payment category
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async generateQRCode(req, res) {
    try {
      const { amount, category, memberId, description, eventId } = req.body;

      const payment = await PaymentRepository.create({
        member_id: memberId,
        amount,
        category,
        description: description || `${category} payment`,
        payment_method: 'M-Pesa',
        status: 'pending',
        transaction_id: null
      }, req.user.church_id);

      const paymentId = payment.id;

      const qrResult = await kopokopoService.generateQRCode({
        amount,
        description: description || `${category} payment`,
        memberId,
        category,
      });

      if (!qrResult.success) {
        await PaymentRepository.updateStatusWithFailureReason(paymentId, 'failed', qrResult.error);

        return res.status(400).json({
          success: false,
          error: qrResult.error,
        });
      }

      await PaymentRepository.updateStatus(paymentId, 'pending', qrResult.qrId, req.user.church_id);

      res.json({
        success: true,
        data: {
          paymentId,
          qrCodeData: qrResult.qrCodeData,
          qrCodeImage: qrResult.qrCodeImage,
          qrId: qrResult.qrId,
        },
      });
    } catch (error) {
      this.logger.error('generateQRCode', error);
      res.status(500).json({
        success: false,
        error: 'QR code generation failed',
      });
    }
  }

  /**
   * Check payment status
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.paymentId - Payment ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async checkPaymentStatus(req, res) {
    try {
      const { paymentId } = req.params;
      const churchId = req.user.church_id;

      const payment = await PaymentRepository.getById(paymentId, churchId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
        });
      }

      // If payment is still pending, check with KopoKopo
      if (payment.status === 'pending' && payment.transaction_id) {
        const statusResult = await kopokopoService.checkTransactionStatus(
          payment.transaction_id
        );

        if (statusResult.success && statusResult.status !== 'pending') {
          await PaymentRepository.updateStatus(paymentId, statusResult.status, null, churchId);
          payment.status = statusResult.status;
          payment.completed_at = new Date();

          // Send SMS notification if payment is completed
          if (statusResult.status === 'completed') {
            sendPaymentCompletionSMS(payment).catch(smsError => {
              this.logger.error('Failed to send payment completion SMS', smsError);
            });
          } else if (statusResult.status === 'failed') {
            sendPaymentFailureSMS(payment, statusResult.error || 'Payment failed').catch(smsError => {
              this.logger.error('Failed to send payment failure SMS', smsError);
            });
          }
        }
      }

      res.json({
        success: true,
        data: {
          paymentId: payment.id,
          status: payment.status,
          amount: payment.amount,
          category: payment.category,
          phoneNumber: payment.phone_number,
          createdAt: payment.created_at,
          completedAt: payment.completed_at,
          mpesaReceipt: payment.mpesa_receipt,
          failureReason: payment.failure_reason,
        },
      });
    } catch (error) {
      this.logger.error('checkPaymentStatus', error);
      res.status(500).json({
        success: false,
        error: 'Payment status check failed',
      });
    }
  }

  /**
   * Get payment history for a member
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.memberId - Member ID
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.limit] - Limit results
   * @param {number} [req.query.offset] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPaymentHistory(req, res) {
    try {
      const { memberId } = req.params;
      const { page = 1, limit = 20, category, startDate, endDate } = req.query;

      const filters = { member_id: memberId };
      if (category) filters.category = category;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      const { payments, totalCount } = await PaymentRepository.getPaymentsWithFilters(filters, null, limit, (page - 1) * limit);

      res.json({
        success: true,
        data: {
          payments,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit),
          },
        },
      });
    } catch (error) {
      this.logger.error('getPaymentHistory', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment history',
      });
    }
  }

  /**
   * Get all payments (admin)
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.limit] - Limit results
   * @param {number} [req.query.offset] - Offset for pagination
   * @param {string} [req.query.category] - Filter by category
   * @param {string} [req.query.status] - Filter by status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllPayments(req, res) {
    try {
      const { page = 1, limit = 20, category, status, startDate, endDate } = req.query;
      const churchId = req.user.church_id;

      const filters = {};
      if (category) filters.category = category;
      if (status) filters.status = status;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      const { payments, totalCount } = await PaymentRepository.getPaymentsWithFilters(filters, churchId, limit, (page - 1) * limit);

      res.json({
        success: true,
        data: {
          payments,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit),
          },
        },
      });
    } catch (error) {
      this.logger.error('getAllPayments', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payments',
      });
    }
  }

  /**
   * Process KopoKopo webhook
   * @param {Object} req - Express request object
   * @param {Object} req.body - Webhook payload from KopoKopo
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async processWebhook(req, res) {
    try {
      const signature = req.headers['x-k2-signature'];
      const payload = req.body;

      if (!signature) {
        return res.status(400).json({
          success: false,
          error: 'Missing signature',
        });
      }

      await kopokopoService.processWebhook(payload, signature);

      res.json({ success: true, message: 'Webhook processed successfully' });
    } catch (error) {
      this.logger.error('processWebhook', error);
      res.status(400).json({
        success: false,
        error: 'Webhook processing failed',
      });
    }
  }

  /**
   * Get payment analytics
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.startDate] - Start date for analytics
   * @param {string} [req.query.endDate] - End date for analytics
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPaymentAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // Get analytics from KopoKopo
      const kopokopoAnalytics = await kopokopoService.getPaymentAnalytics(
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate || new Date()
      );

      // Get local analytics using SQL
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      const localAnalyticsQuery = `
        SELECT 
          category,
          SUM(amount) as total_amount,
          COUNT(*) as count,
          AVG(amount) as average_amount
        FROM payments
        WHERE status = 'completed'
          AND created_at >= $1
          AND created_at <= $2
        GROUP BY category
        ORDER BY total_amount DESC
      `;

      const localAnalyticsResult = await PaymentRepository.getPaymentAnalyticsByCategory(start, end);
      const localAnalytics = localAnalyticsResult.map(row => ({
        _id: row.category,
        totalAmount: parseFloat(row.total_amount),
        count: parseInt(row.count),
        averageAmount: parseFloat(row.average_amount),
      }));

      res.json({
        success: true,
        data: {
          kopokopo: kopokopoAnalytics.analytics || {},
          local: localAnalytics,
        },
      });
    } catch (error) {
      this.logger.error('getPaymentAnalytics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment analytics',
      });
    }
  }

  /**
   * Refund payment
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
      const { amount, reason } = req.body;

      const payment = await PaymentRepository.getPaymentByIdSimple(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
        });
      }

      if (payment.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Only completed payments can be refunded',
        });
      }

      // Generate refund number
      const refundNumber = `REF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      // Create refund record with pending status
      const refund = await PaymentRepository.createRefundWithNumber(
        paymentId,
        amount || payment.amount,
        reason,
        refundNumber,
        req.user.id
      );

      // Create approval request for refund
      const approvalId = await PaymentRepository.createApprovalRequest(
        'refund',
        'payments',
        amount || payment.amount,
        `Refund for payment ${paymentId}: ${reason}`,
        req.user.id,
        { refund_id: refund.id, payment_id: paymentId }
      );

      res.json({
        success: true,
        message: 'Refund request submitted for approval',
        data: {
          ...refund,
          approval_request_id: approvalId
        },
      });
    } catch (error) {
      this.logger.error('refundPayment', error);
      res.status(500).json({
        success: false,
        error: 'Refund request failed',
      });
    }
  }

  /**
   * Approve refund
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.refundId - Refund ID
   * @param {Object} req.body - Request body
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async approveRefund(req, res) {
    try {
      const { refundId } = req.params;

      const refund = await PaymentRepository.getRefundById(refundId);
      if (!refund) {
        return res.status(404).json({
          success: false,
          error: 'Refund not found',
        });
      }

      if (refund.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Only pending refunds can be approved',
        });
      }

      // Get payment details
      const payment = await PaymentRepository.getPaymentByIdSimple(refund.payment_id);

      // Process refund with KopoKopo
      const refundResultData = await kopokopoService.refundPayment(
        payment.transaction_id,
        { amount: refund.amount, reason: refund.reason }
      );

      if (!refundResultData.success) {
        return res.status(400).json({
          success: false,
          error: refundResultData.error,
        });
      }

      // Update refund record
      await PaymentRepository.approveRefund(refundId, refundResultData.refundId, req.user.id);

      // Update payment status
      await PaymentRepository.updatePaymentStatus(refund.payment_id, 'refunded');

      // Send SMS notification for refund approval
      sendRefundStatusSMS({ ...refund, status: 'approved' }, payment).catch(smsError => {
        this.logger.error('Failed to send refund approval SMS', smsError);
      });

      res.json({
        success: true,
        message: 'Refund approved and processed successfully',
      });
    } catch (error) {
      this.logger.error('approveRefund', error);
      res.status(500).json({
        success: false,
        error: 'Refund approval failed',
      });
    }
  }

  /**
   * Reject refund
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.refundId - Refund ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.rejectionReason - Reason for rejection
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async rejectRefund(req, res) {
    try {
      const { refundId } = req.params;
      const { rejectionReason } = req.body;

      const refund = await PaymentRepository.getRefundById(refundId);
      if (!refund) {
        return res.status(404).json({
          success: false,
          error: 'Refund not found',
        });
      }

      if (refund.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Only pending refunds can be rejected',
        });
      }

      // Update refund record
      await PaymentRepository.rejectRefund(refundId, req.user.id, refund.reason, rejectionReason);

      // Get payment details for SMS notification
      const payment = await PaymentRepository.getPaymentByIdSimple(refund.payment_id);

      // Send SMS notification for refund rejection
      sendRefundStatusSMS({ ...refund, status: 'rejected' }, payment).catch(smsError => {
        this.logger.error('Failed to send refund rejection SMS', smsError);
      });

      res.json({
        success: true,
        message: 'Refund rejected successfully',
      });
    } catch (error) {
      this.logger.error('rejectRefund', error);
      res.status(500).json({
        success: false,
        error: 'Refund rejection failed',
      });
    }
  }

  /**
   * Get all refunds
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.status] - Filter by status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getRefunds(req, res) {
    try {
      const { status } = req.query;

      const refunds = await PaymentRepository.getRefundsWithStatus(status);

      res.json({ success: true, data: refunds });
    } catch (error) {
      this.logger.error('getRefunds', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch refunds',
      });
    }
  }
}

module.exports = new PaymentController();
