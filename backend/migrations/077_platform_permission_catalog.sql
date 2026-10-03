-- 077: Backfill platform_users.permissions to the expanded catalog.
--
-- The permission names now live in backend/constants/platformPermissions.js
-- (single source of truth). Stored rows predate the expanded catalog —
-- platform_admin had only 7 permissions and support_staff 2 — so this
-- migration resets every non-owner row to its role's default list and
-- normalizes the owner wildcard ('all' -> '*'; middleware understands
-- both, but '*' is canonical going forward).
--
-- Idempotent: re-running just rewrites the same deterministic values.
-- Custom permission arrays (if a future feature grants per-user extras)
-- would be overwritten — none exist yet.

-- Owners: canonical wildcard
UPDATE platform_users
SET permissions = '["*"]'::jsonb, updated_at = CURRENT_TIMESTAMP
WHERE role = 'platform_owner'
  AND permissions <> '["*"]'::jsonb;

-- platform_admin: full manage surface EXCEPT owner-only permissions
-- (staff:manage, tenant:impersonate, security:manage, data:export,
--  incidents:manage stay behind the owner wildcard).
UPDATE platform_users
SET permissions = '[
  "platform:read",
  "tenant:read", "tenant:manage", "tenant:administer",
  "staff:read",
  "metrics:read", "health:read", "monitoring:manage",
  "payments:read", "payments:manage",
  "security:read",
  "audit:read",
  "data:read", "data:manage",
  "incidents:read",
  "billing:read", "billing:manage",
  "communication:manage",
  "support:read", "support:manage",
  "flags:manage",
  "settings:read", "settings:manage"
]'::jsonb, updated_at = CURRENT_TIMESTAMP
WHERE role = 'platform_admin';

-- support_staff + legacy 'support' alias: read-only support surface
UPDATE platform_users
SET permissions = '[
  "platform:read",
  "tenant:read",
  "metrics:read", "health:read",
  "support:read"
]'::jsonb, updated_at = CURRENT_TIMESTAMP
WHERE role IN ('support_staff', 'support');
