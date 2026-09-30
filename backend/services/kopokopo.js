const axios = require('axios');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { createLogger } = require('../helpers/controllerLogger');
const smsService = require('./hybridSMS');
const emailService = require('../utils/emailService');
const notificationService = require('./notificationService');

const logger = createLogger('kopokopo');

class KopoKopoService {
  constructor() {
    this.baseURL = process.env.KOPOKOPO_BASE_URL || 'https://api.kopokopo.com';
    this.apiKey = process.env.KOPOKOPO_API_KEY;
    this.apiSecret = process.env.KOPOKOPO_API_SECRET;
    this.webhookSecret = process.env.KOPOKOPO_WEBHOOK_SECRET;
  }

  // Generate signature for API requests
  generateSignature(payload) {
    const timestamp = Date.now().toString();
    const message = timestamp + JSON.stringify(payload);
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
  }

  // Make authenticated API request
  async makeRequest(endpoint, payload = {}, method = 'POST') {
    try {
      const signature = this.generateSignature(payload);
      const timestamp = Date.now().toString();

      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-K2-Signature': signature,
          'X-K2-Timestamp': timestamp,
        },
        data: payload,
      };

      const response = await axios(config);
      return response.data;
    } catch (error) {
      logger.error('makeRequest', 'KopoKopo API Error:', error.response?.data || error.message);
      throw new Error('Payment service unavailable');
    }
  }

  // Initiate STK Push payment
  async initiateSTKPush(paymentData) {
    const payload = {
      type: 'stk_push',
      payment_type: 'mpesa',
      phone_number: paymentData.phoneNumber,
      amount: paymentData.amount,
      account_reference: paymentData.reference || 'SDA_CHURCH',
      transaction_desc: paymentData.description || 'Church Payment',
      callback_url: `${process.env.BACKEND_URL}/api/payment/kopokopo/webhook`,
    };

    try {
      const response = await this.makeRequest('/payments/stk_push', payload);
      return {
        success: true,
        transactionId: response.id,
        checkoutRequestID: response.checkout_request_id,
        merchantRequestID: response.merchant_request_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Generate payment link
  async generatePaymentLink(paymentData) {
    const payload = {
      type: 'payment_link',
      amount: paymentData.amount,
      currency: 'KES',
      description: paymentData.description || 'Church Payment',
      redirect_url: paymentData.redirectUrl || `${process.env.FRONTEND_URL}/payment/success`,
      callback_url: `${process.env.BACKEND_URL}/api/payment/kopokopo/webhook`,
      metadata: {
        memberId: paymentData.memberId,
        paymentCategory: paymentData.category,
        churchEvent: paymentData.eventId,
      },
    };

    try {
      const response = await this.makeRequest('/payment_links', payload);
      return {
        success: true,
        paymentUrl: response.payment_url,
        linkId: response.id,
        expiresAt: response.expires_at,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Generate QR code for payments
  async generateQRCode(paymentData) {
    const payload = {
      type: 'qr_code',
      amount: paymentData.amount,
      currency: 'KES',
      merchant_name: 'SDA Church Kiserian Main',
      transaction_desc: paymentData.description || 'Church Payment',
      metadata: {
        memberId: paymentData.memberId,
        paymentCategory: paymentData.category,
      },
    };

    try {
      const response = await this.makeRequest('/qr_codes', payload);
      return {
        success: true,
        qrCodeData: response.qr_code_data,
        qrCodeImage: response.qr_code_image_url,
        qrId: response.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Check transaction status
  async checkTransactionStatus(transactionId) {
    try {
      const response = await this.makeRequest(`/transactions/${transactionId}`, {}, 'GET');
      return {
        success: true,
        status: response.status,
        transaction: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Process webhook callback
  async processWebhook(payload, signature) {
    try {
      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new Error('Invalid webhook signature');
      }

      // Process the payment event
      const event = payload.event;
      
      switch (event.type) {
        case 'transaction.successful':
          return await this.handleSuccessfulPayment(event.data);
        case 'transaction.failed':
          return await this.handleFailedPayment(event.data);
        default:
          logger.info('processWebhook', 'Unhandled event type:', event.type);
          return { processed: true };
      }
    } catch (error) {
      logger.error('processWebhook', 'Webhook processing error:', error);
      throw error;
    }
  }

  // Handle successful payment
  async handleSuccessfulPayment(transactionData) {
    try {
      // Mark the pending payment complete. Match on the KopoKopo transaction id
      // we stored at STK-initiation time; fall back to the SDA-{id} reference.
      const referenceId = String(transactionData.account_reference || '').replace(/^SDA-/i, '') || null;
      const result = await pool.query(
        `UPDATE payments
         SET status = 'completed',
             mpesa_receipt = COALESCE($1, mpesa_receipt),
             mpesa_receipt_number = COALESCE($1, mpesa_receipt_number),
             completed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE status = 'pending'
           AND (transaction_id = $2 OR id::text = $3)
         RETURNING *`,
        [transactionData.receipt_number || null, transactionData.id, referenceId]
      );

      const payment = result.rows[0];
      if (payment) {
        await this.sendPaymentConfirmation(payment);
      } else {
        logger.warn('handleSuccessfulPayment', 'No pending payment matched webhook', {
          transactionId: transactionData.id,
          reference: transactionData.account_reference,
        });
      }

      return { processed: true, payment };
    } catch (error) {
      logger.error('handleSuccessfulPayment', 'Error processing successful payment:', error);
      throw error;
    }
  }

  // Handle failed payment
  async handleFailedPayment(transactionData) {
    try {
      const referenceId = String(transactionData.account_reference || '').replace(/^SDA-/i, '') || null;
      await pool.query(
        `UPDATE payments
         SET status = 'failed',
             notes = COALESCE(notes, '') || ' [FAILED: ' || $1 || ']',
             updated_at = CURRENT_TIMESTAMP
         WHERE transaction_id = $2 OR id::text = $3`,
        [transactionData.failure_reason || 'unknown', transactionData.id, referenceId]
      );

      return { processed: true };
    } catch (error) {
      logger.error('handleFailedPayment', 'Error processing failed payment:', error);
      throw error;
    }
  }

  // Send payment confirmation
  async sendPaymentConfirmation(payment) {
    try {
      const phoneNumber = payment.phone_number || payment.phoneNumber;
      const receipt = payment.mpesa_receipt || payment.mpesa_receipt_number || payment.mpesaReceipt;
      const amount = payment.amount;

      // Send SMS confirmation (non-blocking)
      try {
        if (phoneNumber) {
          await smsService.sendSMS({
            recipients: [phoneNumber],
            message: `Thank you for your payment of KES ${amount} to SDA Church Kiserian Main. Receipt: ${receipt || '-'}`,
            churchId: payment.church_id || payment.churchId
          });
        }
      } catch (smsError) {
        logger.warn('sendPaymentConfirmation', 'SMS confirmation skipped:', smsError.message);
      }

      // Send email confirmation (non-blocking) — needs the member's email
      try {
        const userIdForEmail = payment.user_id || payment.member_id || payment.memberId;
        if (userIdForEmail) {
          const userResult = await pool.query(
            'SELECT email, first_name, last_name FROM users WHERE id = $1',
            [userIdForEmail]
          );
          const member = userResult.rows[0];
          if (member?.email) {
            await emailService.sendPaymentReceipt({
              ...payment,
              email: member.email,
              memberName: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
              mpesaReceipt: receipt,
              amount
            });
          }
        }
      } catch (emailError) {
        logger.warn('sendPaymentConfirmation', 'Email receipt skipped:', emailError.message);
      }

      // Send in-app notification (if member has an account)
      const userId = payment.user_id || payment.member_id || payment.memberId;
      if (userId) {
        try {
          await notificationService.sendRealTimeNotification(userId, {
            type: 'payment',
            title: 'Payment Received',
            message: `Your payment of KES ${amount} has been received successfully.`,
            data: { receipt, amount }
          });
        } catch (pushError) {
          logger.warn('sendPaymentConfirmation', 'Push notification skipped:', pushError.message);
        }
      }
    } catch (error) {
      logger.error('sendPaymentConfirmation', 'Error sending payment confirmation:', error);
    }
  }

  // Get payment analytics
  async getPaymentAnalytics(startDate, endDate) {
    try {
      const response = await this.makeRequest('/analytics/payments', {
        start_date: startDate,
        end_date: endDate,
        filters: {
          currency: 'KES',
          status: 'successful',
        },
      }, 'GET');

      return {
        success: true,
        analytics: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Refund payment
  async refundPayment(transactionId, refundData) {
    const payload = {
      transaction_id: transactionId,
      amount: refundData.amount,
      reason: refundData.reason,
      callback_url: `${process.env.BACKEND_URL}/api/payments/kopokopo/refund-callback`,
    };

    try {
      const response = await this.makeRequest('/refunds', payload);
      return {
        success: true,
        refundId: response.id,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new KopoKopoService();
