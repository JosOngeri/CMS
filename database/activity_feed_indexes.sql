-- Database indexes for activity feed performance optimization
-- These indexes improve query performance for the activity feed feature
-- Updated to work with existing database tables (announcements, events, department_members, audit_log)

-- Index for announcements
CREATE INDEX IF NOT EXISTS idx_announcements_dept_created 
ON announcements(department_id, created_at DESC);

-- Index for events
CREATE INDEX IF NOT EXISTS idx_events_dept_created 
ON events(department_id, created_at DESC);

-- Index for department members (for join activities)
CREATE INDEX IF NOT EXISTS idx_dept_members_dept_joined 
ON department_members(department_id, joined_at DESC) 
WHERE is_active = true;

-- Index for audit log (for user actions) - using GIN index for JSONB
CREATE INDEX IF NOT EXISTS idx_audit_log_new_values_gin 
ON audit_log USING GIN (new_values);

-- Index for audit log created_at
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at 
ON audit_log(created_at DESC);
