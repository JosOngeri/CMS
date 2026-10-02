-- Migration 056: enable per-church settings overrides.
-- The settings table previously had UNIQUE(key) globally, so a church could
-- never hold its own copy of a key and every write rewrote the single global
-- row. ON CONFLICT (key, church_id) in the repo also referenced a constraint
-- that never existed, making importSetting 500 on every call.
--
-- Model after this migration:
--   church_id IS NULL  -> global default row (unique per key)
--   church_id = <uuid> -> church-specific override (unique per key+church)
-- Idempotent: drops the old constraint only if present, creates indexes only
-- if missing.

BEGIN;

ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_key;

-- One global row per key.
CREATE UNIQUE INDEX IF NOT EXISTS settings_key_global_uq
  ON settings (key) WHERE church_id IS NULL;

-- One override row per key per church.
CREATE UNIQUE INDEX IF NOT EXISTS settings_key_church_uq
  ON settings (key, church_id) WHERE church_id IS NOT NULL;

COMMIT;
