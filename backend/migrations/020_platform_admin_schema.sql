-- Platform Admin Schema Migration
-- This migration adds tables for SaaS platform owner dashboard functionality

-- Platform Statistics Table
CREATE TABLE IF NOT EXISTS platform_stats (
  id SERIAL PRIMARY KEY,
  stat_date DATE NOT NULL UNIQUE,
  total_churches INTEGER DEFAULT 0,
  active_churches INTEGER DEFAULT 0,
  total_mrr DECIMAL(10,2) DEFAULT 0,
  new_churches INTEGER DEFAULT 0,
  churned_churches INTEGER DEFAULT 0,
  arpc DECIMAL(10,2) DEFAULT 0,
  platform_health_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster date queries
CREATE INDEX IF NOT EXISTS idx_platform_stats_stat_date ON platform_stats(stat_date);

-- Platform Health Table
CREATE TABLE IF NOT EXISTS platform_health (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  response_time INTEGER,
  error_rate DECIMAL(5,2),
  last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for service queries
CREATE INDEX IF NOT EXISTS idx_platform_health_service_name ON platform_health(service_name);
CREATE INDEX IF NOT EXISTS idx_platform_health_status ON platform_health(status);

-- Platform Alerts Table
CREATE TABLE IF NOT EXISTS platform_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  service_affected VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by INTEGER,
  resolution_notes TEXT
);

-- Create indexes for alert queries
CREATE INDEX IF NOT EXISTS idx_platform_alerts_status ON platform_alerts(status);
CREATE INDEX IF NOT EXISTS idx_platform_alerts_severity ON platform_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_platform_alerts_created_at ON platform_alerts(created_at);

-- Platform Users Table
CREATE TABLE IF NOT EXISTS platform_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('platform_owner', 'platform_admin', 'support_staff')),
  permissions JSONB DEFAULT '[]',
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for user queries
CREATE INDEX IF NOT EXISTS idx_platform_users_email ON platform_users(email);
CREATE INDEX IF NOT EXISTS idx_platform_users_role ON platform_users(role);
CREATE INDEX IF NOT EXISTS idx_platform_users_is_active ON platform_users(is_active);

-- Platform Audit Logs Table
CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id INTEGER,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_user_id ON platform_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_action ON platform_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_resource_type ON platform_audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_created_at ON platform_audit_logs(created_at);

-- Add subscription columns to churches table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'churches' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE churches ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'basic';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'churches' AND column_name = 'billing_cycle'
  ) THEN
    ALTER TABLE churches ADD COLUMN billing_cycle VARCHAR(50) DEFAULT 'monthly';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'churches' AND column_name = 'last_payment_date'
  ) THEN
    ALTER TABLE churches ADD COLUMN last_payment_date TIMESTAMP;
  END IF;
END $$;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_platform_stats_updated_at ON platform_stats;
CREATE TRIGGER update_platform_stats_updated_at
  BEFORE UPDATE ON platform_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_health_updated_at ON platform_health;
CREATE TRIGGER update_platform_health_updated_at
  BEFORE UPDATE ON platform_health
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_users_updated_at ON platform_users;
CREATE TRIGGER update_platform_users_updated_at
  BEFORE UPDATE ON platform_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default platform owner user (password should be changed immediately)
INSERT INTO platform_users (email, name, role, permissions, is_active)
VALUES (
  'admin@kmaincms.org',
  'Platform Owner',
  'platform_owner',
  '["all"]'::jsonb,
  true
) ON CONFLICT (email) DO NOTHING;

-- Insert initial platform stats record
INSERT INTO platform_stats (stat_date, total_churches, active_churches, total_mrr, new_churches, churned_churches, arpc, platform_health_score)
SELECT 
  CURRENT_DATE,
  COUNT(*) as total_churches,
  COUNT(*) FILTER (WHERE is_active = true) as active_churches,
  0.00 as total_mrr,
  0 as new_churches,
  0 as churned_churches,
  0.00 as arpc,
  100 as platform_health_score
FROM churches
ON CONFLICT (stat_date) DO NOTHING;