-- Test Database Configuration for Mobile Integration Testing
-- This script sets up test data for integration testing

-- Insert test user for authentication
INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, email_verified)
VALUES (
    'test-user-123',
    'test@example.com',
    '$2a$10$test.hash.for.testing.purposes.only',
    'Test',
    'User',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert test sync status
INSERT INTO mobile_sync_status (user_id, church_id, sync_type, status, last_sync, next_sync)
VALUES 
    ('test-user-123', 1, 'contacts', 'completed', CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '14 minutes'),
    ('test-user-123', 1, 'templates', 'completed', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP + INTERVAL '58 minutes'),
    ('test-user-123', 1, 'analytics', 'never_synced', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '24 hours')
ON CONFLICT (user_id, church_id, sync_type) DO UPDATE SET
    status = EXCLUDED.status,
    last_sync = EXCLUDED.last_sync,
    next_sync = EXCLUDED.next_sync;

-- Insert test mobile device
INSERT INTO mobile_devices (device_id, user_id, church_id, device_name, platform, os_version, app_version, is_active, last_used)
VALUES 
    ('test-device-456', 'test-user-123', 1, 'Test Device', 'android', '12', '1.0.0', true, CURRENT_TIMESTAMP)
ON CONFLICT (device_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    device_name = EXCLUDED.device_name,
    platform = EXCLUDED.platform,
    os_version = EXCLUDED.os_version,
    app_version = EXCLUDED.app_version,
    is_active = true,
    last_used = CURRENT_TIMESTAMP;

-- Insert test member for contact sync
INSERT INTO members (id, first_name, last_name, email, phone, is_active, updated_at, created_at)
VALUES 
    ('test-member-789', 'John', 'Doe', 'john@example.com', '+254712345678', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    updated_at = CURRENT_TIMESTAMP;

-- Insert test SMS template
INSERT INTO sms_templates (id, name, content, category, is_official, usage_count, last_used, updated_at, created_at)
VALUES 
    ('test-template-101', 'Test Template', 'This is a test template for integration testing', 'Test', true, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    content = EXCLUDED.content,
    category = EXCLUDED.category,
    updated_at = CURRENT_TIMESTAMP;

-- Insert test SMS log
INSERT INTO sms_logs (id, user_id, recipient_count, message, status, sent_at, created_at, source)
VALUES 
    ('test-log-202', 'test-user-123', 100, 'Test message for integration testing', 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'mobile')
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    recipient_count = EXCLUDED.recipient_count,
    message = EXCLUDED.message,
    status = EXCLUDED.status,
    sent_at = EXCLUDED.sent_at,
    updated_at = CURRENT_TIMESTAMP;

-- Verify test data
SELECT 'Test Data Setup Complete' as status;