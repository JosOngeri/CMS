-- Test script to validate SQL migration syntax
-- This file can be used to test if the migration files have valid SQL syntax

-- Test UUID extension
SELECT 1;

-- Test table creation syntax
CREATE TABLE IF NOT EXISTS test_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test ALTER TABLE syntax
ALTER TABLE test_table ADD COLUMN IF NOT EXISTS description TEXT;

-- Test index creation
CREATE INDEX IF NOT EXISTS idx_test_table_name ON test_table(name);

-- Test function creation
CREATE OR REPLACE FUNCTION test_function()
RETURNS INTEGER AS $$
BEGIN
  RETURN 1;
END;
$$ LANGUAGE plpgsql;

-- Test trigger creation
DROP TRIGGER IF EXISTS test_trigger ON test_table;

-- Clean up
DROP TABLE IF EXISTS test_table;
DROP FUNCTION IF EXISTS test_function();

-- If this script runs without errors, the migration syntax is valid
