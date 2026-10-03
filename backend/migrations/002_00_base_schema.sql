-- 002_00: Base application schema.
-- The core tables (users, roles, departments, announcements, payments,
-- sms_*, events) were only ever created by legacy `database/schema.sql` +
-- `database/001_auth_schema.sql`, which the canonical runner never applies.
-- Fresh builds therefore died on the first FK reference to users/departments.
-- Ports the union of both legacy definitions; later migrations (010, 021,
-- 022, 029, 039, 043, 058...) add the newer columns via guarded ALTERs.
-- File sorts before the other 002_* migrations so dependents resolve.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users: schema.sql shape (username + phone_number); 010 adds phone/MFA/etc.
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(50) UNIQUE,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  phone_number  VARCHAR(20),
  slug          VARCHAR(100),
  church_id     UUID REFERENCES churches(id) ON DELETE SET NULL,
  is_active     BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id     UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);

-- Auth-support tables that 001_auth_schema owned and canonical migrations
-- (007) don't all cover.
CREATE TABLE IF NOT EXISTS login_attempts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       VARCHAR(255) NOT NULL,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  success     BOOLEAN DEFAULT false,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100),
  description TEXT,
  head_id     UUID REFERENCES users(id),
  church_id   UUID REFERENCES churches(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS department_members (
  user_id            UUID REFERENCES users(id) ON DELETE CASCADE,
  department_id      UUID REFERENCES departments(id) ON DELETE CASCADE,
  joined_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  role_in_department VARCHAR(50),
  PRIMARY KEY (user_id, department_id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             VARCHAR(200) NOT NULL,
  content           TEXT NOT NULL,
  announcement_type VARCHAR(50) DEFAULT 'general',
  department_id     UUID REFERENCES departments(id),
  author_id         UUID REFERENCES users(id),
  is_public         BOOLEAN DEFAULT true,
  priority          VARCHAR(20) DEFAULT 'normal',
  expires_at        TIMESTAMP,
  church_id         UUID REFERENCES churches(id) ON DELETE SET NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id            UUID REFERENCES users(id),
  transaction_id       VARCHAR(100) UNIQUE,
  mpesa_receipt_number VARCHAR(100),
  phone_number         VARCHAR(20) NOT NULL,
  amount               DECIMAL(10,2) NOT NULL,
  payment_date         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status               VARCHAR(20) DEFAULT 'pending',
  payment_method       VARCHAR(20) DEFAULT 'mpesa',
  notes                TEXT,
  church_id            UUID REFERENCES churches(id) ON DELETE SET NULL,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Created here (before payment_items' FK) using the same shape 028 applies;
-- 028's guarded INSERT still seeds the standard categories when it runs.
CREATE TABLE IF NOT EXISTS payment_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  church_id   UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id  UUID REFERENCES payments(id) ON DELETE CASCADE,
  category_id UUID REFERENCES payment_categories(id),
  amount      DECIMAL(10,2) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sms_templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  content       TEXT NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sms_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_phone VARCHAR(20) NOT NULL,
  message        TEXT NOT NULL,
  sender_id      UUID REFERENCES users(id),
  template_id    UUID REFERENCES sms_templates(id),
  status         VARCHAR(20) DEFAULT 'pending',
  sent_at        TIMESTAMP,
  church_id      UUID REFERENCES churches(id) ON DELETE SET NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  event_date    TIMESTAMP NOT NULL,
  location      VARCHAR(100),
  department_id UUID REFERENCES departments(id),
  organizer_id  UUID REFERENCES users(id),
  is_public     BOOLEAN DEFAULT true,
  max_attendees INTEGER,
  category      VARCHAR(50) NOT NULL DEFAULT 'service',
  church_id     UUID REFERENCES churches(id) ON DELETE SET NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed the standard role set (idempotent) — auth cannot function without it.
INSERT INTO roles (name, description) VALUES
  ('Super Admin', 'Full system access'),
  ('Pastor', 'Spiritual leadership and oversight'),
  ('First Elder', 'Church leadership and administration'),
  ('Elder', 'Church leadership and support'),
  ('Department Head', 'Department management'),
  ('Member', 'Regular church member')
ON CONFLICT (name) DO NOTHING;

-- Indexes (all IF NOT EXISTS — legacy schema created some already)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_church_id ON users(church_id);
CREATE INDEX IF NOT EXISTS idx_departments_church_id ON departments(church_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_announcements_public ON announcements(is_public);
CREATE INDEX IF NOT EXISTS idx_announcements_department ON announcements(department_id);
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_public ON events(is_public);

-- updated_at trigger helper used by base + later tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_departments_updated_at') THEN
        CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_announcements_updated_at') THEN
        CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_events_updated_at') THEN
        CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
