const { pool } = require('../config/database');
const axios = require('axios');
const smsProviderRepo = require('../repositories/SMSProviderRepository');

/**
 * Treasury SMS Integration Helper
 * Handles SMS notifications for treasury events.
 *
 * Tenant rules (ledger Batch-6 L294):
 *  - Every public function requires churchId (pass explicitly or via entity.church_id).
 *  - Provider credentials come from sms_providers (per-church, confirmed schema).
 *    The legacy global sms_settings table is never consulted for other tenants.
 *  - Treasurer/pastor recipient lookups are scoped by users.church_id.
 */

/**
 * Fetch the church's active SMS provider credentials.
 * @param {string} churchId - Church UUID
 * @returns {Promise<Object|null>} Provider row or null
 */
async function getSmsProvider(churchId) {
  // Repository decrypts enc:v1: api_keys — raw SQL here would return ciphertext
  const providers = await smsProviderRepo.getActiveProviders({ church_id: churchId });
  return providers[0] || null;
}

/**
 * Fetch an active SMS template by name. sms_templates is a global table
 * (no church_id column) — tenant isolation lives in the provider +
 * recipient queries, which are always church-scoped.
 */
async function getSmsTemplate(name) {
  const result = await pool.query(
    `SELECT id, content FROM sms_templates
     WHERE name = $1 AND is_active = true
     LIMIT 1`,
    [name]
  );
  return result.rows[0] || null;
}

/**
 * Phone number of a Treasurer belonging to this church.
 */
async function getTreasurerPhone(churchId) {
  const result = await pool.query(
    `SELECT u.phone
     FROM users u
     JOIN user_roles ur ON u.id = ur.user_id
     JOIN roles r ON ur.role_id = r.id
     WHERE r.name = 'Treasurer' AND u.church_id = $1
     LIMIT 1`,
    [churchId]
  );
  return result.rows[0]?.phone || null;
}

/**
 * Normalize a Kenyan phone number to 254XXXXXXXXX.
 */
function formatPhone(phoneNumber) {
  if (!phoneNumber) return null;
  if (!phoneNumber.startsWith('254')) {
    if (phoneNumber.startsWith('0')) return '254' + phoneNumber.substring(1);
    if (phoneNumber.startsWith('7')) return '254' + phoneNumber;
  }
  return phoneNumber;
}

/**
 * Resolve the churchId for a call: explicit param wins, then entity.church_id.
 * Fails closed (returns false) when no tenant context exists.
 */
function resolveChurchId(entity, churchId) {
  return churchId || entity?.church_id || null;
}

async function logSms(message, templateId, relatedId, churchId, status = 'sent') {
  // sms_logs column drift exists across environments — try the tenant-scoped
  // insert first, fall back to the legacy column set if church_id is absent.
  try {
    await pool.query(
      `INSERT INTO sms_logs (sender_id, recipients, message, status, template_id, related_module, related_id, church_id)
       VALUES (NULL, 1, $1, $2, $3, 'treasury', $4, $5)`,
      [message, status, templateId, relatedId, churchId]
    );
  } catch (error) {
    if (error.code !== '42703') throw error; // 42703 = undefined column
    await pool.query(
      `INSERT INTO sms_logs (sender_id, recipients, message, status, template_id, related_module, related_id)
       VALUES (NULL, 1, $1, $2, $3, 'treasury', $4)`,
      [message, status, templateId, relatedId]
    );
  }
}

/**
 * Send SMS notification for budget alert
 * @param {Object} budgetAlert - Budget alert object (must carry church_id)
 * @param {string} [churchId] - Church UUID (overrides budgetAlert.church_id)
 * @returns {Promise<Object>} Result of SMS sending
 */
async function sendBudgetAlertSMS(budgetAlert, churchId) {
  const tenant = resolveChurchId(budgetAlert, churchId);
  if (!tenant) {
    return { success: false, message: 'Missing church context' };
  }
  try {
    const settings = await getSmsProvider(tenant);
    if (!settings) {
      console.log('SMS provider not configured for church, skipping budget alert notification');
      return { success: false, message: 'SMS settings not configured' };
    }

    const template = await getSmsTemplate('Budget Alert');
    if (!template) {
      console.log('Budget alert template not found, skipping SMS');
      return { success: false, message: 'Template not found' };
    }

    let message = template.content;
    message = message.replace(/\{budget_name\}/g, budgetAlert.budget_name);
    message = message.replace(/\{category\}/g, budgetAlert.category_name);
    message = message.replace(/\{budgeted\}/g, budgetAlert.budgeted);
    message = message.replace(/\{spent\}/g, budgetAlert.spent);
    message = message.replace(/\{remaining\}/g, budgetAlert.remaining);

    const phoneNumber = formatPhone(await getTreasurerPhone(tenant));
    if (!phoneNumber) {
      console.log('Treasurer phone number not found, skipping SMS');
      return { success: false, message: 'Treasurer phone not found' };
    }

    const smsResponse = await axios.post(settings.api_url, {
      api_key: settings.api_key,
      phone: phoneNumber,
      message: message
    });

    await logSms(message, template.id, budgetAlert.budget_id, tenant)
      .catch(e => console.error('Error logging SMS:', e.message));

    return {
      success: true,
      message: 'Budget alert SMS sent successfully',
      sms_response: smsResponse.data
    };
  } catch (error) {
    console.error('Error sending budget alert SMS:', error.message);
    await logSms('Budget alert SMS failed', null, budgetAlert.budget_id, tenant, 'failed')
      .catch(e => console.error('Error logging failed SMS:', e.message));
    return { success: false, message: 'Failed to send budget alert SMS' };
  }
}

/**
 * Send SMS notification for expense approval
 * @param {Object} expense - Expense object (must carry church_id)
 * @param {string} status - Approval status
 * @param {string} [churchId] - Church UUID (overrides expense.church_id)
 * @returns {Promise<Object>} Result of SMS sending
 */
async function sendExpenseApprovalSMS(expense, status, churchId) {
  const tenant = resolveChurchId(expense, churchId);
  if (!tenant) {
    return { success: false, message: 'Missing church context' };
  }
  try {
    const settings = await getSmsProvider(tenant);
    if (!settings) {
      console.log('SMS provider not configured for church, skipping expense approval notification');
      return { success: false, message: 'SMS settings not configured' };
    }

    const templateName = status === 'approved' ? 'Expense Approved' : 'Expense Rejected';
    const template = await getSmsTemplate(templateName);
    if (!template) {
      console.log(`${templateName} template not found, skipping SMS`);
      return { success: false, message: 'Template not found' };
    }

    let message = template.content;
    message = message.replace(/\{amount\}/g, expense.amount);
    message = message.replace(/\{category\}/g, expense.category_name);
    message = message.replace(/\{status\}/g, status);
    message = message.replace(/\{date\}/g, new Date(expense.transaction_date).toLocaleDateString());

    let phoneNumber = expense.phone;
    if (expense.recorded_by) {
      // Same-church users only — never pull a foreign tenant's phone
      const userResult = await pool.query(
        'SELECT phone FROM users WHERE id = $1 AND church_id = $2',
        [expense.recorded_by, tenant]
      );
      if (userResult.rows[0]?.phone) {
        phoneNumber = userResult.rows[0].phone;
      }
    }

    phoneNumber = formatPhone(phoneNumber);
    if (!phoneNumber) {
      console.log('No phone number available for expense approval notification');
      return { success: false, message: 'No phone number available' };
    }

    const smsResponse = await axios.post(settings.api_url, {
      api_key: settings.api_key,
      phone: phoneNumber,
      message: message
    });

    await logSms(message, template.id, expense.id, tenant)
      .catch(e => console.error('Error logging SMS:', e.message));

    return {
      success: true,
      message: 'Expense approval SMS sent successfully',
      sms_response: smsResponse.data
    };
  } catch (error) {
    console.error('Error sending expense approval SMS:', error.message);
    await logSms('Expense approval SMS failed', null, expense.id, tenant, 'failed')
      .catch(e => console.error('Error logging failed SMS:', e.message));
    return { success: false, message: 'Failed to send expense approval SMS' };
  }
}

/**
 * Send SMS notification for journal entry posting
 * @param {Object} journalEntry - Journal entry object (must carry church_id)
 * @param {string} [churchId] - Church UUID (overrides journalEntry.church_id)
 * @returns {Promise<Object>} Result of SMS sending
 */
async function sendJournalEntrySMS(journalEntry, churchId) {
  const tenant = resolveChurchId(journalEntry, churchId);
  if (!tenant) {
    return { success: false, message: 'Missing church context' };
  }
  try {
    const settings = await getSmsProvider(tenant);
    if (!settings) {
      console.log('SMS provider not configured for church, skipping journal entry notification');
      return { success: false, message: 'SMS settings not configured' };
    }

    const template = await getSmsTemplate('Journal Entry Posted');
    if (!template) {
      console.log('Journal entry template not found, skipping SMS');
      return { success: false, message: 'Template not found' };
    }

    let message = template.content;
    message = message.replace(/\{entry_number\}/g, journalEntry.entry_number);
    message = message.replace(/\{description\}/g, journalEntry.description);
    message = message.replace(/\{date\}/g, new Date(journalEntry.entry_date).toLocaleDateString());

    const phoneNumber = formatPhone(await getTreasurerPhone(tenant));
    if (!phoneNumber) {
      console.log('Treasurer phone number not found, skipping SMS');
      return { success: false, message: 'Treasurer phone not found' };
    }

    const smsResponse = await axios.post(settings.api_url, {
      api_key: settings.api_key,
      phone: phoneNumber,
      message: message
    });

    await logSms(message, template.id, journalEntry.id, tenant)
      .catch(e => console.error('Error logging SMS:', e.message));

    return {
      success: true,
      message: 'Journal entry SMS sent successfully',
      sms_response: smsResponse.data
    };
  } catch (error) {
    console.error('Error sending journal entry SMS:', error.message);
    await logSms('Journal entry SMS failed', null, journalEntry.id, tenant, 'failed')
      .catch(e => console.error('Error logging failed SMS:', e.message));
    return { success: false, message: 'Failed to send journal entry SMS' };
  }
}

/**
 * Send SMS notification for financial report generation
 * @param {Object} report - Report object (must carry church_id)
 * @param {string} [churchId] - Church UUID (overrides report.church_id)
 * @returns {Promise<Object>} Result of SMS sending
 */
async function sendFinancialReportSMS(report, churchId) {
  const tenant = resolveChurchId(report, churchId);
  if (!tenant) {
    return { success: false, message: 'Missing church context' };
  }
  try {
    const settings = await getSmsProvider(tenant);
    if (!settings) {
      console.log('SMS provider not configured for church, skipping financial report notification');
      return { success: false, message: 'SMS settings not configured' };
    }

    const template = await getSmsTemplate('Financial Report');
    if (!template) {
      console.log('Financial report template not found, skipping SMS');
      return { success: false, message: 'Template not found' };
    }

    let message = template.content;
    message = message.replace(/\{report_type\}/g, report.type);
    message = message.replace(/\{period\}/g, report.period);
    message = message.replace(/\{date\}/g, new Date().toLocaleDateString());

    // Pastor + Treasurer phones for THIS church only
    const recipientsResult = await pool.query(
      `SELECT DISTINCT u.phone
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE r.name IN ('Pastor', 'Treasurer')
         AND u.church_id = $1
         AND u.phone IS NOT NULL`,
      [tenant]
    );

    if (recipientsResult.rows.length === 0) {
      console.log('No recipients found for financial report notification');
      return { success: false, message: 'No recipients found' };
    }

    const results = [];
    for (const recipient of recipientsResult.rows) {
      const phoneNumber = formatPhone(recipient.phone);
      try {
        const smsResponse = await axios.post(settings.api_url, {
          api_key: settings.api_key,
          phone: phoneNumber,
          message: message
        });
        results.push({ phone: phoneNumber, success: true, response: smsResponse.data });
        await logSms(message, template.id, null, tenant)
          .catch(e => console.error('Error logging SMS:', e.message));
      } catch (error) {
        console.error(`Failed to send SMS to ${phoneNumber}:`, error.message);
        results.push({ phone: phoneNumber, success: false });
      }
    }

    return {
      success: true,
      message: 'Financial report SMS sent to recipients',
      results: results
    };
  } catch (error) {
    console.error('Error sending financial report SMS:', error.message);
    await logSms('Financial report SMS failed', null, null, tenant, 'failed')
      .catch(e => console.error('Error logging failed SMS:', e.message));
    return { success: false, message: 'Failed to send financial report SMS' };
  }
}

module.exports = {
  sendBudgetAlertSMS,
  sendExpenseApprovalSMS,
  sendJournalEntrySMS,
  sendFinancialReportSMS
};
