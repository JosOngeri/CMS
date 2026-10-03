-- Migration 057: Tenant scope on audit_log
-- helpers/auditLog.js now writes church_id so audit queries can be filtered
-- per tenant; auditService.log already passed church_id but the table lacked
-- the column until now.
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS church_id UUID;

-- Backfill from the acting user's church where possible
UPDATE audit_log a
SET church_id = u.church_id
FROM users u
WHERE a.user_id = u.id AND a.church_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_church ON audit_log(church_id);
