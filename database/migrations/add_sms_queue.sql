-- Phase 9: API Hub & Hybrid SMS
-- Create SMS queue table with gateway tagging and status tracking

-- Create SMS queue table
CREATE TABLE IF NOT EXISTS sms_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    gateway VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    recipient_count INTEGER DEFAULT 1,
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for SMS queue
CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON sms_queue(status);
CREATE INDEX IF NOT EXISTS idx_sms_queue_gateway ON sms_queue(gateway);
CREATE INDEX IF NOT EXISTS idx_sms_queue_priority ON sms_queue(priority);
CREATE INDEX IF NOT EXISTS idx_sms_queue_church_id ON sms_queue(church_id);
CREATE INDEX IF NOT EXISTS idx_sms_queue_created_at ON sms_queue(created_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_sms_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_sms_queue_updated_at ON sms_queue;
CREATE TRIGGER trg_update_sms_queue_updated_at
    BEFORE UPDATE ON sms_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_sms_queue_updated_at();

-- Create gateway configuration table
CREATE TABLE IF NOT EXISTS sms_gateways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 10,
    min_recipients INTEGER DEFAULT 0,
    max_recipients INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default gateways
INSERT INTO sms_gateways (name, slug, type, config, priority, min_recipients, max_recipients) VALUES
('JOSms Local Gateway', 'josms', 'local', '{"api_key": "placeholder"}', 1, 0, 400),
('Blessed Texts', 'blessed-texts', 'bulk', '{"api_key": "placeholder", "sender_id": "placeholder"}', 2, 401, NULL)
ON CONFLICT (slug) DO NOTHING;

-- Create indexes for gateways
CREATE INDEX IF NOT EXISTS idx_sms_gateways_slug ON sms_gateways(slug);
CREATE INDEX IF NOT EXISTS idx_sms_gateways_active ON sms_gateways(is_active);

-- Add updated_at trigger for gateways
DROP TRIGGER IF EXISTS trg_update_sms_gateways_updated_at ON sms_gateways;
CREATE TRIGGER trg_update_sms_gateways_updated_at
    BEFORE UPDATE ON sms_gateways
    FOR EACH ROW
    EXECUTE FUNCTION update_sms_queue_updated_at();
