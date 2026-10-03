-- Migration 075: platform_settings key/value table
--
-- Platform-level configuration (SaaS-wide, not church-scoped) editable from the
-- superadmin dashboard. tier_pricing drives the MRR estimate on
-- /api/platform/stats and the analytics page; support_email and platform_name
-- are displayed to tenants on their billing/support surfaces.

CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Idempotent seeds — ON CONFLICT preserves operator-edited values on re-runs.
INSERT INTO platform_settings (key, value, description) VALUES
  ('platform_name', '"KMain CMS"', 'Display name of the SaaS platform'),
  ('support_email', '"support@kmaincms.org"', 'Support contact shown to church admins'),
  ('tier_pricing', '{"free": 0, "basic": 1500, "professional": 3500, "enterprise": 7500}', 'Monthly subscription price per tier (KES) — used for the MRR estimate'),
  ('trial_days', '30', 'Default trial length in days for newly onboarded churches')
ON CONFLICT (key) DO NOTHING;

-- platform_audit_logs.resource_id was INTEGER (migration 020), but tenant
-- mutations log church UUIDs — every tenant create/suspend/activate threw
-- "invalid input syntax for type integer" AFTER the change already applied.
-- Widen to VARCHAR so both int and uuid resource ids fit.
ALTER TABLE platform_audit_logs
  ALTER COLUMN resource_id TYPE VARCHAR(100) USING resource_id::VARCHAR;
