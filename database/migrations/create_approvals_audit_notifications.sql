-- Migration: Create approval workflow and notification system
-- This adds notifications and approval_requests tables to complement existing audit_log

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- approval_request, membership_approved, membership_rejected, admin_granted, admin_revoked, department_created, member_added, member_removed
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  link VARCHAR(500), -- URL to navigate to when clicked
  related_entity_type VARCHAR(50), -- department, user, approval_request
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(related_entity_type, related_entity_id);

-- Comment on columns
COMMENT ON TABLE notifications IS 'In-app notification inbox for users';
COMMENT ON COLUMN notifications.type IS 'Notification type: approval_request, membership_approved, membership_rejected, admin_granted, admin_revoked, department_created, member_added, member_removed';
COMMENT ON COLUMN notifications.link IS 'URL to navigate to when notification is clicked';
COMMENT ON COLUMN notifications.related_entity_type IS 'Type of entity this notification relates to (department, user, approval_request)';
COMMENT ON COLUMN notifications.related_entity_id IS 'ID of the related entity';

-- ============================================
-- APPROVAL REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES users(id),
  approver_id UUID REFERENCES users(id), -- NULL initially, set when approved/rejected
  department_id UUID REFERENCES departments(id),
  request_type VARCHAR(50) NOT NULL, -- grant_admin, revoke_admin, role_change, member_add, member_remove, department_update
  entity_type VARCHAR(50) NOT NULL, -- user, department
  entity_id UUID NOT NULL, -- ID of the entity being acted upon
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, cancelled
  metadata JSONB, -- Additional context (e.g., new_role, old_role, reason)
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  comments TEXT
);

-- Indexes for approval_requests
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_approver ON approval_requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_department ON approval_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created ON approval_requests(requested_at DESC);

-- Comment on columns
COMMENT ON TABLE approval_requests IS 'Pending approval requests for sensitive actions';
COMMENT ON COLUMN approval_requests.request_type IS 'Type of request: grant_admin, revoke_admin, role_change, member_add, member_remove, department_update';
COMMENT ON COLUMN approval_requests.entity_type IS 'Type of entity being acted upon: user, department';
COMMENT ON COLUMN approval_requests.entity_id IS 'ID of the entity being acted upon';
COMMENT ON COLUMN approval_requests.metadata IS 'Additional context as JSON (e.g., new_role, old_role, reason)';
COMMENT ON COLUMN approval_requests.status IS 'Request status: pending, approved, rejected, cancelled';

-- ============================================
-- EXTEND EXISTING AUDIT_LOG TABLE
-- ============================================
-- Note: audit_log table already exists in treasury_schema.sql
-- We're adding indexes here if they don't exist for department operations
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_department ON audit_log USING gin (new_values) WHERE new_values ? 'department_id';
