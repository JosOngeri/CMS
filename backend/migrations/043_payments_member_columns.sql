-- Payments table: columns used by the member M-Pesa initiation flow
-- (createPaymentFromFrontend), KopoKopo webhook updates, and receipts.
-- All IF NOT EXISTS so this is safe whether the table came from
-- payments_schema.sql, complete_schema.sql, or an older shape.

ALTER TABLE payments ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS church_slug VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KES';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS merchant_request_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mpesa_receipt VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mpesa_receipt_number VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS initiated_by UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS processed_by UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS obligation_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS budget_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_payments_church_id ON payments(church_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
