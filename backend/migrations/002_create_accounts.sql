CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number VARCHAR(100) NOT NULL UNIQUE,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(100) NOT NULL,
  sub_type VARCHAR(100),
  parent_account_id UUID,
  fund_id UUID,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  church_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_accounts_church_id ON accounts(church_id);
CREATE INDEX IF NOT EXISTS idx_accounts_account_number ON accounts(account_number);
