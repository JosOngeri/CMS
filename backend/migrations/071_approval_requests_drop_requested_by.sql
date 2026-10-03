-- Migration 071: Retire approval_requests.requested_by (L772)
-- requester_id is the canonical requester column. Migration 060 backfilled
-- both directions; new writes since then populate only requester_id. This
-- final backfill covers any stragglers, then the legacy column is removed.

UPDATE approval_requests
SET requester_id = requested_by
WHERE requester_id IS NULL AND requested_by IS NOT NULL;

DROP INDEX IF EXISTS idx_approval_requests_requested_by;

-- Dropping the column also drops any legacy FK/default attached to it.
ALTER TABLE approval_requests DROP COLUMN IF EXISTS requested_by;

-- Enforce referential integrity on the canonical column. NOT VALID so any
-- pre-existing orphan requester ids (rows written before the column was
-- constrained, e.g. pointing at since-deleted users) don't abort the
-- migration; every new INSERT/UPDATE is still enforced. VALIDATE can be run
-- later once the data is known clean.
ALTER TABLE approval_requests DROP CONSTRAINT IF EXISTS fk_approval_requests_requester;
ALTER TABLE approval_requests
  ADD CONSTRAINT fk_approval_requests_requester
  FOREIGN KEY (requester_id) REFERENCES users(id)
  ON DELETE SET NULL
  NOT VALID;
