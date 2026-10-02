-- Document approval support for services/documentApprovalService.js.
-- document_approvals never existed (every approve path 500'd) and documents
-- had no approval_status column for updateDocumentStatus to write.

CREATE TABLE IF NOT EXISTS document_approvals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id  INTEGER NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  approver_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comments             TEXT,
  approved_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (approval_request_id, approver_id)
);

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'none';

-- entity_id was INTEGER but every real row is NULL and document/user entity ids
-- are UUIDs — widen to TEXT (lossless; no existing values to convert).
ALTER TABLE approval_requests
  ALTER COLUMN entity_id TYPE TEXT USING entity_id::TEXT;

CREATE INDEX IF NOT EXISTS idx_document_approvals_request ON document_approvals(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_approver ON document_approvals(approver_id);
