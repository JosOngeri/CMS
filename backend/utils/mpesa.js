const axios = require('axios');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('mpesa');

class MpesaService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.config = null;
  }

  // Get M-Pesa configuration from database
  async getConfig() {
    if (this.config) return this.config;

    try {
      const result = await pool.query(`
        SELECT key, value, value_type
        FROM settings
        WHERE key LIKE 'mpesa_%'
        ORDER BY key
      `);

      const settings = {};
      result.rows.forEach(row => {
        const value = this.parseValue(row.value, row.value_type);
        settings[row.key] = value;
      });

      const environment = settings.mpesa_environment || 'sandbox';

      this.config = {
        environment,
        consumerKey: environment === 'production'
          ? settings.mpesa_production_consumer_key || process.env.MPESA_CONSUMER_KEY
          : settings.mpesa_sandbox_consumer_key || process.env.MPESA_CONSUMER_KEY,
        consumerSecret: environment === 'production'
          ? settings.mpesa_production_consumer_secret || process.env.MPESA_CONSUMER_SECRET
          : settings.mpesa_sandbox_consumer_secret || process.env.MPESA_CONSUMER_SECRET,
        passkey: environment === 'production'
          ? settings.mpesa_production_passkey || process.env.MPESA_PASSKEY
          : settings.mpesa_sandbox_passkey || process.env.MPESA_PASSKEY,
        shortcode: environment === 'production'
          ? settings.mpesa_production_shortcode || process.env.MPESA_SHORTCODE
          : settings.mpesa_sandbox_shortcode || process.env.MPESA_SHORTCODE,
        callbackUrl: environment === 'production'
          ? settings.mpesa_production_callback_url || process.env.MPESA_CALLBACK_URL
          : settings.mpesa_sandbox_callback_url || process.env.MPESA_CALLBACK_URL,
        baseUrl: environment === 'production'
          ? 'https://api.safaricom.co.ke'
          : 'https://sandbox.safaricom.co.ke',
        minAmount: settings.mpesa_minimum_amount || 1,
        maxAmount: settings.mpesa_maximum_amount || 250000,
        timeout: settings.mpesa_transaction_timeout || 300,
        autoRetry: settings.mpesa_auto_retry !== false
      };

      return this.config;
    } catch (error) {
      logger.error('getConfig', 'Error loading M-Pesa config from database:', error);
      // Fallback to environment variables
      this.config = {
        environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
        consumerKey: process.env.MPESA_CONSUMER_KEY,
        consumerSecret: process.env.MPESA_CONSUMER_SECRET,
        passkey: process.env.MPESA_PASSKEY,
        shortcode: process.env.MPESA_SHORTCODE,
        callbackUrl: process.env.MPESA_CALLBACK_URL,
        baseUrl: process.env.MPESA_BASE_URL || (process.env.NODE_ENV === 'production'
          ? 'https://api.safaricom.co.ke'
          : 'https://sandbox.safaricom.co.ke'),
        minAmount: 1,
        maxAmount: 250000,
        timeout: 300,
        autoRetry: true
      };
      return this.config;
    }
  }

  // Parse value based on type
  parseValue(value, type) {
    switch (type) {
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      default:
        return value;
    }
  }

  // Clear cached config (useful after settings update)
  clearConfigCache() {
    this.config = null;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get current configuration (for display/admin purposes)
  async getCurrentConfig() {
    const config = await this.getConfig();
    return {
      environment: config.environment,
      shortcode: config.shortcode,
      callbackUrl: config.callbackUrl,
      minAmount: config.minAmount,
      maxAmount: config.maxAmount,
      timeout: config.timeout,
      autoRetry: config.autoRetry,
      // Don't return sensitive credentials
      hasCredentials: !!(config.consumerKey && config.consumerSecret && config.passkey)
    };
  }

  // Get OAuth access token
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const config = await this.getConfig();

    try {
      const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');

      const response = await axios.get(
        `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 minute before expiry

      return this.accessToken;
    } catch (error) {
      logger.error('getAccessToken', 'Error getting M-Pesa access token:', error.response?.data || error.message);
      throw new Error('Failed to get M-Pesa access token');
    }
  }

  // Generate password for STK push (Base64 encoded: Shortcode + Passkey + Timestamp)
  async generatePassword() {
    const config = await this.getConfig();
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const passwordString = `${config.shortcode}${config.passkey}${timestamp}`;
    return Buffer.from(passwordString).toString('base64');
  }

  // Initiate STK push
  async initiateSTKPush(phoneNumber, amount, accountReference, transactionDesc = 'Church Payment') {
    try {
      const config = await this.getConfig();
      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
      const password = await this.generatePassword();

      // Validate amount
      if (amount < config.minAmount) {
        throw new Error(`Amount must be at least ${config.minAmount}`);
      }
      if (amount > config.maxAmount) {
        throw new Error(`Amount must not exceed ${config.maxAmount}`);
      }

      const payload = {
        BusinessShortCode: config.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: this.formatPhoneNumber(phoneNumber),
        PartyB: config.shortcode,
        PhoneNumber: this.formatPhoneNumber(phoneNumber),
        CallBackURL: `${config.callbackUrl}/stk-push`,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc
      };

      const response = await axios.post(
        `${config.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data,
        checkoutRequestID: response.data.CheckoutRequestID
      };
    } catch (error) {
      logger.error('initiateSTKPush', 'STK Push error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message
      };
    }
  }

  // Query STK push status
  async querySTKStatus(checkoutRequestID) {
    try {
      const config = await this.getConfig();
      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
      const password = await this.generatePassword();

      const payload = {
        BusinessShortCode: config.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID
      };

      const response = await axios.post(
        `${config.baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('querySTKStatus', 'STK Query error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message
      };
    }
  }

  // Format phone number to Kenyan format
  formatPhoneNumber(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove leading 254 if present
    if (cleaned.startsWith('254')) {
      cleaned = cleaned.substring(3);
    }
    
    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Add 254 prefix
    return `254${cleaned}`;
  }

  // Process callback from M-Pesa
  processCallback(callbackData) {
    try {
      const { Body } = callbackData;
      const { stkCallback } = Body;
      
      const {
        MerchantRequestID,
        CheckoutRequestID,
        ResultCode,
        ResultDesc,
        CallbackMetadata
      } = stkCallback;

      const result = {
        success: ResultCode === 0,
        merchantRequestID: MerchantRequestID,
        checkoutRequestID: CheckoutRequestID,
        resultCode: ResultCode,
        resultDesc: ResultDesc,
        metadata: {}
      };

      // Extract metadata if payment was successful
      if (ResultCode === 0 && CallbackMetadata && CallbackMetadata.Item) {
        CallbackMetadata.Item.forEach(item => {
          if (item.Name && item.Value) {
            result.metadata[item.Name] = item.Value;
          }
        });
      }

      return result;
    } catch (error) {
      logger.error('processCallback', 'Error processing M-Pesa callback:', error);
      throw error;
    }
  }

  // Validate payment amount
  validateAmount(amount) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Invalid payment amount');
    }
    return numAmount;
  }

  // Validate phone number
  validatePhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 9 || cleaned.length > 12) {
      throw new Error('Invalid phone number format');
    }
    return phone;
  }
}

module.exports = MpesaService;
