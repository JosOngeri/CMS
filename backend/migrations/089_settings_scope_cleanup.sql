-- 089_settings_scope_cleanup.sql
-- Locks platform-scope settings against church-level edits and backfills
-- manifest keys that lack a global default row. Idempotent.
--
-- Semantics after this migration:
--   is_editable = false on a church_id IS NULL row  → churches may read it
--     (via /public if is_public) but cannot override it — platform-managed.
--   scope metadata itself lives in backend/constants/settingKeys.js.

BEGIN;

-- ── 1. Global-scope keys: church admins must not override ─────────────
UPDATE settings
SET    is_editable = false
WHERE  church_id IS NULL
  AND  (category, key) IN (
        ('feature-flags', 'FEATURE_SETTINGS_USE_ALTERNATIVE'),
        ('general',       'maintenance_mode'),
        ('payment',       'mpesa_environment'),
        ('payment',       'mpesa_passkey'),
        ('payment',       'mpesa_shortcode'),
        ('sms',           'sms_api_key'),
        ('sms',           'sms_enabled'),
        ('sms',           'sms_provider'),
        ('sms',           'sms_sender_id')
  );

-- ── 2. Kill stray malformed override rows (key 'key'/'value' — write bugs)
DELETE FROM settings WHERE key IN ('key', 'value');

-- ── 3. Seed default_tithe_amount per church without an override so the
--        platform console shows a real override-able value everywhere.
INSERT INTO settings (key, value, value_type, category, label, is_public, is_editable, validation_rules, church_id)
SELECT 'default_tithe_amount', '100', 'number', 'payment',
       'Default Tithe Amount', true, true,
       '{"min":1,"max":100000}'::jsonb, c.id
FROM   churches c
WHERE  NOT EXISTS (
         SELECT 1 FROM settings s
         WHERE  s.key = 'default_tithe_amount' AND s.church_id = c.id
       );

COMMIT;
