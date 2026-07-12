-- Financial Alerts Tables Migration
-- Adds financial alerts and notifications

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Financial Alerts
CREATE TABLE IF NOT EXISTS financial_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type VARCHAR(50) NOT NULL, -- 'budget_variance', 'low_balance', 'overdue_payment', 'expense_limit', 'revenue_target'
  title VARCHAR(255) NOT NULL,
  message TEXT,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  entity_type VARCHAR(50), -- 'budget', 'fund', 'payment', 'expense', 'revenue'
  entity_id UUID,
  threshold_value NUMERIC,
  current_value NUMERIC,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_financial_alerts_type ON financial_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_financial_alerts_priority ON financial_alerts(priority);
CREATE INDEX IF NOT EXISTS idx_financial_alerts_resolved ON financial_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_financial_alerts_entity ON financial_alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_financial_alerts_created ON financial_alerts(created_at);

-- Add comments
COMMENT ON TABLE financial_alerts IS 'Financial alerts and notifications for treasury operations';
COMMENT ON COLUMN financial_alerts.alert_type IS 'Type of alert: budget_variance, low_balance, overdue_payment, expense_limit, revenue_target';
COMMENT ON COLUMN financial_alerts.priority IS 'Alert priority: low, medium, high, urgent';
COMMENT ON COLUMN financial_alerts.entity_type IS 'Type of entity the alert relates to';
COMMENT ON COLUMN financial_alerts.threshold_value IS 'Threshold value that triggered the alert';
COMMENT ON COLUMN financial_alerts.current_value IS 'Current value that exceeded threshold';
