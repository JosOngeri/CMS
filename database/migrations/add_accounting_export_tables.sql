-- Accounting Export Tables Migration
-- Adds export to accounting software functionality

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Accounting Exports
CREATE TABLE IF NOT EXISTS accounting_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  export_type VARCHAR(50) NOT NULL, -- 'journal_entries', 'chart_of_accounts', 'transactions', 'payments'
  export_format VARCHAR(20) NOT NULL, -- 'csv', 'quickbooks', 'xero', 'sage'
  date_range_start DATE,
  date_range_end DATE,
  record_count INTEGER DEFAULT 0,
  file_path TEXT,
  file_size BIGINT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_accounting_exports_type ON accounting_exports(export_type);
CREATE INDEX IF NOT EXISTS idx_accounting_exports_format ON accounting_exports(export_format);
CREATE INDEX IF NOT EXISTS idx_accounting_exports_status ON accounting_exports(status);
CREATE INDEX IF NOT EXISTS idx_accounting_exports_created ON accounting_exports(created_at);
CREATE INDEX IF NOT EXISTS idx_accounting_exports_date_range ON accounting_exports(date_range_start, date_range_end);

-- Add comments
COMMENT ON TABLE accounting_exports IS 'Accounting software export records';
COMMENT ON COLUMN accounting_exports.export_type IS 'Type of data exported: journal_entries, chart_of_accounts, transactions, payments';
COMMENT ON COLUMN accounting_exports.export_format IS 'Export format: csv, quickbooks, xero, sage';
COMMENT ON COLUMN accounting_exports.status IS 'Export status: pending, processing, completed, failed';
