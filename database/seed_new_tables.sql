-- Seed data for new system tables
-- This file contains initial seed data for the new tables created in the advanced migrations

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CHART OF ACCOUNTS SEED DATA
-- ============================================

-- Insert standard chart of accounts for church accounting
INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_active) VALUES
-- Assets (1000-1999)
('1000', 'Cash and Cash Equivalents', 'asset', true),
('1001', 'Main Church Bank Account', 'asset', true),
('1002', 'Petty Cash', 'asset', true),
('1100', 'Accounts Receivable', 'asset', true),
('1101', 'Member Contributions Receivable', 'asset', true),
('1200', 'Property, Plant and Equipment', 'asset', true),
('1201', 'Church Building', 'asset', true),
('1202', 'Church Equipment', 'asset', true),
('1203', 'Vehicles', 'asset', true),
('1300', 'Other Assets', 'asset', true),
('1301', 'Prepaid Expenses', 'asset', true),

-- Liabilities (2000-2999)
('2000', 'Accounts Payable', 'liability', true),
('2001', 'Vendor Payables', 'liability', true),
('2100', 'Accrued Expenses', 'liability', true),
('2101', 'Accrued Salaries', 'liability', true),
('2200', 'Other Liabilities', 'liability', true),
('2201', 'Deferred Revenue', 'liability', true),

-- Equity (3000-3999)
('3000', 'General Fund Equity', 'equity', true),
('3001', 'Building Fund Equity', 'equity', true),
('3002', 'Mission Fund Equity', 'equity', true),
('3100', 'Retained Earnings', 'equity', true),

-- Income (4000-4999)
('4000', 'Tithes and Offerings', 'income', true),
('4001', 'General Tithes', 'income', true),
('4002', 'Mission Offerings', 'income', true),
('4100', 'Special Contributions', 'income', true),
('4101', 'Building Fund Contributions', 'income', true),
('4102', 'Special Projects', 'income', true),
('4200', 'Program Income', 'income', true),
('4201', 'Event Income', 'income', true),
('4202', 'Seminar Income', 'income', true),
('4300', 'Other Income', 'income', true),
('4301', 'Investment Income', 'income', true),
('4302', 'Rental Income', 'income', true),

-- Expenses (5000-5999)
('5000', 'Program Expenses', 'expense', true),
('5001', 'Evangelism Expenses', 'expense', true),
('5002', 'Mission Expenses', 'expense', true),
('5100', 'Operating Expenses', 'expense', true),
('5101', 'Salaries and Wages', 'expense', true),
('5102', 'Utilities', 'expense', true),
('5103', 'Maintenance and Repairs', 'expense', true),
('5104', 'Office Supplies', 'expense', true),
('5200', 'Building Expenses', 'expense', true),
('5201', 'Building Maintenance', 'expense', true),
('5202', 'Property Insurance', 'expense', true),
('5300', 'Administrative Expenses', 'expense', true),
('5301', 'Office Expenses', 'expense', true),
('5302', 'Communication Expenses', 'expense', true),
('5400', 'Other Expenses', 'expense', true),
('5401', 'Depreciation Expense', 'expense', true),
('5402', 'Bad Debt Expense', 'expense', true)
ON CONFLICT (account_code) DO NOTHING;

-- ============================================
-- SMS TEMPLATES SEED DATA
-- ============================================

-- Insert SMS templates for various notifications
INSERT INTO sms_templates (name, content, category, variables, is_active) VALUES
-- Payment templates
('Payment Confirmation', 'Your payment of {amount} KES for {category} was successfully received on {date}. Reference: {reference}. Thank you for your generosity!', 'payments', '["amount", "category", "date", "reference"]', true),
('Payment Failed', 'Your payment of {amount} KES for {category} failed. Reason: {reason}. Please try again or contact the church office.', 'payments', '["amount", "category", "reason"]', true),
('Refund Approved', 'Your refund of {amount} KES has been approved and processed. Status: {status}', 'payments', '["amount", "status"]', true),
('Refund Rejected', 'Your refund request of {amount} KES was rejected. Status: {status}. Reason: {reason}', 'payments', '["amount", "status", "reason"]', true),

-- Treasury templates
('Budget Alert', 'Budget Alert: {budget_name} - {category}. Budgeted: {budgeted} KES, Spent: {spent} KES, Remaining: {remaining} KES', 'treasury', '["budget_name", "category", "budgeted", "spent", "remaining"]', true),
('Expense Approved', 'Your expense of {amount} KES for {category} on {date} has been approved.', 'treasury', '["amount", "category", "date"]', true),
('Expense Rejected', 'Your expense of {amount} KES for {category} on {date} was rejected.', 'treasury', '["amount", "category", "date"]', true),
('Journal Entry Posted', 'Journal Entry {entry_number} posted: {description} on {date}', 'treasury', '["entry_number", "description", "date"]', true),
('Financial Report', '{report_type} report for {period} generated on {date} is now available.', 'treasury', '["report_type", "period", "date"]', true),

-- Member templates
('Welcome Message', 'Welcome to Kiserian Main SDA Church! We are blessed to have you as part of our church family.', 'members', '[]', true),
('Service Reminder', 'Reminder: Church service this Saturday at 9:00 AM. We look forward to seeing you!', 'members', '[]', true),
('Event Reminder', 'Reminder: {event_name} is coming up on {event_date}. Don''t miss it!', 'members', '["event_name", "event_date"]', true),

-- General templates
('Birthday Greeting', 'Happy Birthday from Kiserian Main SDA Church! May God bless you on your special day.', 'general', '[]', true),
('Thank You', 'Thank you for your support and contribution to Kiserian Main SDA Church.', 'general', '[]', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SMS SETTINGS SEED DATA
-- ============================================

-- Insert default SMS settings (placeholder - to be updated with actual values)
INSERT INTO sms_settings (provider_name, api_url, api_key, sender_id, is_active) VALUES
('BlessedTexts', 'https://api.blessedtexts.com/sms', 'your_api_key_here', 'KMainCMS', false)
ON CONFLICT DO NOTHING;

-- ============================================
-- SMS CREDITS SEED DATA
-- ============================================

-- Insert initial SMS credits for existing providers (if any)
-- This will only work if sms_providers already has data
DO $$
BEGIN
  -- Check if there are any providers
  IF EXISTS (SELECT 1 FROM sms_providers LIMIT 1) THEN
    INSERT INTO sms_credits (provider_id, balance, low_balance_threshold)
    SELECT id, 0, 100 FROM sms_providers
    ON CONFLICT (provider_id) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- SMS AUTOMATION RULES SEED DATA
-- ============================================

-- Insert default SMS automation rules
INSERT INTO sms_automation_rules (name, trigger_module, trigger_event, template_id, conditions, is_active) VALUES
('Payment Confirmation', 'payments', 'payment_completed', 
 (SELECT id FROM sms_templates WHERE name = 'Payment Confirmation' LIMIT 1),
 '{"amount_min": 0}', true),
('New Member Welcome', 'members', 'member_created',
 (SELECT id FROM sms_templates WHERE name = 'Welcome Message' LIMIT 1),
 '{}', true),
('Event Reminder', 'events', 'event_reminder',
 (SELECT id FROM sms_templates WHERE name = 'Event Reminder' LIMIT 1),
 '{"days_before": 1}', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- GALLERY PHOTO TAGS SEED DATA
-- ============================================

-- Insert default photo tags
INSERT INTO photo_tags (name, slug, color) VALUES
('Church Service', 'church-service', '#3B82F6'),
('Event', 'event', '#10B981'),
('Community', 'community', '#F59E0B'),
('Youth', 'youth', '#8B5CF6'),
('Music', 'music', '#EC4899'),
('Outreach', 'outreach', '#6B7280'),
('Fellowship', 'fellowship', '#14B8A6'),
('Worship', 'worship', '#EF4444'),
('Sabbath School', 'sabbath-school', '#8B5CF6'),
('Prayer Meeting', 'prayer-meeting', '#10B981')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PAYMENT CATEGORIES ENHANCED SEED DATA
-- ============================================

-- Update or insert enhanced payment categories with treasury mapping
INSERT INTO payment_categories_enhanced (name, description, treasury_account_code, is_active) VALUES
('Tithe', 'Regular tithes and offerings', '4001', true),
('Mission Offering', 'Mission and evangelism offerings', '4002', true),
('Building Fund', 'Building fund contributions', '4101', true),
('Special Project', 'Special project contributions', '4102', true),
('Event Registration', 'Event and program registration fees', '4201', true),
('Seminar Fee', 'Seminar and workshop fees', '4202', true),
('General Offering', 'General church offerings', '4000', true),
('Thanksgiving', 'Thanksgiving and special offerings', '4100', true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  treasury_account_code = EXCLUDED.treasury_account_code,
  is_active = EXCLUDED.is_active;

-- ============================================
-- DOCUMENT CATEGORIES SEED DATA (if not exists)
-- ============================================

-- Insert document categories if they don't exist
INSERT INTO document_categories (name, description, color) VALUES
('Church Policies', 'Official church policies and procedures', '#3B82F6'),
('Financial Reports', 'Monthly and annual financial reports', '#10B981'),
('Meeting Minutes', 'Board and committee meeting minutes', '#F59E0B'),
('Membership Records', 'Member registration and records', '#8B5CF6'),
('Event Documents', 'Event plans and reports', '#EC4899'),
('Training Materials', 'Training and educational materials', '#6B7280'),
('Legal Documents', 'Legal and compliance documents', '#EF4444'),
('Communications', 'Newsletters and communications', '#14B8A6')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- FUNDS SEED DATA
-- ============================================

-- Insert default funds
INSERT INTO funds (fund_code, fund_name, fund_type, description, opening_balance, is_active) VALUES
('GEN', 'General Fund', 'operating', 'General church operations fund', 0, true),
('BLDG', 'Building Fund', 'restricted', 'Building and maintenance fund', 0, true),
('MISS', 'Mission Fund', 'restricted', 'Mission and evangelism fund', 0, true),
('EDU', 'Education Fund', 'restricted', 'Education and training fund', 0, true),
('WELF', 'Welfare Fund', 'restricted', 'Church welfare and assistance fund', 0, true)
ON CONFLICT (fund_code) DO NOTHING;

-- ============================================
-- WEBSITE SETTINGS SEED DATA
-- ============================================

-- Insert default website settings
INSERT INTO website_settings (key_name, value, value_type, category, description) VALUES
('site_name', 'Kiserian Main SDA Church', 'string', 'general', 'Church name'),
('site_tagline', 'A Place of Worship and Community', 'string', 'general', 'Site tagline'),
('contact_email', 'info@kmaincms.org', 'string', 'contact', 'Contact email'),
('contact_phone', '+254 700 000 000', 'string', 'contact', 'Contact phone'),
'address', 'Kiserian, Kenya', 'string', 'contact', 'Church address'),
'service_times', 'Saturday 9:00 AM | Sabbath School 10:30 AM', 'string', 'general', 'Service times'),
'social_facebook', 'https://facebook.com/kmaincms', 'string', 'social', 'Facebook URL'),
'social_twitter', 'https://twitter.com/kmaincms', 'string', 'social', 'Twitter URL'),
'social_youtube', 'https://youtube.com/kmaincms', 'string', 'social', 'YouTube URL'),
'social_instagram', 'https://instagram.com/kmaincms', 'string', 'social', 'Instagram URL'),
'meta_description', 'Kiserian Main SDA Church - A place of worship and community in Kiserian, Kenya', 'string', 'seo', 'Meta description'),
'meta_keywords', 'church, sda, seventh day adventist, kiserian, kenya, worship', 'string', 'seo', 'Meta keywords'),
'enable_comments', 'true', 'boolean', 'features', 'Enable comments on content'),
'enable_registration', 'true', 'boolean', 'features', 'Enable public registration'),
'enable_donations', 'true', 'boolean', 'features', 'Enable online donations')
ON CONFLICT (key_name) DO UPDATE SET
  value = EXCLUDED.value,
  value_type = EXCLUDED.value_type,
  category = EXCLUDED.category,
  description = EXCLUDED.description;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Seed data for new system tables has been inserted successfully.';
END $$;
