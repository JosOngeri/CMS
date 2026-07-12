-- Add comprehensive website settings for church management
-- These settings make the website more dynamic and customizable

-- Site Branding Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('site_name', 'Kiserian Main SDA Church', 'text', 'branding', 'Church Name', 'Official name of the church', true, true, '{"minLength": 2, "maxLength": 100}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('site_tagline', 'A Place of Worship and Community', 'text', 'branding', 'Church Tagline', 'Tagline or slogan for the church', true, true, '{"maxLength": 200}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('site_logo_url', '/logo.png', 'text', 'branding', 'Logo URL', 'Path to church logo image', true, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('site_favicon_url', '/favicon.ico', 'text', 'branding', 'Favicon URL', 'Path to favicon icon', true, true, '{}')
ON CONFLICT (key) DO NOTHING;

-- Contact Information Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('contact_phone', '+254700000000', 'text', 'contact', 'Phone Number', 'Main church phone number', true, true, '{"minLength": 10}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('contact_email', 'info@kiseriansda.org', 'text', 'contact', 'Email Address', 'Main church email address', true, true, '{"minLength": 5}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('contact_address', 'Kiserian, Kenya', 'text', 'contact', 'Physical Address', 'Church physical address', true, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('contact_facebook', '', 'text', 'contact', 'Facebook URL', 'Facebook page URL', true, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('contact_twitter', '', 'text', 'contact', 'Twitter URL', 'Twitter/X profile URL', true, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('contact_instagram', '', 'text', 'contact', 'Instagram URL', 'Instagram profile URL', true, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('contact_youtube', '', 'text', 'contact', 'YouTube URL', 'YouTube channel URL', true, true, '{}')
ON CONFLICT (key) DO NOTHING;

-- Service Times Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('service_sabbath_school', '09:00', 'text', 'services', 'Sabbath School Time', 'Sabbath school start time', true, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('service_main', '11:00', 'text', 'services', 'Main Service Time', 'Main church service start time', true, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('service_afternoon', '14:00', 'text', 'services', 'Afternoon Service Time', 'Afternoon service start time', true, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('service_midweek', '18:30', 'text', 'services', 'Midweek Service Time', 'Midweek prayer meeting time', true, true, '{}')
ON CONFLICT (key) DO NOTHING;

-- Member Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('member_approval_required', 'true', 'boolean', 'members', 'Require Member Approval', 'New members require admin approval before access', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('member_default_role', 'Member', 'select', 'members', 'Default Member Role', 'Default role for new members', false, true, '{"enum": ["Member", "Visitor"]}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('member_profile_visibility', 'members', 'select', 'members', 'Member Profile Visibility', 'Who can view member profiles', false, true, '{"enum": ["public", "members", "admin"]}')
ON CONFLICT (key) DO NOTHING;

-- Event Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('event_registration_required', 'true', 'boolean', 'events', 'Require Event Registration', 'Members must register for events', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('event_max_capacity', '100', 'number', 'events', 'Default Event Capacity', 'Default maximum capacity for events', false, true, '{"min": 1, "max": 1000}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('event_reminder_hours', '24', 'number', 'events', 'Event Reminder Hours', 'Hours before event to send reminder', false, true, '{"min": 1, "max": 168}')
ON CONFLICT (key) DO NOTHING;

-- Notification Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('notification_email_enabled', 'true', 'boolean', 'notifications', 'Email Notifications', 'Enable email notifications', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('notification_sms_enabled', 'true', 'boolean', 'notifications', 'SMS Notifications', 'Enable SMS notifications', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('notification_announcements', 'true', 'boolean', 'notifications', 'Announcement Notifications', 'Notify members of new announcements', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('notification_events', 'true', 'boolean', 'notifications', 'Event Notifications', 'Notify members of new events', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('notification_payments', 'true', 'boolean', 'notifications', 'Payment Notifications', 'Notify members of payment confirmations', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

-- Security Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('security_password_min_length', '8', 'number', 'security', 'Minimum Password Length', 'Minimum required password length', false, true, '{"min": 6, "max": 32}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('security_session_timeout', '60', 'number', 'security', 'Session Timeout (minutes)', 'User session timeout in minutes', false, true, '{"min": 15, "max": 480}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('security_max_login_attempts', '5', 'number', 'security', 'Max Login Attempts', 'Maximum failed login attempts before lockout', false, true, '{"min": 3, "max": 10}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('security_lockout_duration', '30', 'number', 'security', 'Lockout Duration (minutes)', 'Account lockout duration after failed attempts', false, true, '{"min": 5, "max": 1440}')
ON CONFLICT (key) DO NOTHING;

-- UI Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('ui_default_page', 'dashboard', 'select', 'ui', 'Default Page', 'Default page after login', false, true, '{"enum": ["dashboard", "announcements", "events", "payments"]}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('ui_items_per_page', '20', 'number', 'ui', 'Items Per Page', 'Default number of items per page in lists', false, true, '{"min": 5, "max": 100}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('ui_sidebar_collapsed', 'false', 'boolean', 'ui', 'Sidebar Collapsed by Default', 'Start with sidebar collapsed', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('ui_compact_mode', 'false', 'boolean', 'ui', 'Compact Mode', 'Use compact UI with smaller elements', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

-- Feature Flags
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('feature_gallery_enabled', 'true', 'boolean', 'features', 'Photo Gallery', 'Enable photo gallery feature', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('feature_donations_enabled', 'true', 'boolean', 'features', 'Donations', 'Enable donations feature', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('feature_volunteer_signup', 'true', 'boolean', 'features', 'Volunteer Sign-up', 'Enable volunteer sign-up feature', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('feature_prayer_requests', 'true', 'boolean', 'features', 'Prayer Requests', 'Enable prayer requests feature', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('feature_sermon_archive', 'false', 'boolean', 'features', 'Sermon Archive', 'Enable sermon archive feature', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

-- Department Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('department_auto_assign', 'false', 'boolean', 'departments', 'Auto-assign Departments', 'Automatically assign members to departments based on role', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('department_max_per_member', '3', 'number', 'departments', 'Max Departments per Member', 'Maximum number of departments a member can join', false, true, '{"min": 1, "max": 10}')
ON CONFLICT (key) DO NOTHING;

-- Treasury Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('treasury_fiscal_year_start', '01', 'select', 'treasury', 'Fiscal Year Start Month', 'Month when fiscal year starts', false, true, '{"enum": ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('treasury_currency', 'KES', 'select', 'treasury', 'Currency', 'Default currency for financial records', false, true, '{"enum": ["KES", "USD", "EUR", "GBP"]}')
ON CONFLICT (key) DO NOTHING;

-- Content Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('content_moderation_enabled', 'true', 'boolean', 'content', 'Content Moderation', 'Enable content moderation for user posts', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('content_auto_approve_members', 'true', 'boolean', 'content', 'Auto-approve Member Content', 'Auto-approve content from trusted members', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

-- Add helpful comments
COMMENT ON COLUMN settings.category IS 'Categories: branding, contact, services, members, events, notifications, security, ui, features, departments, treasury, content, payment';
