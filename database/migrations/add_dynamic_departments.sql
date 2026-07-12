-- Phase 8: Dynamic Departments & Feature Allocation
-- Create department features registry and allocation system

-- Create department_features registry table
CREATE TABLE IF NOT EXISTS department_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    component_name VARCHAR(100),
    icon_name VARCHAR(50),
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    requires_dependencies JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for department_features
CREATE INDEX IF NOT EXISTS idx_department_features_slug ON department_features(slug);
CREATE INDEX IF NOT EXISTS idx_department_features_category ON department_features(category);
CREATE INDEX IF NOT EXISTS idx_department_features_active ON department_features(is_active);

-- Create department_feature_settings allocation table
CREATE TABLE IF NOT EXISTS department_feature_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES department_features(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department_id, feature_id)
);

-- Create indexes for department_feature_settings
CREATE INDEX IF NOT EXISTS idx_dept_feature_settings_dept ON department_feature_settings(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_feature_settings_feature ON department_feature_settings(feature_id);
CREATE INDEX IF NOT EXISTS idx_dept_feature_settings_enabled ON department_feature_settings(is_enabled);

-- Seed default features
INSERT INTO department_features (slug, name, description, component_name, icon_name, category, requires_dependencies) VALUES
('MEMBERSHIP_MANAGEMENT', 'Membership Management', 'Manage church members, attendance, and membership status', 'MembershipManagement', 'Users', 'core', '[]'),
('TELEGRAM_SYNC', 'Telegram Integration', 'Sync department communications with Telegram', 'TelegramSync', 'Send', 'communication', '[]'),
('SMS_NOTIFICATIONS', 'SMS Notifications', 'Send SMS notifications to members', 'SMSNotifications', 'MessageSquare', 'communication', '[]'),
('FINANCIAL_TRACKING', 'Financial Tracking', 'Track department finances and budgets', 'FinancialTracking', 'DollarSign', 'treasury', '[]'),
('EVENT_LOGISTICS', 'Event Management', 'Plan and manage department events', 'EventManagement', 'Calendar', 'events', '[]'),
('AI_ANNOUNCEMENT_DRAFTING', 'AI Announcement Drafting', 'Use AI to draft announcements', 'AIAnnouncementDrafting', 'Sparkles', 'content', '[]'),
('ATTENDANCE_TRACKING', 'Attendance Tracking', 'Track meeting and event attendance', 'AttendanceTracking', 'CheckSquare', 'core', '[]'),
('DOCUMENT_MANAGEMENT', 'Document Management', 'Manage department documents and resources', 'DocumentManagement', 'FileText', 'content', '[]'),
('REPORT_GENERATION', 'Report Generation', 'Generate department reports', 'ReportGeneration', 'BarChart', 'treasury', '[]'),
('PRAYER_REQUESTS', 'Prayer Requests', 'Manage prayer requests and praises', 'PrayerRequests', 'Heart', 'pastoral', '[]'),
('VOLUNTEER_MANAGEMENT', 'Volunteer Management', 'Manage department volunteers and assignments', 'VolunteerManagement', 'Users', 'core', '[]'),
('RESOURCE_SCHEDULING', 'Resource Scheduling', 'Schedule department resources and facilities', 'ResourceScheduling', 'Clock', 'operations', '[]')
ON CONFLICT (slug) DO NOTHING;

-- Add updated_at trigger to department_features
CREATE OR REPLACE FUNCTION update_department_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_department_features_updated_at ON department_features;
CREATE TRIGGER trg_update_department_features_updated_at
    BEFORE UPDATE ON department_features
    FOR EACH ROW
    EXECUTE FUNCTION update_department_features_updated_at();

-- Add updated_at trigger to department_feature_settings
CREATE OR REPLACE FUNCTION update_department_feature_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_department_feature_settings_updated_at ON department_feature_settings;
CREATE TRIGGER trg_update_department_feature_settings_updated_at
    BEFORE UPDATE ON department_feature_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_department_feature_settings_updated_at();

-- Add church_id to department_features table for multi-tenancy
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='department_features' AND column_name='church_id') THEN
        ALTER TABLE department_features ADD COLUMN church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add church_id to department_feature_settings table for multi-tenancy
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='department_feature_settings' AND column_name='church_id') THEN
        ALTER TABLE department_feature_settings ADD COLUMN church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Backfill church_id with default church
UPDATE department_features SET church_id = (SELECT id FROM churches WHERE slug = 'kiserian-main-sda') WHERE church_id IS NULL;
UPDATE department_feature_settings SET church_id = (SELECT id FROM churches WHERE slug = 'kiserian-main-sda') WHERE church_id IS NULL;

-- Create indexes for church_id
CREATE INDEX IF NOT EXISTS idx_department_features_church_id ON department_features(church_id);
CREATE INDEX IF NOT EXISTS idx_dept_feature_settings_church_id ON department_feature_settings(church_id);
