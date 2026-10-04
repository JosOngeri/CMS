-- 087_payment_items.sql
-- Itemized category breakdown per payment (tithe 200 + pathfinder 100 = 300).
-- Until now payment_items from the member giving form was summed into
-- `amount` and the names flattened into `category` — the split was lost.
-- Stored as JSONB: [{ "category_name": "tithe", "amount": 200 }, ...]

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_items JSONB;

-- Backfill: legacy rows have no per-item amounts, so each gets a single
-- item carrying its category label and full amount — the quickview then
-- shows an honest "category — total" line instead of a fabricated split.
UPDATE payments
SET payment_items = jsonb_build_array(
  jsonb_build_object(
    'category_name', COALESCE(NULLIF(category, ''), payment_type, 'general'),
    'amount', amount
  )
)
WHERE payment_items IS NULL;
