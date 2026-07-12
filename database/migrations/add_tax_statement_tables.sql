-- Tax Statement Tables Migration
-- Adds tax-deductible contribution statement generation

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tax Statements
CREATE TABLE IF NOT EXISTS tax_statements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_number VARCHAR(50) UNIQUE NOT NULL,
  member_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL,
  status VARCHAR(20) DEFAULT 'generated', -- 'generated', 'sent', 'viewed'
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
  regenerated_at TIMESTAMP,
  regenerated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tax Statement Items
CREATE TABLE IF NOT EXISTS tax_statement_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id UUID REFERENCES tax_statements(id) ON DELETE CASCADE,
  payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  category_id INTEGER REFERENCES payment_categories(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tax_statements_number ON tax_statements(statement_number);
CREATE INDEX IF NOT EXISTS idx_tax_statements_member ON tax_statements(member_id);
CREATE INDEX IF NOT EXISTS idx_tax_statements_year ON tax_statements(tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_statements_status ON tax_statements(status);
CREATE INDEX IF NOT EXISTS idx_tax_statements_generated ON tax_statements(generated_at);

CREATE INDEX IF NOT EXISTS idx_tax_statement_items_statement ON tax_statement_items(statement_id);
CREATE INDEX IF NOT EXISTS idx_tax_statement_items_payment ON tax_statement_items(payment_id);
CREATE INDEX IF NOT EXISTS idx_tax_statement_items_date ON tax_statement_items(payment_date);

-- Add comments
COMMENT ON TABLE tax_statements IS 'Tax-deductible contribution statements for members';
COMMENT ON TABLE tax_statement_items IS 'Line items for tax statements showing individual contributions';
COMMENT ON COLUMN tax_statements.status IS 'Statement status: generated, sent, viewed';
