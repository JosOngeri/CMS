-- 086_payment_archive.sql
-- Soft-delete for payments: records are archived (hidden from the working
-- list, restorable) instead of hard-deleted so financial history is never
-- lost. archived_at = NULL means the row is live.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_payments_archived
  ON payments (church_id) WHERE archived_at IS NOT NULL;

-- Seed: archive stale failed attempts (>90 days) so the archive view is
-- demonstrably populated. Idempotent — only touches un-archived rows.
UPDATE payments
SET archived_at = COALESCE(updated_at, created_at)
WHERE status = 'failed'
  AND created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
  AND archived_at IS NULL;
