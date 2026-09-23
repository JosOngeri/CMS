-- Migration 028: tables/columns required by mobile app endpoints
-- Fixes: my-departments (departments.category), documents module,
-- payment history (payment_methods, payment_categories, payments.payment_method_id)

-- departments.category (used by getMyDepartments)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- payments.payment_method_id (used by receipt + history joins)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method_id UUID;

-- payment_methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50),
  provider VARCHAR(100),
  config JSONB,
  is_active BOOLEAN DEFAULT true,
  church_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO payment_methods (name, type, provider, is_active)
SELECT v.name, v.type, v.provider, true
FROM (VALUES
  ('M-Pesa', 'mobile_money', 'safaricom'),
  ('Cash', 'cash', NULL),
  ('Bank Transfer', 'bank', NULL)
) AS v(name, type, provider)
WHERE NOT EXISTS (SELECT 1 FROM payment_methods pm WHERE pm.name = v.name);

-- payment_categories
CREATE TABLE IF NOT EXISTS payment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  church_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO payment_categories (name, description)
SELECT v.name, v.description
FROM (VALUES
  ('Tithe', 'Regular tithe contributions'),
  ('Offering', 'Sabbath and special offerings'),
  ('Thanksgiving', 'Thanksgiving offerings'),
  ('Building Fund', 'Church building and development fund'),
  ('Camp Meeting', 'Camp meeting contributions'),
  ('Welfare', 'Member welfare support')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM payment_categories pc WHERE pc.name = v.name);

-- documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  file_name VARCHAR(255),
  file_path TEXT,
  file_url TEXT,
  size BIGINT,
  file_size BIGINT,
  category VARCHAR(100),
  tags TEXT,
  description TEXT,
  uploaded_by UUID,
  storage_provider VARCHAR(50),
  storage_key TEXT,
  cloud_storage BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  church_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_church ON documents(church_id);

CREATE TABLE IF NOT EXISTS document_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID,
  permission VARCHAR(50) DEFAULT 'read',
  church_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  file_path TEXT,
  file_size BIGINT,
  version_number INT DEFAULT 1,
  change_summary TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
