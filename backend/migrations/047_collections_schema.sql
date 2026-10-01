-- 047_collections_schema.sql
-- The collections feature queries personal_collections,
-- collection_contributions and event_collections columns that are missing
-- in production (the canonical database/migrations/create_event_collections.sql
-- was never applied there).

-- Personal giving records ("My Collections" page)
CREATE TABLE IF NOT EXISTS personal_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  church_id UUID,
  amount NUMERIC(12,2) NOT NULL,
  purpose TEXT,
  fund VARCHAR(100),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_personal_collections_user ON personal_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_collections_church ON personal_collections(church_id);

-- Columns event_collections needs for the repository queries
ALTER TABLE event_collections ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'department';
ALTER TABLE event_collections ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE event_collections ADD COLUMN IF NOT EXISTS created_by UUID;

-- Contributions made toward an event collection
CREATE TABLE IF NOT EXISTS collection_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES event_collections(id) ON DELETE CASCADE,
  contributor_id UUID,
  contributor_name VARCHAR(255),
  amount NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_collection_contributions_collection ON collection_contributions(collection_id);

-- Events flag used by the collections workflow
ALTER TABLE events ADD COLUMN IF NOT EXISTS has_collection BOOLEAN NOT NULL DEFAULT false;
