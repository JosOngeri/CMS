-- Add tax-deductible flag to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS is_tax_deductible BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_payments_tax_deductible ON payments(is_tax_deductible);

COMMENT ON COLUMN payments.is_tax_deductible IS 'Flag indicating if payment is tax-deductible';
