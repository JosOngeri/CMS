-- 091_church_schema_alignment.sql
-- Align prod church-side schema with dev. The content/attendance/activity
-- tables live in database/*.sql (outside backend/migrations/) so prod never
-- received them. Every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Content module (UUID shapes matching dev)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  church_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  church_id UUID
);

CREATE TABLE IF NOT EXISTS website_settings (
  key_name VARCHAR(100) PRIMARY KEY,
  value TEXT,
  value_type VARCHAR(20) DEFAULT 'string',
  category VARCHAR(50) DEFAULT 'general',
  description TEXT,
  church_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(50) DEFAULT 'page',
  category_id UUID,
  author_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'draft',
  published_at TIMESTAMP,
  expires_at TIMESTAMP,
  priority INTEGER DEFAULT 0,
  seo_title VARCHAR(255),
  seo_description TEXT,
  og_image VARCHAR(255),
  church_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT,
  author_id UUID,
  revision_number INTEGER NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_locks (
  content_item_id UUID PRIMARY KEY REFERENCES content_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Scheduled publishing columns (added post-hoc on dev via
-- database/migrations/add_content_advanced_tables.sql, absent on prod)
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMP;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS scheduled_unpublish_at TIMESTAMP;

-- Referenced by ContentRepository but missing on dev AND prod
CREATE TABLE IF NOT EXISTS content_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'editor',
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (content_item_id, user_id)
);

CREATE TABLE IF NOT EXISTS content_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  parent_id UUID REFERENCES content_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referenced by AnalyticsRepository.getContentViews; created here so the
-- analytics endpoint works before any view tracking writer exists.
CREATE TABLE IF NOT EXISTS content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  user_id UUID,
  church_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_items_church ON content_items(church_id);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_items_category ON content_items(category_id);
CREATE INDEX IF NOT EXISTS idx_content_revisions_item ON content_revisions(content_item_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_item ON content_comments(content_item_id);
CREATE INDEX IF NOT EXISTS idx_content_collaborators_item ON content_collaborators(content_item_id);
CREATE INDEX IF NOT EXISTS idx_content_views_content ON content_views(content_id);
CREATE INDEX IF NOT EXISTS idx_website_settings_church ON website_settings(church_id);

-- ---------------------------------------------------------------------------
-- Member / department activity tables (ad-hoc on dev, absent on prod)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID,
  event_id UUID,
  attendance_date DATE NOT NULL,
  attended BOOLEAN DEFAULT true,
  church_id UUID,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID,
  activity_type VARCHAR(100),
  description TEXT,
  activity_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  church_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS department_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_member_attendance_church ON member_attendance(church_id);
CREATE INDEX IF NOT EXISTS idx_member_attendance_member ON member_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_member_activities_church ON member_activities(church_id);
CREATE INDEX IF NOT EXISTS idx_member_activities_member ON member_activities(member_id);
CREATE INDEX IF NOT EXISTS idx_department_activity_dept ON department_activity(department_id);

-- ---------------------------------------------------------------------------
-- departments: branding columns (prod has legacy logo/banner names)
-- ---------------------------------------------------------------------------
ALTER TABLE departments ADD COLUMN IF NOT EXISTS logo_url VARCHAR;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS banner_url VARCHAR;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS logo_color VARCHAR;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS banner_color VARCHAR;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS accent_color VARCHAR;

-- Backfill new branding columns from legacy logo/banner where they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'departments' AND column_name = 'logo') THEN
    UPDATE departments SET logo_url = logo WHERE logo_url IS NULL AND logo IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'departments' AND column_name = 'banner') THEN
    UPDATE departments SET banner_url = banner WHERE banner_url IS NULL AND banner IS NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- department_communications: prod has an older shape (body/created_by/send_sms)
-- ---------------------------------------------------------------------------
ALTER TABLE department_communications ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE department_communications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE department_communications ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'normal';
ALTER TABLE department_communications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE department_communications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'department_communications' AND column_name = 'body') THEN
    UPDATE department_communications SET message = body WHERE message IS NULL AND body IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'department_communications' AND column_name = 'created_by') THEN
    UPDATE department_communications SET sender_id = created_by WHERE sender_id IS NULL AND created_by IS NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Seed default content categories + tags (global defaults, church_id NULL)
-- ---------------------------------------------------------------------------
INSERT INTO content_categories (name, slug, description, sort_order) VALUES
  ('Announcements', 'announcements', 'Church announcements and updates', 1),
  ('Sermons', 'sermons', 'Sermon recordings and notes', 2),
  ('Events', 'events', 'Upcoming and past church events', 3),
  ('News', 'news', 'Church news and updates', 4),
  ('Resources', 'resources', 'Church resources and materials', 5)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO content_tags (name, slug) VALUES
  ('Important', 'important'),
  ('Featured', 'featured'),
  ('New', 'new'),
  ('Update', 'update')
ON CONFLICT (slug) DO NOTHING;
