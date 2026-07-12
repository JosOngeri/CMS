-- PAYMENTS Module Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'mobile_money', 'bank_transfer', 'card', 'cash'
  provider VARCHAR(100),
  account_number VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Some logic uses user_id instead of member_id
  amount NUMERIC NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  payment_type VARCHAR(50) NOT NULL, -- 'tithe', 'offering', 'donation', 'pledge', 'fee'
  category VARCHAR(100), -- Used by payment.controller.js
  description TEXT,
  reference_number VARCHAR(100) UNIQUE,
  transaction_id VARCHAR(255),
  checkout_request_id VARCHAR(255),
  merchant_request_id VARCHAR(255),
  payment_url TEXT,
  link_id VARCHAR(100),
  qr_code_data TEXT,
  qr_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  failure_reason TEXT,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  event_id UUID, -- For event-specific payments
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pledges table
CREATE TABLE IF NOT EXISTS pledges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  pledge_type VARCHAR(50), -- 'general', 'building', 'mission', 'special'
  start_date DATE,
  end_date DATE,
  frequency VARCHAR(20), -- 'weekly', 'monthly', 'quarterly', 'annual', 'one_time'
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pledge payments table
CREATE TABLE IF NOT EXISTS pledge_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pledge_id UUID REFERENCES pledges(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reason TEXT,
  refund_id VARCHAR(100),
  status VARCHAR(20),
  initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default payment methods
INSERT INTO payment_methods (name, type, provider, account_number) VALUES
  ('M-Pesa', 'mobile_money', 'Safaricom', '174379')
ON CONFLICT (name) DO NOTHING;

INSERT INTO payment_methods (name, type, provider, account_number) VALUES
  ('Airtel Money', 'mobile_money', 'Airtel', '')
ON CONFLICT (name) DO NOTHING;

INSERT INTO payment_methods (name, type, provider, account_number) VALUES
  ('Bank Transfer', 'bank_transfer', 'KCB Bank', '1234567890')
ON CONFLICT (name) DO NOTHING;

INSERT INTO payment_methods (name, type, provider, account_number) VALUES
  ('Cash', 'cash', '', '')
ON CONFLICT (name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_pledges_member ON pledges(member_id);
CREATE INDEX IF NOT EXISTS idx_pledges_status ON pledges(status);
CREATE INDEX IF NOT EXISTS idx_pledge_payments_pledge ON pledge_payments(pledge_id);

-- Add comments
COMMENT ON TABLE payment_methods IS 'Available payment methods for church contributions';
COMMENT ON TABLE payments IS 'Record of all payments and contributions';
COMMENT ON TABLE pledges IS 'Member pledges for church projects and support';
COMMENT ON TABLE pledge_payments IS 'Payments made towards pledges';
