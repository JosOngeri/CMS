-- Phase 6: Enable Row-Level Security (RLS) Policies
-- Ensures tenant isolation by automatically filtering queries by church_id

-- Enable RLS on all tenant-aware tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for each table
-- These policies allow access when:
-- 1. No church context is set (for system operations)
-- 2. The church_id matches the current church context
-- 3. For users table: Super admins can see all churches

-- Users table policy (with super admin exception)
DROP POLICY IF EXISTS users_church_isolation ON users;
CREATE POLICY users_church_isolation ON users
    FOR ALL
    USING (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
        OR id = current_setting('app.current_user_id', true)::uuid
    )
    WITH CHECK (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    );

-- Members table policy
DROP POLICY IF EXISTS members_church_isolation ON members;
CREATE POLICY members_church_isolation ON members
    FOR ALL
    USING (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    )
    WITH CHECK (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    );

-- Payments table policy
DROP POLICY IF EXISTS payments_church_isolation ON payments;
CREATE POLICY payments_church_isolation ON payments
    FOR ALL
    USING (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    )
    WITH CHECK (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    );

-- Announcements table policy
DROP POLICY IF EXISTS announcements_church_isolation ON announcements;
CREATE POLICY announcements_church_isolation ON announcements
    FOR ALL
    USING (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    )
    WITH CHECK (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    );

-- Events table policy
DROP POLICY IF EXISTS events_church_isolation ON events;
CREATE POLICY events_church_isolation ON events
    FOR ALL
    USING (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    )
    WITH CHECK (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    );

-- Departments table policy
DROP POLICY IF EXISTS departments_church_isolation ON departments;
CREATE POLICY departments_church_isolation ON departments
    FOR ALL
    USING (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    )
    WITH CHECK (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    );

-- Gallery albums table policy
DROP POLICY IF EXISTS gallery_albums_church_isolation ON gallery_albums;
CREATE POLICY gallery_albums_church_isolation ON gallery_albums
    FOR ALL
    USING (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    )
    WITH CHECK (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    );

-- Gallery photos table policy
DROP POLICY IF EXISTS gallery_photos_church_isolation ON gallery_photos;
CREATE POLICY gallery_photos_church_isolation ON gallery_photos
    FOR ALL
    USING (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    )
    WITH CHECK (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    );

-- SMS logs table policy
DROP POLICY IF EXISTS sms_logs_church_isolation ON sms_logs;
CREATE POLICY sms_logs_church_isolation ON sms_logs
    FOR ALL
    USING (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    )
    WITH CHECK (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    );

-- Settings table policy
DROP POLICY IF EXISTS settings_church_isolation ON settings;
CREATE POLICY settings_church_isolation ON settings
    FOR ALL
    USING (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    )
    WITH CHECK (
        current_setting('app.current_church_id', true) IS NULL 
        OR church_id = current_setting('app.current_church_id', true)::uuid
    );

-- Churches table - no RLS needed (super admin access only)
-- This table is managed by super admins through the church controller
