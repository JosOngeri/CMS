-- Database Indexes for Common Queries
-- This script creates indexes to improve query performance

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Announcements table indexes
CREATE INDEX IF NOT EXISTS idx_announcements_is_public ON announcements(is_public);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_author_id ON announcements(author_id);

-- Events table indexes
CREATE INDEX IF NOT EXISTS idx_events_is_public ON events(is_public);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_category ON payments(category);

-- Departments table indexes
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);

-- Department members junction table indexes
CREATE INDEX IF NOT EXISTS idx_department_members_department_id ON department_members(department_id);
CREATE INDEX IF NOT EXISTS idx_department_members_user_id ON department_members(user_id);

-- SMS table indexes
CREATE INDEX IF NOT EXISTS idx_sms_status ON sms(status);
CREATE INDEX IF NOT EXISTS idx_sms_created_at ON sms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_recipient_phone ON sms(recipient_phone);

-- User roles junction table indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_announcements_public_created ON announcements(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_public_date ON events(is_public, event_date);
CREATE INDEX IF NOT EXISTS idx_payments_member_status ON payments(member_id, status);
CREATE INDEX IF NOT EXISTS idx_users_active_created ON users(is_active, created_at DESC);
