-- Treasury Module Additional Tables Migration
-- Adds vendors, projects, pledges, recurring payments, and budgets

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_code VARCHAR(20) UNIQUE NOT NULL,
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

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_code VARCHAR(20) UNIQUE NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  description TEXT,
  project_type VARCHAR(50) DEFAULT 'general', -- 'general', 'building', 'mission', 'education', 'youth'
  start_date DATE,
  end_date DATE,
  target_amount NUMERIC DEFAULT 0,
  current_amount NUMERIC DEFAULT 0,
  status VARCHAR(20) DEFAULT 'planned', -- 'planned', 'active', 'on_hold', 'completed', 'cancelled'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  fund_id UUID REFERENCES funds(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pledges
CREATE TABLE IF NOT EXISTS pledges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pledge_number VARCHAR(50) UNIQUE NOT NULL,
  member_id UUID REFERENCES users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  fund_id UUID REFERENCES funds(id) ON DELETE SET NULL,
  pledge_amount NUMERIC NOT NULL,
  pledged_date DATE NOT NULL,
  start_date DATE,
  end_date DATE,
  frequency VARCHAR(20) DEFAULT 'one_time', -- 'one_time', 'weekly', 'monthly', 'quarterly', 'annual'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'completed', 'cancelled', 'defaulted'
  amount_paid NUMERIC DEFAULT 0,
  amount_remaining NUMERIC GENERATED ALWAYS AS (pledge_amount - amount_paid) STORED,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recurring Payments
CREATE TABLE IF NOT EXISTS recurring_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recurring_number VARCHAR(50) UNIQUE NOT NULL,
  member_id UUID REFERENCES users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  fund_id UUID REFERENCES funds(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  frequency VARCHAR(20) NOT NULL, -- 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'annual'
  start_date DATE NOT NULL,
  end_date DATE,
  next_payment_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled'
  payment_method VARCHAR(50) DEFAULT 'M-Pesa',
  auto_charge BOOLEAN DEFAULT false,
  last_payment_date DATE,
  total_paid NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_code VARCHAR(20) UNIQUE NOT NULL,
  budget_name VARCHAR(255) NOT NULL,
  description TEXT,
  fiscal_year INTEGER NOT NULL,
  period VARCHAR(20) DEFAULT 'annual', -- 'annual', 'quarterly', 'monthly'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  fund_id UUID REFERENCES funds(id) ON DELETE SET NULL,
  account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  budgeted_amount NUMERIC NOT NULL,
  actual_amount NUMERIC DEFAULT 0,
  variance NUMERIC GENERATED ALWAYS AS (budgeted_amount - actual_amount) STORED,
  variance_percentage NUMERIC GENERATED ALWAYS AS (CASE WHEN budgeted_amount > 0 THEN ((budgeted_amount - actual_amount) / budgeted_amount) * 100 ELSE 0 END) STORED,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'submitted', 'approved', 'rejected'
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget Line Items
CREATE TABLE IF NOT EXISTS budget_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  category VARCHAR(100),
  description TEXT,
  budgeted_amount NUMERIC NOT NULL,
  actual_amount NUMERIC DEFAULT 0,
  variance NUMERIC GENERATED ALWAYS AS (budgeted_amount - actual_amount) STORED,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active);

CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_department ON projects(department_id);
CREATE INDEX IF NOT EXISTS idx_projects_fund ON projects(fund_id);

CREATE INDEX IF NOT EXISTS idx_pledges_number ON pledges(pledge_number);
CREATE INDEX IF NOT EXISTS idx_pledges_member ON pledges(member_id);
CREATE INDEX IF NOT EXISTS idx_pledges_project ON pledges(project_id);
CREATE INDEX IF NOT EXISTS idx_pledges_fund ON pledges(fund_id);
CREATE INDEX IF NOT EXISTS idx_pledges_status ON pledges(status);
CREATE INDEX IF NOT EXISTS idx_pledges_date ON pledges(pledged_date);

CREATE INDEX IF NOT EXISTS idx_recurring_number ON recurring_payments(recurring_number);
CREATE INDEX IF NOT EXISTS idx_recurring_member ON recurring_payments(member_id);
CREATE INDEX IF NOT EXISTS idx_recurring_project ON recurring_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_recurring_fund ON recurring_payments(fund_id);
CREATE INDEX IF NOT EXISTS idx_recurring_status ON recurring_payments(status);
CREATE INDEX IF NOT EXISTS idx_recurring_next_payment ON recurring_payments(next_payment_date);

CREATE INDEX IF NOT EXISTS idx_budgets_code ON budgets(budget_code);
CREATE INDEX IF NOT EXISTS idx_budgets_year ON budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budgets_department ON budgets(department_id);
CREATE INDEX IF NOT EXISTS idx_budgets_fund ON budgets(fund_id);
CREATE INDEX IF NOT EXISTS idx_budgets_account ON budgets(account_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);

CREATE INDEX IF NOT EXISTS idx_budget_line_items_budget ON budget_line_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_account ON budget_line_items(account_id);

-- Add comments
COMMENT ON TABLE vendors IS 'Vendor management for treasury operations';
COMMENT ON TABLE projects IS 'Project accounting and tracking';
COMMENT ON TABLE pledges IS 'Member pledge management';
COMMENT ON TABLE recurring_payments IS 'Recurring payment/gift management';
COMMENT ON TABLE budgets IS 'Budget planning and tracking';
COMMENT ON TABLE budget_line_items IS 'Budget line items with account-level detail';
COMMENT ON COLUMN pledges.amount_remaining IS 'Calculated remaining amount to fulfill pledge';
COMMENT ON COLUMN budgets.variance IS 'Budget variance (budgeted - actual)';
COMMENT ON COLUMN budgets.variance_percentage IS 'Budget variance as percentage';
