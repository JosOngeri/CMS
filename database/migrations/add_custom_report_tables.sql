-- Custom Report Builder Tables Migration
-- Adds custom report builder functionality

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom Reports
CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- 'financial', 'budget', 'expense', 'income', 'custom'
  description TEXT,
  data_source VARCHAR(100) NOT NULL, -- Table name or view name
  group_by VARCHAR(255),
  order_by VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom Report Columns
CREATE TABLE IF NOT EXISTS custom_report_columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES custom_reports(id) ON DELETE CASCADE,
  column_name VARCHAR(100) NOT NULL,
  column_alias VARCHAR(100),
  aggregation VARCHAR(20), -- 'SUM', 'AVG', 'COUNT', 'MIN', 'MAX', null
  column_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom Report Filters
CREATE TABLE IF NOT EXISTS custom_report_filters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES custom_reports(id) ON DELETE CASCADE,
  filter_column VARCHAR(100) NOT NULL,
  operator VARCHAR(20) NOT NULL, -- '=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN'
  filter_value TEXT,
  filter_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_reports_type ON custom_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_custom_reports_source ON custom_reports(data_source);
CREATE INDEX IF NOT EXISTS idx_custom_reports_created_by ON custom_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_reports_active ON custom_reports(is_active);

CREATE INDEX IF NOT EXISTS idx_custom_report_columns_report ON custom_report_columns(report_id);
CREATE INDEX IF NOT EXISTS idx_custom_report_columns_order ON custom_report_columns(column_order);

CREATE INDEX IF NOT EXISTS idx_custom_report_filters_report ON custom_report_filters(report_id);
CREATE INDEX IF NOT EXISTS idx_custom_report_filters_order ON custom_report_filters(filter_order);

-- Add comments
COMMENT ON TABLE custom_reports IS 'Custom report definitions for financial reporting';
COMMENT ON TABLE custom_report_columns IS 'Column definitions for custom reports';
COMMENT ON TABLE custom_report_filters IS 'Filter definitions for custom reports';
COMMENT ON COLUMN custom_report_columns.aggregation IS 'SQL aggregation function (SUM, AVG, COUNT, MIN, MAX)';
COMMENT ON COLUMN custom_report_filters.operator IS 'SQL comparison operator (=, !=, >, <, >=, <=, LIKE, IN)';
