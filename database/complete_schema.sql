-- KMainCMS Complete Database Schema (Standardized to UUID)
-- Seventh-day Adventist Church - Kiserian Main
-- Church Management System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE / AUTH MODULE
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(255),
  slug VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Function to generate user slugs from first and last name
CREATE OR REPLACE FUNCTION generate_user_slug(first_name VARCHAR, last_name VARCHAR, user_id UUID) RETURNS VARCHAR AS $$
DECLARE
  base_slug VARCHAR(100);
  counter INTEGER;
  new_slug VARCHAR(100);
BEGIN
  -- Convert to lowercase, replace spaces with underscores, remove special characters
  base_slug := lower(regexp_replace(regexp_replace(COALESCE(first_name, '') || '_' || COALESCE(last_name, ''), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '_', 'g'));

  -- Handle empty names
  IF base_slug = '_' OR base_slug = '' THEN
    base_slug := 'user_' || substring(user_id::text, 1, 8);
  END IF;

  -- Check if base slug is unique
  counter := 1;
  new_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM users WHERE slug = new_slug AND id != user_id) LOOP
    new_slug := base_slug || '_' || counter;
    counter := counter + 1;
  END LOOP;

  RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Role junction table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, role_id)
);

-- Login attempts tracking
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auth audit log
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MEMBERS MODULE
-- ============================================

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  membership_number VARCHAR(50) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(20),
  marital_status VARCHAR(30),
  occupation VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  baptism_date DATE,
  membership_status VARCHAR(30) DEFAULT 'active',
  joined_date DATE,
  notes TEXT,
  church_slug VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Member contacts
CREATE TABLE IF NOT EXISTS member_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  contact_type VARCHAR(50) NOT NULL,
  contact_value VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Member groups
CREATE TABLE IF NOT EXISTS member_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  group_type VARCHAR(50),
  leader_id UUID REFERENCES members(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Member group memberships
CREATE TABLE IF NOT EXISTS member_group_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  group_id UUID REFERENCES member_groups(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, group_id)
);

-- ============================================
-- DEPARTMENTS MODULE
-- ============================================

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50),
  head_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  slug VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Department members table
CREATE TABLE IF NOT EXISTS department_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  role VARCHAR(50),
  role_in_department VARCHAR(50), -- Supporting both column names
  status VARCHAR(20) DEFAULT 'approved', -- pending, approved, rejected
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  UNIQUE(user_id, department_id)
);

-- Department communications
CREATE TABLE IF NOT EXISTS department_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'normal',
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Compatibility
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PAYMENTS MODULE (Consolidated)
-- ============================================

-- Payment categories table
CREATE TABLE IF NOT EXISTS payment_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  provider VARCHAR(100),
  account_number VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  payment_type VARCHAR(50) NOT NULL, -- tithe, offering, etc.
  category VARCHAR(100), -- ID or name
  description TEXT,
  reference_number VARCHAR(100) UNIQUE,
  transaction_id VARCHAR(255),
  checkout_request_id VARCHAR(255),
  merchant_request_id VARCHAR(255),
  mpesa_receipt_number VARCHAR(100),
  phone_number VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  failure_reason TEXT,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pledges table
CREATE TABLE IF NOT EXISTS pledges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  pledge_type VARCHAR(50),
  start_date DATE,
  end_date DATE,
  frequency VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ANNOUNCEMENTS / EVENTS MODULE
-- ============================================

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  announcement_type VARCHAR(50) DEFAULT 'general',
  department_id UUID REFERENCES departments(id),
  author_id UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT true,
  priority VARCHAR(20) DEFAULT 'normal',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Church events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_date TIMESTAMP NOT NULL,
  location VARCHAR(100),
  department_id UUID REFERENCES departments(id),
  organizer_id UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT true,
  max_attendees INTEGER,
  poster_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event attendance
CREATE TABLE IF NOT EXISTS event_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES users(id) ON DELETE CASCADE,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  attended BOOLEAN DEFAULT false,
  UNIQUE(event_id, member_id)
);

-- ============================================
-- SMS MODULE
-- ============================================

-- SMS providers
CREATE TABLE IF NOT EXISTS sms_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  api_key VARCHAR(255),
  api_url VARCHAR(255),
  sender_id VARCHAR(50),
  balance NUMERIC DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'KES',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS templates
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  merge_fields JSONB,
  approval_status VARCHAR(20) DEFAULT 'approved',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS logs
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_phone VARCHAR(20) NOT NULL,
  recipients INTEGER, -- Count
  message TEXT NOT NULL,
  sender_id UUID REFERENCES users(id),
  template_id UUID REFERENCES sms_templates(id),
  status VARCHAR(20) DEFAULT 'pending',
  cost NUMERIC,
  scheduled_date DATE,
  scheduled_time TIME,
  enable_reply BOOLEAN DEFAULT false,
  track_links BOOLEAN DEFAULT false,
  reply_received BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('Super Admin', 'Full system access'),
  ('Pastor', 'Church pastor with administrative access'),
  ('First Elder', 'First elder with administrative access'),
  ('Department Head', 'Head of a department'),
  ('Treasurer', 'Treasury management'),
  ('Member', 'Regular church member')
ON CONFLICT (name) DO NOTHING;

-- Insert default payment categories
INSERT INTO payment_categories (name, description) VALUES
  ('Tithe', '10% return to God'),
  ('Local Church Offering', 'General church operations'),
  ('Mission Offering', 'World mission support'),
  ('Building Fund', 'Church construction and maintenance'),
  ('Youth Ministries', 'Youth programs and activities');

-- Insert default payment methods
INSERT INTO payment_methods (name, type, provider, account_number) VALUES
  ('M-Pesa', 'mobile_money', 'Safaricom', '174379'),
  ('Cash', 'cash', '', '')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
