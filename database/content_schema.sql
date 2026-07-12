-- CONTENT Module Database Schema

-- Content categories table (no dependencies)
CREATE TABLE IF NOT EXISTS content_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  parent_id INTEGER REFERENCES content_categories(id) ON DELETE CASCADE,
  description TEXT,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content tags table (no dependencies)
CREATE TABLE IF NOT EXISTS content_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Website settings table (no dependencies)
CREATE TABLE IF NOT EXISTS website_settings (
  id SERIAL PRIMARY KEY,
  key_name VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  value_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
  category VARCHAR(50) DEFAULT 'general',
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content items table (depends on content_categories, users)
CREATE TABLE IF NOT EXISTS content_items (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT,
  content_type VARCHAR(50) DEFAULT 'page', -- 'page', 'post', 'sermon', 'announcement'
  category_id INTEGER REFERENCES content_categories(id) ON DELETE SET NULL,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'
  published_at TIMESTAMP,
  expires_at TIMESTAMP,
  priority INTEGER DEFAULT 0,
  seo_title VARCHAR(255),
  seo_description TEXT,
  og_image VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content-tag junction table (depends on content_items, content_tags)
CREATE TABLE IF NOT EXISTS content_item_tags (
  content_item_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES content_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (content_item_id, tag_id)
);

-- Content revisions table (depends on content_items, users)
CREATE TABLE IF NOT EXISTS content_revisions (
  id SERIAL PRIMARY KEY,
  content_item_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  revision_number INTEGER NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO content_categories (name, slug, description, sort_order) VALUES
  ('Announcements', 'announcements', 'Church announcements and updates', 1),
  ('Sermons', 'sermons', 'Sermon recordings and notes', 2),
  ('Events', 'events', 'Upcoming and past church events', 3),
  ('News', 'news', 'Church news and updates', 4),
  ('Resources', 'resources', 'Church resources and materials', 5)
ON CONFLICT (name) DO NOTHING;

-- Insert default tags
INSERT INTO content_tags (name, slug, color) VALUES
  ('Important', 'important', '#EF4444'),
  ('Featured', 'featured', '#F59E0B'),
  ('New', 'new', '#10B981'),
  ('Update', 'update', '#3B82F6')
ON CONFLICT (name) DO NOTHING;

-- Insert default website settings
INSERT INTO website_settings (key_name, value, value_type, category, description) VALUES
  ('site_title', 'Kiserian Main SDA Church', 'string', 'general', 'Website title'),
  ('site_description', 'Welcome to Kiserian Main SDA Church', 'string', 'general', 'Website description'),
  ('contact_email', 'info@kmaincms.org', 'string', 'contact', 'Contact email'),
  ('contact_phone', '+254 700 000 000', 'string', 'contact', 'Contact phone'),
  ('address', 'Kiserian, Kenya', 'string', 'contact', 'Church address'),
  ('facebook_url', '', 'string', 'social', 'Facebook page URL'),
  ('twitter_url', '', 'string', 'social', 'Twitter profile URL'),
  ('instagram_url', '', 'string', 'social', 'Instagram profile URL'),
  ('youtube_url', '', 'string', 'social', 'YouTube channel URL')
ON CONFLICT (key_name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_items_slug ON content_items(slug);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_items_category ON content_items(category_id);
CREATE INDEX IF NOT EXISTS idx_content_items_author ON content_items(author_id);
CREATE INDEX IF NOT EXISTS idx_content_items_published_at ON content_items(published_at);
CREATE INDEX IF NOT EXISTS idx_content_categories_parent ON content_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_content_categories_slug ON content_categories(slug);
CREATE INDEX IF NOT EXISTS idx_content_revisions_content_item ON content_revisions(content_item_id);
CREATE INDEX IF NOT EXISTS idx_content_revisions_created_at ON content_revisions(created_at);
CREATE INDEX IF NOT EXISTS idx_website_settings_key ON website_settings(key_name);
CREATE INDEX IF NOT EXISTS idx_website_settings_category ON website_settings(category);

-- Add comments
COMMENT ON TABLE content_items IS 'Main content storage for pages, posts, sermons, and announcements';
COMMENT ON TABLE content_categories IS 'Hierarchical categories for content organization';
COMMENT ON TABLE content_tags IS 'Tags for content classification and filtering';
COMMENT ON TABLE content_revisions IS 'Version history for content items with rollback capability';
COMMENT ON TABLE website_settings IS 'Website-specific settings separate from system settings';