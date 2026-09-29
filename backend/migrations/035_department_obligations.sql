-- ============================================================================
-- 035_department_obligations.sql
-- Department-centric finance: budgets → member obligations → collections
-- tracker → M-Pesa/bank SMS reconciliation → AI-calibrated parser profiles.
-- Idempotent — safe to re-run. See docs/plans/department-centric-redesign-plan.md
-- ============================================================================

BEGIN;

-- 1. Budget workflow columns --------------------------------------------------
ALTER TABLE department_budgets
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS purpose TEXT,
  ADD COLUMN IF NOT EXISTS target_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS collection_deadline DATE,
  ADD COLUMN IF NOT EXISTS obligation_type VARCHAR(20) DEFAULT 'voluntary',
  ADD COLUMN IF NOT EXISTS approval_request_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- 2. Member obligations -------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES department_budgets(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  obligation_type VARCHAR(20) NOT NULL DEFAULT 'target',  -- target | voluntary
  paid_amount NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',                 -- pending|partial|fulfilled|waived|cancelled
  due_date DATE,
  allocated_by UUID,
  waived_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_obligation
  ON member_obligations(budget_id, user_id);
CREATE INDEX IF NOT EXISTS idx_member_obligations_user ON member_obligations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_member_obligations_dept ON member_obligations(department_id);
CREATE INDEX IF NOT EXISTS idx_member_obligations_church ON member_obligations(church_id);

-- 3. Link contributions/payments to obligations --------------------------------
ALTER TABLE program_contributions ADD COLUMN IF NOT EXISTS obligation_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS obligation_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS budget_id UUID;
CREATE INDEX IF NOT EXISTS idx_payments_obligation ON payments(obligation_id);

-- 4. M-Pesa / bank SMS reconciliations -----------------------------------------
CREATE TABLE IF NOT EXISTS mpesa_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL,
  department_id UUID,
  subcommittee_id UUID,
  budget_id UUID,
  obligation_id UUID,
  tx_code VARCHAR(20) UNIQUE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  payer_name VARCHAR(200),
  payer_phone VARCHAR(20),
  sms_timestamp TIMESTAMPTZ,
  reconciled_by UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'reconciled',   -- reconciled|unassigned|reversed|remitted
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mpesa_recon_dept ON mpesa_reconciliations(department_id, status);
CREATE INDEX IF NOT EXISTS idx_mpesa_recon_church ON mpesa_reconciliations(church_id);

-- 5. AI-calibrated parser profiles ---------------------------------------------
CREATE TABLE IF NOT EXISTS mpesa_parser_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL,
  department_id UUID,
  subcommittee_id UUID,
  version INT NOT NULL DEFAULT 1,
  ruleset JSONB NOT NULL,
  sample_sms TEXT,
  status VARCHAR(20) DEFAULT 'draft',         -- draft | active | retired
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parser_profiles_scope
  ON mpesa_parser_profiles(church_id, department_id, subcommittee_id, status);

-- 6. audit_log — referenced by helpers/auditLog.js since the leadership work but
--    never created on production (silent 42P01 on every logged mutation)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

-- 7. Role for collectors -------------------------------------------------------
INSERT INTO roles (name, description)
VALUES ('Subcommittee Collector', 'Scoped member allowed to reconcile M-Pesa collections for their subcommittee')
ON CONFLICT (name) DO NOTHING;

COMMIT;
