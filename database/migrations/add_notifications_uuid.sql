-- Phase 10: Add UUID recipient_id to notifications table
-- Ensures notifications use UUID for consistency with multi-tenancy

-- Check if notifications table exists and recipient_id column type
DO $$
BEGIN
    -- Add recipient_id as UUID if table exists and column doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='notifications') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='recipient_id') THEN
            ALTER TABLE notifications ADD COLUMN recipient_id UUID REFERENCES users(id) ON DELETE CASCADE;
        END IF;
    ELSE
        -- Create notifications table if it doesn't exist
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
            church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            type VARCHAR(50) DEFAULT 'info',
            is_read BOOLEAN DEFAULT false,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            read_at TIMESTAMP
        );
        
        -- Create indexes
        CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
        CREATE INDEX idx_notifications_church ON notifications(church_id);
        CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read = false;
    END IF;
END $$;

-- Backfill recipient_id from existing user_id if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id') THEN
        -- Update recipient_id from user_id
        UPDATE notifications SET recipient_id = user_id::uuid WHERE recipient_id IS NULL AND user_id IS NOT NULL;
        
        -- Drop old user_id column after migration
        ALTER TABLE notifications DROP COLUMN IF EXISTS user_id;
    END IF;
END $$;

-- Add church_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='church_id') THEN
        ALTER TABLE notifications ADD COLUMN church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
        CREATE INDEX idx_notifications_church ON notifications(church_id);
    END IF;
END $$;

-- Backfill church_id from recipient_id's user
UPDATE notifications n
SET church_id = u.church_id
FROM users u
WHERE n.recipient_id = u.id AND n.church_id IS NULL;

-- Add trigger for welcome notification on user registration
CREATE OR REPLACE FUNCTION trigger_welcome_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (recipient_id, church_id, title, message, type)
    VALUES (
        NEW.id,
        NEW.church_id,
        'Welcome to KMainCMS',
        'Your account has been successfully created. Welcome to our church management system!',
        'welcome'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to users table
DROP TRIGGER IF EXISTS trg_welcome_notification ON users;
CREATE TRIGGER trg_welcome_notification
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_welcome_notification();
