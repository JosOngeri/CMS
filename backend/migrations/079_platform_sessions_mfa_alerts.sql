-- 079: platform sessions + MFA + alert rules + dunning/maintenance settings.
--
-- Completes the must-have operational layer: revocable platform sessions
-- (3.3), TOTP MFA columns (3.4), the alert-rules engine table (4.6),
-- 'overdue' as a first-class invoice status for dunning (9.5), and the
-- settings keys the maintenance-mode middleware + schedulers read.

-- -- Platform sessions - one row per issued JWT, revocable by jti --------
CREATE TABLE IF NOT EXISTS platform_sessions (
  id SERIAL PRIMARY KEY,
  platform_user_id INTEGER NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  token_jti VARCHAR(64) NOT NULL UNIQUE,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  revoked_by INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  revoke_reason VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_user ON platform_sessions(platform_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_active ON platform_sessions(revoked_at) WHERE revoked_at IS NULL;

-- -- MFA on platform accounts (3.4) --------------------------------------
ALTER TABLE platform_users
  ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(64),
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN DEFAULT false;

-- -- Alert rules (4.6) - the engine evaluates these on a schedule --------
CREATE TABLE IF NOT EXISTS platform_alert_rules (
  id SERIAL PRIMARY KEY,
  metric VARCHAR(50) NOT NULL,
  comparator VARCHAR(2) NOT NULL CHECK (comparator IN ('>', '<', '>=', '<=', '=')),
  threshold NUMERIC NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  cooldown_minutes INTEGER NOT NULL DEFAULT 60,
  last_fired_at TIMESTAMP,
  created_by INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -- Invoices: 'overdue' is a real status once dunning runs (9.5) --------
ALTER TABLE platform_invoices DROP CONSTRAINT IF EXISTS platform_invoices_status_check;
ALTER TABLE platform_invoices
  ADD CONSTRAINT platform_invoices_status_check
  CHECK (status IN ('draft', 'open', 'overdue', 'paid', 'void', 'uncollectible'));
ALTER TABLE platform_invoices
  ADD COLUMN IF NOT EXISTS dunning_reminded_at TIMESTAMP;

-- -- Settings the new middleware/services read ---------------------------
INSERT INTO platform_settings (key, value, description) VALUES
  ('maintenance_mode', '{"enabled": false, "message": "Scheduled maintenance in progress - please try again shortly.", "ends_at": null}', '13.6: enabled=true 503s every tenant API call; platform console stays up'),
  ('dunning_grace_days', '14', '9.5: days an invoice may be overdue before the tenant is auto-suspended'),
  ('backup_keep', '14', '7.1: number of most-recent pg_dump backups to retain'),
  ('sms_credit_floor', '50', '4.6: alert when a tenant''s sms_credits drop below this')
ON CONFLICT (key) DO NOTHING;

-- -- Default alert rules (idempotent - keyed on metric) ------------------
INSERT INTO platform_alert_rules (metric, comparator, threshold, severity, message, cooldown_minutes)
SELECT * FROM (VALUES
  ('stuck_payments',    '>', 0::numeric,  'high',   '%v payment(s) stuck pending over 24h across tenants', 120),
  ('failed_logins_24h', '>', 50::numeric, 'medium', '%v failed church logins in the last 24h - possible brute force', 60),
  ('failed_jobs',       '>', 0::numeric,  'medium', '%v platform job(s) in failed state', 120),
  ('overdue_invoices',  '>', 0::numeric,  'medium', '%v invoice(s) past due date', 360),
  ('low_sms_tenants',   '>', 0::numeric,  'low',    '%v tenant(s) below the SMS credit floor', 720)
) AS seed(metric, comparator, threshold, severity, message, cooldown_minutes)
WHERE NOT EXISTS (SELECT 1 FROM platform_alert_rules);
