-- 078: Platform control-plane schema for the 13 superadmin function areas.
--
-- Adds every table the platform console needs beyond what migration 020
-- created (stats, health, alerts, users, audit_logs). Permission names
-- come from backend/constants/platformPermissions.js.
--
-- Conventions:
--   church_id  -> churches.id  (the tenant)
--   user_id    -> platform_users.id (platform staff actor)
--   All CREATE TABLE guarded with IF NOT EXISTS; seeds are idempotent.

-- -- Church-level control columns ----------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='churches' AND column_name='trial_ends_at') THEN
    ALTER TABLE churches ADD COLUMN trial_ends_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='churches' AND column_name='quarantined') THEN
    ALTER TABLE churches ADD COLUMN quarantined BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='churches' AND column_name='is_demo') THEN
    ALTER TABLE churches ADD COLUMN is_demo BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='churches' AND column_name='onboarding_state') THEN
    ALTER TABLE churches ADD COLUMN onboarding_state JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='churches' AND column_name='member_cap') THEN
    ALTER TABLE churches ADD COLUMN member_cap INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='churches' AND column_name='storage_cap_mb') THEN
    ALTER TABLE churches ADD COLUMN storage_cap_mb INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='churches' AND column_name='sms_credits') THEN
    ALTER TABLE churches ADD COLUMN sms_credits INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='churches' AND column_name='admin_seats') THEN
    ALTER TABLE churches ADD COLUMN admin_seats INTEGER;
  END IF;
END $$;

-- -- F4: Impersonation sessions ------------------------------------------
CREATE TABLE IF NOT EXISTS platform_impersonations (
  id SERIAL PRIMARY KEY,
  platform_user_id INTEGER NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  tenant_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  mode VARCHAR(20) NOT NULL DEFAULT 'readonly' CHECK (mode IN ('readonly', 'full')),
  reason TEXT,
  token_id VARCHAR(64) UNIQUE,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  end_reason VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_impersonations_church ON platform_impersonations(church_id);
CREATE INDEX IF NOT EXISTS idx_impersonations_active ON platform_impersonations(ended_at) WHERE ended_at IS NULL;

-- -- Platform user session revocation (JWT denylist) ---------------------
CREATE TABLE IF NOT EXISTS platform_revoked_tokens (
  id SERIAL PRIMARY KEY,
  token_id VARCHAR(64) NOT NULL,
  platform_user_id INTEGER REFERENCES platform_users(id) ON DELETE CASCADE,
  revoked_by INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  reason VARCHAR(100),
  revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_id ON platform_revoked_tokens(token_id);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_user ON platform_revoked_tokens(platform_user_id);

-- -- Feature flags -------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_feature_flags (
  id SERIAL PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  flag VARCHAR(50) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (church_id, flag)
);

CREATE TABLE IF NOT EXISTS platform_feature_flags (
  id SERIAL PRIMARY KEY,
  flag VARCHAR(50) UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_pct INTEGER DEFAULT 100 CHECK (rollout_pct BETWEEN 0 AND 100),
  description TEXT,
  updated_by INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -- Announcements / incidents / IP rules --------------------------------
CREATE TABLE IF NOT EXISTS platform_announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  target VARCHAR(20) DEFAULT 'all' CHECK (target IN ('all', 'trial', 'active', 'admins')),
  created_by INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_incidents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  summary TEXT,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'monitoring', 'resolved')),
  tenant_id UUID REFERENCES churches(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_platform_incidents_status ON platform_incidents(status);

CREATE TABLE IF NOT EXISTS platform_ip_rules (
  id SERIAL PRIMARY KEY,
  cidr VARCHAR(45) NOT NULL,
  mode VARCHAR(10) NOT NULL CHECK (mode IN ('allow', 'deny')),
  reason TEXT,
  created_by INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (cidr, mode)
);

-- -- Support -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE SET NULL,
  subject VARCHAR(200) NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assignee_id INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  requester_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_church ON support_tickets(church_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_type VARCHAR(20) NOT NULL CHECK (author_type IN ('platform', 'tenant')),
  author_id VARCHAR(64),
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON support_ticket_messages(ticket_id);

CREATE TABLE IF NOT EXISTS platform_known_issues (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'mitigated', 'fixed')),
  affected_tenants INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- -- Billing -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'KES',
  features JSONB DEFAULT '[]',
  member_cap INTEGER,
  sms_credits_monthly INTEGER,
  storage_cap_mb INTEGER,
  admin_seats INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id SERIAL PRIMARY KEY,
  church_id UUID NOT NULL UNIQUE REFERENCES churches(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing', 'active', 'past_due', 'suspended', 'cancelled')),
  billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_ends_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  updated_by INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status);

CREATE TABLE IF NOT EXISTS platform_invoices (
  id SERIAL PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES tenant_subscriptions(id) ON DELETE SET NULL,
  number VARCHAR(40) UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  period_start DATE,
  period_end DATE,
  due_date DATE,
  paid_at TIMESTAMP,
  notes TEXT,
  created_by INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_church ON platform_invoices(church_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_status ON platform_invoices(status);

-- -- Compliance / data ---------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_data_requests (
  id SERIAL PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('export', 'dsar', 'deletion', 'correction')),
  subject_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'fulfilled', 'rejected')),
  requested_by VARCHAR(255),
  notes TEXT,
  handled_by INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fulfilled_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_data_requests_church ON platform_data_requests(church_id);

CREATE TABLE IF NOT EXISTS platform_credential_rotations (
  id SERIAL PRIMARY KEY,
  secret_name VARCHAR(100) UNIQUE NOT NULL,
  owner VARCHAR(100),
  last_rotated_at TIMESTAMP,
  next_due_at TIMESTAMP,
  notes TEXT,
  updated_by INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_backups (
  id SERIAL PRIMARY KEY,
  scope VARCHAR(20) NOT NULL DEFAULT 'full' CHECK (scope IN ('full', 'tenant')),
  church_id UUID REFERENCES churches(id) ON DELETE SET NULL,
  file_path TEXT,
  size_bytes BIGINT,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed', 'verified')),
  initiated_by INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP
);

-- -- Platform jobs (background task tracking) ----------------------------
CREATE TABLE IF NOT EXISTS platform_jobs (
  id SERIAL PRIMARY KEY,
  job_type VARCHAR(60) NOT NULL,
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  payload JSONB DEFAULT '{}',
  error TEXT,
  attempts INTEGER DEFAULT 0,
  run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  finished_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_platform_jobs_status ON platform_jobs(status, run_at);

-- -- Seeds (idempotent) --------------------------------------------------
-- Default subscription plans - real pricing in KES; adjust as the
-- business decides. 'free' is the tier existing churches already use.
INSERT INTO subscription_plans (code, name, price_monthly, price_yearly, currency, features, member_cap, sms_credits_monthly, storage_cap_mb, admin_seats)
VALUES
  ('free',     'Free',     0,     0,     'KES', '["core dashboard","member directory","announcements"]', 200,  0,    256,  2),
  ('standard', 'Standard', 1500,  15000, 'KES', '["free +","treasury","payments (M-Pesa)","reports","SMS (metered)"]', 1000, 100,  1024, 5),
  ('premium',  'Premium',  3500,  35000, 'KES', '["standard +","departments","telegram","documents","approvals","priority support"]', NULL, 500, 5120, NULL)
ON CONFLICT (code) DO NOTHING;

-- Backfill tenant_subscriptions for churches that don't have one yet -
-- trialing maps to trial_ends_at when set, else 'free' plan active for
-- legacy rows so billing screens aren't empty.
INSERT INTO tenant_subscriptions (church_id, plan_id, status, billing_cycle, trial_ends_at, current_period_start)
SELECT c.id,
       (SELECT id FROM subscription_plans WHERE code = 'free'),
       CASE WHEN c.trial_ends_at IS NOT NULL AND c.trial_ends_at > CURRENT_TIMESTAMP
            THEN 'trialing' ELSE 'active' END,
       COALESCE(c.billing_cycle, 'monthly'),
       c.trial_ends_at,
       CURRENT_TIMESTAMP
FROM churches c
WHERE NOT EXISTS (SELECT 1 FROM tenant_subscriptions ts WHERE ts.church_id = c.id);

-- Credential rotation registry seeded with the secrets we know about -
-- the Daraja row records that rotation is REQUIRED (see audit ledger).
INSERT INTO platform_credential_rotations (secret_name, owner, last_rotated_at, next_due_at, notes)
VALUES
  ('PLATFORM_JWT_SECRET', 'platform', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '180 days', 'Platform session signing key'),
  ('JWT_SECRET', 'platform', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '180 days', 'Church user session signing key'),
  ('DARAJA_CONSUMER_KEY', 'safaricom', NULL, CURRENT_TIMESTAMP, 'REQUIRED - credentials were committed to git history; rotate in the Daraja portal'),
  ('DARAJA_CONSUMER_SECRET', 'safaricom', NULL, CURRENT_TIMESTAMP, 'REQUIRED - see DARAJA_CONSUMER_KEY'),
  ('KOPOKOPO_API_KEY', 'kopokopo', NULL, CURRENT_TIMESTAMP + INTERVAL '90 days', 'Payment gateway key')
ON CONFLICT (secret_name) DO NOTHING;
