-- Migration 030: tables/columns for Pastor, Treasurer and Department Head dashboards
-- tasks (ministry health + dept stats), event_collections (financial health),
-- department_budgets (financial health), transactions.member_id (treasurer feed)

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID,
  church_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'normal',
  assigned_to UUID,
  due_date TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_church ON tasks(church_id);

CREATE TABLE IF NOT EXISTS event_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_amount NUMERIC(12,2) DEFAULT 0,
  current_amount NUMERIC(12,2) DEFAULT 0,
  church_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_collections_church ON event_collections(church_id);

CREATE TABLE IF NOT EXISTS department_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID,
  total_amount NUMERIC(12,2) DEFAULT 0,
  spent_amount NUMERIC(12,2) DEFAULT 0,
  remaining_amount NUMERIC(12,2) DEFAULT 0,
  fiscal_year VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS member_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
