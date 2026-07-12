-- Update existing settings with default values
-- This script updates settings that already exist with their default values

-- Phase 1: High Priority Site Settings

-- 1.1 Maintenance Mode Settings
UPDATE settings SET value = 'false' WHERE key = 'maintenance_mode_enabled';
UPDATE settings SET value = 'Our website is currently under maintenance. Please check back soon.' WHERE key = 'maintenance_message';
UPDATE settings SET value = 'true' WHERE key = 'maintenance_admin_bypass';

-- 1.2 Church Information Settings
UPDATE settings SET value = 'Kiserian Main SDA Church' WHERE key = 'church_name';
UPDATE settings SET value = 'Kiserian, Kenya' WHERE key = 'church_address';
UPDATE settings SET value = '+254 700 000 000' WHERE key = 'church_phone';
UPDATE settings SET value = 'info@kiserianmain.org' WHERE key = 'church_email';
UPDATE settings SET value = '' WHERE key = 'church_map_url';
UPDATE settings SET value = 'Pastor Name' WHERE key = 'pastor_name';

-- 1.3 Service Streaming Settings
UPDATE settings SET value = '' WHERE key = 'youtube_stream_url';
UPDATE settings SET value = '' WHERE key = 'facebook_stream_url';
UPDATE settings SET value = '' WHERE key = 'zoom_meeting_url';
UPDATE settings SET value = 'Sabbath: 9:00 AM - 12:00 PM
Wednesday: 6:30 PM - 8:00 PM' WHERE key = 'streaming_schedule';

-- 1.4 Announcement Banner Settings
UPDATE settings SET value = 'false' WHERE key = 'announcement_banner_enabled';
UPDATE settings SET value = '' WHERE key = 'announcement_banner_text';
UPDATE settings SET value = '#10B981' WHERE key = 'announcement_banner_color';
UPDATE settings SET value = '' WHERE key = 'announcement_banner_link';
UPDATE settings SET value = '' WHERE key = 'announcement_banner_expiry';

-- Phase 2: Medium Priority Site Settings

-- 2.1 Email Notification Settings
UPDATE settings SET value = 'admin@kiserianmain.org' WHERE key = 'notification_email';
UPDATE settings SET value = 'true' WHERE key = 'notify_new_members';
UPDATE settings SET value = 'true' WHERE key = 'notify_event_signups';
UPDATE settings SET value = 'true' WHERE key = 'notify_prayer_requests';
UPDATE settings SET value = 'true' WHERE key = 'notify_donations';
UPDATE settings SET value = 'true' WHERE key = 'notify_department_requests';

-- 2.2 SEO & Analytics Settings
UPDATE settings SET value = 'Kiserian Main SDA Church' WHERE key = 'site_title';
UPDATE settings SET value = 'Welcome to Kiserian Main SDA Church - A community of believers dedicated to serving God and our community.' WHERE key = 'meta_description';
UPDATE settings SET value = '' WHERE key = 'google_analytics_id';
UPDATE settings SET value = '' WHERE key = 'google_search_console';

-- 2.3 File Upload Settings
UPDATE settings SET value = '10' WHERE key = 'max_file_size_mb';
UPDATE settings SET value = 'jpg,jpeg,png,webp,pdf,doc,docx' WHERE key = 'allowed_file_types';
UPDATE settings SET value = '1920' WHERE key = 'max_image_width';
UPDATE settings SET value = '1080' WHERE key = 'max_image_height';
UPDATE settings SET value = 'true' WHERE key = 'auto_compress_images';

-- 2.4 Security Settings
UPDATE settings SET value = '24' WHERE key = 'session_timeout_hours';
UPDATE settings SET value = 'false' WHERE key = 'require_email_verification';
UPDATE settings SET value = '8' WHERE key = 'password_min_length';
UPDATE settings SET value = 'true' WHERE key = 'require_special_chars';
UPDATE settings SET value = 'false' WHERE key = 'enable_2fa';
UPDATE settings SET value = '5' WHERE key = 'failed_login_lockout';

-- Phase 3: Low Priority Site Settings

-- 3.1 Default User Settings
UPDATE settings SET value = 'Member' WHERE key = 'default_user_role';
UPDATE settings SET value = '' WHERE key = 'auto_assign_department';
UPDATE settings SET value = 'true' WHERE key = 'send_welcome_email';
UPDATE settings SET value = 'Welcome to Kiserian Main SDA Church! We are blessed to have you join our community.' WHERE key = 'welcome_email_template';

-- 3.2 Content Moderation Settings
UPDATE settings SET value = 'true' WHERE key = 'auto_approve_comments';
UPDATE settings SET value = 'true' WHERE key = 'enable_profanity_filter';
UPDATE settings SET value = 'false' WHERE key = 'require_approval_photos';
UPDATE settings SET value = 'false' WHERE key = 'require_approval_announcements';
UPDATE settings SET value = 'false' WHERE key = 'require_approval_events';
UPDATE settings SET value = 'false' WHERE key = 'require_approval_prayer_requests';

-- 3.3 Backup Settings
UPDATE settings SET value = 'false' WHERE key = 'enable_auto_backup';
UPDATE settings SET value = 'Weekly' WHERE key = 'backup_frequency';
UPDATE settings SET value = '30' WHERE key = 'backup_retention_days';
UPDATE settings SET value = 'admin@kiserianmain.org' WHERE key = 'backup_notification_email';

-- 3.4 Event Settings
UPDATE settings SET value = 'true' WHERE key = 'enable_event_registration';
UPDATE settings SET value = '50' WHERE key = 'default_max_attendees';
UPDATE settings SET value = 'true' WHERE key = 'enable_waitlist';
UPDATE settings SET value = 'false' WHERE key = 'require_event_approval';
UPDATE settings SET value = '24' WHERE key = 'event_reminder_hours';

-- 3.5 Donation/Giving Settings
UPDATE settings SET value = 'false' WHERE key = 'enable_online_giving';
UPDATE settings SET value = '100,500,1000,5000' WHERE key = 'suggested_donation_amounts';
UPDATE settings SET value = 'Tithe' WHERE key = 'default_donation_category';
UPDATE settings SET value = 'true' WHERE key = 'require_donor_info';
UPDATE settings SET value = 'true' WHERE key = 'auto_send_receipts';

-- 3.6 Volunteer Management Settings
UPDATE settings SET value = 'true' WHERE key = 'enable_volunteer_signup';
UPDATE settings SET value = 'volunteers@kiserianmain.org' WHERE key = 'volunteer_coordinator_email';
UPDATE settings SET value = 'false' WHERE key = 'require_background_check';
UPDATE settings SET value = 'false' WHERE key = 'auto_assign_volunteer_roles';

-- Event poster setting
UPDATE settings SET value = '' WHERE key = 'default_event_poster';
