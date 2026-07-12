-- DOCUMENTS Module Database Schema

-- Document categories table
CREATE TABLE IF NOT EXISTS document_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES document_categories(id) ON DELETE SET NULL,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document versions table
CREATE TABLE IF NOT EXISTS document_versions (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  change_summary TEXT,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document permissions table
CREATE TABLE IF NOT EXISTS document_permissions (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
  permission VARCHAR(20) NOT NULL, -- 'read', 'write', 'delete', 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO document_categories (name, slug, description, icon) VALUES
('Policies', 'policies', 'Church policies and guidelines', 'file-text'),
('Forms', 'forms', 'Church forms and applications', 'clipboard'),
('Reports', 'reports', 'Church reports and documents', 'bar-chart'),
('Resources', 'resources', 'Educational and training resources', 'book'),
('Minutes', 'minutes', 'Meeting minutes and records', 'clock')
ON CONFLICT (slug) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_slug ON documents(slug);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_is_public ON documents(is_public);
CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_document ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_user ON document_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_role ON document_permissions(role_id);

-- Add comments
COMMENT ON TABLE document_categories IS 'Categories for organizing church documents';
COMMENT ON TABLE documents IS 'Church documents and files';
COMMENT ON TABLE document_versions IS 'Version history for documents';
COMMENT ON TABLE document_permissions IS 'Access control for documents';