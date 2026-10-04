/**
 * platformDunning — the overdue-invoice lifecycle (9.5):
 *
 *   open invoice past due_date        -> status 'overdue' + reminder email
 *   overdue beyond grace period       -> church suspended (is_active=false)
 *                                        + alert + audit entry
 *   tenant_subscriptions              -> 'past_due' alongside
 *
 * Runs from the platform scheduler (daily) and the manual
 * POST /billing/dunning/run endpoint. Reminder emails go through the
 * shared emailService; a 3-day throttle on dunning_reminded_at prevents
 * re-mail spam every cycle.
 */
const { pool } = require('../config/database');
const logger = require('../config/logging');
const emailService = require('../utils/emailService');

const REMINDER_THROTTLE_DAYS = 3;

const getGraceDays = async () => {
  const r = await pool.query('SELECT value FROM platform_settings WHERE key = $1', ['dunning_grace_days']);
  return Number(r.rows[0]?.value ?? 14) || 14;
};

const sendReminder = async (invoice) => {
  const to = invoice.contact_email;
  if (!to) return false;
  try {
    await emailService.sendEmail({
      to,
      subject: `Payment reminder — invoice ${invoice.number || invoice.id} is overdue`,
      html: `<p>Hello ${invoice.church_name || ''},</p>
<p>Your subscription invoice <strong>${invoice.number || `#${invoice.id}`}</strong> for
<strong>${invoice.currency} ${Number(invoice.amount).toLocaleString()}</strong> was due on
<strong>${invoice.due_date}</strong> and is now overdue.</p>
<p>Please settle it to avoid interruption of service.</p>`
    });
    return true;
  } catch (error) {
    logger.warn(`Dunning email to ${to} failed: ${error.message}`);
    return false;
  }
};

/**
 * One dunning pass. Returns a summary { markedOverdue, reminded, suspended }.
 */
const run = async () => {
  const graceDays = await getGraceDays();
  const summary = { markedOverdue: 0, reminded: 0, suspended: 0 };

  // 1) open -> overdue, carrying church contact info for the reminder.
  const nowOverdue = await pool.query(
    `UPDATE platform_invoices i
     SET status = 'overdue'
     FROM churches c
     WHERE i.church_id = c.id AND i.status = 'open' AND i.due_date < CURRENT_DATE
     RETURNING i.id, i.number, i.amount, i.currency, i.due_date, i.church_id,
             c.name AS church_name, c.settings->>'contact_email' AS contact_email`
  );
  summary.markedOverdue = nowOverdue.rows.length;
  for (const inv of nowOverdue.rows) {
    if (await sendReminder(inv)) summary.reminded += 1;
    await pool.query(
      'UPDATE platform_invoices SET dunning_reminded_at = CURRENT_TIMESTAMP WHERE id = $1',
      [inv.id]
    );
    await pool.query(
      `UPDATE tenant_subscriptions SET status = 'past_due', updated_at = CURRENT_TIMESTAMP
       WHERE church_id = $1 AND status IN ('trialing', 'active')`,
      [inv.church_id]
    );
  }

  // 2) already-overdue invoices — periodic reminder while unthrottled.
  const remindable = await pool.query(
    `SELECT i.id, i.number, i.amount, i.currency, i.due_date, i.church_id,
            c.name AS church_name, c.settings->>'contact_email' AS contact_email
     FROM platform_invoices i
     JOIN churches c ON c.id = i.church_id
     WHERE i.status = 'overdue'
       AND (i.dunning_reminded_at IS NULL OR i.dunning_reminded_at < CURRENT_TIMESTAMP - INTERVAL '${REMINDER_THROTTLE_DAYS} days')`
  );
  for (const inv of remindable.rows) {
    if (await sendReminder(inv)) summary.reminded += 1;
    await pool.query(
      'UPDATE platform_invoices SET dunning_reminded_at = CURRENT_TIMESTAMP WHERE id = $1',
      [inv.id]
    );
  }

  // 3) past grace -> suspend the tenant, alert the console, audit it.
  const pastGrace = await pool.query(
    `SELECT DISTINCT i.church_id, c.name AS church_name
     FROM platform_invoices i
     JOIN churches c ON c.id = i.church_id
     WHERE i.status = 'overdue'
       AND i.due_date < CURRENT_DATE - ($1 || ' days')::interval
       AND c.is_active = true`,
    [graceDays]
  );
  for (const church of pastGrace.rows) {
    await pool.query(
      'UPDATE churches SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [church.church_id]
    );
    await pool.query(
      `INSERT INTO platform_alerts (alert_type, severity, message, service_affected, status)
       VALUES ('dunning_suspend', 'high', $1, 'billing', 'active')`,
      [`Church "${church.church_name}" auto-suspended — invoice overdue beyond ${graceDays}-day grace`]
    );
    await pool.query(
      `INSERT INTO platform_audit_logs (user_id, action, resource_type, resource_id, details)
       VALUES (NULL, 'billing.tenant_auto_suspended', 'church', $1, $2)`,
      [church.church_id, JSON.stringify({ church_name: church.church_name, grace_days: graceDays, actor: 'dunning-scheduler' })]
    );
    summary.suspended += 1;
  }

  return summary;
};

module.exports = { run };
