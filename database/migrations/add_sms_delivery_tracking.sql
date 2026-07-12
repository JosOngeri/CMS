-- Migration: Add SMS delivery tracking columns to sms_logs table
-- This enables tracking of delivery status and callbacks from SMS providers

-- Add external_message_id to track provider's message ID
ALTER TABLE sms_logs 
ADD COLUMN IF NOT EXISTS external_message_id VARCHAR(100);

COMMENT ON COLUMN sms_logs.external_message_id IS 'Message ID from SMS provider (e.g., Blessed Texts) for delivery tracking';

-- Add delivery_status to track final delivery status
ALTER TABLE sms_logs 
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'pending';

COMMENT ON COLUMN sms_logs.delivery_status IS 'Delivery status: pending, delivered, failed, expired';

-- Add delivery_status_message for error details
ALTER TABLE sms_logs 
ADD COLUMN IF NOT EXISTS delivery_status_message TEXT;

COMMENT ON COLUMN sms_logs.delivery_status_message IS 'Detailed status message or error description from SMS provider';

-- Add delivered_at timestamp
ALTER TABLE sms_logs 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

COMMENT ON COLUMN sms_logs.delivered_at IS 'Timestamp when SMS was confirmed as delivered';

-- Add delivery_cost to track actual cost
ALTER TABLE sms_logs 
ADD COLUMN IF NOT EXISTS delivery_cost DECIMAL(10,2);

COMMENT ON COLUMN sms_logs.delivery_cost IS 'Actual cost charged by SMS provider for this message';

-- Add callback_received_at to track when delivery callback was received
ALTER TABLE sms_logs 
ADD COLUMN IF NOT EXISTS callback_received_at TIMESTAMP;

COMMENT ON COLUMN sms_logs.callback_received_at IS 'Timestamp when delivery callback was received from SMS provider';

-- Create index for faster lookup by external message ID
CREATE INDEX IF NOT EXISTS idx_sms_logs_external_message_id ON sms_logs(external_message_id);

-- Create index for filtering by delivery status
CREATE INDEX IF NOT EXISTS idx_sms_logs_delivery_status ON sms_logs(delivery_status);

-- Create index for filtering by callback timestamps
CREATE INDEX IF NOT EXISTS idx_sms_logs_callback_received ON sms_logs(callback_received_at);

-- Update existing records to have proper default values
UPDATE sms_logs 
SET delivery_status = 'unknown' 
WHERE delivery_status IS NULL OR delivery_status = '';
