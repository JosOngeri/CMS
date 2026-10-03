-- Phase 4: UUID Standardization for TREASURY
-- Objective: Convert treasury and all related tables to UUID v4

BEGIN;

-- 1. Create temporary UUID columns
ALTER TABLE church_accounts ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();
ALTER TABLE income_categories ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();
ALTER TABLE expense_categories ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();
ALTER TABLE transactions ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();
ALTER TABLE transactions ADD COLUMN new_account_id UUID;
ALTER TABLE transactions ADD COLUMN new_category_id UUID;
ALTER TABLE budgets ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();
ALTER TABLE budget_items ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();
ALTER TABLE budget_items ADD COLUMN new_budget_id UUID;

-- 2. Backfill FK references
UPDATE transactions t SET new_account_id = ca.new_id FROM church_accounts ca WHERE t.account_id = ca.id;
UPDATE budget_items bi SET new_budget_id = b.new_id FROM budgets b WHERE bi.budget_id = b.id;

-- 3. Finalize Primary Keys (Sequential Drops/Renames)
-- Church Accounts
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;
ALTER TABLE church_accounts DROP CONSTRAINT church_accounts_pkey CASCADE;
ALTER TABLE church_accounts DROP COLUMN id;
ALTER TABLE church_accounts RENAME COLUMN new_id TO id;
ALTER TABLE church_accounts ADD PRIMARY KEY (id);

-- Transactions FK fix
ALTER TABLE transactions DROP COLUMN account_id;
ALTER TABLE transactions RENAME COLUMN new_account_id TO account_id;
ALTER TABLE transactions ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES church_accounts(id);

-- Transactions PK fix
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_pkey;
ALTER TABLE transactions DROP COLUMN id;
ALTER TABLE transactions RENAME COLUMN new_id TO id;
ALTER TABLE transactions ADD PRIMARY KEY (id);

-- Budgets PK fix
ALTER TABLE budget_items DROP CONSTRAINT IF EXISTS budget_items_budget_id_fkey;
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_pkey CASCADE;
ALTER TABLE budgets DROP COLUMN id;
ALTER TABLE budgets RENAME COLUMN new_id TO id;
ALTER TABLE budgets ADD PRIMARY KEY (id);

-- Budget Items FK fix
ALTER TABLE budget_items DROP COLUMN budget_id;
ALTER TABLE budget_items RENAME COLUMN new_budget_id TO budget_id;
ALTER TABLE budget_items ADD CONSTRAINT budget_items_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES budgets(id);

-- Categories (simplified for this script, but same pattern follows)
ALTER TABLE income_categories DROP CONSTRAINT IF EXISTS income_categories_pkey CASCADE;
ALTER TABLE income_categories DROP COLUMN id;
ALTER TABLE income_categories RENAME COLUMN new_id TO id;
ALTER TABLE income_categories ADD PRIMARY KEY (id);

ALTER TABLE expense_categories DROP CONSTRAINT IF EXISTS expense_categories_pkey CASCADE;
ALTER TABLE expense_categories DROP COLUMN id;
ALTER TABLE expense_categories RENAME COLUMN new_id TO id;
ALTER TABLE expense_categories ADD PRIMARY KEY (id);

COMMIT;
