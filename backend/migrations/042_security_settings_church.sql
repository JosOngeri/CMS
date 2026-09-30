-- Security settings: church scoping + flexible settings payload
-- The original create script made a single global row without church_id;
-- repositories query by church_id, so this adds the column and a JSONB
-- payload column to persist the full settings object the UI manages.

CREATE TABLE IF NOT EXISTS security_settings (
  id SERIAL PRIMARY KEY,
  church_id UUID,
  password_policy JSONB,
  session_timeout INTEGER DEFAULT 60,
  mfa_enabled BOOLEAN DEFAULT false,
  ip_whitelist JSONB,
  ip_blacklist JSONB,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE security_settings ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE security_settings ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS security_settings_church_uidx
  ON security_settings (church_id);
