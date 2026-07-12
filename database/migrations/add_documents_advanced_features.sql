-- Documents Advanced Features Migration
-- Adds cloud storage, permissions, full-text search, and version control

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Document Permissions
CREATE TABLE IF NOT EXISTS document_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(50) NOT NULL, -- 'read', 'write', 'admin', 'delete'
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, user_id, permission)
);

-- Add cloud storage columns to documents table if they don't exist
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(50), -- 's3', 'azure', 'google', 'local'
ADD COLUMN IF NOT EXISTS storage_key VARCHAR(500),
ADD COLUMN IF NOT EXISTS cloud_storage BOOLEAN DEFAULT false;

-- Add full-text search column to documents table if it doesn't exist
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('english', coalesce(file_name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, ''))
) STORED;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_permissions_doc ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_user ON document_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON documents USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_documents_storage_provider ON documents(storage_provider);

-- Add comments
COMMENT ON TABLE document_permissions IS 'Document-specific user permissions';
COMMENT ON COLUMN documents.storage_provider IS 'Cloud storage provider (s3, azure, google, local)';
COMMENT ON COLUMN documents.storage_key IS 'Storage key/path for cloud storage';
COMMENT ON COLUMN documents.cloud_storage IS 'Flag indicating if document is stored in cloud';
COMMENT ON COLUMN documents.search_vector IS 'Full-text search vector for document content';
