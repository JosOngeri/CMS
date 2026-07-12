-- SMS Module Advanced Tables Migration
-- Adds credit management, automation rules, and opt-out management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SMS Credits
CREATE TABLE IF NOT EXISTS sms_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id INTEGER REFERENCES sms_providers(id) ON DELETE SET NULL,
  balance INTEGER DEFAULT 0,
  last_recharge_at TIMESTAMP,
  low_balance_threshold INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS Automation Rules
CREATE TABLE IF NOT EXISTS sms_automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  trigger_module VARCHAR(50), -- 'payments', 'treasury', 'events', 'members', etc.
  trigger_event VARCHAR(50), -- 'payment_received', 'expense_approved', 'event_created', etc.
  template_id INTEGER REFERENCES sms_templates(id) ON DELETE SET NULL,
  conditions JSONB, -- Conditions for triggering automation
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS Opt-outs
CREATE TABLE IF NOT EXISTS sms_optouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  opt_out_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  opt_out_method VARCHAR(50), -- 'manual', 'reply_stop', 'web_form'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhance existing sms_campaigns table if needed
ALTER TABLE sms_campaigns 
ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES sms_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS target_audience JSONB, -- Enhanced audience targeting
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP,
ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS successful_sends INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_sends INTEGER DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sms_credits_provider ON sms_credits(provider_id);
CREATE INDEX IF NOT EXISTS idx_sms_automation_rules_module ON sms_automation_rules(trigger_module);
CREATE INDEX IF NOT EXISTS idx_sms_automation_rules_event ON sms_automation_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_sms_automation_rules_template ON sms_automation_rules(template_id);
CREATE INDEX IF NOT EXISTS idx_sms_automation_rules_active ON sms_automation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_sms_optouts_phone ON sms_optouts(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_optouts_date ON sms_optouts(opt_out_date);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_template ON sms_campaigns(template_id);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_scheduled ON sms_campaigns(scheduled_for);

-- Add comments
COMMENT ON TABLE sms_credits IS 'SMS credit balance tracking per provider';
COMMENT ON TABLE sms_automation_rules IS 'Automated SMS triggers based on system events';
COMMENT ON TABLE sms_optouts IS 'SMS opt-out management for compliance';
COMMENT ON COLUMN sms_automation_rules.conditions IS 'JSON conditions for when to trigger automation';
COMMENT ON COLUMN sms_campaigns.target_audience IS 'Enhanced audience targeting with JSON criteria';

-- Insert default SMS automation rules
INSERT INTO sms_automation_rules (name, trigger_module, trigger_event, template_id, conditions, is_active) VALUES
('Payment Confirmation', 'payments', 'payment_completed', 
 (SELECT id FROM sms_templates WHERE name = 'Welcome Message' LIMIT 1),
 '{"amount_min": 0}', true),
('New Member Welcome', 'members', 'member_created',
 (SELECT id FROM sms_templates WHERE name = 'Welcome Message' LIMIT 1),
 '{}', true),
('Event Reminder', 'events', 'event_reminder',
 (SELECT id FROM sms_templates WHERE name = 'Service Reminder' LIMIT 1),
 '{"days_before": 1}', true)
ON CONFLICT DO NOTHING;

-- Insert default SMS credits for existing providers
INSERT INTO sms_credits (provider_id, balance, low_balance_threshold)
SELECT id, 0, 100 FROM sms_providers
ON CONFLICT DO NOTHING;
