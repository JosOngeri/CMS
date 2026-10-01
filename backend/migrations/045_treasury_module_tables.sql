-- Migration 045: Treasury module tables (church-scoped)
-- The modular treasury routes (modules/treasury) query funds,
-- journal_entries, journal_entry_lines; the legacy chart-of-accounts and
-- fixed-assets routers query chart_of_accounts and fixed_assets. None of
-- these were ever applied. All tables carry church_id for tenant isolation.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Funds (module treasury)
CREATE TABLE IF NOT EXISTS funds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  fund_code VARCHAR(20) NOT NULL,
  fund_name VARCHAR(255) NOT NULL,
  fund_type VARCHAR(20) DEFAULT 'operating',
  description TEXT,
  purpose TEXT,
  start_date DATE,
  end_date DATE,
  target_amount NUMERIC(15,2),
  current_balance NUMERIC(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (church_id, fund_code)
);
CREATE INDEX IF NOT EXISTS idx_funds_church ON funds(church_id);

-- Journal entries (double-entry header)
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  entry_number VARCHAR(50),
  entry_date DATE NOT NULL,
  description TEXT,
  reference_type VARCHAR(50),
  reference_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'draft',
  total_debits NUMERIC(15,2) DEFAULT 0,
  total_credits NUMERIC(15,2) DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_by UUID,
  posted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_journal_entries_church ON journal_entries(church_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);

-- Journal entry lines (reference module 'accounts' table)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID,
  debit_amount NUMERIC(15,2) DEFAULT 0,
  credit_amount NUMERIC(15,2) DEFAULT 0,
  description TEXT,
  line_number INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_jel_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account ON journal_entry_lines(account_id);

-- Chart of Accounts (legacy /treasury/chart-of-accounts router)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  account_code VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  sub_type VARCHAR(50),
  parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  fund_id UUID,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  balance NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (church_id, account_code)
);
CREATE INDEX IF NOT EXISTS idx_coa_church ON chart_of_accounts(church_id);

-- Fixed assets
CREATE TABLE IF NOT EXISTS fixed_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  asset_code VARCHAR(50),
  asset_name VARCHAR(255) NOT NULL,
  asset_type VARCHAR(50),
  fund_id UUID,
  account_id UUID,
  vendor_id UUID,
  purchase_date DATE,
  purchase_price NUMERIC(15,2),
  current_value NUMERIC(15,2),
  depreciation_method VARCHAR(30),
  useful_life INTEGER,
  accumulated_depreciation NUMERIC(15,2) DEFAULT 0,
  location VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  disposal_date DATE,
  disposal_amount NUMERIC(15,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_church ON fixed_assets(church_id);

-- The module Budget repository writes these; the existing budgets table
-- (041) was missing them.
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS total_actual NUMERIC(15,2) DEFAULT 0;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS variance NUMERIC(15,2) DEFAULT 0;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS variance_percentage NUMERIC(6,2) DEFAULT 0;

-- accounts exists from an older schema — ensure church_id present
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS church_id UUID;

-- chart_of_accounts code uses category for grouping
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS category VARCHAR(50);
