CREATE TABLE IF NOT EXISTS department_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  church_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS department_feature_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL,
  feature_id UUID NOT NULL REFERENCES department_features(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  church_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(department_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_department_features_church_id ON department_features(church_id);
CREATE INDEX IF NOT EXISTS idx_department_features_slug ON department_features(slug);
CREATE INDEX IF NOT EXISTS idx_department_feature_settings_department ON department_feature_settings(department_id);
