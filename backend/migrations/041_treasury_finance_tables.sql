-- 041_treasury_finance_tables.sql
-- Consolidated treasury/finance tables required by the mounted treasury routes.
-- Source shapes: database/treasury_schema.sql, database/migrations/add_treasury_*.sql
-- plus the columns the restored repositories actually query (superset unions).
-- All statements are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- Church bank / mobile-money accounts (distinct from the chart-of-accounts `accounts` table)
CREATE TABLE IF NOT EXISTS church_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50),
  bank_name VARCHAR(255),
  account_type VARCHAR(50) DEFAULT 'checking',
  balance NUMERIC DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'KES',
  is_active BOOLEAN DEFAULT true,
  church_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE church_accounts ADD COLUMN IF NOT EXISTS church_id UUID;

-- Transaction categories
CREATE TABLE IF NOT EXISTS income_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  code VARCHAR(20) UNIQUE,
  church_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  code VARCHAR(20) UNIQUE,
  budget_limit NUMERIC,
  church_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE income_categories ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS church_id UUID;

-- Transactions (base table may already exist from 025_dashboard_tables; fill gaps)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_type VARCHAR(20) NOT NULL,
  category_id UUID,
  account_id UUID,
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_number VARCHAR(100),
  transaction_date DATE NOT NULL,
  fund_id UUID,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(50),
  church_id UUID,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fund_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recorded_by UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS church_id UUID;

-- Budgets (superset of module + legacy repository column sets)
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  name VARCHAR(255),
  budget_code VARCHAR(20),
  budget_name VARCHAR(255),
  budget_type VARCHAR(50),
  description TEXT,
  fiscal_year INTEGER,
  period VARCHAR(20) DEFAULT 'annual',
  start_date DATE,
  end_date DATE,
  department_id UUID,
  fund_id UUID,
  account_id UUID,
  budgeted_amount NUMERIC,
  actual_amount NUMERIC DEFAULT 0,
  total_budgeted NUMERIC,
  total_income_budget NUMERIC,
  total_expense_budget NUMERIC,
  status VARCHAR(20) DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS budget_name VARCHAR(255);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS budget_type VARCHAR(50);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS total_budgeted NUMERIC;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS total_income_budget NUMERIC;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS total_expense_budget NUMERIC;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS notes TEXT;

-- Budget line items (superset)
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  category_id UUID,
  category_type VARCHAR(20),
  category_name VARCHAR(255),
  item_name VARCHAR(255),
  amount NUMERIC,
  budgeted_amount NUMERIC,
  actual_amount NUMERIC DEFAULT 0,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS category_name VARCHAR(255);
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS budgeted_amount NUMERIC;
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS actual_amount NUMERIC DEFAULT 0;
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS description TEXT;

-- Expenses (module repository column set)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  expense_number VARCHAR(50),
  expense_date DATE,
  description TEXT,
  amount NUMERIC NOT NULL,
  account_id UUID,
  fund_id UUID,
  vendor_id UUID,
  department_id UUID,
  project_id UUID,
  receipt_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(50),
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_number VARCHAR(50);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  vendor_code VARCHAR(50) UNIQUE NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  tax_id VARCHAR(50),
  payment_terms VARCHAR(50) DEFAULT 'NET 30',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS church_id UUID;

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  project_code VARCHAR(50) UNIQUE NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  description TEXT,
  project_type VARCHAR(50) DEFAULT 'general',
  start_date DATE,
  end_date DATE,
  target_amount NUMERIC DEFAULT 0,
  current_amount NUMERIC DEFAULT 0,
  status VARCHAR(20) DEFAULT 'planned',
  priority VARCHAR(20) DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID,
  fund_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS church_id UUID;

CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  contributor_id UUID,
  date DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pledges and campaigns
CREATE TABLE IF NOT EXISTS pledge_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_amount NUMERIC DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pledges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  pledge_number VARCHAR(50) UNIQUE NOT NULL,
  member_id UUID,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  fund_id UUID,
  pledge_amount NUMERIC NOT NULL,
  pledged_date DATE,
  start_date DATE,
  end_date DATE,
  frequency VARCHAR(20) DEFAULT 'one_time',
  status VARCHAR(20) DEFAULT 'pending',
  amount_paid NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

-- Recurring payments
CREATE TABLE IF NOT EXISTS recurring_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  recurring_number VARCHAR(50) UNIQUE NOT NULL,
  member_id UUID,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  fund_id UUID,
  amount NUMERIC NOT NULL,
  frequency VARCHAR(20) NOT NULL,
  start_date DATE,
  end_date DATE,
  next_payment_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  payment_method VARCHAR(50) DEFAULT 'M-Pesa',
  auto_charge BOOLEAN DEFAULT false,
  last_payment_date DATE,
  total_paid NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE recurring_payments ADD COLUMN IF NOT EXISTS church_id UUID;

-- Bank reconciliations (account_id is UUID — the frontend picks from the `accounts` COA list)
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  account_id UUID,
  reconciliation_date DATE,
  statement_date DATE,
  statement_balance NUMERIC,
  book_balance NUMERIC,
  difference NUMERIC,
  status VARCHAR(20) DEFAULT 'in_progress',
  notes TEXT,
  reconciled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE bank_reconciliations ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE bank_reconciliations ADD COLUMN IF NOT EXISTS statement_date DATE;
ALTER TABLE bank_reconciliations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'in_progress';
ALTER TABLE bank_reconciliations ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS reconciliation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  reconciliation_id UUID REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  transaction_id UUID,
  item_type VARCHAR(20),
  amount NUMERIC,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial alerts (drives /treasury/dashboard/alert-summary)
CREATE TABLE IF NOT EXISTS financial_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID,
  alert_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  entity_type VARCHAR(50),
  entity_id UUID,
  threshold_value NUMERIC,
  current_value NUMERIC,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE financial_alerts ADD COLUMN IF NOT EXISTS church_id UUID;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_church_date ON transactions(church_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_budgets_church ON budgets(church_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_budget ON budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_expenses_church_status ON expenses(church_id, status);
CREATE INDEX IF NOT EXISTS idx_vendors_church ON vendors(church_id);
CREATE INDEX IF NOT EXISTS idx_projects_church ON projects(church_id);
CREATE INDEX IF NOT EXISTS idx_pledges_church ON pledges(church_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_church ON recurring_payments(church_id);
CREATE INDEX IF NOT EXISTS idx_bank_recon_church ON bank_reconciliations(church_id);
CREATE INDEX IF NOT EXISTS idx_financial_alerts_resolved ON financial_alerts(is_resolved);
