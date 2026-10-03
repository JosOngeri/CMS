-- Document approval support for services/documentApprovalService.js.
-- document_approvals never existed (every approve path 500'd) and documents
-- had no approval_status column for updateDocumentStatus to write.
--
-- approval_request_id must match approval_requests.id (INTEGER vs UUID drift).

DO $$
DECLARE
  ar_id_type TEXT;
BEGIN
  SELECT data_type INTO ar_id_type
    FROM information_schema.columns
   WHERE table_name = 'approval_requests' AND column_name = 'id';
  IF ar_id_type IS NULL THEN
    RAISE EXCEPTION 'approval_requests.id not found — run the approvals migration first';
  END IF;

  EXECUTE format($ct$
    CREATE TABLE IF NOT EXISTS document_approvals (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      approval_request_id  %s NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
      approver_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      comments             TEXT,
      approved_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (approval_request_id, approver_id)
    )$ct$, ar_id_type);
END $$;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'none';

-- entity_id was INTEGER but every real row is NULL and document/user entity ids
-- are UUIDs — widen to TEXT (lossless; no existing values to convert).
ALTER TABLE approval_requests
  ALTER COLUMN entity_id TYPE TEXT USING entity_id::TEXT;

CREATE INDEX IF NOT EXISTS idx_document_approvals_request ON document_approvals(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_approver ON document_approvals(approver_id);
