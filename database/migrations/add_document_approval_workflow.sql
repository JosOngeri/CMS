-- Phase 14: Document Approval Workflow Migration
-- Adds document approval tracking and multi-level approval support

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create document approvals table for multi-level approvals
CREATE TABLE IF NOT EXISTS document_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  comments TEXT,
  approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add approval_status column to documents table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='approval_status') THEN
    ALTER TABLE documents ADD COLUMN approval_status VARCHAR(20) DEFAULT 'draft';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='approval_level') THEN
    ALTER TABLE documents ADD COLUMN approval_level VARCHAR(20) DEFAULT 'standard';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='approval_request_id') THEN
    ALTER TABLE documents ADD COLUMN approval_request_id UUID REFERENCES approval_requests(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_document_approvals_request ON document_approvals(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_approver ON document_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_date ON document_approvals(approved_at);
CREATE INDEX IF NOT EXISTS idx_documents_approval_status ON documents(approval_status);
CREATE INDEX IF NOT EXISTS idx_documents_approval_request ON documents(approval_request_id);

-- Add document approval notification templates
INSERT INTO notification_templates (name, type_id, title, message, action_url, variables) VALUES
  ('approval_request', 'document', 'Document Approval Requested', '{{requesterName}} has requested approval for document: {{documentTitle}}', '/documents/{{documentId}}', '["requesterName", "documentTitle", "documentId", "approvalLevel"]'),
  ('approval_approved', 'document', 'Document Approved', 'Your document "{{documentTitle}}" has been approved by {{approverName}}', '/documents/{{documentId}}', '["documentTitle", "approverName", "documentId"]'),
  ('approval_rejected', 'document', 'Document Rejected', 'Your document "{{documentTitle}}" has been rejected. Reason: {{rejectionReason}}', '/documents/{{documentId}}', '["documentTitle", "rejectionReason", "documentId"]'),
  ('approval_progress', 'document', 'Approval Progress Update', 'Your document "{{documentTitle}}" has received {{currentApprovals}} of {{requiredApprovals}} required approvals', '/documents/{{documentId}}', '["documentTitle", "currentApprovals", "requiredApprovals", "documentId"]')
ON CONFLICT (name, church_id) DO NOTHING;

-- Add comments
COMMENT ON TABLE document_approvals IS 'Individual approvals for multi-level document approval workflow';
COMMENT ON COLUMN documents.approval_status IS 'Document approval status: draft, pending, approved, rejected';
COMMENT ON COLUMN documents.approval_level IS 'Required approval level: basic, standard, critical';
COMMENT ON COLUMN documents.approval_request_id IS 'Reference to the approval request for this document';
