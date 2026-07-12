-- Mobile Integration Database Migration
-- This migration adds support for mobile app integration with the CMS
-- Version: 1.0
-- Date: 2025-01-15

-- ============================================
-- MOBILE DEVICE MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS mobile_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    church_id INTEGER NOT NULL,
    device_name VARCHAR(100),
    platform VARCHAR(20),
    os_version VARCHAR(50),
    app_version VARCHAR(20),
    push_token VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_mobile_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_mobile_devices_user ON mobile_devices(user_id);
CREATE INDEX idx_mobile_devices_church ON mobile_devices(church_id);
CREATE INDEX idx_mobile_devices_active ON mobile_devices(is_active);
CREATE INDEX idx_mobile_devices_platform ON mobile_devices(platform);
CREATE INDEX idx_mobile_devices_last_used ON mobile_devices(last_used DESC);

-- ============================================
-- MOBILE SYNC STATUS TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS mobile_sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    church_id INTEGER NOT NULL,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    last_sync TIMESTAMP NOT NULL,
    next_sync TIMESTAMP,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_sync_status_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unq_user_church_sync_type UNIQUE(user_id, church_id, sync_type)
);

CREATE INDEX idx_sync_status_user ON mobile_sync_status(user_id);
CREATE INDEX idx_sync_status_church ON mobile_sync_status(church_id);
CREATE INDEX idx_sync_status_type ON mobile_sync_status(sync_type);
CREATE INDEX idx_sync_status_last_sync ON mobile_sync_status(last_sync DESC);

-- ============================================
-- MOBILE SYNC CONFLICTS
-- ============================================

CREATE TABLE IF NOT EXISTS mobile_sync_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    church_id INTEGER NOT NULL,
    sync_type VARCHAR(50) NOT NULL,
    conflict_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    local_data JSONB NOT NULL,
    cms_data JSONB NOT NULL,
    resolution VARCHAR(20),
    resolved_at TIMESTAMP,
    resolved_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_sync_conflicts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sync_conflicts_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_sync_conflicts_user ON mobile_sync_conflicts(user_id);
CREATE INDEX idx_sync_conflicts_church ON mobile_sync_conflicts(church_id);
CREATE INDEX idx_sync_conflicts_type ON mobile_sync_conflicts(conflict_type);
CREATE INDEX idx_sync_conflicts_entity ON mobile_sync_conflicts(entity_type, entity_id);
CREATE INDEX idx_sync_conflicts_resolved ON mobile_sync_conflicts(resolution);
CREATE INDEX idx_sync_conflicts_created ON mobile_sync_conflicts(created_at DESC);

-- ============================================
-- SMS TEMPLATE EXTENSIONS
-- ============================================

-- Add columns to existing sms_templates table (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sms_templates') THEN
        ALTER TABLE sms_templates 
        ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_used TIMESTAMP,
        ADD COLUMN IF NOT EXISTS sync_metadata JSONB;

        CREATE INDEX IF NOT EXISTS idx_sms_templates_official ON sms_templates(is_official);
        CREATE INDEX IF NOT EXISTS idx_sms_templates_usage ON sms_templates(usage_count DESC);
        CREATE INDEX IF NOT EXISTS idx_sms_templates_last_used ON sms_templates(last_used DESC);
    END IF;
END $$;

-- ============================================
-- SMS CAMPAIGN EXTENSIONS
-- ============================================

-- Add columns to existing sms_campaigns table (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sms_campaigns') THEN
        ALTER TABLE sms_campaigns 
        ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'web',
        ADD COLUMN IF NOT EXISTS mobile_device_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS progress_metadata JSONB;

        CREATE INDEX IF NOT EXISTS idx_sms_campaigns_source ON sms_campaigns(source);
        CREATE INDEX IF NOT EXISTS idx_sms_campaigns_device ON sms_campaigns(mobile_device_id);
        CREATE INDEX IF NOT EXISTS idx_sms_campaigns_source_status ON sms_campaigns(source, status);
    END IF;
END $$;

-- ============================================
-- MEMBER SYNC EXTENSIONS
-- ============================================

-- Add columns to existing members table (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'members') THEN
        ALTER TABLE members 
        ADD COLUMN IF NOT EXISTS sync_metadata JSONB,
        ADD COLUMN IF NOT EXISTS last_synced_by UUID,
        ADD COLUMN IF NOT EXISTS conflict_resolved_at TIMESTAMP;

        CREATE INDEX IF NOT EXISTS idx_members_synced ON members(last_synced_by);
        CREATE INDEX IF NOT EXISTS idx_members_conflict_resolved ON members(conflict_resolved_at);

        -- Add foreign key constraint if column was added and constraint doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_members_last_synced_by'
        ) THEN
            ALTER TABLE members 
            ADD CONSTRAINT fk_members_last_synced_by 
            FOREIGN KEY (last_synced_by) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- ============================================
-- SMS LOG EXTENSIONS
-- ============================================

-- Add columns to existing sms_logs table (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sms_logs') THEN
        ALTER TABLE sms_logs 
        ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'web',
        ADD COLUMN IF NOT EXISTS mobile_device_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'synced';

        CREATE INDEX IF NOT EXISTS idx_sms_logs_source ON sms_logs(source);
        CREATE INDEX IF NOT EXISTS idx_sms_logs_device ON sms_logs(mobile_device_id);
        CREATE INDEX IF NOT EXISTS idx_sms_logs_sync_status ON sms_logs(sync_status);
        CREATE INDEX IF NOT EXISTS idx_sms_logs_source_status ON sms_logs(source, status);
    END IF;
END $$;

-- ============================================
-- MOBILE ANALYTICS CACHE
-- ============================================

CREATE TABLE IF NOT EXISTS mobile_analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    church_id INTEGER NOT NULL,
    analytics_type VARCHAR(50) NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    analytics_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_analytics_cache_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_analytics_cache_user ON mobile_analytics_cache(user_id);
CREATE INDEX idx_analytics_cache_church ON mobile_analytics_cache(church_id);
CREATE INDEX idx_analytics_cache_type ON mobile_analytics_cache(analytics_type);
CREATE INDEX idx_analytics_cache_period ON mobile_analytics_cache(period_start, period_end);
CREATE INDEX idx_analytics_cache_expires ON mobile_analytics_cache(expires_at);

-- ============================================
-- MOBILE PUSH NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS mobile_push_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    church_id INTEGER NOT NULL,
    device_id VARCHAR(255),
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_push_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_push_notifications_user ON mobile_push_notifications(user_id);
CREATE INDEX idx_push_notifications_church ON mobile_push_notifications(church_id);
CREATE INDEX idx_push_notifications_device ON mobile_push_notifications(device_id);
CREATE INDEX idx_push_notifications_status ON mobile_push_notifications(status);
CREATE INDEX idx_push_notifications_type ON mobile_push_notifications(notification_type);
CREATE INDEX idx_push_notifications_created ON mobile_push_notifications(created_at DESC);

-- ============================================
-- MOBILE OFFLINE QUEUE
-- ============================================

CREATE TABLE IF NOT EXISTS mobile_offline_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    church_id INTEGER NOT NULL,
    device_id VARCHAR(255),
    queue_type VARCHAR(50) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    payload JSONB NOT NULL,
    priority INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_offline_queue_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_offline_queue_user ON mobile_offline_queue(user_id);
CREATE INDEX idx_offline_queue_church ON mobile_offline_queue(church_id);
CREATE INDEX idx_offline_queue_device ON mobile_offline_queue(device_id);
CREATE INDEX idx_offline_queue_status ON mobile_offline_queue(status);
CREATE INDEX idx_offline_queue_priority ON mobile_offline_queue(priority DESC, created_at ASC);
CREATE INDEX idx_offline_queue_type ON mobile_offline_queue(queue_type, operation);

-- ============================================
-- MOBILE SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS mobile_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    church_id INTEGER NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_mobile_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unq_user_church_setting UNIQUE(user_id, church_id, setting_key)
);

CREATE INDEX idx_mobile_settings_user ON mobile_settings(user_id);
CREATE INDEX idx_mobile_settings_church ON mobile_settings(church_id);
CREATE INDEX idx_mobile_settings_key ON mobile_settings(setting_key);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables with updated_at
CREATE TRIGGER update_mobile_devices_updated_at BEFORE UPDATE ON mobile_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mobile_sync_status_updated_at BEFORE UPDATE ON mobile_sync_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mobile_settings_updated_at BEFORE UPDATE ON mobile_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View for active mobile devices per user
CREATE OR REPLACE VIEW active_user_devices AS
SELECT 
    u.id as user_id,
    u.email,
    u.first_name || ' ' || u.last_name as name,
    md.device_id,
    md.device_name,
    md.platform,
    md.os_version,
    md.app_version,
    md.last_used
FROM users u
INNER JOIN mobile_devices md ON u.id = md.user_id
WHERE md.is_active = true
ORDER BY md.last_used DESC;

-- View for sync status summary
CREATE OR REPLACE VIEW user_sync_summary AS
SELECT 
    mss.user_id,
    mss.church_id,
    mss.sync_type,
    mss.status,
    mss.last_sync,
    mss.next_sync,
    COUNT(msc.id) as conflict_count
FROM mobile_sync_status mss
LEFT JOIN mobile_sync_conflicts msc ON mss.user_id = msc.user_id 
    AND mss.church_id = msc.church_id 
    AND mss.sync_type = msc.sync_type 
    AND msc.resolution IS NULL
GROUP BY mss.user_id, mss.church_id, mss.sync_type, mss.status, mss.last_sync, mss.next_sync;

-- ============================================
-- INITIAL DATA AND DEFAULTS
-- ============================================

-- Insert default sync types for existing users
-- Note: This assumes users have a church_id field. If not, this will need adjustment.
INSERT INTO mobile_sync_status (user_id, church_id, sync_type, status, last_sync, next_sync)
SELECT 
    u.id,
    1 as church_id, -- Default church ID, adjust as needed
    'contacts',
    'never_synced',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '15 minutes'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM mobile_sync_status mss 
    WHERE mss.user_id = u.id 
    AND mss.church_id = 1 
    AND mss.sync_type = 'contacts'
);

INSERT INTO mobile_sync_status (user_id, church_id, sync_type, status, last_sync, next_sync)
SELECT 
    u.id,
    1 as church_id, -- Default church ID, adjust as needed
    'templates',
    'never_synced',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 hour'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM mobile_sync_status mss 
    WHERE mss.user_id = u.id 
    AND mss.church_id = 1 
    AND mss.sync_type = 'templates'
);

INSERT INTO mobile_sync_status (user_id, church_id, sync_type, status, last_sync, next_sync)
SELECT 
    u.id,
    1 as church_id, -- Default church ID, adjust as needed
    'analytics',
    'never_synced',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 day'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM mobile_sync_status mss 
    WHERE mss.user_id = u.id 
    AND mss.church_id = 1 
    AND mss.sync_type = 'analytics'
);

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Function to clean up old analytics cache
CREATE OR REPLACE FUNCTION cleanup_old_analytics_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM mobile_analytics_cache 
    WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up processed offline queue items
CREATE OR REPLACE FUNCTION cleanup_processed_queue_items()
RETURNS void AS $$
BEGIN
    DELETE FROM mobile_offline_queue 
    WHERE status = 'processed' 
    AND processed_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old push notifications
CREATE OR REPLACE FUNCTION cleanup_old_push_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM mobile_push_notifications 
    WHERE status IN ('delivered', 'read') 
    AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Mobile integration migration completed successfully';
    RAISE NOTICE 'Added tables: mobile_devices, mobile_sync_status, mobile_sync_conflicts, mobile_analytics_cache, mobile_push_notifications, mobile_offline_queue, mobile_settings';
    RAISE NOTICE 'Extended tables: sms_templates, sms_campaigns, members, sms_logs';
    RAISE NOTICE 'Created views: active_user_devices, user_sync_summary, mobile_campaign_stats';
    RAISE NOTICE 'Created cleanup functions: cleanup_old_analytics_cache, cleanup_processed_queue_items, cleanup_old_push_notifications';
END $$;