-- APPROVALS Module Database Schema

-- Approval workflows table
CREATE TABLE IF NOT EXISTS approval_workflows (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  entity_type VARCHAR(50) NOT NULL, -- 'content', 'document', 'expense', 'event'
  approval_chain JSONB NOT NULL, -- Array of role IDs in approval order
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Approval requests table
CREATE TABLE IF NOT EXISTS approval_requests (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER REFERENCES approval_workflows(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  current_step INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  request_data JSONB,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Approval actions table
CREATE TABLE IF NOT EXISTS approval_actions (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES approval_requests(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL, -- 'approved', 'rejected', 'commented'
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default approval workflows
INSERT INTO approval_workflows (name, description, entity_type, approval_chain) VALUES
('Content Approval', 'Approval workflow for publishing content', 'content', '[3, 2, 1]'),
('Document Approval', 'Approval workflow for official documents', 'document', '[3, 2, 1]'),
('Expense Approval', 'Approval workflow for expenses above threshold', 'expense', '[3, 2, 1]'),
('Event Approval', 'Approval workflow for church events', 'event', '[3, 2, 1]')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_approval_workflows_entity_type ON approval_workflows(entity_type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_actions_request ON approval_actions(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_user ON approval_actions(user_id);

-- Add comments
COMMENT ON TABLE approval_workflows IS 'Approval workflow definitions for different entity types';
COMMENT ON TABLE approval_requests IS 'Individual approval requests following defined workflows';
COMMENT ON TABLE approval_actions IS 'History of actions taken on approval requests';