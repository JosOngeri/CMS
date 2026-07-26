-- Snapshot and Rolling Update tables migration
-- This migration creates tables for daily snapshots and 5-minute rolling updates for SMS sync

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Daily snapshots table
CREATE TABLE IF NOT EXISTS sms_daily_snapshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  church_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  data_hash VARCHAR(255) NOT NULL,
  compressed_data BYTEA NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sms_daily_snapshots_church_id FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
  CONSTRAINT sms_daily_snapshots_church_date_unique UNIQUE (church_id, snapshot_date)
);

-- Create indexes for snapshots
CREATE INDEX IF NOT EXISTS idx_sms_daily_snapshots_church_id ON sms_daily_snapshots(church_id);
CREATE INDEX IF NOT EXISTS idx_sms_daily_snapshots_snapshot_date ON sms_daily_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_sms_daily_snapshots_created_at ON sms_daily_snapshots(created_at);

-- Rolling updates table
CREATE TABLE IF NOT EXISTS sms_rolling_updates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  church_id UUID NOT NULL,
  update_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  operation VARCHAR(20) NOT NULL,
  data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sequence_number BIGINT NOT NULL,
  CONSTRAINT fk_sms_rolling_updates_church_id FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
  CONSTRAINT sms_rolling_updates_church_sequence_unique UNIQUE (church_id, sequence_number)
);

-- Create indexes for rolling updates
CREATE INDEX IF NOT EXISTS idx_sms_rolling_updates_church_id ON sms_rolling_updates(church_id);
CREATE INDEX IF NOT EXISTS idx_sms_rolling_updates_created_at ON sms_rolling_updates(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_rolling_updates_sequence_number ON sms_rolling_updates(sequence_number);
CREATE INDEX IF NOT EXISTS idx_sms_rolling_updates_entity_type ON sms_rolling_updates(entity_type);

-- Create sequence for rolling update sequence numbers
CREATE SEQUENCE IF NOT EXISTS sms_rolling_updates_sequence;

-- Add comment to tables
COMMENT ON TABLE sms_daily_snapshots IS 'Daily compressed snapshots of church data for SMS sync';
COMMENT ON TABLE sms_rolling_updates IS 'Rolling log of data changes for 5-minute incremental sync';
