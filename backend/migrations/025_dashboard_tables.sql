-- Create tables required by the mobile dashboard and approvals module.
-- The production cms_db was created from an older schema and is missing
-- notifications, approval_requests, and transactions.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Notifications (queried by MobileRepository: user_id, is_read, church_id)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  recipient_id UUID,
  type VARCHAR(50),
  title VARCHAR(200),
  body TEXT,
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  church_id UUID,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Columns that may be missing in older local schemas
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity_type VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity_id UUID;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_church_id ON notifications(church_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Approval requests. Both requester_id (ApprovalsRepository, MobileRepository)
-- and requested_by (PaymentRepository, older local schema) are included.
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200),
  description TEXT,
  request_type VARCHAR(50),
  request_data JSONB,
  metadata JSONB,
  entity_type VARCHAR(50),
  entity_id UUID,
  requester_id UUID,
  requested_by UUID,
  approver_id UUID,
  department_id UUID,
  module VARCHAR(50),
  amount NUMERIC(14,2),
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'pending',
  comments TEXT,
  church_id UUID,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Columns that exist in production-style schema but may be missing locally
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS requester_id UUID;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS request_data JSONB;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS title VARCHAR(200);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS approver_id UUID;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS module VARCHAR(50);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS amount NUMERIC(14,2);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_requests_church_id ON approval_requests(church_id);

-- Transactions (queried by MobileRepository.getQuickStats)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_type VARCHAR(20),
  category_id INTEGER,
  amount NUMERIC(14,2),
  description TEXT,
  transaction_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  church_id UUID,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_church_id ON transactions(church_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(transaction_type, status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
