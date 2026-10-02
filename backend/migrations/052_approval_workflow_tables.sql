-- Approval workflow engine tables.
-- helpers/workflowEngine.js has been mounted live via approvals.controller but
-- approval_workflows / workflow_assignments / approval_history never existed —
-- every workflow execute/process/status call 500'd on missing relations.
-- approval_requests also gains the columns the engine writes
-- (workflow_id, approved_by, rejected_by).

CREATE TABLE IF NOT EXISTS approval_workflows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  steps       JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  church_id   UUID,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id   INTEGER NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  step_index    INTEGER NOT NULL,
  approver_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at   TIMESTAMPTZ,
  comment       TEXT,
  delegated_to  UUID REFERENCES users(id) ON DELETE SET NULL,
  delegated_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (approval_id, step_index, approver_id)
);

CREATE TABLE IF NOT EXISTS approval_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id INTEGER NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(60) NOT NULL,
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE approval_requests
  ADD COLUMN IF NOT EXISTS workflow_id UUID,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS rejected_by UUID;

CREATE INDEX IF NOT EXISTS idx_approval_workflows_church      ON approval_workflows(church_id);
CREATE INDEX IF NOT EXISTS idx_workflow_assignments_approval  ON workflow_assignments(approval_id);
CREATE INDEX IF NOT EXISTS idx_workflow_assignments_approver  ON workflow_assignments(approver_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_history_approval      ON approval_history(approval_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_workflow     ON approval_requests(workflow_id);
