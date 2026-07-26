-- Add SMS Contact Management Tables to KMainCMS
-- This migration adds the contact and group management features from JOSms WebApp

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add SMS organizations table (if not exists)
CREATE TABLE IF NOT EXISTS sms_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add SMS groups table
CREATE TABLE IF NOT EXISTS sms_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES sms_organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(50) DEFAULT 'local', -- 'local' or 'website'
    contact_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add SMS contacts table
CREATE TABLE IF NOT EXISTS sms_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES sms_organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    group_id UUID REFERENCES sms_groups(id) ON DELETE SET NULL,
    source VARCHAR(50) DEFAULT 'local', -- 'phone', 'website', 'manual'
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'blocked'
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add user group permissions table
CREATE TABLE IF NOT EXISTS user_group_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES sms_groups(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT false,
    can_send BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, group_id)
);

-- Add message templates table (if not exists, extend existing)
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES sms_organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    is_favorite BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add import logs table
CREATE TABLE IF NOT EXISTS import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES sms_organizations(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    import_type VARCHAR(50) NOT NULL,
    total_rows INTEGER DEFAULT 0,
    imported_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    errors JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add sync status table
CREATE TABLE IF NOT EXISTS sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES sms_organizations(id) ON DELETE CASCADE,
    last_sync_time TIMESTAMP,
    sync_in_progress BOOLEAN DEFAULT false,
    pending_contact_changes INTEGER DEFAULT 0,
    pending_message_changes INTEGER DEFAULT 0,
    conflicts JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_organizations_church_id ON sms_organizations(church_id);
CREATE INDEX IF NOT EXISTS idx_sms_organizations_slug ON sms_organizations(slug);
CREATE INDEX IF NOT EXISTS idx_sms_groups_church_id ON sms_groups(church_id);
CREATE INDEX IF NOT EXISTS idx_sms_groups_organization_id ON sms_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_sms_groups_source ON sms_groups(source);
CREATE INDEX IF NOT EXISTS idx_sms_contacts_church_id ON sms_contacts(church_id);
CREATE INDEX IF NOT EXISTS idx_sms_contacts_organization_id ON sms_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_sms_contacts_group_id ON sms_contacts(group_id);
CREATE INDEX IF NOT EXISTS idx_sms_contacts_source ON sms_contacts(source);
CREATE INDEX IF NOT EXISTS idx_sms_contacts_phone ON sms_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_sms_contacts_status ON sms_contacts(status);
CREATE INDEX IF NOT EXISTS idx_user_group_permissions_user_id ON user_group_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_permissions_group_id ON user_group_permissions(group_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_church_id ON message_templates(church_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_organization_id ON message_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_church_id ON import_logs(church_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_organization_id ON import_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_church_id ON sync_status(church_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_organization_id ON sync_status(organization_id);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_sms_organizations_updated_at BEFORE UPDATE ON sms_organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_groups_updated_at BEFORE UPDATE ON sms_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_contacts_updated_at BEFORE UPDATE ON sms_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_status_updated_at BEFORE UPDATE ON sync_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE sms_organizations IS 'SMS organizations for multi-tenant SMS management';
COMMENT ON TABLE sms_groups IS 'Contact groups for SMS campaigns';
COMMENT ON TABLE sms_contacts IS 'SMS contacts with phone numbers and grouping';
COMMENT ON TABLE user_group_permissions IS 'User permissions for specific contact groups';
COMMENT ON TABLE message_templates IS 'Reusable message templates for SMS campaigns';
COMMENT ON TABLE import_logs IS 'History of contact imports from external sources';
COMMENT ON TABLE sync_status IS 'Mobile app synchronization status tracking';