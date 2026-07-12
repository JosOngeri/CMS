-- KMainCMS Complete Seed Data
-- Seventh-day Adventist Church - Kiserian Main
-- Sample data for all tables

-- ============================================
-- AUTH MODULE SEED DATA
-- ============================================

-- Insert default roles
INSERT INTO roles (name, description, parent_role_id, level, permissions) VALUES
('Super Admin', 'Full system access', NULL, 1, '{"all": true}'),
('Pastor', 'Church pastor with administrative access', 2, 2, '{"users": ["read", "write"], "content": ["read", "write"], "members": ["read", "write"], "departments": ["read", "write"], "treasury": ["read", "write"]}'),
('First Elder', 'First elder with administrative access', 2, 3, '{"users": ["read"], "content": ["read", "write"], "members": ["read", "write"], "departments": ["read", "write"], "treasury": ["read"]}'),
('Elder', 'Church leadership and support', 3, 4, '{"users": ["read"], "content": ["read"], "members": ["read", "write"], "departments": ["read", "write"]}'),
('Department Head', 'Head of a department', NULL, 5, '{"content": ["read", "write"], "members": ["read"], "departments": ["read", "write"]}'),
('Member', 'Regular church member', NULL, 6, '{"content": ["read"], "members": ["read"]}')
ON CONFLICT (name) DO NOTHING;

-- Insert sample users (passwords are hashed - these are placeholders)
-- In production, use proper password hashing
INSERT INTO users (email, password_hash, first_name, last_name, username, phone, is_active, email_verified) VALUES
('admin@sda.org', '$2a$10$placeholder_hash_for_admin123', 'Admin', 'User', 'admin', '+254700000000', true, true),
('pastor@sda.org', '$2a$10$placeholder_hash_for_pastor123', 'Pastor', 'John', 'pastor', '+254700000001', true, true),
('elder@sda.org', '$2a$10$placeholder_hash_for_elder123', 'Elder', 'James', 'elder', '+254700000003', true, true),
('treasurer@sda.org', '$2a$10$placeholder_hash_for_treasurer123', 'Treasurer', 'Mary', 'treasurer', '+254700000004', true, true),
('clerk@sda.org', '$2a$10$placeholder_hash_for_clerk123', 'Church', 'Clerk', 'clerk', '+254700000005', true, true),
('member@sda.org', '$2a$10$placeholder_hash_for_member123', 'Church', 'Member', 'member', '+254700000002', true, true)
ON CONFLICT (email) DO NOTHING;

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'Super Admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r
WHERE u.username = 'pastor' AND r.name = 'Pastor'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r
WHERE u.username = 'elder' AND r.name = 'Elder'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r
WHERE u.username = 'treasurer' AND r.name = 'Department Head'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r
WHERE u.username = 'clerk' AND r.name = 'Department Head'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r
WHERE u.username = 'member' AND r.name = 'Member'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ============================================
-- DEPARTMENTS MODULE SEED DATA
-- ============================================

-- Insert departments based on church structure
INSERT INTO departments (name, description, category, leader_name, leader_contact, is_active) VALUES
-- Leadership
('Elders', 'Church Elders Council', 'Leadership', 'George Ng''ang''a', '+254711000001', true),
('Deaconry', 'Deacons and Deaconesses', 'Leadership', 'Kennedy Mbatia', '+254711000002', true),
('Treasurer', 'Church Financial Management', 'Leadership', 'Elizabeth Mboya', '+254711000003', true),
('Church Clerk', 'Church Records and Administration', 'Leadership', 'Esther Okemwa', '+254711000004', true),

-- Ministries
('Youth Ministry', 'Youth Programs and Activities', 'Ministry', 'Mitchel Chabari', '+254711000005', true),
('Children Ministry', 'Children Programs and Education', 'Ministry', 'Elizabeth Magembe', '+254711000006', true),
('Adventist Men Ministry', 'Men Ministry Programs', 'Ministry', 'Okemwa Ogwoka', '+254711000007', true),
('Adventist Women Ministry', 'Women Ministry Programs', 'Ministry', 'Eucabeth Chacha', '+254711000008', true),
('Adventist Possibility Ministry', 'Possibility Ministry Programs', 'Ministry', 'Millicent Okoth', '+254711000009', true),
('Health Ministry', 'Health and Wellness Programs', 'Ministry', 'Raphael Mahianyu', '+254711000010', true),
('Family Life', 'Family Programs and Counseling', 'Ministry', 'Gerald Magati', '+254711000011', true),

-- Music and Worship
('Music Ministry', 'Church Music and Choir', 'Ministry', 'George Ochogo', '+254711000012', true),
('Choristers', 'Church Choir', 'Ministry', 'Maureen Ochogo', '+254711000013', true),
('Church Choir', 'Main Church Choir', 'Ministry', 'Linet Okemwa', '+254711000014', true),
('Pianist', 'Piano and Keyboard', 'Ministry', 'Sammy Mureithi', '+254711000015', true),
('PA System', 'Sound and Audio', 'Ministry', 'James Ogato', '+254711000016', true),

-- Sabbath School
('Sabbath School', 'Sabbath School Programs', 'Education', 'Kirsten Gathogo', '+254711000017', true),
('Education', 'Church Education Programs', 'Education', 'Abel Nyakundi', '+254711000018', true),

-- Youth Programs
('Adventurer Club', 'Adventurer Programs', 'Youth', 'Casper Lewis', '+254711000019', true),
('Ambassadors', 'Ambassador Programs', 'Youth', 'Nancy Gathoni', '+254711000020', true),
('Pathfinder', 'Pathfinder Programs', 'Youth', 'Rhoda Mabiria', '+254711000021', true),
('VBS', 'Vacation Bible School', 'Youth', 'Mary Benson', '+254711000022', true),

-- Support Ministries
('Dorcas', 'Dorcas Ministry', 'Support', 'Julian Maihanyu', '+254711000023', true),
('Personal Ministry', 'Personal Evangelism', 'Ministry', 'Thomas Gichinga', '+254711000024', true),
('Publishing', 'Publishing and Literature', 'Ministry', 'Monicah Ndung''u', '+254711000025', true),
('Evangelism', 'Evangelism Programs', 'Ministry', 'Stephen Ng''ang''a', '+254711000026', true),
('Stewardship', 'Stewardship Programs', 'Ministry', 'George Ng''ang''a', '+254711000027', true),

-- Special Programs
('Camp Meeting', 'Camp Meeting Organization', 'Special', 'Benard Chieng''a', '+254711000028', true),
('Development', 'Church Development Projects', 'Special', 'Gerald Magati', '+254711000029', true),
('Welfare', 'Church Welfare Programs', 'Special', 'Gladys Kimori', '+254711000030', true),
('Interest Coordinator', 'New Member Interests', 'Special', 'Ken Okoth', '+254711000031', true),

-- Communication
('Communication Secretary', 'Church Communications', 'Support', 'Josiah Omesa', '+254711000032', true),
('V.O.P./S.O.P.', 'Voice of Prophecy/School of Prophets', 'Education', 'Mbatia Njoroge', '+254711000033', true),

-- Other Ministries
('Prayer Ministry', 'Prayer Programs', 'Ministry', 'Edith Wachira', '+254711000034', true),
('Religious Liberty', 'Religious Liberty Programs', 'Ministry', 'George Ng''ang''a', '+254711000035', true),
('Nurture and Retention', 'Member Nurturing', 'Ministry', 'Henry Mokaya', '+254711000036', true),
('Library', 'Church Library', 'Education', 'Moses Magembe', '+254711000037', true),
('School Chair', 'Church School Management', 'Education', 'Moses Magembe', '+254711000038', true)
ON CONFLICT (name) DO NOTHING;

-- Assign users to departments
INSERT INTO department_members (user_id, department_id, role, is_active, joined_at)
SELECT u.id, d.id, 'Leader', true, NOW()
FROM users u, departments d
WHERE u.username = 'pastor' AND d.name = 'Elders'
ON CONFLICT (user_id, department_id) DO NOTHING;

INSERT INTO department_members (user_id, department_id, role, is_active, joined_at)
SELECT u.id, d.id, 'Leader', true, NOW()
FROM users u, departments d
WHERE u.username = 'admin' AND d.name = 'Youth Ministry'
ON CONFLICT (user_id, department_id) DO NOTHING;

INSERT INTO department_members (user_id, department_id, role, is_active, joined_at)
SELECT u.id, d.id, 'Leader', true, NOW()
FROM users u, departments d
WHERE u.username = 'treasurer' AND d.name = 'Treasurer'
ON CONFLICT (user_id, department_id) DO NOTHING;

INSERT INTO department_members (user_id, department_id, role, is_active, joined_at)
SELECT u.id, d.id, 'Leader', true, NOW()
FROM users u, departments d
WHERE u.username = 'clerk' AND d.name = 'Church Clerk'
ON CONFLICT (user_id, department_id) DO NOTHING;

INSERT INTO department_members (user_id, department_id, role, is_active, joined_at)
SELECT u.id, d.id, 'Member', true, NOW()
FROM users u, departments d
WHERE u.username = 'member' AND d.name = 'Sabbath School'
ON CONFLICT (user_id, department_id) DO NOTHING;

-- ============================================
-- CONTENT MODULE SEED DATA
-- ============================================

-- Insert content categories
INSERT INTO content_categories (name, slug, description, icon, sort_order) VALUES
('Announcements', 'announcements', 'Church announcements and updates', 'megaphone', 1),
('Sermons', 'sermons', 'Sermon recordings and notes', 'book-open', 2),
('Events', 'events', 'Upcoming and past church events', 'calendar', 3),
('News', 'news', 'Church news and updates', 'newspaper', 4),
('Resources', 'resources', 'Church resources and materials', 'folder', 5),
('About Us', 'about-us', 'Information about our church', 'info', 6),
('Ministries', 'ministries', 'Church ministry information', 'users', 7)
ON CONFLICT (slug) DO NOTHING;

-- Insert content tags
INSERT INTO content_tags (name, slug, color) VALUES
('Important', 'important', '#EF4444'),
('Featured', 'featured', '#F59E0B'),
('New', 'new', '#10B981'),
('Update', 'update', '#3B82F6'),
('Event', 'event', '#8B5CF6'),
('Sermon', 'sermon', '#EC4899')
ON CONFLICT (slug) DO NOTHING;

-- Insert website settings
INSERT INTO website_settings (key_name, value, value_type, category, description) VALUES
('site_title', 'Kiserian Main SDA Church', 'string', 'general', 'Website title'),
('site_description', 'Welcome to Kiserian Main SDA Church - A place of worship and community', 'string', 'general', 'Website description'),
('contact_email', 'info@kiseriansda.org', 'string', 'contact', 'Contact email'),
('contact_phone', '+254 700 000 000', 'string', 'contact', 'Contact phone'),
('address', 'Kiserian, Kenya', 'string', 'contact', 'Church address'),
('facebook_url', 'https://facebook.com/kiseriansda', 'string', 'social', 'Facebook page URL'),
('twitter_url', 'https://twitter.com/kiseriansda', 'string', 'social', 'Twitter profile URL'),
('instagram_url', 'https://instagram.com/kiseriansda', 'string', 'social', 'Instagram profile URL'),
('youtube_url', 'https://youtube.com/kiseriansda', 'string', 'social', 'YouTube channel URL')
ON CONFLICT (key_name) DO NOTHING;

-- Insert sample content items
INSERT INTO content_items (title, slug, content, content_type, category_id, author_id, status, published_at, priority) VALUES
('Welcome to Our Church', 'welcome-to-our-church', 'We are excited to welcome you to Kiserian Main SDA Church. Our community is dedicated to worship, fellowship, and service.', 'page', 
  (SELECT id FROM content_categories WHERE slug = 'about-us'),
  (SELECT id FROM users WHERE username = 'admin'),
  'published', NOW(), 1),
('This Week''s Sermon', 'this-weeks-sermon', 'Join us this Saturday for a powerful sermon on faith and community.', 'post',
  (SELECT id FROM content_categories WHERE slug = 'sermons'),
  (SELECT id FROM users WHERE username = 'pastor'),
  'published', NOW(), 2),
('Upcoming Events', 'upcoming-events', 'Don''t miss our upcoming events including the youth camp meeting and community outreach program.', 'post',
  (SELECT id FROM content_categories WHERE slug = 'events'),
  (SELECT id FROM users WHERE username = 'admin'),
  'published', NOW(), 1)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- GALLERY MODULE SEED DATA
-- ============================================

-- Insert gallery categories
INSERT INTO gallery_categories (name, slug, description, icon, color, sort_order, is_active) VALUES
('Church Services', 'church-services', 'Regular church services and worship', 'church', '#3B82F6', 1, true),
('Events', 'events', 'Special church events and celebrations', 'calendar', '#10B981', 2, true),
('Community', 'community', 'Community outreach and service activities', 'users', '#F59E0B', 3, true),
('Youth', 'youth', 'Youth group activities and programs', 'heart', '#8B5CF6', 4, true),
('Music', 'music', 'Music ministry and performances', 'music', '#EC4899', 5, true),
('Facilities', 'facilities', 'Church buildings and facilities', 'building', '#6B7280', 6, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample gallery albums
INSERT INTO gallery_albums (title, description, created_by, is_private) VALUES
('Sabbath Service Highlights', 'Highlights from our weekly Sabbath services',
  (SELECT id FROM users WHERE username = 'admin'), false),
('Youth Camp 2024', 'Photos from our annual youth camp',
  (SELECT id FROM users WHERE username = 'admin'), false),
('Community Outreach', 'Our community service activities',
  (SELECT id FROM users WHERE username = 'admin'), false)
ON CONFLICT DO NOTHING;

-- ============================================
-- PAYMENTS MODULE SEED DATA
-- ============================================

-- Insert payment methods
INSERT INTO payment_methods (name, type, provider, account_number, is_active) VALUES
('M-Pesa', 'mobile_money', 'Safaricom', '174379', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO payment_methods (name, type, provider, account_number, is_active) VALUES
('Airtel Money', 'mobile_money', 'Airtel', '', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO payment_methods (name, type, provider, account_number, is_active) VALUES
('Bank Transfer', 'bank_transfer', 'KCB Bank', '1234567890', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO payment_methods (name, type, provider, account_number, is_active) VALUES
('Cash', 'cash', '', '', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- TREASURY MODULE SEED DATA
-- ============================================

-- Insert church accounts
INSERT INTO church_accounts (account_name, account_number, bank_name, account_type, balance, currency, is_active) VALUES
('Main Operating Account', '1234567890', 'KCB Bank', 'checking', 500000.00, 'KES', true)
ON CONFLICT (account_name) DO NOTHING;

INSERT INTO church_accounts (account_name, account_number, bank_name, account_type, balance, currency, is_active) VALUES
('Tithe Account', '0987654321', 'Equity Bank', 'savings', 250000.00, 'KES', true)
ON CONFLICT (account_name) DO NOTHING;

INSERT INTO church_accounts (account_name, account_number, bank_name, account_type, balance, currency, is_active) VALUES
('Building Fund Account', '1122334455', 'Co-op Bank', 'savings', 1000000.00, 'KES', true)
ON CONFLICT (account_name) DO NOTHING;

-- Insert income categories
INSERT INTO income_categories (name, description, code) VALUES
('Tithes', 'Member tithes', 'TITHE'),
('Offerings', 'General offerings', 'OFFERING'),
('Mission Offerings', 'Mission support offerings', 'MISSION'),
('Sabbath School Offerings', 'Sabbath School offerings', 'SS_OFFERING'),
('Donations', 'General donations', 'DONATION'),
('Special Projects', 'Special project contributions', 'SPECIAL'),
('Investment Income', 'Interest and investment returns', 'INVESTMENT')
ON CONFLICT (code) DO NOTHING;

-- Insert expense categories
INSERT INTO expense_categories (name, description, code, budget_limit) VALUES
('Salaries', 'Staff salaries and wages', 'SALARY', 200000.00),
('Utilities', 'Water, electricity, and other utilities', 'UTILITIES', 50000.00),
('Maintenance', 'Building and equipment maintenance', 'MAINTENANCE', 75000.00),
('Programs', 'Church programs and events', 'PROGRAMS', 100000.00),
('Mission Support', 'Mission and evangelism support', 'MISSION_EXP', 50000.00),
('Office Supplies', 'Office supplies and materials', 'SUPPLIES', 25000.00),
('Insurance', 'Insurance premiums', 'INSURANCE', 30000.00),
('Charity', 'Charitable giving and support', 'CHARITY', 40000.00)
ON CONFLICT (code) DO NOTHING;

-- Insert sample budget
INSERT INTO budgets (name, fiscal_year, start_date, end_date, total_income_budget, total_expense_budget, status, created_by) VALUES
('2024 Annual Budget', 2024, '2024-01-01', '2024-12-31', 5000000.00, 4500000.00, 'active',
  (SELECT id FROM users WHERE username = 'treasurer'))
ON CONFLICT DO NOTHING;

-- ============================================
-- SMS MODULE SEED DATA
-- ============================================

-- Insert SMS provider
INSERT INTO sms_providers (name, provider_type, sender_id, is_active) VALUES
('Africas Talking', 'africas_talking', 'KMainCMS', false)
ON CONFLICT DO NOTHING;

-- Insert SMS templates
INSERT INTO sms_templates (name, template_type, content, variables, created_by) VALUES
('Welcome Message', 'welcome', 'Welcome to Kiserian Main SDA Church! We are blessed to have you as part of our family. Join us this Saturday for worship.', '[]',
  (SELECT id FROM users WHERE username = 'admin')),
('Service Reminder', 'reminder', 'Reminder: Church service this Saturday at 9:00 AM. Do not miss out!', '[]',
  (SELECT id FROM users WHERE username = 'admin')),
('Event Notification', 'notification', 'Event: {event_name} on {event_date}. We hope to see you there!', '["event_name", "event_date"]',
  (SELECT id FROM users WHERE username = 'admin')),
('Prayer Request', 'alert', 'Prayer request: {prayer_request}. Please keep {name} in your prayers.', '["prayer_request", "name"]',
  (SELECT id FROM users WHERE username = 'admin'))
ON CONFLICT DO NOTHING;

-- ============================================
-- TELEGRAM MODULE SEED DATA
-- ============================================

-- Insert telegram settings
INSERT INTO telegram_settings (bot_token, bot_username, webhook_url) VALUES
('', '', '')
ON CONFLICT DO NOTHING;

-- Insert telegram channel
INSERT INTO telegram_channels (channel_id, channel_name, channel_username, is_active, auto_sync_to_announcements) VALUES
('-1001234567890', 'Kiserian Main SDA Church', '@sdakiserianmain', true, false)
ON CONFLICT (channel_id) DO NOTHING;

-- ============================================
-- NOTIFICATIONS MODULE SEED DATA
-- ============================================

-- Insert notification types
INSERT INTO notification_types (name, description, icon, color) VALUES
('Content Update', 'New or updated content notifications', 'file-text', '#3B82F6'),
('Event Reminder', 'Event and meeting reminders', 'calendar', '#F59E0B'),
('Approval Required', 'Items requiring your approval', 'check-circle', '#EF4444'),
('System Alert', 'System notifications and alerts', 'alert-triangle', '#EF4444'),
('Message', 'New messages and communications', 'message-square', '#10B981'),
('Financial', 'Financial notifications and updates', 'dollar-sign', '#10B981');

-- ============================================
-- DOCUMENTS MODULE SEED DATA
-- ============================================

-- Insert document categories
INSERT INTO document_categories (name, slug, description, icon) VALUES
('Policies', 'policies', 'Church policies and guidelines', 'file-text'),
('Forms', 'forms', 'Church forms and applications', 'clipboard'),
('Reports', 'reports', 'Church reports and documents', 'bar-chart'),
('Resources', 'resources', 'Educational and training resources', 'book'),
('Minutes', 'minutes', 'Meeting minutes and records', 'clock')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- APPROVALS MODULE SEED DATA
-- ============================================

-- Insert approval workflows
INSERT INTO approval_workflows (name, description, entity_type, approval_chain, is_active, created_by) VALUES
('Content Approval', 'Approval workflow for publishing content', 'content', '[3, 2, 1]', true,
  (SELECT id FROM users WHERE username = 'admin')),
('Document Approval', 'Approval workflow for official documents', 'document', '[3, 2, 1]', true,
  (SELECT id FROM users WHERE username = 'admin')),
('Expense Approval', 'Approval workflow for expenses above threshold', 'expense', '[3, 2, 1]', true,
  (SELECT id FROM users WHERE username = 'admin')),
('Event Approval', 'Approval workflow for church events', 'event', '[3, 2, 1]', true,
  (SELECT id FROM users WHERE username = 'admin'))
ON CONFLICT DO NOTHING;

-- ============================================
-- SETTINGS MODULE SEED DATA
-- ============================================

-- Insert system settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable) VALUES
-- General Settings
('site_name', 'Kiserian Main SDA Church', 'string', 'general', 'Site Name', 'The name of the church website', true, true),
('site_description', 'Welcome to Kiserian Main SDA Church', 'string', 'general', 'Site Description', 'A brief description of the church', true, true),
('site_logo', '', 'string', 'general', 'Site Logo URL', 'URL to the church logo image', true, true),
('maintenance_mode', 'false', 'boolean', 'general', 'Maintenance Mode', 'Enable maintenance mode to take the site offline', false, true),

-- Appearance Settings
('primary_color', '#10B981', 'color', 'appearance', 'Primary Color', 'Main theme color for the site', true, true),
('secondary_color', '#3B82F6', 'color', 'appearance', 'Secondary Color', 'Secondary theme color for the site', true, true),
('accent_color', '#F59E0B', 'color', 'appearance', 'Accent Color', 'Accent color for highlights', true, true),
('font_family', 'Inter', 'string', 'appearance', 'Font Family', 'Default font family for the site', true, true),

-- Contact Settings
('church_address', 'Kiserian, Kenya', 'string', 'contact', 'Church Address', 'Physical address of the church', true, true),
('church_phone', '+254 700 000 000', 'string', 'contact', 'Church Phone', 'Main church phone number', true, true),
('church_email', 'info@kiseriansda.org', 'string', 'contact', 'Church Email', 'Main church email address', true, true),

-- Social Media Settings
('facebook_url', 'https://facebook.com/kiseriansda', 'string', 'social', 'Facebook URL', 'Facebook page URL', true, true),
('twitter_url', 'https://twitter.com/kiseriansda', 'string', 'social', 'Twitter URL', 'Twitter profile URL', true, true),
('instagram_url', 'https://instagram.com/kiseriansda', 'string', 'social', 'Instagram URL', 'Instagram profile URL', true, true),
('youtube_url', 'https://youtube.com/kiseriansda', 'string', 'social', 'YouTube URL', 'YouTube channel URL', true, true),

-- Payment Settings
('mpesa_shortcode', '174379', 'string', 'payment', 'M-Pesa Shortcode', 'M-Pesa Paybill or Till Number', false, true),
('mpesa_environment', 'sandbox', 'string', 'payment', 'M-Pesa Environment', 'Sandbox or Production environment', false, true),

-- SMS Settings
('sms_provider', 'at', 'string', 'sms', 'SMS Provider', 'SMS service provider', false, true),
('sms_sender_id', 'KISERIAN', 'string', 'sms', 'SMS Sender ID', 'Sender ID for outgoing SMS messages', false, true),
('sms_enabled', 'true', 'boolean', 'sms', 'SMS Enabled', 'Enable or disable SMS functionality', false, true),

-- Service Settings
('saturday_service_time', '09:00', 'string', 'service', 'Saturday Service Time', 'Saturday worship service time', true, true),
('wednesday_service_time', '18:00', 'string', 'service', 'Wednesday Service Time', 'Wednesday prayer meeting time', true, true),
('pastor_name', 'Pastor John', 'string', 'service', 'Pastor Name', 'Name of the senior pastor', true, true),

-- Feature Flags
('enable_treasury', 'true', 'boolean', 'features', 'Enable Treasury', 'Enable treasury accounting module', false, true),
('enable_events', 'true', 'boolean', 'features', 'Enable Events', 'Enable events module', true, true),
('enable_announcements', 'true', 'boolean', 'features', 'Enable Announcements', 'Enable announcements module', true, true),
('enable_live_stream', 'false', 'boolean', 'features', 'Enable Live Stream', 'Enable live streaming feature', true, true)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- MEMBERS MODULE SEED DATA
-- ============================================

-- Insert sample members
INSERT INTO members (user_id, membership_number, first_name, last_name, date_of_birth, gender, marital_status, occupation, address, city, phone, email, baptism_date, membership_status, joined_date) VALUES
((SELECT id FROM users WHERE username = 'member'), 'MEM001', 'Church', 'Member', '1990-05-15', 'Male', 'Single', 'Engineer', '123 Main Street', 'Kiserian', '+254700000002', 'member@sda.org', '2010-06-12', 'active', '2010-06-12')
ON CONFLICT (membership_number) DO NOTHING;

-- Insert member groups
INSERT INTO member_groups (name, description, group_type, leader_id) VALUES
('Sabbath School Class A', 'Adult Sabbath School class', 'sabbath_school', 
  (SELECT id FROM members WHERE membership_number = 'MEM001')),
('Youth Group', 'Church youth fellowship group', 'youth', 
  (SELECT id FROM members WHERE membership_number = 'MEM001')),
('Prayer Warriors', 'Intercessory prayer group', 'prayer', 
  (SELECT id FROM members WHERE membership_number = 'MEM001'))
ON CONFLICT DO NOTHING;

-- Add member to groups
INSERT INTO member_group_memberships (member_id, group_id, role, joined_at)
SELECT m.id, g.id, 'leader', NOW()
FROM members m, member_groups g
WHERE m.membership_number = 'MEM001' AND g.name = 'Sabbath School Class A'
ON CONFLICT (member_id, group_id) DO NOTHING;

-- ============================================
-- SAMPLE TRANSACTIONS
-- ============================================

-- Insert sample transactions
INSERT INTO transactions (transaction_type, category_id, account_id, amount, description, reference_number, transaction_date, recorded_by, status, payment_method) VALUES
('income', 
  (SELECT id FROM income_categories WHERE code = 'TITHE'),
  (SELECT id FROM church_accounts WHERE account_number = '1234567890'),
  50000.00, 'Weekly tithe collection', 'TITHE-2024-001', CURRENT_DATE,
  (SELECT id FROM users WHERE username = 'treasurer'), 'approved', 'mobile_money'),
('expense',
  (SELECT id FROM expense_categories WHERE code = 'UTILITIES'),
  (SELECT id FROM church_accounts WHERE account_number = '1234567890'),
  15000.00, 'Monthly electricity bill', 'EXP-2024-001', CURRENT_DATE,
  (SELECT id FROM users WHERE username = 'treasurer'), 'approved', 'bank_transfer');

-- ============================================
-- SAMPLE NOTIFICATIONS
-- ============================================

-- Insert sample notifications
INSERT INTO notifications (user_id, type_id, title, message, is_read, metadata) VALUES
((SELECT id FROM users WHERE username = 'admin'),
  (SELECT id FROM notification_types WHERE name = 'Content Update' LIMIT 1),
  'New Content Published',
  'A new sermon has been published to the website.',
  false, '{"content_id": 1, "content_type": "sermon"}'),
((SELECT id FROM users WHERE username = 'pastor'),
  (SELECT id FROM notification_types WHERE name = 'Approval Required' LIMIT 1),
  'Expense Approval Needed',
  'A new expense requires your approval.',
  false, '{"expense_id": 1, "amount": 15000.00}');

-- ============================================
-- SAMPLE DEPARTMENT TASKS
-- ============================================

-- Insert sample department tasks
INSERT INTO department_tasks (department_id, title, description, assigned_to, assigned_by, due_date, priority, status) VALUES
((SELECT id FROM departments WHERE name = 'Youth Ministry'),
  'Plan Youth Camp',
  'Organize and plan the annual youth camp program',
  (SELECT id FROM users WHERE username = 'admin'),
  (SELECT id FROM users WHERE username = 'admin'),
  CURRENT_DATE + INTERVAL '30 days',
  'high', 'pending'),
((SELECT id FROM departments WHERE name = 'Music Ministry'),
  'Prepare Special Music',
  'Prepare special music for upcoming Sabbath service',
  (SELECT id FROM users WHERE username = 'admin'),
  (SELECT id FROM users WHERE username = 'pastor'),
  CURRENT_DATE + INTERVAL '7 days',
  'normal', 'in_progress')
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE DEPARTMENT MEETINGS
-- ============================================

-- Insert sample department meetings
INSERT INTO department_meetings (department_id, title, description, meeting_date, duration, location, organizer_id, status) VALUES
((SELECT id FROM departments WHERE name = 'Elders'),
  'Monthly Elders Meeting',
  'Regular monthly meeting of the church elders council',
  CURRENT_DATE + INTERVAL '7 days',
  120, 'Church Board Room',
  (SELECT id FROM users WHERE username = 'pastor'),
  'scheduled'),
((SELECT id FROM departments WHERE name = 'Youth Ministry'),
  'Youth Planning Meeting',
  'Planning meeting for youth activities',
  CURRENT_DATE + INTERVAL '3 days',
  90, 'Youth Room',
  (SELECT id FROM users WHERE username = 'admin'),
  'scheduled')
ON CONFLICT DO NOTHING;

-- Add meeting attendees
INSERT INTO department_meeting_attendees (meeting_id, member_id, status, response_time)
SELECT m.id, u.id, 'confirmed', NOW()
FROM department_meetings m, users u
WHERE m.title = 'Monthly Elders Meeting' AND u.username = 'elder'
ON CONFLICT (meeting_id, member_id) DO NOTHING;

INSERT INTO department_meeting_attendees (meeting_id, member_id, status, response_time)
SELECT m.id, u.id, 'confirmed', NOW()
FROM department_meetings m, users u
WHERE m.title = 'Youth Planning Meeting' AND u.username = 'admin'
ON CONFLICT (meeting_id, member_id) DO NOTHING;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Seed data completed successfully!';
  RAISE NOTICE 'Default users created:';
  RAISE NOTICE '  Admin: admin / admin123';
  RAISE NOTICE '  Pastor: pastor / pastor123';
  RAISE NOTICE '  Elder: elder / elder123';
  RAISE NOTICE '  Treasurer: treasurer / treasurer123';
  RAISE NOTICE '  Clerk: clerk / clerk123';
  RAISE NOTICE '  Member: member / member123';
END $$;
