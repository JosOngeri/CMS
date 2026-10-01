const { pool } = require('../config/database');
const axios = require('axios');

/**
 * Treasury SMS Integration Helper
 * Handles SMS notifications for treasury events
 */

/**
 * Send SMS notification for budget alert
 * @param {Object} budgetAlert - Budget alert object
 * @returns {Promise<Object>} Result of SMS sending
 */
async function sendBudgetAlertSMS(budgetAlert) {
  try {
    // Get SMS settings
    const settingsResult = await pool.query(
      'SELECT * FROM sms_settings WHERE is_active = true LIMIT 1'
    );

    if (settingsResult.rows.length === 0) {
      console.log('SMS settings not configured, skipping budget alert notification');
      return { success: false, message: 'SMS settings not configured' };
    }

    const settings = settingsResult.rows[0];

    // Get budget alert template
    const templateResult = await pool.query(
      "SELECT * FROM sms_templates WHERE name = 'Budget Alert' AND is_active = true LIMIT 1"
    );

    if (templateResult.rows.length === 0) {
      console.log('Budget alert template not found, skipping SMS');
      return { success: false, message: 'Template not found' };
    }

    const template = templateResult.rows[0];

    // Replace variables in template (use regex for global replacement)
    let message = template.content;
    message = message.replace(/\{budget_name\}/g, budgetAlert.budget_name);
    message = message.replace(/\{category\}/g, budgetAlert.category_name);
    message = message.replace(/\{budgeted\}/g, budgetAlert.budgeted);
    message = message.replace(/\{spent\}/g, budgetAlert.spent);
    message = message.replace(/\{remaining\}/g, budgetAlert.remaining);

    // Get treasurer phone number
    const treasurerResult = await pool.query(
      `SELECT u.phone 
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE r.name = 'Treasurer'
       LIMIT 1`
    );

    if (treasurerResult.rows.length === 0 || !treasurerResult.rows[0].phone) {
      console.log('Treasurer phone number not found, skipping SMS');
      return { success: false, message: 'Treasurer phone not found' };
    }

    let phoneNumber = treasurerResult.rows[0].phone;

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
       VALUES (1, 1, $1, 'sent', $2, 'treasury', $3)`,
      [message, template.id, budgetAlert.budget_id]
    );

    return {
      success: true,
      message: 'Budget alert SMS sent successfully',
      sms_response: smsResponse.data
    };

  } catch (error) {
    console.error('Error sending budget alert SMS:', error);
    
    // Log failed attempt
    await pool.query(
      `INSERT INTO sms_logs (sender_id, recipients, message, status, related_module, related_id)
       VALUES (1, 1, 'Budget alert SMS failed', 'failed', 'treasury', $1)`,
      [budgetAlert.budget_id]
    ).catch(logError => console.error('Error logging failed SMS:', logError));

    return {
      success: false,
      message: 'Failed to send budget alert SMS',
      error: error.message
    };
  }
}

/**
 * Send SMS notification for expense approval
 * @param {Object} expense - Expense object
 * @param {string} status - Approval status
 * @returns {Promise<Object>} Result of SMS sending
 */
async function sendExpenseApprovalSMS(expense, status) {
  try {
    // Get SMS settings
    const settingsResult = await pool.query(
      'SELECT * FROM sms_settings WHERE is_active = true LIMIT 1'
    );

    if (settingsResult.rows.length === 0) {
      console.log('SMS settings not configured, skipping expense approval notification');
      return { success: false, message: 'SMS settings not configured' };
    }

    const settings = settingsResult.rows[0];

    // Get template based on status
    const templateName = status === 'approved' ? 'Expense Approved' : 'Expense Rejected';
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
    message = message.replace(/\{amount\}/g, expense.amount);
    message = message.replace(/\{category\}/g, expense.category_name);
    message = message.replace(/\{status\}/g, status);
    message = message.replace(/\{date\}/g, new Date(expense.transaction_date).toLocaleDateString());

    // Get submitter phone number
    let phoneNumber = expense.phone;
    if (expense.recorded_by) {
      const userResult = await pool.query(
        'SELECT phone FROM users WHERE id = $1',
        [expense.recorded_by]
      );
      if (userResult.rows.length > 0 && userResult.rows[0].phone) {
        phoneNumber = userResult.rows[0].phone;
      }
    }

    if (!phoneNumber) {
      console.log('No phone number available for expense approval notification');
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
       VALUES (1, 1, $1, 'sent', $2, 'treasury', $3)`,
      [message, template.id, expense.id]
    );

    return {
      success: true,
      message: 'Expense approval SMS sent successfully',
      sms_response: smsResponse.data
    };

  } catch (error) {
    console.error('Error sending expense approval SMS:', error);
    
    // Log failed attempt
    await pool.query(
      `INSERT INTO sms_logs (sender_id, recipients, message, status, related_module, related_id)
       VALUES (1, 1, 'Expense approval SMS failed', 'failed', 'treasury', $1)`,
      [expense.id]
    ).catch(logError => console.error('Error logging failed SMS:', logError));

    return {
      success: false,
      message: 'Failed to send expense approval SMS',
      error: error.message
    };
  }
}

/**
 * Send SMS notification for journal entry posting
 * @param {Object} journalEntry - Journal entry object
 * @returns {Promise<Object>} Result of SMS sending
 */
async function sendJournalEntrySMS(journalEntry) {
  try {
    // Get SMS settings
    const settingsResult = await pool.query(
      'SELECT * FROM sms_settings WHERE is_active = true LIMIT 1'
    );

    if (settingsResult.rows.length === 0) {
      console.log('SMS settings not configured, skipping journal entry notification');
      return { success: false, message: 'SMS settings not configured' };
    }

    const settings = settingsResult.rows[0];

    // Get journal entry template
    const templateResult = await pool.query(
      "SELECT * FROM sms_templates WHERE name = 'Journal Entry Posted' AND is_active = true LIMIT 1"
    );

    if (templateResult.rows.length === 0) {
      console.log('Journal entry template not found, skipping SMS');
      return { success: false, message: 'Template not found' };
    }

    const template = templateResult.rows[0];

    // Replace variables in template (use regex for global replacement)
    let message = template.content;
    message = message.replace(/\{entry_number\}/g, journalEntry.entry_number);
    message = message.replace(/\{description\}/g, journalEntry.description);
    message = message.replace(/\{date\}/g, new Date(journalEntry.entry_date).toLocaleDateString());

    // Get treasurer phone number
    const treasurerResult = await pool.query(
      `SELECT u.phone 
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE r.name = 'Treasurer'
       LIMIT 1`
    );

    if (treasurerResult.rows.length === 0 || !treasurerResult.rows[0].phone) {
      console.log('Treasurer phone number not found, skipping SMS');
      return { success: false, message: 'Treasurer phone not found' };
    }

    let phoneNumber = treasurerResult.rows[0].phone;

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
       VALUES (1, 1, $1, 'sent', $2, 'treasury', $3)`,
      [message, template.id, journalEntry.id]
    );

    return {
      success: true,
      message: 'Journal entry SMS sent successfully',
      sms_response: smsResponse.data
    };

  } catch (error) {
    console.error('Error sending journal entry SMS:', error);
    
    // Log failed attempt
    await pool.query(
      `INSERT INTO sms_logs (sender_id, recipients, message, status, related_module, related_id)
       VALUES (1, 1, 'Journal entry SMS failed', 'failed', 'treasury', $1)`,
      [journalEntry.id]
    ).catch(logError => console.error('Error logging failed SMS:', logError));

    return {
      success: false,
      message: 'Failed to send journal entry SMS',
      error: error.message
    };
  }
}

/**
 * Send SMS notification for financial report generation
 * @param {Object} report - Report object
 * @returns {Promise<Object>} Result of SMS sending
 */
async function sendFinancialReportSMS(report) {
  try {
    // Get SMS settings
    const settingsResult = await pool.query(
      'SELECT * FROM sms_settings WHERE is_active = true LIMIT 1'
    );

    if (settingsResult.rows.length === 0) {
      console.log('SMS settings not configured, skipping financial report notification');
      return { success: false, message: 'SMS settings not configured' };
    }

    const settings = settingsResult.rows[0];

    // Get financial report template
    const templateResult = await pool.query(
      "SELECT * FROM sms_templates WHERE name = 'Financial Report' AND is_active = true LIMIT 1"
    );

    if (templateResult.rows.length === 0) {
      console.log('Financial report template not found, skipping SMS');
      return { success: false, message: 'Template not found' };
    }

    const template = templateResult.rows[0];

    // Replace variables in template (use regex for global replacement)
    let message = template.content;
    message = message.replace(/\{report_type\}/g, report.type);
    message = message.replace(/\{period\}/g, report.period);
    message = message.replace(/\{date\}/g, new Date().toLocaleDateString());

    // Get pastor and treasurer phone numbers
    const recipientsResult = await pool.query(
      `SELECT DISTINCT u.phone 
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE r.name IN ('Pastor', 'Treasurer')
       AND u.phone IS NOT NULL`
    );

    if (recipientsResult.rows.length === 0) {
      console.log('No recipients found for financial report notification');
      return { success: false, message: 'No recipients found' };
    }

    const results = [];
    for (const recipient of recipientsResult.rows) {
      let phoneNumber = recipient.phone;

      // Format phone number
      if (!phoneNumber.startsWith('254')) {
        if (phoneNumber.startsWith('0')) {
          phoneNumber = '254' + phoneNumber.substring(1);
        } else if (phoneNumber.startsWith('7')) {
          phoneNumber = '254' + phoneNumber;
        }
      }

      try {
        // Send SMS via BlessedTexts API
        const smsResponse = await axios.post(settings.api_url, {
          api_key: settings.api_key,
          phone: phoneNumber,
          message: message
        });

        results.push({ phone: phoneNumber, success: true, response: smsResponse.data });

        // Log the SMS
        await pool.query(
          `INSERT INTO sms_logs (sender_id, recipients, message, status, template_id, related_module)
           VALUES (1, 1, $1, 'sent', $2, 'treasury')`,
          [message, template.id]
        );

      } catch (error) {
        console.error(`Failed to send SMS to ${phoneNumber}:`, error);
        results.push({ phone: phoneNumber, success: false, error: error.message });
      }
    }

    return {
      success: true,
      message: 'Financial report SMS sent to recipients',
      results: results
    };

  } catch (error) {
    console.error('Error sending financial report SMS:', error);
    
    // Log failed attempt
    await pool.query(
      `INSERT INTO sms_logs (sender_id, recipients, message, status, related_module)
       VALUES (1, 1, 'Financial report SMS failed', 'failed', 'treasury')`
    ).catch(logError => console.error('Error logging failed SMS:', logError));

    return {
      success: false,
      message: 'Failed to send financial report SMS',
      error: error.message
    };
  }
}

module.exports = {
  sendBudgetAlertSMS,
  sendExpenseApprovalSMS,
  sendJournalEntrySMS,
  sendFinancialReportSMS
};
