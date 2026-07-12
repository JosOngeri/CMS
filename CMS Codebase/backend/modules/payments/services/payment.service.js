/**
 * Payment Service
 * Business logic for payment operations
 */

const PaymentRepository = require('../repositories/payment.repository');
const { Payment, PaymentItem } = require('../models/Payment');
const MpesaService = require('../../../utils/mpesa');
const AccountingService = require('../../../services/accounting.service');
const SMSService = require('../../../shared/services/smsService');
const logger = require('../../../config/logging');

class PaymentService {
  constructor(pool) {
    this.paymentRepo = new PaymentRepository(pool);
    this.mpesaService = new MpesaService();
    this.smsService = new SMSService(pool);
  }

  /**
   * Create payment with M-Pesa STK push
   */
  async createPayment(paymentData, userId) {
    const { phone_number, payment_items, notes } = paymentData;

    // Calculate total amount
    const totalAmount = payment_items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    // Validate payment items
    if (payment_items.length === 0) {
      throw new Error('At least one payment item is required');
    }

    return this.transaction(async (client) => {
      // Create payment record
      const payment = new Payment({
        member_id: userId,
        phone_number,
        amount: totalAmount,
        notes,
        status: 'pending'
      });

      const validation = payment.validate();
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const createdPayment = await this.paymentRepo.create(payment, client);

      // Create payment items
      const items = [];
      for (const item of payment_items) {
        const paymentItem = new PaymentItem({
          payment_id: createdPayment.id,
          category_id: item.category_id,
          amount: item.amount
        });

        const itemValidation = paymentItem.validate();
        if (!itemValidation.isValid) {
          throw new Error(`Item validation failed: ${itemValidation.errors.join(', ')}`);
        }

        const createdItem = await this.paymentRepo.createPaymentItem(paymentItem, client);
        items.push(createdItem);
      }

      createdPayment.payment_items = items;

      // Generate account reference
      const accountReference = createdPayment.getAccountReference();

      // Initiate M-Pesa STK push
      const stkResult = await this.mpesaService.initiateSTKPush(
        phone_number,
        totalAmount,
        accountReference,
        'SDA Church Kiserian - Offering & Tithe'
      );

      if (!stkResult.success) {
        throw new Error(`Failed to initiate payment: ${stkResult.error}`);
      }

      // Update payment with transaction details
      const updatedPayment = await this.paymentRepo.update(createdPayment.id, {
        ...createdPayment,
        transaction_id: stkResult.data.CheckoutRequestID,
        mpesa_receipt_number: stkResult.data.MerchantRequestID
      });

      logger.info(`Payment created: ${updatedPayment.id} for user ${userId}`);

      return {
        payment: {
          ...updatedPayment,
          payment_items: items,
          account_reference
        },
        stk_push: {
          checkout_request_id: stkResult.data.CheckoutRequestID,
          merchant_request_id: stkResult.data.MerchantRequestID,
          customer_message: stkResult.data.CustomerMessage
        }
      };
    });
  }

  /**
   * Process M-Pesa callback
   */
  async processMpesaCallback(callbackData) {
    const callbackResult = this.mpesaService.processCallback(callbackData);
    const { checkoutRequestID, success, metadata } = callbackResult;

    // Find payment by transaction ID
    const payment = await this.paymentRepo.findByTransactionId(checkoutRequestID);
    if (!payment) {
      logger.error(`Payment not found for checkout request ID: ${checkoutRequestID}`);
      throw new Error('Payment not found');
    }

    // Update payment status
    const updatedPayment = await this.paymentRepo.updateStatus(payment.id, success ? 'completed' : 'failed', {
      mpesa_receipt_number: metadata.MpesaReceiptNumber || null
    });

    logger.info(`Payment ${payment.id} status updated to: ${updatedPayment.status}`);

    // If payment was successful, create journal entry for accounting
    if (success && metadata.MpesaReceiptNumber) {
      try {
        await AccountingService.createJournalEntryFromPayment(payment.id, payment.member_id);
        logger.info(`Journal entry created for payment: ${payment.id}`);
      } catch (accountingError) {
        logger.error(`Failed to create journal entry for payment ${payment.id}:`, accountingError);
      }

      // Send confirmation SMS
      try {
        await this.sendPaymentConfirmationSMS(updatedPayment);
      } catch (smsError) {
        logger.error(`Failed to send SMS for payment ${payment.id}:`, smsError);
      }
    }

    // Update event registration status if this was an event payment
    if (success) {
      try {
        await this.pool.query(
          'UPDATE event_registrations SET status = $1 WHERE payment_id = $2',
          ['confirmed', payment.id]
        );
      } catch (eventError) {
        logger.error(`Failed to update event registration for payment ${payment.id}:`, eventError);
      }
    }

    return updatedPayment;
  }

  /**
   * Query payment status from M-Pesa
   */
  async queryPaymentStatus(transactionId) {
    const payment = await this.paymentRepo.findByTransactionId(transactionId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // If still pending, query M-Pesa status
    if (payment.isPending()) {
      const stkResult = await this.mpesaService.querySTKStatus(transactionId);

      if (stkResult.success) {
        const { ResultCode, ResultDesc } = stkResult.data;

        if (ResultCode === '0') {
          // Payment successful
          const updated = await this.paymentRepo.updateStatus(payment.id, 'completed');
          payment.status = 'completed';
        } else if (ResultCode === '1032') {
          // Request cancelled by user
          const updated = await this.paymentRepo.updateStatus(payment.id, 'cancelled');
          payment.status = 'cancelled';
        }
      }
    }

    return payment;
  }

  /**
   * Get payment history for a user
   */
  async getUserPayments(userId, options = {}) {
    return this.paymentRepo.findAll({ ...options, member_id: userId });
  }

  /**
   * Get all payments (admin)
   */
  async getAllPayments(options = {}) {
    return this.paymentRepo.findAll(options);
  }

  /**
   * Get payment categories
   */
  async getCategories() {
    return this.paymentRepo.getCategories();
  }

  /**
   * Create payment category
   */
  async createCategory(categoryData) {
    const category = new PaymentCategory(categoryData);
    return this.paymentRepo.createCategory(category);
  }

  /**
   * Update payment category
   */
  async updateCategory(id, categoryData) {
    const category = new PaymentCategory({ ...categoryData, id });
    return this.paymentRepo.updateCategory(id, category);
  }

  /**
   * Get payment statistics
   */
  async getStats(startDate, endDate) {
    return this.paymentRepo.getPaymentStats(startDate, endDate);
  }

  /**
   * Send payment confirmation SMS
   */
  async sendPaymentConfirmationSMS(payment) {
    const message = `Thank you for your payment of KES ${payment.amount} to Kiserian Main SDA Church. Receipt: ${payment.mpesa_receipt_number}. God bless you!`;
    
    await this.smsService.sendSMS(payment.phone_number, message);
  }

  /**
   * Transaction helper
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = PaymentService;
