-- Migration 037: Remittance ledger
-- Collectors gather funds via mpesa_reconciliations; a remittance records
-- the batch handover of those funds to the church account and the
-- treasurer's confirmation. Closes the cash-trail gap between
-- "reconciled" and "money in the church account".

CREATE TABLE IF NOT EXISTS remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL,
  department_id UUID,
  collector_id UUID NOT NULL,
  treasurer_id UUID,                       -- who confirmed receipt
  amount NUMERIC(12,2) NOT NULL,           -- declared batch total
  item_count INT NOT NULL DEFAULT 0,
  method VARCHAR(20) NOT NULL DEFAULT 'cash',  -- cash|bank|mpesa
  reference VARCHAR(100),                  -- bank slip no. / mpesa tx code
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending|confirmed|disputed
  notes TEXT,
  dispute_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS remittance_items (
  remittance_id UUID NOT NULL REFERENCES remittances(id) ON DELETE CASCADE,
  reconciliation_id UUID NOT NULL REFERENCES mpesa_reconciliations(id),
  PRIMARY KEY (remittance_id, reconciliation_id)
);

ALTER TABLE mpesa_reconciliations
  ADD COLUMN IF NOT EXISTS remittance_id UUID REFERENCES remittances(id);

CREATE INDEX IF NOT EXISTS idx_remittances_church_status ON remittances(church_id, status);
CREATE INDEX IF NOT EXISTS idx_remittances_dept_status ON remittances(department_id, status);
CREATE INDEX IF NOT EXISTS idx_remittances_collector ON remittances(collector_id, status);
CREATE INDEX IF NOT EXISTS idx_mpesa_recon_remittance ON mpesa_reconciliations(remittance_id);
