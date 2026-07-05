const axios = require('axios');
const crypto = require('crypto');
const { pool } = require('../config/database');
const logger = require('../config/logging');

/**
 * MpesaService (Phase 12)
 * Handles STK Push and callback processing for church contributions
 * Full Safaricom M-Pesa API integration
 */
class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.passkey = process.env.MPESA_PASSKEY;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    this.callbackUrl = process.env.MPESA_CALLBACK_URL;
    
    // API endpoints based on environment
    this.baseUrl = this.environment === 'production' 
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  /**
   * Generate OAuth access token
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: { Authorization: `Basic ${auth}` },
          timeout: 10000
        }
      );
      
      return response.data.access_token;
    } catch (error) {
      logger.error('M-Pesa OAuth Error:', error.response?.data || error.message);
      throw new Error('Failed to get M-Pesa access token');
    }
  }

  /**
   * Generate STK Push password
   * @param {string} timestamp - Timestamp in format YYYYMMDDHHmmss
   * @returns {string} Base64 encoded password
   */
  generatePassword(timestamp) {
    const str = `${this.shortcode}${this.passkey}${timestamp}`;
    return Buffer.from(str).toString('base64');
  }

  /**
   * Get current timestamp in required format
   * @returns {string} Timestamp
   */
  getTimestamp() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Format phone number to M-Pesa format (254...)
   * @param {string} phone - Phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phone) {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Add 254 prefix if starting with 0
    if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    }
    
    // Add 254 prefix if starting with 7
    if (cleaned.startsWith('7')) {
      return '254' + cleaned;
    }
    
    // Return as-is if already has 254
    return cleaned;
  }

  /**
   * Initiate STK Push request
   * @param {string} phone - Phone number
   * @param {number} amount - Amount to charge
   * @param {string} churchId - Church ID
   * @param {string} reference - Payment reference
   * @param {string} description - Payment description
   * @returns {Promise<object>} STK Push response
   */
  async initiateSTK(phone, amount, churchId, reference = 'CHURCH_PAYMENT', description = 'Church Contribution') {
    try {
      const token = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);
      const formattedPhone = this.formatPhoneNumber(phone);
      
      const requestBody = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: this.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: `${this.callbackUrl}/api/mpesa/callback`,
        AccountReference: reference,
        TransactionDesc: description
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const { MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription, CustomerMessage } = response.data;

      // Log the STK Push request to database
      await pool.query(
        `INSERT INTO mpesa_stk_pushes 
         (merchant_request_id, checkout_request_id, phone, amount, church_id, reference, 
          response_code, response_description, customer_message, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          MerchantRequestID,
          CheckoutRequestID,
          formattedPhone,
          amount,
          churchId,
          reference,
          ResponseCode,
          ResponseDescription,
          CustomerMessage,
          ResponseCode === '0' ? 'pending' : 'failed'
        ]
      );

      logger.info(`STK Push initiated: ${CheckoutRequestID} for ${formattedPhone}`);

      return {
        success: ResponseCode === '0',
        merchantRequestId: MerchantRequestID,
        checkoutRequestId: CheckoutRequestID,
        responseCode: ResponseCode,
        responseDescription: ResponseDescription,
        customerMessage: CustomerMessage
      };
    } catch (error) {
      logger.error('STK Push Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'Failed to initiate STK Push');
    }
  }

  /**
   * Process M-Pesa callback
   * @param {object} data - Callback data from Safaricom
   * @returns {Promise<object>} Processing result
   */
  async processCallback(data) {
    try {
      const { Body } = data;
      const { stkCallback } = Body;
      const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

      // Update STK Push status in database
      await pool.query(
        `UPDATE mpesa_stk_pushes 
         SET status = $1, result_code = $2, result_description = $3, processed_at = CURRENT_TIMESTAMP
         WHERE checkout_request_id = $4`,
        [ResultCode === '0' ? 'completed' : 'failed', ResultCode, ResultDesc, CheckoutRequestID]
      );

      if (ResultCode !== '0') {
        logger.warn(`STK Push failed: ${CheckoutRequestID} - ${ResultDesc}`);
        return { success: false, message: ResultDesc };
      }

      // Extract payment details from metadata
      const metadata = CallbackMetadata.Item;
      const amount = metadata.find(item => item.Name === 'Amount')?.Value;
      const mpesaReceipt = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
      const transactionDate = metadata.find(item => item.Name === 'TransactionDate')?.Value;
      const phoneNumber = metadata.find(item => item.Name === 'PhoneNumber')?.Value;

      // Add to reconciliation queue
      await pool.query(
        `INSERT INTO reconciliation_queue 
         (mpesa_receipt, amount, phone_number, transaction_date, merchant_request_id, 
          checkout_request_id, church_id, status, source)
         VALUES ($1, $2, $3, $4, $5, $6, 
          (SELECT church_id FROM mpesa_stk_pushes WHERE checkout_request_id = $6),
          $7, $8)`,
        [mpesaReceipt, amount, phoneNumber, transactionDate, MerchantRequestID, CheckoutRequestID, 'pending', 'mpesa_stk']
      );

      logger.info(`M-Pesa payment processed: ${mpesaReceipt} - KES ${amount}`);

      return {
        success: true,
        receipt: mpesaReceipt,
        amount,
        phoneNumber,
        transactionDate
      };
    } catch (error) {
      logger.error('Callback Processing Error:', error.message);
      throw new Error('Failed to process M-Pesa callback');
    }
  }

  /**
   * Check transaction status
   * @param {string} checkoutRequestId - Checkout request ID
   * @returns {Promise<object>} Transaction status
   */
  async checkTransactionStatus(checkoutRequestId) {
    try {
      const token = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);

      const requestBody = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const { ResultCode, ResultDesc } = response.data;

      return {
        success: ResultCode === '0',
        resultCode: ResultCode,
        resultDescription: ResultDesc
      };
    } catch (error) {
      logger.error('Transaction Status Check Error:', error.response?.data || error.message);
      throw new Error('Failed to check transaction status');
    }
  }

  /**
   * Reverse a transaction (for refunds)
   * @param {string} transactionId - Transaction ID to reverse
   * @param {number} amount - Amount to reverse
   * @param {string} remark - Reversal remark
   * @returns {Promise<object>} Reversal result
   */
  async reverseTransaction(transactionId, amount, remark = 'Refund') {
    try {
      const token = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);

      const requestBody = {
        Initiator: process.env.MPESA_INITIATOR_NAME,
        SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
        CommandID: 'TransactionReversal',
        TransactionID: transactionId,
        Amount: amount,
        ReceiverParty: this.shortcode,
        RecieverIdentifierType: '11',
        ResultURL: `${this.callbackUrl}/api/mpesa/reversal-result`,
        QueueTimeOutURL: `${this.callbackUrl}/api/mpesa/reversal-timeout`,
        Remark: remark,
        Occasion: 'Refund'
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/reversal/v1/request`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const { ResponseCode, ResponseDescription } = response.data;

      return {
        success: ResponseCode === '0',
        responseCode: ResponseCode,
        responseDescription: ResponseDescription
      };
    } catch (error) {
      logger.error('Transaction Reversal Error:', error.response?.data || error.message);
      throw new Error('Failed to reverse transaction');
    }
  }

  /**
   * Validate M-Pesa callback signature
   * @param {string} signature - Signature from callback
   * @param {string} payload - Callback payload
   * @returns {boolean} True if signature is valid
   */
  validateSignature(signature, payload) {
    try {
      const secret = process.env.MPESA_CALLBACK_SECRET;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');
      
      return signature === expectedSignature;
    } catch (error) {
      logger.error('Signature Validation Error:', error.message);
      return false;
    }
  }
}

module.exports = new MpesaService();
