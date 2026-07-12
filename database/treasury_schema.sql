-- TREASURY Module Database Schema

-- Church accounts table
CREATE TABLE IF NOT EXISTS church_accounts (
  id SERIAL PRIMARY KEY,
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50),
  bank_name VARCHAR(255),
  account_type VARCHAR(50) DEFAULT 'checking', -- 'checking', 'savings', 'investment'
  balance NUMERIC DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'KES',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Income categories table
CREATE TABLE IF NOT EXISTS income_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  code VARCHAR(20) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  code VARCHAR(20) UNIQUE,
  budget_limit NUMERIC,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  transaction_type VARCHAR(20) NOT NULL, -- 'income', 'expense', 'transfer'
  category_id INTEGER,
  account_id INTEGER REFERENCES church_accounts(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_number VARCHAR(100),
  transaction_date DATE NOT NULL,
  recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  payment_method VARCHAR(50), -- 'cash', 'bank_transfer', 'mobile_money', 'check'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget table
CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_income_budget NUMERIC DEFAULT 0,
  total_expense_budget NUMERIC DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'closed'
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget items table
CREATE TABLE IF NOT EXISTS budget_items (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
  category_id INTEGER,
  category_type VARCHAR(20) NOT NULL, -- 'income', 'expense'
  amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default income categories
INSERT INTO income_categories (name, description, code) VALUES
  ('Tithes', 'Member tithes', 'TITHE'),
  ('Offerings', 'General offerings', 'OFFERING'),
  ('Mission Offerings', 'Mission support offerings', 'MISSION'),
  ('Sabbath School Offerings', 'Sabbath School offerings', 'SS_OFFERING'),
  ('Donations', 'General donations', 'DONATION'),
  ('Special Projects', 'Special project contributions', 'SPECIAL'),
  ('Investment Income', 'Interest and investment returns', 'INVESTMENT')
ON CONFLICT (code) DO NOTHING;

-- Insert default expense categories
INSERT INTO expense_categories (name, description, code) VALUES
  ('Salaries', 'Staff salaries and wages', 'SALARY'),
  ('Utilities', 'Water, electricity, and other utilities', 'UTILITIES'),
  ('Maintenance', 'Building and equipment maintenance', 'MAINTENANCE'),
  ('Programs', 'Church programs and events', 'PROGRAMS'),
  ('Mission Support', 'Mission and evangelism support', 'MISSION_EXP'),
  ('Office Supplies', 'Office supplies and materials', 'SUPPLIES'),
  ('Insurance', 'Insurance premiums', 'INSURANCE'),
  ('Charity', 'Charitable giving and support', 'CHARITY')
ON CONFLICT (code) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_church_accounts_type ON church_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_budgets_year ON budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budget_items_budget ON budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_category ON budget_items(category_id);

-- Add comments
COMMENT ON TABLE church_accounts IS 'Church bank accounts and financial accounts';
COMMENT ON TABLE income_categories IS 'Categories for classifying income sources';
COMMENT ON TABLE expense_categories IS 'Categories for classifying expenses';
COMMENT ON TABLE transactions IS 'Financial transactions (income, expenses, transfers)';
COMMENT ON TABLE budgets IS 'Annual or periodic budgets for financial planning';
COMMENT ON TABLE budget_items IS 'Individual budget line items by category';