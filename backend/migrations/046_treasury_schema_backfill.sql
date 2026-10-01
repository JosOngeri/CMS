-- 046_treasury_schema_backfill.sql
-- Migration 045 used CREATE TABLE IF NOT EXISTS, so tables that already
-- existed in production (funds, journal_entries, journal_entry_lines,
-- chart_of_accounts, fixed_assets) never received church_id or the columns
-- the module repositories select/insert. This migration adds them.

-- Tenant scoping columns
ALTER TABLE funds               ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE journal_entries     ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE chart_of_accounts   ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE fixed_assets        ADD COLUMN IF NOT EXISTS church_id UUID;

-- Columns the module repositories write/read but older schemas lack
ALTER TABLE funds            ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE funds            ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE funds            ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE funds            ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE funds            ADD COLUMN IF NOT EXISTS target_amount NUMERIC(15,2);

ALTER TABLE journal_entries  ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
ALTER TABLE journal_entries  ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE journal_entries  ADD COLUMN IF NOT EXISTS total_debits NUMERIC(15,2) DEFAULT 0;
ALTER TABLE journal_entries  ADD COLUMN IF NOT EXISTS total_credits NUMERIC(15,2) DEFAULT 0;
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS line_number INTEGER;

ALTER TABLE fixed_assets     ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE fixed_assets     ADD COLUMN IF NOT EXISTS fund_id UUID;
ALTER TABLE fixed_assets     ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE fixed_assets     ADD COLUMN IF NOT EXISTS vendor_id UUID;
ALTER TABLE fixed_assets     ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE payments         ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);

-- contributions: referenced by fund balances and contribution workflows
CREATE TABLE IF NOT EXISTS contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  member_id UUID,
  payment_id UUID,
  fund_id UUID,
  project_id UUID,
  campaign_id UUID,
  amount NUMERIC(15,2) NOT NULL,
  contribution_date DATE DEFAULT CURRENT_DATE,
  contribution_type VARCHAR(50),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contributions_church ON contributions(church_id);
CREATE INDEX IF NOT EXISTS idx_contributions_fund ON contributions(fund_id);

-- Backfill: attribute pre-existing rows to their creator's church,
-- falling back to the primary church (Kiserian Main SDA)
DO $$
DECLARE
  fallback_church UUID;
BEGIN
  SELECT COALESCE(
    (SELECT id FROM churches WHERE name ILIKE 'Kiserian Main%' LIMIT 1),
    (SELECT id FROM churches ORDER BY created_at NULLS LAST LIMIT 1)
  ) INTO fallback_church;

  UPDATE journal_entries je SET church_id = COALESCE(
    (SELECT u.church_id FROM users u WHERE u.id = je.created_by),
    fallback_church
  ) WHERE je.church_id IS NULL;

  UPDATE journal_entry_lines jel SET church_id = je.church_id
    FROM journal_entries je
    WHERE jel.journal_entry_id = je.id AND jel.church_id IS NULL;

  UPDATE journal_entry_lines SET church_id = fallback_church WHERE church_id IS NULL;
  UPDATE funds             SET church_id = fallback_church WHERE church_id IS NULL;
  UPDATE chart_of_accounts SET church_id = fallback_church WHERE church_id IS NULL;

  UPDATE fixed_assets fa SET church_id = COALESCE(
    (SELECT u.church_id FROM users u WHERE u.id = fa.created_by),
    fallback_church
  ) WHERE fa.church_id IS NULL;
END $$;
