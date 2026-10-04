-- ============================================================================
-- 088_sweep_schema_alignment.sql
-- Closes schema drift found by the frontend table-population sweep: the code
-- expects tables/columns that several environments never received (local dev
-- DBs are many migrations behind and some objects were never migrated at all).
-- Every statement is idempotent; ASCII-only for WIN1252-encoded databases.
-- ============================================================================

BEGIN;

-- 1. personal_collections: repo reads/writes purpose+fund; table only had
--    'category'. Keep category for back-compat, backfill purpose from it.
ALTER TABLE personal_collections
  ADD COLUMN IF NOT EXISTS purpose TEXT,
  ADD COLUMN IF NOT EXISTS fund VARCHAR(80);

-- The category column only exists on older databases — prod's table was
-- created with purpose+fund directly, so this backfill must be conditional.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'personal_collections' AND column_name = 'category') THEN
    UPDATE personal_collections
    SET purpose = COALESCE(category, 'General collection')
    WHERE purpose IS NULL;
  END IF;
END $$;

UPDATE personal_collections
SET fund = 'General Fund'
WHERE fund IS NULL;

-- 2. Security module tables (SecurityRepository reads all four; nothing wrote
--    them yet, so they were silently missing and every /security/* call 500'd).
CREATE TABLE IF NOT EXISTS security_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   UUID NOT NULL,
  user_id     UUID,
  type        VARCHAR(50) NOT NULL,
  description TEXT,
  severity    VARCHAR(20) NOT NULL DEFAULT 'info',
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  blocked     BOOLEAN NOT NULL DEFAULT false,
  suspicious  BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_logs_church   ON security_logs(church_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_created  ON security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON security_logs(church_id, severity);

CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id  UUID NOT NULL,
  email      VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fla_church_created ON failed_login_attempts(church_id, created_at);

CREATE TABLE IF NOT EXISTS blocked_ips (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id  UUID NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  reason     TEXT,
  blocked_by UUID,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_blocked_ip_per_church UNIQUE (church_id, ip_address)
);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_church ON blocked_ips(church_id);

CREATE TABLE IF NOT EXISTS user_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  church_id    UUID NOT NULL,
  ip_address   VARCHAR(45),
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user   ON user_sessions(user_id, church_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expiry ON user_sessions(expires_at);

-- 3. SMS providers: SMSProviderRepository reads/writes/sorts on priority.
--    Prod never had this table — create it (credentials table, legitimately
--    starts empty; no seed rows make sense for api_key columns).
CREATE TABLE IF NOT EXISTS sms_providers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(120) NOT NULL,
  api_key    VARCHAR(255),
  api_url    VARCHAR(255),
  sender_id  VARCHAR(32),
  balance    NUMERIC(12,2),
  currency   VARCHAR(8) DEFAULT 'KES',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  church_id  UUID REFERENCES churches(id) ON DELETE CASCADE,
  priority   INT NOT NULL DEFAULT 10,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE sms_providers
  ADD COLUMN IF NOT EXISTS priority INT NOT NULL DEFAULT 10;

-- 4. sms_templates: repo filters on church_id + is_active and writes
--    created_by. Existing global rows (church_id IS NULL) are copied to each
--    church so every tenant keeps the shared templates it had before.
ALTER TABLE sms_templates
  ADD COLUMN IF NOT EXISTS church_id  UUID,
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE sms_templates SET is_active = true WHERE is_active IS NULL;

INSERT INTO sms_templates (name, content, template_type, church_id, is_active, created_at)
SELECT t.name, t.content, t.template_type, c.id, true, t.created_at
FROM sms_templates t
CROSS JOIN churches c
WHERE t.church_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM sms_templates x
    WHERE x.church_id = c.id AND x.name = t.name
  );

-- 5. sms_logs: campaign/scheduling/analytics columns the repo expects.
--    Twin columns stay in sync: sent_by is canonical going forward, the
--    legacy sender_id keeps working for per-recipient rows; phone_number
--    mirrors recipient_phone for the same reason.
ALTER TABLE sms_logs
  ADD COLUMN IF NOT EXISTS church_id       UUID,
  ADD COLUMN IF NOT EXISTS campaign_id     UUID,
  ADD COLUMN IF NOT EXISTS sent_by         UUID,
  ADD COLUMN IF NOT EXISTS user_id         UUID,
  ADD COLUMN IF NOT EXISTS recipient_count INT,
  ADD COLUMN IF NOT EXISTS phone_number    VARCHAR(32),
  ADD COLUMN IF NOT EXISTS schedule_date   DATE,
  ADD COLUMN IF NOT EXISTS schedule_time   TIME,
  ADD COLUMN IF NOT EXISTS enable_reply    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS track_links     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_receipt JSONB,
  ADD COLUMN IF NOT EXISTS rate_limit      INT,
  ADD COLUMN IF NOT EXISTS source          VARCHAR(20) NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ;

UPDATE sms_logs SET sent_by         = sender_id       WHERE sent_by IS NULL;
UPDATE sms_logs SET user_id         = sender_id       WHERE user_id IS NULL;
UPDATE sms_logs SET phone_number    = recipient_phone WHERE phone_number IS NULL;
UPDATE sms_logs SET recipient_count = 1               WHERE recipient_count IS NULL;
UPDATE sms_logs sl SET church_id = u.church_id
FROM users u
WHERE u.id = sl.sender_id AND sl.church_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sms_logs_church   ON sms_logs(church_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_campaign ON sms_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_by  ON sms_logs(sent_by);

-- 6. sms_campaigns: SMSRepository.createCampaign/getCampaigns target it.
CREATE TABLE IF NOT EXISTS sms_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID NOT NULL,
  name            VARCHAR(200) NOT NULL,
  template_id     UUID,
  scheduled_for   TIMESTAMPTZ,
  target_audience JSONB,
  status          VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_church ON sms_campaigns(church_id);

-- 7. members: SMSRepository.getOptedOutMembers filters on sms_opt_out.
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS sms_opt_out BOOLEAN NOT NULL DEFAULT false;

-- 8. department_budgets: 035's ALTERs were skipped in some environments
--    (migration recorded as applied before its transaction failed). Re-state
--    them here so /departments/me/obligations can read purpose/deadline.
ALTER TABLE department_budgets
  ADD COLUMN IF NOT EXISTS status              VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS purpose             TEXT,
  ADD COLUMN IF NOT EXISTS target_amount       NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS collection_deadline DATE,
  ADD COLUMN IF NOT EXISTS obligation_type     VARCHAR(20) DEFAULT 'voluntary',
  ADD COLUMN IF NOT EXISTS approval_request_id UUID,
  ADD COLUMN IF NOT EXISTS created_by          UUID;

-- 9. Gallery advanced albums: GalleryAlbumsRepository expects categories,
--    sub-albums, an album<->photo join table, and is_public on albums.
CREATE TABLE IF NOT EXISTS gallery_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id  UUID,
  name       VARCHAR(100) NOT NULL,
  color      VARCHAR(60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gallery_categories_church ON gallery_categories(church_id);

ALTER TABLE gallery_albums
  ADD COLUMN IF NOT EXISTS category_id UUID,
  ADD COLUMN IF NOT EXISTS parent_id   UUID REFERENCES gallery_albums(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_public   BOOLEAN;

-- is_private is the legacy flag; is_public mirrors it inverted.
UPDATE gallery_albums
SET is_public = NOT COALESCE(is_private, false)
WHERE is_public IS NULL;

CREATE TABLE IF NOT EXISTS album_photos (
  album_id   UUID NOT NULL REFERENCES gallery_albums(id) ON DELETE CASCADE,
  photo_id   UUID NOT NULL REFERENCES gallery_photos(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_album_photos PRIMARY KEY (album_id, photo_id)
);
CREATE INDEX IF NOT EXISTS idx_album_photos_photo ON album_photos(photo_id);

-- Legacy rows linked photos to albums via gallery_photos.album_id — mirror
-- those links into the join table so photo_count/ordering stay consistent.
INSERT INTO album_photos (album_id, photo_id, sort_order)
SELECT gp.album_id, gp.id, COALESCE(gp.order_index, 0)
FROM gallery_photos gp
WHERE gp.album_id IS NOT NULL
ON CONFLICT (album_id, photo_id) DO NOTHING;

-- Seed a starter category set per church (idempotent, no placeholders).
INSERT INTO gallery_categories (church_id, name, color)
SELECT c.id, cat.name, cat.color
FROM churches c
CROSS JOIN (VALUES
  ('Sabbath Services', 'var(--color-primary)'),
  ('Church Events',    'var(--color-secondary)'),
  ('Outreach',         'var(--color-accent)'),
  ('Youth Activities', 'var(--color-warning)')
) AS cat(name, color)
WHERE NOT EXISTS (
  SELECT 1 FROM gallery_categories gc
  WHERE gc.church_id = c.id AND gc.name = cat.name
);

-- 10. Analytics reads: sms cost tracking + per-user preferences table.
--     cost stays NULL for providers that do not report per-message pricing;
--     SUM() over NULLs correctly yields NULL -> 0 in the UI.
ALTER TABLE sms_logs
  ADD COLUMN IF NOT EXISTS cost NUMERIC(10,4);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id                     UUID PRIMARY KEY,
  email_notifications         BOOLEAN NOT NULL DEFAULT true,
  sms_notifications           BOOLEAN NOT NULL DEFAULT true,
  announcement_notifications  BOOLEAN NOT NULL DEFAULT true,
  event_notifications         BOOLEAN NOT NULL DEFAULT true,
  department_notifications    BOOLEAN NOT NULL DEFAULT true,
  payment_notifications       BOOLEAN NOT NULL DEFAULT true,
  reminder_notifications      BOOLEAN NOT NULL DEFAULT true,
  profile_visibility          VARCHAR(20) NOT NULL DEFAULT 'members',
  show_email                  BOOLEAN NOT NULL DEFAULT false,
  show_phone                  BOOLEAN NOT NULL DEFAULT false,
  show_departments            BOOLEAN NOT NULL DEFAULT true,
  allow_messages              BOOLEAN NOT NULL DEFAULT true,
  show_activity               BOOLEAN NOT NULL DEFAULT true,
  theme                       VARCHAR(20) NOT NULL DEFAULT 'light',
  language                    VARCHAR(10) NOT NULL DEFAULT 'en',
  timezone                    VARCHAR(50) NOT NULL DEFAULT 'Africa/Nairobi',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Give every existing user a defaults row so the settings page always has a
-- record to read (idempotent).
INSERT INTO user_preferences (user_id)
SELECT u.id FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_preferences p WHERE p.user_id = u.id);

-- 11. Department remittance workflow (collector -> treasurer handover batches)
--     and member_contacts (member detail page LATERAL join).
CREATE TABLE IF NOT EXISTS remittances (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id      UUID NOT NULL,
  department_id  UUID NOT NULL,
  collector_id   UUID NOT NULL,
  treasurer_id   UUID,
  amount         NUMERIC(12,2) NOT NULL,
  item_count     INT NOT NULL DEFAULT 0,
  method         VARCHAR(20) NOT NULL DEFAULT 'cash',
  reference      VARCHAR(100),
  notes          TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending',
  dispute_reason TEXT,
  confirmed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_remittances_dept   ON remittances(department_id, status);
CREATE INDEX IF NOT EXISTS idx_remittances_church ON remittances(church_id);

CREATE TABLE IF NOT EXISTS remittance_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remittance_id     UUID NOT NULL REFERENCES remittances(id) ON DELETE CASCADE,
  reconciliation_id UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_remittance_item UNIQUE (reconciliation_id)
);
CREATE INDEX IF NOT EXISTS idx_remittance_items_rem ON remittance_items(remittance_id);

ALTER TABLE mpesa_reconciliations
  ADD COLUMN IF NOT EXISTS remittance_id UUID;
CREATE INDEX IF NOT EXISTS idx_mpesa_recon_remittance ON mpesa_reconciliations(remittance_id);

-- Member contacts: the member detail view joins this for the phone/email list.
CREATE TABLE IF NOT EXISTS member_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  contact_type  VARCHAR(20) NOT NULL,
  contact_value VARCHAR(200) NOT NULL,
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_member_contacts_member ON member_contacts(member_id);

-- Seed real contact rows from members.phone/email (idempotent).
INSERT INTO member_contacts (member_id, contact_type, contact_value, is_primary)
SELECT m.id, 'phone', m.phone, true
FROM members m
WHERE m.phone IS NOT NULL AND m.phone <> ''
  AND NOT EXISTS (
    SELECT 1 FROM member_contacts c
    WHERE c.member_id = m.id AND c.contact_type = 'phone'
  );

INSERT INTO member_contacts (member_id, contact_type, contact_value, is_primary)
SELECT m.id, 'email', m.email,
       (m.phone IS NULL OR m.phone = '')
FROM members m
WHERE m.email IS NOT NULL AND m.email <> ''
  AND NOT EXISTS (
    SELECT 1 FROM member_contacts c
    WHERE c.member_id = m.id AND c.contact_type = 'email'
  );


-- ============================================================
-- SECTION 12: transactions.category_id type alignment
-- The column was created as INTEGER but joins against
-- income_categories.id / expense_categories.id which are UUID.
-- Every join crashed with "operator does not exist: integer = uuid".
-- No live rows populate category_id, so a plain type change is safe.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'category_id'
      AND data_type <> 'uuid'
  ) THEN
    -- Drop any stale integer values (none expected — verified empty in dev)
    UPDATE transactions SET category_id = NULL
    WHERE category_id IS NOT NULL
      AND category_id::text !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
    ALTER TABLE transactions
      ALTER COLUMN category_id TYPE uuid
      USING category_id::text::uuid;
  END IF;
END $$;


-- ============================================================
-- SECTION 13: Department Head scoped approve permission
-- Product decision: a Department Head may approve budget-type
-- requests for departments they head, and may escalate anything
-- else to First Elder/Pastor. The DB grant is flat
-- approvals.approve; the per-request scope lives in
-- routes/approvals.routes.js (scopeApprovalAction).
-- Some environments applied 038 partially (permissions catalog
-- rows missing) so the approvals rows are re-asserted first.
-- ============================================================

INSERT INTO permissions (name, description, category) VALUES
  ('approvals.view',    'View approval inbox',       'approvals'),
  ('approvals.approve', 'Approve/reject requests',   'approvals')
ON CONFLICT (name) DO NOTHING;

-- Approvers: mirrors migration 038 (Pastor, First Elder, Treasurer)
-- plus Department Head, scoped in code to own-department budgets.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name IN ('Super Admin', 'Pastor', 'First Elder', 'Treasurer',
                 'Department Head')
  AND p.name = 'approvals.approve'
ON CONFLICT (role_id, permission_id) DO NOTHING;


-- ============================================================
-- SECTION 14: write-path column alignment (write sweep)
-- sms_logs.recipient_phone is per-recipient, but batch log rows
-- (recipient_count > 1) have no single phone — they could not
-- insert at all, breaking POST /sms/send.
-- audit_log.record_id was uuid, so writes for int-keyed tables
-- (approval_requests uses serial ids) failed with
-- "invalid input syntax for type uuid" and silently dropped
-- audit rows. TEXT stores both uuid and int ids verbatim.
-- ============================================================

ALTER TABLE sms_logs ALTER COLUMN recipient_phone DROP NOT NULL;

ALTER TABLE audit_log ALTER COLUMN record_id TYPE text USING record_id::text;

COMMIT;
