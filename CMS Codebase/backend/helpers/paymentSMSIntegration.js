const { pool } = require('../config/database');
const axios = require('axios');

/**
 * Payment SMS Integration Helper
 * Handles SMS notifications for payment events
 */

/**
 * Send SMS notification for payment completion
 * @param {Object} payment - Payment object
 * @returns {Promise<Object>} Result of SMS sending
 */
async function sendPaymentCompletionSMS(payment) {
  try {
    // Get SMS settings
    const settingsResult = await pool.query(
      'SELECT * FROM sms_settings WHERE is_active = true LIMIT 1'
    );

    if (settingsResult.rows.length === 0) {
      console.log('SMS settings not configured, skipping payment notification');
      return { success: false, message: 'SMS settings not configured' };
    }

    const settings = settingsResult.rows[0];

    // Get payment template
    const templateResult = await pool.query(
      "SELECT * FROM sms_templates WHERE name = 'Payment Confirmation' AND is_active = true LIMIT 1"
    );

    if (templateResult.rows.length === 0) {
      console.log('Payment confirmation template not found, skipping SMS');
      return { success: false, message: 'Template not found' };
    }

    const template = templateResult.rows[0];

    // Replace variables in template (use regex for global replacement)
    let message = template.content;
    message = message.replace(/\{amount\}/g, payment.amount);
    message = message.replace(/\{category\}/g, payment.category);
    message = message.replace(/\{date\}/g, new Date(payment.created_at).toLocaleDateString());
    message = message.replace(/\{reference\}/g, payment.id);

    // Get member phone number if available
    let phoneNumber = payment.phone_number;
    if (payment.member_id) {
      const memberResult = await pool.query(
        'SELECT phone FROM members WHERE id = $1',
        [payment.member_id]
      );
      if (memberResult.rows.length > 0 && memberResult.rows[0].phone) {
        phoneNumber = memberResult.rows[0].phone;
      }
    }

    if (!phoneNumber) {
      console.log('No phone number available for payment notification');
      return { success: false, message: 'No phone number available' };
    }

    // Format phone number (ensure it starts with 254)
    if (!phoneNumber.startsWith('254')) {
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '254' + phoneNumber.substring(1);
      } else if (phoneNumber.startsWith('7')) {
        phoneNumber = '254' + phoneNumber;
      }
    }

    // Send SMS via BlessedTexts API
    const smsResponse = await axios.post(settings.api_url, {
      api_key: settings.api_key,
      phone: phoneNumber,
      message: message
    });

    // Log the SMS
    await pool.query(
      `INSERT INTO sms_logs (sender_id, recipients, message, status, template_id, related_module, related_id)
       VALUES (1, 1, $1, 'sent', $2, 'payments', $3)`,
      [message, template.id, payment.id]
    );

    return {
      success: true,
      message: 'Payment confirmation SMS sent successfully',
      sms_response: smsResponse.data
    };

  } catch (error) {
    console.error('Error sending payment completion SMS:', error);
    
    // Log failed attempt
    await pool.query(
      `INSERT INTO sms_logs (sender_id, recipients, message, status, related_module, related_id)
       VALUES (1, 1, 'Payment confirmation SMS failed', 'failed', 'payments', $1)`,
      [payment.id]
    ).catch(logError => console.error('Error logging failed SMS:', logError));

    return {
      success: false,
      message: 'Failed to send payment confirmation SMS',
      error: error.message
    };
  }
}

/**
 * Send SMS notification for payment failure
 * @param {Object} payment - Payment object
 * @param {string} reason - Failure reason
 * @returns {Promise<Object>} Result of SMS sending
 */
async function sendPaymentFailureSMS(payment, reason) {
  try {
    // Get SMS settings
    const settingsResult = await pool.query(
      'SELECT * FROM sms_settings WHERE is_active = true LIMIT 1'
    );

    if (settingsResult.rows.length === 0) {
      console.log('SMS settings not configured, skipping payment failure notification');
      return { success: false, message: 'SMS settings not configured' };
    }

    const settings = settingsResult.rows[0];

    // Get payment failure template
    const templateResult = await pool.query(
      "SELECT * FROM sms_templates WHERE name = 'Payment Failed' AND is_active = true LIMIT 1"
    );

    if (templateResult.rows.length === 0) {
      console.log('Payment failure template not found, skipping SMS');
      return { success: false, message: 'Template not found' };
    }

    const template = templateResult.rows[0];

    // Replace variables in template (use regex for global replacement)
    let message = template.content;
    message = message.replace(/\{amount\}/g, payment.amount);
    message = message.replace(/\{category\}/g, payment.category);
    message = message.replace(/\{reason\}/g, reason || 'Unknown error');

    // Get member phone number if available
    let phoneNumber = payment.phone_number;
    if (payment.member_id) {
      const memberResult = await pool.query(
        'SELECT phone FROM members WHERE id = $1',
        [payment.member_id]
      );
      if (memberResult.rows.length > 0 && memberResult.rows[0].phone) {
        phoneNumber = memberResult.rows[0].phone;
      }
    }

    if (!phoneNumber) {
      console.log('No phone number available for payment failure notification');
      return { success: false, message: 'No phone number available' };
    }

    // Format phone number
    if (!phoneNumber.startsWith('254')) {
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '254' + phoneNumber.substring(1);
      } else if (phoneNumber.startsWith('7')) {
        phoneNumber = '254' + phoneNumber;
      }
    }

    // Send SMS via BlessedTexts API
    const smsResponse = await axios.post(settings.api_url, {
      api_key: settings.api_key,
      phone: phoneNumber,
      message: message
    });

    // Log the SMS
    await pool.query(
      `INSERT INTO sms_logs (sender_id, recipients, message, status, template_id, related_module, related_id)
       VALUES (1, 1, $1, 'sent', $2, 'payments', $3)`,
      [message, template.id, payment.id]
    );

    return {
      success: true,
      message: 'Payment failure SMS sent successfully',
      sms_response: smsResponse.data
    };

  } catch (error) {
    console.error('Error sending payment failure SMS:', error);
    
    // Log failed attempt
    await pool.query(
      `INSERT INTO sms_logs (sender_id, recipients, message, status, related_module, related_id)
       VALUES (1, 1, 'Payment failure SMS failed', 'failed', 'payments', $1)`,
      [payment.id]
    ).catch(logError => console.error('Error logging failed SMS:', logError));

    return {
      success: false,
      message: 'Failed to send payment failure SMS',
      error: error.message
    };
  }
}

/**
 * Send SMS notification for refund status change
 * @param {Object} refund - Refund object
 * @param {Object} payment - Related payment object
 * @returns {Promise<Object>} Result of SMS sending
 */
async function sendRefundStatusSMS(refund, payment) {
  try {
    // Get SMS settings
    const settingsResult = await pool.query(
      'SELECT * FROM sms_settings WHERE is_active = true LIMIT 1'
    );

    if (settingsResult.rows.length === 0) {
      console.log('SMS settings not configured, skipping refund notification');
      return { success: false, message: 'SMS settings not configured' };
    }

    const settings = settingsResult.rows[0];

    // Get template based on refund status
    const templateName = refund.status === 'approved' ? 'Refund Approved' : 'Refund Rejected';
    const templateResult = await pool.query(
      `SELECT * FROM sms_templates WHERE name = '${templateName}' AND is_active = true LIMIT 1`
    );

    if (templateResult.rows.length === 0) {
      console.log(`${templateName} template not found, skipping SMS`);
      return { success: false, message: 'Template not found' };
    }

    const template = templateResult.rows[0];

    // Replace variables in template (use regex for global replacement)
    let message = template.content;
    message = message.replace(/\{amount\}/g, refund.amount);
    message = message.replace(/\{status\}/g, refund.status);
    message = message.replace(/\{reason\}/g, refund.reason || '');

    // Get member phone number
    let phoneNumber = payment.phone_number;
    if (payment.member_id) {
      const memberResult = await pool.query(
        'SELECT phone FROM members WHERE id = $1',
        [payment.member_id]
      );
      if (memberResult.rows.length > 0 && memberResult.rows[0].phone) {
        phoneNumber = memberResult.rows[0].phone;
      }
    }

    if (!phoneNumber) {
      console.log('No phone number available for refund notification');
      return { success: false, message: 'No phone number available' };
    }

    // Format phone number
    if (!phoneNumber.startsWith('254')) {
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '254' + phoneNumber.substring(1);
      } else if (phoneNumber.startsWith('7')) {
        phoneNumber = '254' + phoneNumber;
      }
    }

    // Send SMS via BlessedTexts API
    const smsResponse = await axios.post(settings.api_url, {
      api_key: settings.api_key,
      phone: phoneNumber,
      message: message
    });

    // Log the SMS
    await pool.query(
      `INSERT INTO sms_logs (sender_id, recipients, message, status, template_id, related_module, related_id)
       VALUES (1, 1, $1, 'sent', $2, 'payments', $3)`,
      [message, template.id, payment.id]
    );

    return {
      success: true,
      message: 'Refund status SMS sent successfully',
      sms_response: smsResponse.data
    };

  } catch (error) {
    console.error('Error sending refund status SMS:', error);
    
    // Log failed attempt
    await pool.query(
      `INSERT INTO sms_logs (sender_id, recipients, message, status, related_module, related_id)
       VALUES (1, 1, 'Refund status SMS failed', 'failed', 'payments', $1)`,
      [payment.id]
    ).catch(logError => console.error('Error logging failed SMS:', logError));

    return {
      success: false,
      message: 'Failed to send refund status SMS',
      error: error.message
    };
  }
}

module.exports = {
  sendPaymentCompletionSMS,
  sendPaymentFailureSMS,
  sendRefundStatusSMS
};
