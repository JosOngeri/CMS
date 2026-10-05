-- 094: make settings_audit_log usable — it had zero writers and no tenant
-- column, so a bulk reset (DELETE of church overrides) left no trail.
-- Adds church_id + action; writers land in SettingsRepository.

ALTER TABLE settings_audit_log ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE settings_audit_log ADD COLUMN IF NOT EXISTS action VARCHAR(20) NOT NULL DEFAULT 'update';

CREATE INDEX IF NOT EXISTS idx_settings_audit_log_church
  ON settings_audit_log (church_id, setting_key, changed_at DESC);

-- Sanity: reset 'action' on any pre-existing rows (all were pre-column writes).
UPDATE settings_audit_log SET action = 'update' WHERE action IS NULL;
