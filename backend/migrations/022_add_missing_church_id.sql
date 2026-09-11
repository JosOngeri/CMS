-- Add church_id to commonly referenced tables where it is missing
ALTER TABLE IF EXISTS accounts ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE IF EXISTS pledges ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE IF EXISTS budgets ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE IF EXISTS collections ADD COLUMN IF NOT EXISTS church_id UUID;

CREATE INDEX IF NOT EXISTS idx_payments_church_id ON payments(church_id);
CREATE INDEX IF NOT EXISTS idx_pledges_church_id ON pledges(church_id);
CREATE INDEX IF NOT EXISTS idx_budgets_church_id ON budgets(church_id);
CREATE INDEX IF NOT EXISTS idx_collections_church_id ON collections(church_id);
