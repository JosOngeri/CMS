-- Phase 12: Add M-Pesa STK Push tracking table
-- Tracks STK Push requests and their status

CREATE TABLE IF NOT EXISTS mpesa_stk_pushes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_request_id VARCHAR(100) UNIQUE NOT NULL,
    checkout_request_id VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    reference VARCHAR(100),
    response_code VARCHAR(10),
    response_description TEXT,
    customer_message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    result_code VARCHAR(10),
    result_description TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mpesa_stk_checkout ON mpesa_stk_pushes(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_stk_merchant ON mpesa_stk_pushes(merchant_request_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_stk_phone ON mpesa_stk_pushes(phone);
CREATE INDEX IF NOT EXISTS idx_mpesa_stk_church ON mpesa_stk_pushes(church_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_stk_status ON mpesa_stk_pushes(status);
CREATE INDEX IF NOT EXISTS idx_mpesa_stk_created ON mpesa_stk_pushes(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mpesa_stk_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_mpesa_stk_updated_at ON mpesa_stk_pushes;
CREATE TRIGGER trg_update_mpesa_stk_updated_at
    BEFORE UPDATE ON mpesa_stk_pushes
    FOR EACH ROW
    EXECUTE FUNCTION update_mpesa_stk_updated_at();