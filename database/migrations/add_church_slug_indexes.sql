-- Phase 6: Add Church Slug Redundant Keys for Zero-Join Queries
-- Optimizes queries by enabling lookups without joins through church_slug

-- Add church_slug to users table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='church_slug') THEN
        ALTER TABLE users ADD COLUMN church_slug VARCHAR(50);
    END IF;
END $$;

-- Backfill church_slug from churches table
UPDATE users u
SET church_slug = c.slug
FROM churches c
WHERE u.church_id = c.id AND u.church_slug IS NULL;

-- Add index for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_church_slug ON users(church_slug);

-- Add church_slug to other core tables for zero-join optimization
DO $$
BEGIN
    -- Members
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='church_slug') THEN
        ALTER TABLE members ADD COLUMN church_slug VARCHAR(50);
    END IF;
    
    -- Payments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='church_slug') THEN
        ALTER TABLE payments ADD COLUMN church_slug VARCHAR(50);
    END IF;
    
    -- Announcements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='church_slug') THEN
        ALTER TABLE announcements ADD COLUMN church_slug VARCHAR(50);
    END IF;
    
    -- Events
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='church_slug') THEN
        ALTER TABLE events ADD COLUMN church_slug VARCHAR(50);
    END IF;
END $$;

-- Backfill church_slug for all tables
UPDATE members m SET church_slug = c.slug FROM churches c WHERE m.church_id = c.id AND m.church_slug IS NULL;
UPDATE payments p SET church_slug = c.slug FROM churches c WHERE p.church_id = c.id AND p.church_slug IS NULL;
UPDATE announcements a SET church_slug = c.slug FROM churches c WHERE a.church_id = c.id AND a.church_slug IS NULL;
UPDATE events e SET church_slug = c.slug FROM churches c WHERE e.church_id = c.id AND e.church_slug IS NULL;

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_members_church_slug ON members(church_slug);
CREATE INDEX IF NOT EXISTS idx_payments_church_slug ON payments(church_slug);
CREATE INDEX IF NOT EXISTS idx_announcements_church_slug ON announcements(church_slug);
CREATE INDEX IF NOT EXISTS idx_events_church_slug ON events(church_slug);

-- Add trigger to keep church_slug in sync when church_id changes
CREATE OR REPLACE FUNCTION sync_church_slug()
RETURNS TRIGGER AS $$
BEGIN
    NEW.church_slug = (SELECT slug FROM churches WHERE id = NEW.church_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to all tables
DROP TRIGGER IF EXISTS trg_sync_users_church_slug ON users;
CREATE TRIGGER trg_sync_users_church_slug
    BEFORE UPDATE OF church_id ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_church_slug();

DROP TRIGGER IF EXISTS trg_sync_members_church_slug ON members;
CREATE TRIGGER trg_sync_members_church_slug
    BEFORE UPDATE OF church_id ON members
    FOR EACH ROW
    EXECUTE FUNCTION sync_church_slug();

DROP TRIGGER IF EXISTS trg_sync_payments_church_slug ON payments;
CREATE TRIGGER trg_sync_payments_church_slug
    BEFORE UPDATE OF church_id ON payments
    FOR EACH ROW
    EXECUTE FUNCTION sync_church_slug();

DROP TRIGGER IF EXISTS trg_sync_announcements_church_slug ON announcements;
CREATE TRIGGER trg_sync_announcements_church_slug
    BEFORE UPDATE OF church_id ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION sync_church_slug();

DROP TRIGGER IF EXISTS trg_sync_events_church_slug ON events;
CREATE TRIGGER trg_sync_events_church_slug
    BEFORE UPDATE OF church_id ON events
    FOR EACH ROW
    EXECUTE FUNCTION sync_church_slug();
