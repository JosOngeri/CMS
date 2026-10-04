-- 092_church_schema_alignment_pt2.sql
-- Second church-side drift batch, found by scripts/churchSmokeSweep.js.
-- Groups: (A) prod-missing tables dev has, (B) tables missing on BOTH envs
-- that code already references, (C) column adds/backfills. All idempotent.

-- ---------------------------------------------------------------------------
-- A) Tables prod lacks (exist on dev)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS department_settings (
  department_id UUID NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  PRIMARY KEY (department_id, setting_key)
);

CREATE TABLE IF NOT EXISTS settings_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_by UUID,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sms_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  content TEXT,
  version_number INTEGER,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- prod's telegram_auth_methods predates church scoping
ALTER TABLE telegram_auth_methods ADD COLUMN IF NOT EXISTS church_id UUID;

-- prod's photo_tags predates church scoping; assignments table never shipped
ALTER TABLE photo_tags ADD COLUMN IF NOT EXISTS church_id UUID;
CREATE TABLE IF NOT EXISTS photo_tag_assignments (
  photo_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  PRIMARY KEY (photo_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- B) Tables missing on BOTH envs (code references them; never created)
-- ---------------------------------------------------------------------------
-- MpesaService INSERTs/UPDATEs this on every STK push + callback
CREATE TABLE IF NOT EXISTS mpesa_stk_pushes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_request_id VARCHAR(100),
  checkout_request_id VARCHAR(100) UNIQUE,
  phone VARCHAR(30),
  amount NUMERIC(12,2),
  church_id UUID,
  reference VARCHAR(100),
  response_code VARCHAR(10),
  response_description TEXT,
  customer_message TEXT,
  status VARCHAR(30),
  result_code VARCHAR(10),
  result_description TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mpesa_stk_pushes_church ON mpesa_stk_pushes(church_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_stk_pushes_checkout ON mpesa_stk_pushes(checkout_request_id);

-- GatewayRepository: Android SMS gateway device registry
CREATE TABLE IF NOT EXISTS sms_gateways (
  id UUID PRIMARY KEY,
  church_id UUID,
  device_model VARCHAR(100),
  battery_level INTEGER,
  signal_strength INTEGER,
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MobileRepository: Flutter device registry + sync bookkeeping
CREATE TABLE IF NOT EXISTS mobile_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(255) UNIQUE,
  device_name VARCHAR(255),
  platform VARCHAR(50),
  os_version VARCHAR(50),
  user_id UUID,
  church_id UUID,
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mobile_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  church_id UUID,
  sync_type VARCHAR(50),
  status VARCHAR(50),
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- events.routes.js ticketed-registration feature
CREATE TABLE IF NOT EXISTS ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID,
  name VARCHAR(255),
  description TEXT,
  price NUMERIC(12,2) DEFAULT 0,
  max_quantity INTEGER,
  available_from TIMESTAMP,
  available_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID,
  member_id UUID,
  payment_id UUID,
  ticket_type_id UUID,
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  amount_paid NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'confirmed',
  church_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_types_event ON ticket_types(event_id);

-- ---------------------------------------------------------------------------
-- C) Column adds + backfills
-- ---------------------------------------------------------------------------
-- PaletteRepository: color theme palettes (missing on both envs)
CREATE TABLE IF NOT EXISTS color_palettes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100),
  display_name VARCHAR(150),
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  church_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS color_palette_colors (
  palette_id UUID NOT NULL REFERENCES color_palettes(id) ON DELETE CASCADE,
  color_key VARCHAR(50) NOT NULL,
  color_value VARCHAR(30) NOT NULL,
  PRIMARY KEY (palette_id, color_key)
);

-- notification_types gains church scoping (global rows stay church_id NULL)
ALTER TABLE notification_types ADD COLUMN IF NOT EXISTS church_id UUID;

-- mobile_sync_status: per-(user,church,sync_type) upsert target + error text
ALTER TABLE mobile_sync_status ADD COLUMN IF NOT EXISTS error_message TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mobile_sync_status_unique
  ON mobile_sync_status(user_id, church_id, sync_type);

-- prod funds has `balance`; code + dev use `current_balance`
ALTER TABLE funds ADD COLUMN IF NOT EXISTS current_balance NUMERIC(12,2);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'funds' AND column_name = 'balance') THEN
    UPDATE funds SET current_balance = balance WHERE current_balance IS NULL AND balance IS NOT NULL;
  END IF;
END $$;

-- notification/type + treasury category tables predate soft-disable
ALTER TABLE notification_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE income_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- members.department_id — denormalized primary department (mobile delta sync)
ALTER TABLE members ADD COLUMN IF NOT EXISTS department_id UUID;
UPDATE members m
SET department_id = (
  SELECT dm.department_id FROM department_members dm
  WHERE dm.member_id = m.id AND dm.is_active = true
  ORDER BY dm.joined_at ASC NULLS LAST LIMIT 1
)
WHERE m.department_id IS NULL;

-- sms_templates: mobile template sync needs these
ALTER TABLE sms_templates ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE sms_templates ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT false;
ALTER TABLE sms_templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE sms_templates ADD COLUMN IF NOT EXISTS last_used TIMESTAMP;
UPDATE sms_templates SET category = template_type WHERE category IS NULL AND template_type IS NOT NULL;

-- sms_campaigns: mobile campaign tracking cols (scheduled_for already exists)
ALTER TABLE sms_campaigns ADD COLUMN IF NOT EXISTS source VARCHAR(30);
ALTER TABLE sms_campaigns ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0;
ALTER TABLE sms_campaigns ADD COLUMN IF NOT EXISTS sent_recipients INTEGER DEFAULT 0;
ALTER TABLE sms_campaigns ADD COLUMN IF NOT EXISTS failed_recipients INTEGER DEFAULT 0;

-- reconciliation_queue predates the STK callback insert shape
ALTER TABLE reconciliation_queue ADD COLUMN IF NOT EXISTS mpesa_receipt VARCHAR(100);
ALTER TABLE reconciliation_queue ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);
ALTER TABLE reconciliation_queue ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMP;
ALTER TABLE reconciliation_queue ADD COLUMN IF NOT EXISTS merchant_request_id VARCHAR(100);
ALTER TABLE reconciliation_queue ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(100);
ALTER TABLE reconciliation_queue ADD COLUMN IF NOT EXISTS source VARCHAR(50);
