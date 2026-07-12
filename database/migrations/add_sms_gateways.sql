-- Phase 9: SMS Gateway Management
-- Tracking JOSms Android devices and their health status

CREATE TABLE IF NOT EXISTS sms_gateways (
    id VARCHAR(100) PRIMARY KEY,
    church_id UUID REFERENCES churches(id),
    device_model VARCHAR(100),
    battery_level INTEGER,
    signal_strength INTEGER,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_gateways_church ON sms_gateways(church_id);
