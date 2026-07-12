-- Settings Advanced Features Migration
-- Adds system health, backup logs, and maintenance scheduling

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- System Logs
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_level VARCHAR(20) NOT NULL, -- 'info', 'warning', 'error', 'debug'
  module VARCHAR(50),
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backup Logs
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_type VARCHAR(20) NOT NULL, -- 'full', 'incremental', 'differential'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  file_path TEXT,
  file_size BIGINT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Maintenance Schedules
CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheduled_at TIMESTAMP NOT NULL,
  duration VARCHAR(50), -- e.g., '2 hours', '30 minutes'
  message TEXT,
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_system_logs_module ON system_logs(module);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_backup_logs_started ON backup_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_scheduled ON maintenance_schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_status ON maintenance_schedules(status);

-- Add comments
COMMENT ON TABLE system_logs IS 'System-wide logging for monitoring and debugging';
COMMENT ON TABLE backup_logs IS 'Backup operation logs and history';
COMMENT ON TABLE maintenance_schedules IS 'Scheduled maintenance windows';
COMMENT ON COLUMN backup_logs.backup_type IS 'Type of backup: full, incremental, or differential';
COMMENT ON COLUMN backup_logs.status IS 'Backup operation status';
COMMENT ON COLUMN maintenance_schedules.status IS 'Maintenance schedule status';
