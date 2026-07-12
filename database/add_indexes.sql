-- Database Indexes for Performance Optimization
-- This file adds indexes to frequently queried columns
-- Run this migration to improve query performance

-- Index on users.email for fast login and user lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index on users.phone_number for fast user searches
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);

-- Index on users.is_active for filtering active users
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Index on users.created_at for sorting and reporting
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Index on payments.member_id for user payment history
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);

-- Index on payments.status for filtering by payment status
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Index on payments.created_at for sorting and reporting
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Index on announcements.is_public for filtering public announcements
CREATE INDEX IF NOT EXISTS idx_announcements_is_public ON announcements(is_public);

-- Index on announcements.created_at for sorting recent announcements
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

-- Index on announcements.department_id for department-specific announcements
CREATE INDEX IF NOT EXISTS idx_announcements_department_id ON announcements(department_id);

-- Index on events.event_date for upcoming events queries
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);

-- Index on events.is_public for filtering public events
CREATE INDEX IF NOT EXISTS idx_events_is_public ON events(is_public);

-- Index on events.created_at for sorting
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- Index on departments.is_active for filtering active departments
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);

-- Index on department_members.user_id for user department lookups
CREATE INDEX IF NOT EXISTS idx_dept_members_user_id ON department_members(user_id);

-- Index on department_members.department_id for department member lists
CREATE INDEX IF NOT EXISTS idx_dept_members_dept_id ON department_members(department_id);

-- Index on department_members.is_active for filtering active memberships
CREATE INDEX IF NOT EXISTS idx_dept_members_is_active ON department_members(is_active);

-- Composite index for department members (user + department) for uniqueness checks
CREATE INDEX IF NOT EXISTS idx_dept_members_user_dept ON department_members(user_id, department_id);

-- Index on user_roles.user_id for fast role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- Index on user_roles.role_id for reverse role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Comment to verify migration
COMMENT ON DATABASE sda_church_db IS 'Performance indexes added on ' || CURRENT_TIMESTAMP;
