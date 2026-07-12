-- Phase 12: Payment Tracking Migration
-- Adds payment tracking, reconciliation, and audit tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create bank transactions table
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  code VARCHAR(50) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  source VARCHAR(50),
  church_id UUID REFERENCES churches(id) ON DELETE SET NULL,
  matched_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  matched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payment discrepancies table
CREATE TABLE IF NOT EXISTS payment_discrepancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  transaction_id VARCHAR(100),
  reason TEXT NOT NULL,
  amount_diff DECIMAL(15, 2),
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  church_id UUID REFERENCES churches(id) ON DELETE SET NULL
);

-- Create payment audit log table
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  church_id UUID REFERENCES churches(id) ON DELETE SET NULL
);

-- Add reconciliation columns to payments table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='reconciled_at') THEN
    ALTER TABLE payments ADD COLUMN reconciled_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='transaction_id') THEN
    ALTER TABLE payments ADD COLUMN transaction_id VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='discrepancy') THEN
    ALTER TABLE payments ADD COLUMN discrepancy DECIMAL(15, 2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='refunded') THEN
    ALTER TABLE payments ADD COLUMN refunded BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='refunded_at') THEN
    ALTER TABLE payments ADD COLUMN refunded_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='refunded_by') THEN
    ALTER TABLE payments ADD COLUMN refunded_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_bank_transactions_code ON bank_transactions(code);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_church ON bank_transactions(church_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_matched ON bank_transactions(matched_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_discrepancies_payment ON payment_discrepancies(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_discrepancies_church ON payment_discrepancies(church_id);
CREATE INDEX IF NOT EXISTS idx_payment_discrepancies_resolved ON payment_discrepancies(resolved);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_payment ON payment_audit_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_church ON payment_audit_log(church_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_action ON payment_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_payments_reconciled ON payments(reconciled_at);
CREATE INDEX IF NOT EXISTS idx_payments_refunded ON payments(refunded);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_bank_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_bank_transactions_updated_at ON bank_transactions;
CREATE TRIGGER trg_update_bank_transactions_updated_at
  BEFORE UPDATE ON bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_transactions_updated_at();

-- Add comments
COMMENT ON TABLE bank_transactions IS 'Bank transactions for reconciliation';
COMMENT ON TABLE payment_discrepancies IS 'Payment discrepancies detected during reconciliation';
COMMENT ON TABLE payment_audit_log IS 'Audit log for payment changes';
COMMENT ON COLUMN payments.reconciled_at IS 'Timestamp when payment was reconciled with bank transaction';
COMMENT ON COLUMN payments.refunded IS 'Whether payment has been refunded';
COMMENT ON COLUMN payment_discrepancies.resolved IS 'Whether discrepancy has been resolved';
