-- Payments Module Advanced Tables Migration
-- Adds payment categories (enhanced), analytics, and dispute tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payment Categories (Enhanced)
CREATE TABLE IF NOT EXISTS payment_categories_enhanced (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  treasury_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Analytics
CREATE TABLE IF NOT EXISTS payment_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  category_id UUID REFERENCES payment_categories_enhanced(id) ON DELETE SET NULL,
  total_amount NUMERIC DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  average_amount NUMERIC DEFAULT 0,
  payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Disputes
CREATE TABLE IF NOT EXISTS payment_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  dispute_reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'closed'
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhance existing refunds table if needed
ALTER TABLE refunds 
ADD COLUMN IF NOT EXISTS refund_number VARCHAR(50) UNIQUE NOT NULL DEFAULT generate_series(1, 1000),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_categories_code ON payment_categories_enhanced(code);
CREATE INDEX IF NOT EXISTS idx_payment_categories_treasury ON payment_categories_enhanced(treasury_account_id);
CREATE INDEX IF NOT EXISTS idx_payment_analytics_date ON payment_analytics(date);
CREATE INDEX IF NOT EXISTS idx_payment_analytics_category ON payment_analytics(category_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_payment ON payment_disputes(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_status ON payment_disputes(status);
CREATE INDEX IF NOT EXISTS idx_refunds_number ON refunds(refund_number);

-- Insert default payment categories
INSERT INTO payment_categories_enhanced (name, code, description, treasury_account_id) VALUES
('Tithes', 'TITHE', '10% return to God', (SELECT id FROM chart_of_accounts WHERE account_code = '4100' LIMIT 1)),
('Local Church Offering', 'OFFERING', 'General church operations', (SELECT id FROM chart_of_accounts WHERE account_code = '4200' LIMIT 1)),
('Mission Offering', 'MISSION', 'World mission support', (SELECT id FROM chart_of_accounts WHERE account_code = '4300' LIMIT 1)),
('Sabbath School Offering', 'SS_OFFERING', 'Sabbath School programs', (SELECT id FROM chart_of_accounts WHERE account_code = '4200' LIMIT 1)),
('Building Fund', 'BUILDING', 'Church construction and maintenance', (SELECT id FROM chart_of_accounts WHERE account_code = '3200' LIMIT 1)),
('Education Fund', 'EDUCATION', 'Educational support', (SELECT id FROM chart_of_accounts WHERE account_code = '3300' LIMIT 1)),
('Youth Ministries', 'YOUTH', 'Youth programs and activities', (SELECT id FROM chart_of_accounts WHERE account_code = '4200' LIMIT 1))
ON CONFLICT (code) DO NOTHING;

-- Add comments
COMMENT ON TABLE payment_categories_enhanced IS 'Enhanced payment categories with treasury account mapping';
COMMENT ON TABLE payment_analytics IS 'Payment analytics for reporting and insights';
COMMENT ON TABLE payment_disputes IS 'Payment dispute tracking and resolution';
COMMENT ON COLUMN payment_categories_enhanced.treasury_account_id IS 'Link to chart of accounts for automatic journal entries';
