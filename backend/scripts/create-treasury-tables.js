const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function createTreasuryTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add generated columns to support existing repository queries
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS full_name TEXT GENERATED ALWAYS AS (COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) STORED
    `);

    await client.query(`
      ALTER TABLE departments
      ADD COLUMN IF NOT EXISTS department_name TEXT GENERATED ALWAYS AS (name) STORED
    `);

    // Accounts
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_name VARCHAR(255) NOT NULL,
        account_number VARCHAR(100),
        account_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Funds
    await client.query(`
      CREATE TABLE IF NOT EXISTS funds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fund_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Vendors
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(100),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Projects
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Expenses
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expense_date DATE NOT NULL,
        description TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
        fund_id UUID REFERENCES funds(id) ON DELETE SET NULL,
        vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        receipt_url TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(100),
        submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Journal entries
    await client.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_date DATE NOT NULL,
        description TEXT NOT NULL,
        reference_type VARCHAR(100),
        reference_id UUID,
        status VARCHAR(50) DEFAULT 'posted',
        total_debits NUMERIC(12,2) DEFAULT 0,
        total_credits NUMERIC(12,2) DEFAULT 0,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS journal_entry_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
        account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
        debit_amount NUMERIC(12,2) DEFAULT 0,
        credit_amount NUMERIC(12,2) DEFAULT 0,
        description TEXT,
        line_number INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Budgets
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        budget_name VARCHAR(255) NOT NULL,
        budget_type VARCHAR(100),
        fiscal_year INTEGER,
        account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
        fund_id UUID REFERENCES funds(id) ON DELETE SET NULL,
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        total_budgeted NUMERIC(12,2) DEFAULT 0,
        total_actual NUMERIC(12,2) DEFAULT 0,
        variance NUMERIC(12,2) DEFAULT 0,
        variance_percentage NUMERIC(5,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        start_date DATE,
        end_date DATE,
        notes TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('Treasury tables created successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating treasury tables:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTreasuryTables();
