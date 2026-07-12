-- Phase 12: Financial Immutability Triggers
-- Prevents modification of verified financial records for audit compliance

-- Add is_verified column to payments table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='is_verified') THEN
        ALTER TABLE payments ADD COLUMN is_verified BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='verified_at') THEN
        ALTER TABLE payments ADD COLUMN verified_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='verified_by') THEN
        ALTER TABLE payments ADD COLUMN verified_by UUID REFERENCES users(id);
    END IF;
END $$;

-- Add index for verified payments
CREATE INDEX IF NOT EXISTS idx_payments_verified ON payments(is_verified);

-- Add edit_history column to track changes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='edit_history') THEN
        ALTER TABLE payments ADD COLUMN edit_history JSONB DEFAULT '[]';
    END IF;
END $$;

-- Create function to prevent updates to verified payments
CREATE OR REPLACE FUNCTION prevent_verified_payment_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_verified = true AND NEW.is_verified = true THEN
        -- Allow updating only non-critical fields even when verified
        IF NEW.amount != OLD.amount OR 
           NEW.payment_date != OLD.payment_date OR 
           NEW.member_id != OLD.member_id OR
           NEW.transaction_code != OLD.transaction_code THEN
            RAISE EXCEPTION 'Cannot modify critical fields of verified payment record';
        END IF;
    END IF;
    
    -- Track edit history
    IF NEW.is_verified = false OR (OLD.is_verified = false AND NEW.is_verified = true) THEN
        NEW.edit_history = COALESCE(OLD.edit_history, '[]')::jsonb || 
            jsonb_build_array(
                jsonb_build_object(
                    'edited_at', CURRENT_TIMESTAMP,
                    'edited_by', current_setting('app.current_user_id', 'system')::uuid,
                    'changes', 
                    jsonb_build_object(
                        'amount', CASE WHEN NEW.amount != OLD.amount THEN jsonb_build_object('old', OLD.amount, 'new', NEW.amount) END,
                        'status', CASE WHEN NEW.status != OLD.status THEN jsonb_build_object('old', OLD.status, 'new', NEW.status) END,
                        'member_id', CASE WHEN NEW.member_id != OLD.member_id THEN jsonb_build_object('old', OLD.member_id, 'new', NEW.member_id) END
                    )
                )
            );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payments
DROP TRIGGER IF EXISTS trg_prevent_verified_payment_update ON payments;
CREATE TRIGGER trg_prevent_verified_payment_update
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION prevent_verified_payment_update();

-- Create function to prevent deletion of verified payments
CREATE OR REPLACE FUNCTION prevent_verified_payment_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_verified = true THEN
        RAISE EXCEPTION 'Cannot delete verified payment record';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment deletion
DROP TRIGGER IF EXISTS trg_prevent_verified_payment_delete ON payments;
CREATE TRIGGER trg_prevent_verified_payment_delete
    BEFORE DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION prevent_verified_payment_delete();

-- Add similar immutability to reconciliation_queue
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reconciliation_queue' AND column_name='is_locked') THEN
        ALTER TABLE reconciliation_queue ADD COLUMN is_locked BOOLEAN DEFAULT false;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reconciliation_locked ON reconciliation_queue(is_locked);

-- Create function to prevent updates to locked reconciliation records
CREATE OR REPLACE FUNCTION prevent_locked_reconciliation_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_locked = true THEN
        RAISE EXCEPTION 'Cannot modify locked reconciliation record';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reconciliation_queue
DROP TRIGGER IF EXISTS trg_prevent_locked_reconciliation_update ON reconciliation_queue;
CREATE TRIGGER trg_prevent_locked_reconciliation_update
    BEFORE UPDATE ON reconciliation_queue
    FOR EACH ROW
    EXECUTE FUNCTION prevent_locked_reconciliation_update();

-- Create function to prevent deletion of locked reconciliation records
CREATE OR REPLACE FUNCTION prevent_locked_reconciliation_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_locked = true THEN
        RAISE EXCEPTION 'Cannot delete locked reconciliation record';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reconciliation_queue deletion
DROP TRIGGER IF EXISTS trg_prevent_locked_reconciliation_delete ON reconciliation_queue;
CREATE TRIGGER trg_prevent_locked_reconciliation_delete
    BEFORE DELETE ON reconciliation_queue
    FOR EACH ROW
    EXECUTE FUNCTION prevent_locked_reconciliation_delete();

-- Add similar immutability to transactions table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='is_finalized') THEN
        ALTER TABLE transactions ADD COLUMN is_finalized BOOLEAN DEFAULT false;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_finalized ON transactions(is_finalized);

-- Create function to prevent updates to finalized transactions
CREATE OR REPLACE FUNCTION prevent_finalized_transaction_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_finalized = true THEN
        RAISE EXCEPTION 'Cannot modify finalized transaction record';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transactions
DROP TRIGGER IF EXISTS trg_prevent_finalized_transaction_update ON transactions;
CREATE TRIGGER trg_prevent_finalized_transaction_update
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_finalized_transaction_update();

-- Create function to prevent deletion of finalized transactions
CREATE OR REPLACE FUNCTION prevent_finalized_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_finalized = true THEN
        RAISE EXCEPTION 'Cannot delete finalized transaction record';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transactions deletion
DROP TRIGGER IF EXISTS trg_prevent_finalized_transaction_delete ON transactions;
CREATE TRIGGER trg_prevent_finalized_transaction_delete
    BEFORE DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_finalized_transaction_delete();
