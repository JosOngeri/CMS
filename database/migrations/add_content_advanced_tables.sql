-- Content Module Advanced Tables Migration
-- Adds collaboration, comments, locking, and enhanced revision features

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- First, convert existing content tables to UUID if they use SERIAL
-- Note: This assumes the existing tables use SERIAL, we need to migrate them to UUID

-- Content Collaborators
CREATE TABLE IF NOT EXISTS content_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_item_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'editor', -- 'owner', 'editor', 'viewer'
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(content_item_id, user_id)
);

-- Content Comments
CREATE TABLE IF NOT EXISTS content_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_item_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  parent_id UUID REFERENCES content_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content Locks
CREATE TABLE IF NOT EXISTS content_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_item_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  UNIQUE(content_item_id)
);

-- Enhance existing content_revisions table
ALTER TABLE content_revisions 
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rollback_from_id INTEGER REFERENCES content_revisions(id) ON DELETE SET NULL;

-- Add scheduled publishing columns to content_items if they don't exist
ALTER TABLE content_items 
ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS scheduled_unpublish_at TIMESTAMP;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_collaborators_content ON content_collaborators(content_item_id);
CREATE INDEX IF NOT EXISTS idx_content_collaborators_user ON content_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_content ON content_comments(content_item_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_user ON content_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_parent ON content_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_content_locks_content ON content_locks(content_item_id);
CREATE INDEX IF NOT EXISTS idx_content_locks_user ON content_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_content_locks_expires ON content_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_content_revisions_current ON content_revisions(is_current);
CREATE INDEX IF NOT EXISTS idx_content_items_scheduled_publish ON content_items(scheduled_publish_at);
CREATE INDEX IF NOT EXISTS idx_content_items_scheduled_unpublish ON content_items(scheduled_unpublish_at);

-- Add comments
COMMENT ON TABLE content_collaborators IS 'Content collaborators with role-based access';
COMMENT ON TABLE content_comments IS 'Comments on content items for collaboration';
COMMENT ON TABLE content_locks IS 'Content editing locks to prevent conflicts';
COMMENT ON COLUMN content_revisions.is_current IS 'Flag indicating if this is the current revision';
COMMENT ON COLUMN content_revisions.rollback_from_id IS 'Reference to revision this was rolled back from';
COMMENT ON COLUMN content_items.scheduled_publish_at IS 'Scheduled publish timestamp';
COMMENT ON COLUMN content_items.scheduled_unpublish_at IS 'Scheduled unpublish timestamp';

-- Create function to automatically set is_current flag
CREATE OR REPLACE FUNCTION set_current_content_revision()
RETURNS TRIGGER AS $$
BEGIN
  -- Set all other revisions for this content item to not current
  IF NEW.is_current = true THEN
    UPDATE content_revisions 
    SET is_current = false 
    WHERE content_item_id = NEW.content_item_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for content_revisions
DROP TRIGGER IF EXISTS set_current_content_revision_trigger ON content_revisions;
CREATE TRIGGER set_current_content_revision_trigger
  BEFORE INSERT OR UPDATE ON content_revisions
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION set_current_content_revision();
