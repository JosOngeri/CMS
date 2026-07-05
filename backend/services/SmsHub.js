const { pool } = require('../config/database');
const axios = require('axios');

/**
 * SmsHub Service (REQ-FR-003)
 * Orchestrates message routing between JOSms and Bulk Providers
 */
class SmsHub {
  constructor() {
    this.io = null; // Set via server.js
    this.THRESHOLD = 400; // Recipient count threshold
  }

  setIo(io) {
    this.io = io;
  }

  async sendSMS(payload) {
    const { recipients, message, churchId } = payload;
    const count = recipients.length;

    try {
      if (count < this.THRESHOLD) {
        return await this.routeToJOSms(payload);
      } else {
        return await this.routeToBlessedTexts(payload);
      }
    } catch (error) {
      console.error('SmsHub Error:', error);
      throw error;
    }
  }

  async routeToJOSms(payload) {
    const io = global.io;
    if (!io) throw new Error('Socket.io not initialized in SmsHub');

    // Emit to the church's relay namespace
    io.to(`relay:${payload.churchId}`).emit('process_bulk', {
      recipients: payload.recipients,
      message: payload.message,
      batchId: payload.batchId
    });

    return { success: true, gateway: 'JOSms', status: 'queued' };
  }

  async routeToBlessedTexts(payload) {
    // Integration with Blessed Texts API
    const apiKey = process.env.BLESSED_TEXTS_API_KEY;
    const url = 'https://api.blessedtexts.com/v1/send';

    const response = await axios.post(url, {
      recipients: payload.recipients,
      message: payload.message
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    return { success: true, gateway: 'BlessedTexts', data: response.data };
  }
}

module.exports = new SmsHub();
