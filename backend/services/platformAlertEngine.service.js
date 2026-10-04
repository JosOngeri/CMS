/**
 * platformAlertEngine — evaluates platform_alert_rules on a schedule and
 * writes platform_alerts rows when a metric breaches its threshold (4.6).
 *
 * Each metric is a named count query over the fleet. `%v` in a rule's
 * message is the measured value. `cooldown_minutes` prevents a breached
 * rule from spamming alerts every cycle.
 */
const { pool } = require('../config/database');
const logger = require('../config/logging');
const emailService = require('../utils/emailService');
const telegramService = require('./telegramService');

// Metric name -> query returning a single `value` number.
const METRICS = {
  stuck_payments: `
    SELECT COUNT(*)::int AS value FROM payments
    WHERE status = 'pending' AND created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'`,
  failed_logins_24h: `
    SELECT COALESCE(SUM(failed_login_attempts), 0)::int AS value
    FROM users WHERE last_login > CURRENT_TIMESTAMP - INTERVAL '24 hours'`,
  failed_jobs: `
    SELECT COUNT(*)::int AS value FROM platform_jobs WHERE status = 'failed'`,
  overdue_invoices: `
    SELECT COUNT(*)::int AS value FROM platform_invoices
    WHERE status IN ('open', 'overdue') AND due_date < CURRENT_DATE`,
  low_sms_tenants: `
    SELECT COUNT(*)::int AS value FROM churches
    WHERE is_active = true AND sms_credits IS NOT NULL
      AND sms_credits < COALESCE((SELECT (value#>>'{}')::int FROM platform_settings WHERE key = 'sms_credit_floor'), 50)`,
  quarantined_tenants: `
    SELECT COUNT(*)::int AS value FROM churches WHERE quarantined = true`,
};

const COMPARATORS = {
  '>': (v, t) => v > t,
  '<': (v, t) => v < t,
  '>=': (v, t) => v >= t,
  '<=': (v, t) => v <= t,
  '=': (v, t) => v === t,
};

const measure = async (metric) => {
  const query = METRICS[metric];
  if (!query) return null;
  const result = await pool.query(query);
  return Number(result.rows[0]?.value ?? 0);
};

// -- Delivery (4.6 remainder): a fired alert reaches operators via the
//    channels named on the rule. Delivery failures never break the loop --
//    the console alert row already exists, so nothing is silently lost.
const readSetting = async (key, fallback) => {
  const r = await pool.query('SELECT value FROM platform_settings WHERE key = $1', [key]);
  return r.rows[0]?.value ?? fallback;
};

const emailRecipients = async () => {
  const configured = await readSetting('alert_email_recipients', []);
  if (Array.isArray(configured) && configured.length > 0) return configured;
  const owners = await pool.query(
    "SELECT email FROM platform_users WHERE role = 'platform_owner' AND is_active = true"
  );
  return owners.rows.map((o) => o.email);
};

const deliver = async (rule, alertMessage) => {
  const channels = Array.isArray(rule.notify_channels) ? rule.notify_channels : [];

  if (channels.includes('email')) {
    try {
      const recipients = await emailRecipients();
      for (const to of recipients) {
        await emailService.sendEmail({
          to,
          subject: `[${rule.severity.toUpperCase()}] Platform alert: ${rule.metric}`,
          html: `<p>${alertMessage}</p><p style="color:#888">Rule #${rule.id} — KMain CMS platform console</p>`,
        });
      }
    } catch (error) {
      logger.warn(`alertEngine email delivery failed for rule ${rule.id}: ${error.message}`);
    }
  }

  if (channels.includes('telegram')) {
    try {
      const chatId = await readSetting('alert_telegram_chat_id', '');
      if (chatId) {
        await telegramService.postMessage(chatId, `<b>[${rule.severity.toUpperCase()}]</b> ${alertMessage}`);
      }
    } catch (error) {
      logger.warn(`alertEngine telegram delivery failed for rule ${rule.id}: ${error.message}`);
    }
  }
};

/**
 * Evaluate every enabled rule once. Returns { evaluated, fired } counts —
 * the scheduler logs the result as a platform_jobs row.
 */
const evaluate = async () => {
  const rules = await pool.query('SELECT * FROM platform_alert_rules WHERE enabled = true');
  let fired = 0;

  for (const rule of rules.rows) {
    // Cooldown: skip if this rule fired recently — keeps the alert list
    // actionable instead of a repeating wall of the same alert.
    if (rule.last_fired_at &&
        Date.now() - new Date(rule.last_fired_at).getTime() < rule.cooldown_minutes * 60000) {
      continue;
    }

    let value;
    try {
      value = await measure(rule.metric);
    } catch (error) {
      logger.error(`alertEngine measure(${rule.metric}) failed: ${error.message}`);
      continue;
    }
    if (value === null) continue;

    const breached = COMPARATORS[rule.comparator]?.(value, Number(rule.threshold));
    if (!breached) continue;

    await pool.query(
      `INSERT INTO platform_alerts (alert_type, severity, message, service_affected, status)
       VALUES ($1, $2, $3, $4, 'active')`,
      [`rule:${rule.metric}`, rule.severity, rule.message.replace('%v', String(value)), rule.metric]
    );
    await pool.query(
      'UPDATE platform_alert_rules SET last_fired_at = CURRENT_TIMESTAMP WHERE id = $1',
      [rule.id]
    );
    await deliver(rule, rule.message.replace('%v', String(value)));
    fired += 1;
  }

  return { evaluated: rules.rows.length, fired };
};

module.exports = { evaluate, METRICS };
