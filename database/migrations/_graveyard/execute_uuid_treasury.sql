-- Phase 4: Execute UUID Migration for Treasury Tables
-- This script converts treasury tables from SERIAL to UUID primary keys

BEGIN;

-- 1. Standardize church_accounts
ALTER TABLE church_accounts ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE church_accounts SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

-- Update foreign key references
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS new_account_id UUID;
UPDATE transactions SET new_account_id = ca.new_id 
FROM church_accounts ca WHERE transactions.account_id = ca.id;

-- Drop constraints
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;
ALTER TABLE transactions DROP COLUMN IF EXISTS account_id;
ALTER TABLE transactions RENAME COLUMN new_account_id TO account_id;
ALTER TABLE transactions ADD CONSTRAINT transactions_account_id_fkey 
  FOREIGN KEY (account_id) REFERENCES church_accounts(id) ON DELETE SET NULL;

-- Finalize church_accounts
ALTER TABLE church_accounts DROP CONSTRAINT IF EXISTS church_accounts_pkey;
ALTER TABLE church_accounts DROP COLUMN IF EXISTS id;
ALTER TABLE church_accounts RENAME COLUMN new_id TO id;
ALTER TABLE church_accounts ADD PRIMARY KEY (id);

-- 2. Standardize income_categories
ALTER TABLE income_categories ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE income_categories SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS new_income_category_id UUID;
UPDATE transactions SET new_income_category_id = ic.new_id 
FROM income_categories ic WHERE transactions.category_id = ic.id AND transactions.transaction_type = 'income';

ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS new_income_category_id UUID;
UPDATE budget_items SET new_income_category_id = ic.new_id 
FROM income_categories ic WHERE budget_items.category_id = ic.id AND budget_items.category_type = 'income';

-- Drop constraints
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;
ALTER TABLE budget_items DROP CONSTRAINT IF EXISTS budget_items_category_id_fkey;
ALTER TABLE transactions DROP COLUMN IF EXISTS category_id;
ALTER TABLE budget_items DROP COLUMN IF EXISTS category_id;
ALTER TABLE transactions RENAME COLUMN new_income_category_id TO category_id;
ALTER TABLE budget_items RENAME COLUMN new_income_category_id TO category_id;
ALTER TABLE transactions ADD CONSTRAINT transactions_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES income_categories(id) ON DELETE SET NULL;
ALTER TABLE budget_items ADD CONSTRAINT budget_items_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES income_categories(id) ON DELETE CASCADE;

-- Finalize income_categories
ALTER TABLE income_categories DROP CONSTRAINT IF EXISTS income_categories_pkey;
ALTER TABLE income_categories DROP COLUMN IF EXISTS id;
ALTER TABLE income_categories RENAME COLUMN new_id TO id;
ALTER TABLE income_categories ADD PRIMARY KEY (id);

-- 3. Standardize expense_categories
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE expense_categories SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS new_expense_category_id UUID;
UPDATE transactions SET new_expense_category_id = ec.new_id 
FROM expense_categories ec WHERE transactions.category_id = ec.id AND transactions.transaction_type = 'expense';

ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS new_expense_category_id UUID;
UPDATE budget_items SET new_expense_category_id = ec.new_id 
FROM expense_categories ec WHERE budget_items.category_id = ec.id AND budget_items.category_type = 'expense';

-- Drop constraints
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;
ALTER TABLE budget_items DROP CONSTRAINT IF EXISTS budget_items_category_id_fkey;
ALTER TABLE transactions DROP COLUMN IF EXISTS category_id;
ALTER TABLE budget_items DROP COLUMN IF EXISTS category_id;
ALTER TABLE transactions RENAME COLUMN new_expense_category_id TO category_id;
ALTER TABLE budget_items RENAME COLUMN new_expense_category_id TO category_id;
ALTER TABLE transactions ADD CONSTRAINT transactions_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL;
ALTER TABLE budget_items ADD CONSTRAINT budget_items_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE CASCADE;

-- Finalize expense_categories
ALTER TABLE expense_categories DROP CONSTRAINT IF EXISTS expense_categories_pkey;
ALTER TABLE expense_categories DROP COLUMN IF EXISTS id;
ALTER TABLE expense_categories RENAME COLUMN new_id TO id;
ALTER TABLE expense_categories ADD PRIMARY KEY (id);

-- 4. Standardize transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE transactions SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

-- Update foreign key references
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS new_transaction_id UUID;
UPDATE budget_items SET new_transaction_id = t.new_id 
FROM transactions t WHERE budget_items.budget_id = t.id;

-- Drop constraints
ALTER TABLE budget_items DROP CONSTRAINT IF EXISTS budget_items_budget_id_fkey;
ALTER TABLE budget_items DROP COLUMN IF EXISTS budget_id;
ALTER TABLE budget_items RENAME COLUMN new_transaction_id TO budget_id;
ALTER TABLE budget_items ADD CONSTRAINT budget_items_budget_id_fkey 
  FOREIGN KEY (budget_id) REFERENCES transactions(id) ON DELETE CASCADE;

-- Finalize transactions
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_pkey;
ALTER TABLE transactions DROP COLUMN IF EXISTS id;
ALTER TABLE transactions RENAME COLUMN new_id TO id;
ALTER TABLE transactions ADD PRIMARY KEY (id);

-- 5. Standardize budgets
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE budgets SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

-- Update foreign key references
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS new_budget_id UUID;
UPDATE budget_items SET new_budget_id = b.new_id 
FROM budgets b WHERE budget_items.budget_id = b.id;

-- Drop constraints
ALTER TABLE budget_items DROP CONSTRAINT IF EXISTS budget_items_budget_id_fkey;
ALTER TABLE budget_items DROP COLUMN IF EXISTS budget_id;
ALTER TABLE budget_items RENAME COLUMN new_budget_id TO budget_id;
ALTER TABLE budget_items ADD CONSTRAINT budget_items_budget_id_fkey 
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE;

-- Finalize budgets
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_pkey;
ALTER TABLE budgets DROP COLUMN IF EXISTS id;
ALTER TABLE budgets RENAME COLUMN new_id TO id;
ALTER TABLE budgets ADD PRIMARY KEY (id);

-- 6. Standardize budget_items
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE budget_items SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

ALTER TABLE budget_items DROP CONSTRAINT IF EXISTS budget_items_pkey;
ALTER TABLE budget_items DROP COLUMN IF EXISTS id;
ALTER TABLE budget_items RENAME COLUMN new_id TO id;
ALTER TABLE budget_items ADD PRIMARY KEY (id);

COMMIT;

-- Verification queries (run separately to verify)
-- SELECT id FROM church_accounts LIMIT 5;
-- SELECT id FROM transactions LIMIT 5;
-- SELECT id FROM budgets LIMIT 5;
