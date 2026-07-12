-- Documents Module Advanced Tables Migration
-- Adds version control, permissions, preview cache, and access logging

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Document Versions
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  change_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Permissions
CREATE TABLE IF NOT EXISTS document_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  permission_level VARCHAR(20) DEFAULT 'view', -- 'view', 'edit', 'delete', 'admin'
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, user_id),
  UNIQUE(document_id, department_id)
);

-- Document Preview Cache
CREATE TABLE IF NOT EXISTS document_previews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  preview_type VARCHAR(20), -- 'thumbnail', 'pdf', 'text'
  preview_path TEXT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Access Logs
CREATE TABLE IF NOT EXISTS document_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(20), -- 'view', 'download', 'edit', 'delete', 'share'
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_number ON document_versions(version_number);
CREATE INDEX IF NOT EXISTS idx_document_versions_created ON document_versions(created_at);
CREATE INDEX IF NOT EXISTS idx_document_permissions_document ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_user ON document_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_department ON document_permissions(department_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_level ON document_permissions(permission_level);
CREATE INDEX IF NOT EXISTS idx_document_previews_document ON document_previews(document_id);
CREATE INDEX IF NOT EXISTS idx_document_previews_type ON document_previews(preview_type);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_document ON document_access_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_user ON document_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_action ON document_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_accessed ON document_access_logs(accessed_at);

-- Add comments
COMMENT ON TABLE document_versions IS 'Version history for documents with rollback capability';
COMMENT ON TABLE document_permissions IS 'Granular permissions for document access control';
COMMENT ON TABLE document_previews IS 'Cached preview files for documents';
COMMENT ON TABLE document_access_logs IS 'Audit log of document access and actions';

-- Create function to auto-increment version numbers
CREATE OR REPLACE FUNCTION increment_document_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-increment version number for this document
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO NEW.version_number
  FROM document_versions
  WHERE document_id = NEW.document_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for document_versions
DROP TRIGGER IF EXISTS increment_document_version_trigger ON document_versions;
CREATE TRIGGER increment_document_version_trigger
  BEFORE INSERT ON document_versions
  FOR EACH ROW
  EXECUTE FUNCTION increment_document_version();

-- Create function to log document access
CREATE OR REPLACE FUNCTION log_document_access()
RETURNS TRIGGER AS $$
BEGIN
  -- This would typically be called from application logic
  -- But we can create a trigger for automatic logging on certain operations
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
