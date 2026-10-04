-- ============================================================================
-- 090_prod_schema_alignment.sql — objects the prod DB never had
--
-- Found via a prod smoke sweep: several platform endpoints 500 on prod while
-- returning 200 on dev because the prod schema predates these objects.
-- Everything here is IF NOT EXISTS / IF EXISTS — safe to re-run on dev.
-- ============================================================================

BEGIN;

-- 1. users.deleted_at — the codebase-wide soft-delete convention. Prod's
--    users table never got the column, so every `deleted_at IS NULL` filter
--    errored (getFleet, getSecurityCenter, getGrowthMetrics, getUsageReport,
--    getTenantUsers).
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at
  ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- 2. refunds — written by payment.controller refund flow and read by the
--    platform Payments > Refunds oversight tab. Prod never had the table.
CREATE TABLE IF NOT EXISTS refunds (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id   UUID REFERENCES payments(id) ON DELETE SET NULL,
  amount       NUMERIC(12,2) NOT NULL,
  reason       TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',
  initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  church_id    UUID REFERENCES churches(id) ON DELETE CASCADE,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refunds_church_status ON refunds(church_id, status);
CREATE INDEX IF NOT EXISTS idx_refunds_payment       ON refunds(payment_id);

COMMIT;
