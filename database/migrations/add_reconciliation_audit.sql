-- Phase 12: Forensic Financial Reconciliation
-- Support for Name-First auditing and immutable edit history

CREATE TABLE IF NOT EXISTS reconciliation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id),
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    sender_name VARCHAR(100),
    claimed_by_name VARCHAR(100),
    amount NUMERIC(15, 2),
    source_type VARCHAR(20) DEFAULT 'mpesa',
    status VARCHAR(20) DEFAULT 'unclaimed',
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id),
    edit_history JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_recon_tx_code ON reconciliation_queue(transaction_code);
CREATE INDEX IF NOT EXISTS idx_recon_church ON reconciliation_queue(church_id);
