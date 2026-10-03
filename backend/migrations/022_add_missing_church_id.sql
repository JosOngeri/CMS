-- Add church_id to commonly referenced tables where it is missing
ALTER TABLE IF EXISTS accounts ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE IF EXISTS pledges ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE IF EXISTS budgets ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE IF EXISTS collections ADD COLUMN IF NOT EXISTS church_id UUID;

-- Some of these tables (pledges, budgets, collections) are only created by
-- later migrations (041). CREATE INDEX has no IF EXISTS for the target
-- table, so guard each with to_regclass — 041 adds its own indexes anyway.
DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_payments_church_id ON payments(church_id);
  END IF;
  IF to_regclass('public.pledges') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_pledges_church_id ON pledges(church_id);
  END IF;
  IF to_regclass('public.budgets') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_budgets_church_id ON budgets(church_id);
  END IF;
  IF to_regclass('public.collections') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_collections_church_id ON collections(church_id);
  END IF;
END $$;
