-- Phase 6: Multi-Tenancy & Row-Level Security
-- Core Tenancy Infrastructure

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create churches table
CREATE TABLE IF NOT EXISTS churches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for churches table
CREATE INDEX IF NOT EXISTS idx_churches_slug ON churches(slug);
CREATE INDEX IF NOT EXISTS idx_churches_active ON churches(is_active);

-- Insert default church
INSERT INTO churches (name, slug, settings)
VALUES ('Kiserian Main SDA', 'kiserian-main-sda', '{"timezone": "Africa/Nairobi", "currency": "KES"}')
ON CONFLICT (slug) DO NOTHING;

-- Add church_id to users table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='church_id') THEN
        ALTER TABLE users ADD COLUMN church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add church_id to members table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='church_id') THEN
        ALTER TABLE members ADD COLUMN church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add church_id to payments table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='church_id') THEN
        ALTER TABLE payments ADD COLUMN church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add church_id to announcements table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='church_id') THEN
        ALTER TABLE announcements ADD COLUMN church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add church_id to events table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='church_id') THEN
        ALTER TABLE events ADD COLUMN church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add church_id to departments table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='departments' AND column_name='church_id') THEN
        ALTER TABLE departments ADD COLUMN church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add church_id to gallery_albums table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_albums' AND column_name='church_id') THEN
        ALTER TABLE gallery_albums ADD COLUMN church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add church_id to gallery_photos table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_photos' AND column_name='church_id') THEN
        ALTER TABLE gallery_photos ADD COLUMN church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add church_id to sms_logs table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sms_logs' AND column_name='church_id') THEN
        ALTER TABLE sms_logs ADD COLUMN church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add church_id to settings table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settings' AND column_name='church_id') THEN
        ALTER TABLE settings ADD COLUMN church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Backfill existing data with default church
UPDATE users SET church_id = (SELECT id FROM churches WHERE slug = 'kiserian-main-sda') WHERE church_id IS NULL;
UPDATE members SET church_id = (SELECT id FROM churches WHERE slug = 'kiserian-main-sda') WHERE church_id IS NULL;
UPDATE payments SET church_id = (SELECT id FROM churches WHERE slug = 'kiserian-main-sda') WHERE church_id IS NULL;
UPDATE announcements SET church_id = (SELECT id FROM churches WHERE slug = 'kiserian-main-sda') WHERE church_id IS NULL;
UPDATE events SET church_id = (SELECT id FROM churches WHERE slug = 'kiserian-main-sda') WHERE church_id IS NULL;
UPDATE departments SET church_id = (SELECT id FROM churches WHERE slug = 'kiserian-main-sda') WHERE church_id IS NULL;
UPDATE gallery_albums SET church_id = (SELECT id FROM churches WHERE slug = 'kiserian-main-sda') WHERE church_id IS NULL;
UPDATE gallery_photos SET church_id = (SELECT id FROM churches WHERE slug = 'kiserian-main-sda') WHERE church_id IS NULL;
UPDATE sms_logs SET church_id = (SELECT id FROM churches WHERE slug = 'kiserian-main-sda') WHERE church_id IS NULL;
UPDATE settings SET church_id = (SELECT id FROM churches WHERE slug = 'kiserian-main-sda') WHERE church_id IS NULL;

-- Add indexes for church_id columns
CREATE INDEX IF NOT EXISTS idx_users_church_id ON users(church_id);
CREATE INDEX IF NOT EXISTS idx_members_church_id ON members(church_id);
CREATE INDEX IF NOT EXISTS idx_payments_church_id ON payments(church_id);
CREATE INDEX IF NOT EXISTS idx_announcements_church_id ON announcements(church_id);
CREATE INDEX IF NOT EXISTS idx_events_church_id ON events(church_id);
CREATE INDEX IF NOT EXISTS idx_departments_church_id ON departments(church_id);
CREATE INDEX IF NOT EXISTS idx_gallery_albums_church_id ON gallery_albums(church_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_church_id ON gallery_photos(church_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_church_id ON sms_logs(church_id);
CREATE INDEX IF NOT EXISTS idx_settings_church_id ON settings(church_id);

-- Add updated_at trigger to churches table
CREATE OR REPLACE FUNCTION update_church_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_church_updated_at ON churches;
CREATE TRIGGER trg_update_church_updated_at
    BEFORE UPDATE ON churches
    FOR EACH ROW
    EXECUTE FUNCTION update_church_updated_at();
