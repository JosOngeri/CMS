-- Treasury Module Advanced Tables Migration
-- Adds double-entry accounting, chart of accounts, funds, fixed assets, bank reconciliation

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_code VARCHAR(20) UNIQUE NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) NOT NULL, -- 'asset', 'liability', 'equity', 'income', 'expense'
  parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'posted', -- 'draft', 'posted', 'void'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entry Lines
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Funds
CREATE TABLE IF NOT EXISTS funds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fund_code VARCHAR(20) UNIQUE NOT NULL,
  fund_name VARCHAR(255) NOT NULL,
  fund_type VARCHAR(20) DEFAULT 'operating', -- 'operating', 'capital', 'restricted'
  balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fixed Assets
CREATE TABLE IF NOT EXISTS fixed_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_code VARCHAR(50) UNIQUE NOT NULL,
  asset_name VARCHAR(255) NOT NULL,
  asset_type VARCHAR(50),
  purchase_date DATE,
  purchase_price NUMERIC,
  current_value NUMERIC,
  depreciation_method VARCHAR(20), -- 'straight_line', 'declining_balance'
  useful_life INTEGER, -- in years
  accumulated_depreciation NUMERIC DEFAULT 0,
  location VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'disposed', 'sold'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bank Reconciliations
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id INTEGER REFERENCES church_accounts(id) ON DELETE SET NULL,
  reconciliation_date DATE NOT NULL,
  statement_balance NUMERIC NOT NULL,
  book_balance NUMERIC NOT NULL,
  difference NUMERIC,
  reconciled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reconciliation Items
CREATE TABLE IF NOT EXISTS reconciliation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reconciliation_id UUID REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  item_type VARCHAR(20), -- 'outstanding', 'deposit_transit', 'bank_charge'
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent ON chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_number ON journal_entries(entry_number);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_funds_code ON funds(fund_code);
CREATE INDEX IF NOT EXISTS idx_funds_type ON funds(fund_type);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_code ON fixed_assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_account ON bank_reconciliations(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_date ON bank_reconciliations(reconciliation_date);
CREATE INDEX IF NOT EXISTS idx_reconciliation_items_reconciliation ON reconciliation_items(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_items_transaction ON reconciliation_items(transaction_id);

-- Insert default chart of accounts
INSERT INTO chart_of_accounts (account_code, account_name, account_type) VALUES
-- Assets
('1000', 'ASSETS', 'asset'),
('1100', 'Cash and Cash Equivalents', 'asset'),
('1110', 'Church Bank Account', 'asset'),
('1120', 'Petty Cash', 'asset'),
('1200', 'Accounts Receivable', 'asset'),
('1300', 'Fixed Assets', 'asset'),
('1310', 'Church Building', 'asset'),
('1320', 'Equipment', 'asset'),
('1330', 'Vehicles', 'asset'),
-- Liabilities
('2000', 'LIABILITIES', 'liability'),
('2100', 'Accounts Payable', 'liability'),
('2200', 'Accrued Expenses', 'liability'),
-- Equity
('3000', 'EQUITY', 'equity'),
('3100', 'General Fund', 'equity'),
('3200', 'Building Fund', 'equity'),
('3300', 'Mission Fund', 'equity'),
-- Income
('4000', 'INCOME', 'income'),
('4100', 'Tithes', 'income'),
('4200', 'Offerings', 'income'),
('4300', 'Mission Offerings', 'income'),
('4400', 'Donations', 'income'),
-- Expenses
('5000', 'EXPENSES', 'expense'),
('5100', 'Salaries and Wages', 'expense'),
('5200', 'Utilities', 'expense'),
('5300', 'Maintenance', 'expense'),
('5400', 'Programs', 'expense'),
('5500', 'Mission Support', 'expense')
ON CONFLICT (account_code) DO NOTHING;

-- Insert default funds
INSERT INTO funds (fund_code, fund_name, fund_type) VALUES
('GEN', 'General Fund', 'operating'),
('BLD', 'Building Fund', 'capital'),
('MISS', 'Mission Fund', 'restricted'),
('YOUTH', 'Youth Fund', 'restricted'),
('EDU', 'Education Fund', 'restricted')
ON CONFLICT (fund_code) DO NOTHING;

-- Add comments
COMMENT ON TABLE chart_of_accounts IS 'Chart of accounts for double-entry accounting';
COMMENT ON TABLE journal_entries IS 'Journal entries for double-entry accounting';
COMMENT ON TABLE journal_entry_lines IS 'Individual debit/credit lines for journal entries';
COMMENT ON TABLE funds IS 'Fund tracking for designated giving';
COMMENT ON TABLE fixed_assets IS 'Fixed asset register with depreciation tracking';
COMMENT ON TABLE bank_reconciliations IS 'Bank reconciliation records';
COMMENT ON TABLE reconciliation_items IS 'Items included in bank reconciliation';
