-- Site Settings Schema
-- Comprehensive site-wide settings for non-technical users
-- This file includes all settings from Phase 1 (High Priority), Phase 2 (Medium Priority), and Phase 3 (Low Priority)

-- Phase 1: High Priority Site Settings

-- 1.1 Maintenance Mode Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_editable, validation_rules) VALUES
  ('maintenance_mode_enabled', 'false', 'boolean', 'maintenance', 'Maintenance Mode', 'Toggle maintenance mode on/off', true, NULL),
  ('maintenance_message', 'Our website is currently under maintenance. Please check back soon.', 'text', 'maintenance', 'Maintenance Message', 'Custom message displayed during maintenance', true, NULL),
  ('maintenance_admin_bypass', 'true', 'boolean', 'maintenance', 'Admin Bypass', 'Allow admins to bypass maintenance mode', true, NULL)
ON CONFLICT (key) DO NOTHING;

-- 1.2 Church Information Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_editable, validation_rules) VALUES
  ('church_name', 'Kiserian Main SDA Church', 'text', 'church_info', 'Church Name', 'Official name of the church', true, NULL),
  ('church_address', 'Kiserian, Kenya', 'textarea', 'church_info', 'Church Address', 'Physical address of the church', true, NULL),
  ('church_phone', '+254 700 000 000', 'text', 'church_info', 'Church Phone', 'Main contact phone number', true, NULL),
  ('church_email', 'info@kiserianmain.org', 'text', 'church_info', 'Church Email', 'Main contact email address', true, NULL),
  ('church_map_url', '', 'text', 'church_info', 'Google Maps URL', 'Google Maps embed URL for location', true, NULL),
  ('pastor_name', 'Pastor Name', 'text', 'church_info', 'Pastor Name', 'Name of the senior pastor', true, NULL)
ON CONFLICT (key) DO NOTHING;

-- 1.3 Service Streaming Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_editable, validation_rules) VALUES
  ('youtube_stream_url', '', 'text', 'streaming', 'YouTube Stream URL', 'YouTube live stream URL', true, NULL),
  ('facebook_stream_url', '', 'text', 'streaming', 'Facebook Stream URL', 'Facebook live stream URL', true, NULL),
  ('zoom_meeting_url', '', 'text', 'streaming', 'Zoom Meeting URL', 'Zoom meeting link for online services', true, NULL),
  ('streaming_schedule', 'Sabbath: 9:00 AM - 12:00 PM\nWednesday: 6:30 PM - 8:00 PM', 'textarea', 'streaming', 'Streaming Schedule', 'Streaming schedule information', true, NULL)
ON CONFLICT (key) DO NOTHING;

-- 1.4 Announcement Banner Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_editable, validation_rules) VALUES
  ('announcement_banner_enabled', 'false', 'boolean', 'banner', 'Enable Banner', 'Toggle announcement banner on/off', true, NULL),
  ('announcement_banner_text', '', 'text', 'banner', 'Banner Text', 'Message to display in the announcement banner', true, NULL),
  ('announcement_banner_color', '#10B981', 'color', 'banner', 'Banner Color', 'Background color of the announcement banner', true, NULL),
  ('announcement_banner_link', '', 'text', 'banner', 'Banner Link', 'Optional link URL for the banner', true, NULL),
  ('announcement_banner_expiry', '', 'date', 'banner', 'Banner Expiry', 'Date when the banner should expire', true, NULL)
ON CONFLICT (key) DO NOTHING;

-- Phase 2: Medium Priority Site Settings

-- 2.1 Email Notification Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_editable, validation_rules) VALUES
  ('notification_email', 'admin@kiserianmain.org', 'text', 'notifications', 'Notification Email', 'System notification email address', true, NULL),
  ('notify_new_members', 'true', 'boolean', 'notifications', 'Notify New Members', 'Email on new member registration', true, NULL),
  ('notify_event_signups', 'true', 'boolean', 'notifications', 'Notify Event Signups', 'Email on event signups', true, NULL),
  ('notify_prayer_requests', 'true', 'boolean', 'notifications', 'Notify Prayer Requests', 'Email on prayer requests', true, NULL),
  ('notify_donations', 'true', 'boolean', 'notifications', 'Notify Donations', 'Email on donations', true, NULL),
  ('notify_department_requests', 'true', 'boolean', 'notifications', 'Notify Department Requests', 'Email on department membership requests', true, NULL)
ON CONFLICT (key) DO NOTHING;

-- 2.2 SEO & Analytics Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_editable, validation_rules) VALUES
  ('site_title', 'Kiserian Main SDA Church', 'text', 'seo', 'Site Title', 'Site title for SEO', true, NULL),
  ('meta_description', 'Welcome to Kiserian Main SDA Church - A community of believers dedicated to serving God and our community.', 'textarea', 'seo', 'Meta Description', 'Meta description for search engines', true, NULL),
  ('google_analytics_id', '', 'text', 'seo', 'Google Analytics ID', 'Google Analytics tracking ID', true, NULL),
  ('google_search_console', '', 'text', 'seo', 'Search Console', 'Google Search Console verification code', true, NULL)
ON CONFLICT (key) DO NOTHING;

-- 2.3 File Upload Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_editable, validation_rules) VALUES
  ('max_file_size_mb', '10', 'number', 'uploads', 'Max File Size (MB)', 'Maximum file size in MB', true, '{"min": 1, "max": 100}'),
  ('allowed_file_types', 'jpg,jpeg,png,webp,pdf,doc,docx', 'textarea', 'uploads', 'Allowed File Types', 'Comma-separated list of allowed extensions', true, NULL),
  ('max_image_width', '1920', 'number', 'uploads', 'Max Image Width', 'Maximum image width in pixels', true, '{"min": 100, "max": 4096}'),
  ('max_image_height', '1080', 'number', 'uploads', 'Max Image Height', 'Maximum image height in pixels', true, '{"min": 100, "max": 4096}'),
  ('auto_compress_images', 'true', 'boolean', 'uploads', 'Auto Compress Images', 'Auto-compress uploaded images', true, NULL)
ON CONFLICT (key) DO NOTHING;

-- 2.4 Security Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_editable, validation_rules) VALUES
  ('session_timeout_hours', '24', 'number', 'security', 'Session Timeout (Hours)', 'Session timeout in hours', true, '{"min": 1, "max": 168}'),
  ('require_email_verification', 'false', 'boolean', 'security', 'Require Email Verification', 'Require email verification for new users', true, NULL),
  ('password_min_length', '8', 'number', 'security', 'Password Min Length', 'Minimum password length', true, '{"min": 6, "max": 32}'),
  ('require_special_chars', 'true', 'boolean', 'security', 'Require Special Characters', 'Require special characters in passwords', true, NULL),
  ('enable_2fa', 'false', 'boolean', 'security', 'Enable 2FA', 'Enable two-factor authentication', true, NULL),
  ('failed_login_lockout', '5', 'number', 'security', 'Failed Login Lockout', 'Lockout after N failed attempts', true, '{"min": 3, "max": 10}')
ON CONFLICT (key) DO NOTHING;

-- Phase 3: Low Priority Site Settings

-- 3.1 Default User Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_editable, validation_rules) VALUES
  ('default_user_role', 'Member', 'select', 'user_defaults', 'Default User Role', 'Default role for new users', true, '{"enum": ["Member", "Visitor"]}'),
  ('auto_assign_department', '', 'text', 'user_defaults', 'Auto Assign Department', 'Department ID to auto-assign new users', true, NULL),
  ('send_welcome_email', 'true', 'boolean', 'user_defaults', 'Send Welcome Email', 'Send welcome email to new users', true, NULL),
  ('welcome_email_template', 'Welcome to Kiserian Main SDA Church! We are blessed to have you join our community.', 'textarea', 'user_defaults', 'Welcome Email Template', 'Welcome email content', true, NULL)
ON CONFLICT (key) DO NOTHING;

-- 3.2 Content Moderation Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_editable, validation_rules) VALUES
  ('auto_approve_comments', 'true', 'boolean', 'moderation', 'Auto Approve Comments', 'Auto-approve user comments', true, NULL),
  ('enable_profanity_filter', 'true', 'boolean', 'moderation', 'Enable Profanity Filter', 'Enable profanity filter', true, NULL),
  ('require_approval_photos', 'false', 'boolean', 'moderation', 'Require Approval Photos', 'Require approval for gallery photos', true, NULL),
  ('require_approval_announcements', 'false', 'boolean', 'moderation', 'Require Approval Announcements', 'Require approval for announcements', true, NULL),
  ('require_approval_events', 'false', 'boolean', 'moderation', 'Require Approval Events', 'Require approval for events', true, NULL),
  ('require_approval_prayer_requests', 'false', 'boolean', 'moderation', 'Require Approval Prayer Requests', 'Require approval for prayer requests', true, NULL)
ON CONFLICT (key) DO NOTHING;

-- 3.3 Backup Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_editable, validation_rules) VALUES
  ('enable_auto_backup', 'false', 'boolean', 'backups', 'Enable Auto Backup', 'Enable automatic backups', true, NULL),
  ('backup_frequency', 'Weekly', 'select', 'backups', 'Backup Frequency', 'How often to run backups', true, '{"enum": ["Daily", "Weekly", "Monthly"]}'),
  ('backup_retention_days', '30', 'number', 'backups', 'Backup Retention (Days)', 'How long to keep backups', true, '{"min": 7, "max": 365}'),
  ('backup_notification_email', 'admin@kiserianmain.org', 'text', 'backups', 'Backup Notification Email', 'Email for backup notifications', true, NULL)
ON CONFLICT (key) DO NOTHING;

-- 3.4 Event Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_editable, validation_rules) VALUES
  ('enable_event_registration', 'true', 'boolean', 'event_settings', 'Enable Event Registration', 'Enable event registration', true, NULL),
  ('default_max_attendees', '50', 'number', 'event_settings', 'Default Max Attendees', 'Default maximum attendees for events', true, '{"min": 1, "max": 1000}'),
  ('enable_waitlist', 'true', 'boolean', 'event_settings', 'Enable Waitlist', 'Enable waitlist when event is full', true, NULL),
  ('require_event_approval', 'false', 'boolean', 'event_settings', 'Require Event Approval', 'Require approval for public events', true, NULL),
  ('event_reminder_hours', '24', 'number', 'event_settings', 'Event Reminder Hours', 'Send reminder X hours before event', true, '{"min": 1, "max": 168}')
ON CONFLICT (key) DO NOTHING;

-- 3.5 Donation/Giving Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_editable, validation_rules) VALUES
  ('enable_online_giving', 'false', 'boolean', 'giving', 'Enable Online Giving', 'Enable online giving', true, NULL),
  ('suggested_donation_amounts', '100,500,1000,5000', 'textarea', 'giving', 'Suggested Donation Amounts', 'Comma-separated suggested amounts', true, NULL),
  ('default_donation_category', 'Tithe', 'text', 'giving', 'Default Donation Category', 'Default donation category', true, NULL),
  ('require_donor_info', 'true', 'boolean', 'giving', 'Require Donor Info', 'Require donor information', true, NULL),
  ('auto_send_receipts', 'true', 'boolean', 'giving', 'Auto Send Receipts', 'Auto-send donation receipts', true, NULL)
ON CONFLICT (key) DO NOTHING;

-- 3.6 Volunteer Management Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_editable, validation_rules) VALUES
  ('enable_volunteer_signup', 'true', 'boolean', 'volunteers', 'Enable Volunteer Signup', 'Enable volunteer signup', true, NULL),
  ('volunteer_coordinator_email', 'volunteers@kiserianmain.org', 'text', 'volunteers', 'Volunteer Coordinator Email', 'Coordinator email', true, NULL),
  ('require_background_check', 'false', 'boolean', 'volunteers', 'Require Background Check', 'Require background check for volunteers', true, NULL),
  ('auto_assign_volunteer_roles', 'false', 'boolean', 'volunteers', 'Auto Assign Volunteer Roles', 'Auto-assign volunteer roles', true, NULL)
ON CONFLICT (key) DO NOTHING;
