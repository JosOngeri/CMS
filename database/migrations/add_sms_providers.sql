-- Phase 9: SMS Providers Migration
-- Creates SMS providers table for hybrid SMS system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create SMS providers table
CREATE TABLE IF NOT EXISTS sms_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  api_url TEXT NOT NULL,
  sender_id VARCHAR(50),
  church_id UUID REFERENCES churches(id) ON DELETE SET NULL,
  balance DECIMAL(10, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'KES',
  priority INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  health_status VARCHAR(20) DEFAULT 'unknown',
  last_health_check TIMESTAMP,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_sms_providers_church_id ON sms_providers(church_id);
CREATE INDEX IF NOT EXISTS idx_sms_providers_active ON sms_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_sms_providers_priority ON sms_providers(priority);

-- Add church_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sms_providers' AND column_name='church_id') THEN
    ALTER TABLE sms_providers ADD COLUMN church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Seed default SMS providers
INSERT INTO sms_providers (name, api_key, api_url, sender_id, church_id, priority) VALUES
  ('JOSms', 'josms_default_key', 'http://localhost:3000/api', 'KiserianSDA', NULL, 1),
  ('BlessedTexts', 'blessed_default_key', 'https://api.blessedtexts.com/v1', 'KiserianSDA', NULL, 2),
  ('AfricasTalking', 'at_default_key', 'https://api.africastalking.com/v1', 'KiserianSDA', NULL, 3)
ON CONFLICT (name) DO NOTHING;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_sms_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_sms_providers_updated_at ON sms_providers;
CREATE TRIGGER trg_update_sms_providers_updated_at
  BEFORE UPDATE ON sms_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_providers_updated_at();

-- Add comments
COMMENT ON TABLE sms_providers IS 'SMS provider configurations for hybrid SMS system';
COMMENT ON COLUMN sms_providers.priority IS 'Provider priority for failover (lower = higher priority)';
COMMENT ON COLUMN sms_providers.health_status IS 'Current health status of the provider';
COMMENT ON COLUMN sms_providers.failure_count IS 'Number of consecutive failures';
