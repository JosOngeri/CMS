const { pool } = require('../config/database');
const axios = require('axios');
const smsProviderRepo = require('../repositories/SMSProviderRepository');

/**
 * Payment SMS Integration Helper
 * Handles SMS notifications for payment events.
 *
 * Tenant rules (ledger Batch-6 L295):
 *  - Every public function requires churchId (pass explicitly or via payment.church_id).
 *  - Provider credentials come from sms_providers (per-church) — never a global
 *    sms_settings row, which would leak one tenant's API key into another's sends.
 *  - Member phone lookups are scoped by members.church_id.
 */

async function getSmsProvider(churchId) {
  // Repository decrypts enc:v1: api_keys — raw SQL here would return ciphertext
  const providers = await smsProviderRepo.getActiveProviders({ church_id: churchId });
  return providers[0] || null;
}

// sms_templates is a global table (no church_id) — scoping lives in the
// provider + recipient queries.
async function getSmsTemplate(name) {
  const result = await pool.query(
    `SELECT id, content FROM sms_templates
     WHERE name = $1 AND is_active = true
     LIMIT 1`,
    [name]
  );
  return result.rows[0] || null;
}

function formatPhone(phoneNumber) {
  if (!phoneNumber) return null;
  if (!phoneNumber.startsWith('254')) {
    if (phoneNumber.startsWith('0')) return '254' + phoneNumber.substring(1);
    if (phoneNumber.startsWith('7')) return '254' + phoneNumber;
  }
  return phoneNumber;
}

async function getMemberPhone(memberId, churchId) {
  const result = await pool.query(
    'SELECT phone FROM members WHERE id = $1 AND church_id = $2',
    [memberId, churchId]
  );
  return result.rows[0]?.phone || null;
}

function resolveChurchId(entity, churchId) {
  return churchId || entity?.church_id || null;
}

async function logSms(message, templateId, relatedId, churchId, status = 'sent') {
  try {
    await pool.query(
      `INSERT INTO sms_logs (sender_id, recipients, message, status, template_id, related_module, related_id, church_id)
       VALUES (NULL, 1, $1, $2, $3, 'payments', $4, $5)`,
      [message, status, templateId, relatedId, churchId]
    );
  } catch (error) {
    if (error.code !== '42703') throw error; // 42703 = undefined column
    await pool.query(
      `INSERT INTO sms_logs (sender_id, recipients, message, status, template_id, related_module, related_id)
       VALUES (NULL, 1, $1, $2, $3, 'payments', $4)`,
      [message, status, templateId, relatedId]
    );
  }
}

/**
 * Send SMS notification for payment completion
 * @param {Object} payment - Payment object (must carry church_id)
 * @param {string} [churchId] - Church UUID (overrides payment.church_id)
 * @returns {Promise<Object>} Result of SMS sending
 */
async function sendPaymentCompletionSMS(payment, churchId) {
  const tenant = resolveChurchId(payment, churchId);
  if (!tenant) {
    return { success: false, message: 'Missing church context' };
  }
  try {
    const settings = await getSmsProvider(tenant);
    if (!settings) {
      console.log('SMS provider not configured for church, skipping payment notification');
      return { success: false, message: 'SMS settings not configured' };
    }

    const template = await getSmsTemplate('Payment Confirmation');
    if (!template) {
      console.log('Payment confirmation template not found, skipping SMS');
      return { success: false, message: 'Template not found' };
    }

    let message = template.content;
    message = message.replace(/\{amount\}/g, payment.amount);
    message = message.replace(/\{category\}/g, payment.category);
    message = message.replace(/\{date\}/g, new Date(payment.created_at).toLocaleDateString());
    message = message.replace(/\{reference\}/g, payment.id);

    let phoneNumber = payment.phone_number;
    if (payment.member_id) {
      phoneNumber = (await getMemberPhone(payment.member_id, tenant)) || phoneNumber;
    }

    phoneNumber = formatPhone(phoneNumber);
    if (!phoneNumber) {
      console.log('No phone number available for payment notification');
      return { success: false, message: 'No phone number available' };
    }

    const smsResponse = await axios.post(settings.api_url, {
      api_key: settings.api_key,
      phone: phoneNumber,
      message: message
    });

    await logSms(message, template.id, payment.id, tenant)
      .catch(e => console.error('Error logging SMS:', e.message));

    return {
      success: true,
      message: 'Payment confirmation SMS sent successfully',
      sms_response: smsResponse.data
    };
  } catch (error) {
    console.error('Error sending payment completion SMS:', error.message);
    await logSms('Payment confirmation SMS failed', null, payment.id, tenant, 'failed')
      .catch(e => console.error('Error logging failed SMS:', e.message));
    return { success: false, message: 'Failed to send payment confirmation SMS' };
  }
}

/**
 * Send SMS notification for payment failure
 * @param {Object} payment - Payment object (must carry church_id)
 * @param {string} reason - Failure reason
 * @param {string} [churchId] - Church UUID (overrides payment.church_id)
 * @returns {Promise<Object>} Result of SMS sending
 */
async function sendPaymentFailureSMS(payment, reason, churchId) {
  const tenant = resolveChurchId(payment, churchId);
  if (!tenant) {
    return { success: false, message: 'Missing church context' };
  }
  try {
    const settings = await getSmsProvider(tenant);
    if (!settings) {
      console.log('SMS provider not configured for church, skipping payment failure notification');
      return { success: false, message: 'SMS settings not configured' };
    }

    const template = await getSmsTemplate('Payment Failed');
    if (!template) {
      console.log('Payment failure template not found, skipping SMS');
      return { success: false, message: 'Template not found' };
    }

    let message = template.content;
    message = message.replace(/\{amount\}/g, payment.amount);
    message = message.replace(/\{category\}/g, payment.category);
    message = message.replace(/\{reason\}/g, reason || 'Unknown error');

    let phoneNumber = payment.phone_number;
    if (payment.member_id) {
      phoneNumber = (await getMemberPhone(payment.member_id, tenant)) || phoneNumber;
    }

    phoneNumber = formatPhone(phoneNumber);
    if (!phoneNumber) {
      console.log('No phone number available for payment failure notification');
      return { success: false, message: 'No phone number available' };
    }

    const smsResponse = await axios.post(settings.api_url, {
      api_key: settings.api_key,
      phone: phoneNumber,
      message: message
    });

    await logSms(message, template.id, payment.id, tenant)
      .catch(e => console.error('Error logging SMS:', e.message));

    return {
      success: true,
      message: 'Payment failure SMS sent successfully',
      sms_response: smsResponse.data
    };
  } catch (error) {
    console.error('Error sending payment failure SMS:', error.message);
    await logSms('Payment failure SMS failed', null, payment.id, tenant, 'failed')
      .catch(e => console.error('Error logging failed SMS:', e.message));
    return { success: false, message: 'Failed to send payment failure SMS' };
  }
}

/**
 * Send SMS notification for refund status change
 * @param {Object} refund - Refund object
 * @param {Object} payment - Related payment object (must carry church_id)
 * @param {string} [churchId] - Church UUID (overrides payment.church_id)
 * @returns {Promise<Object>} Result of SMS sending
 */
async function sendRefundStatusSMS(refund, payment, churchId) {
  const tenant = resolveChurchId(payment, churchId);
  if (!tenant) {
    return { success: false, message: 'Missing church context' };
  }
  try {
    const settings = await getSmsProvider(tenant);
    if (!settings) {
      console.log('SMS provider not configured for church, skipping refund notification');
      return { success: false, message: 'SMS settings not configured' };
    }

    const templateName = refund.status === 'approved' ? 'Refund Approved' : 'Refund Rejected';
    const template = await getSmsTemplate(templateName);
    if (!template) {
      console.log(`${templateName} template not found, skipping SMS`);
      return { success: false, message: 'Template not found' };
    }

    let message = template.content;
    message = message.replace(/\{amount\}/g, refund.amount);
    message = message.replace(/\{status\}/g, refund.status);
    message = message.replace(/\{reason\}/g, refund.reason || '');

    let phoneNumber = payment.phone_number;
    if (payment.member_id) {
      phoneNumber = (await getMemberPhone(payment.member_id, tenant)) || phoneNumber;
    }

    phoneNumber = formatPhone(phoneNumber);
    if (!phoneNumber) {
      console.log('No phone number available for refund notification');
      return { success: false, message: 'No phone number available' };
    }

    const smsResponse = await axios.post(settings.api_url, {
      api_key: settings.api_key,
      phone: phoneNumber,
      message: message
    });

    await logSms(message, template.id, payment.id, tenant)
      .catch(e => console.error('Error logging SMS:', e.message));

    return {
      success: true,
      message: 'Refund status SMS sent successfully',
      sms_response: smsResponse.data
    };
  } catch (error) {
    console.error('Error sending refund status SMS:', error.message);
    await logSms('Refund status SMS failed', null, payment.id, tenant, 'failed')
      .catch(e => console.error('Error logging failed SMS:', e.message));
    return { success: false, message: 'Failed to send refund status SMS' };
  }
}

module.exports = {
  sendPaymentCompletionSMS,
  sendPaymentFailureSMS,
  sendRefundStatusSMS
};
