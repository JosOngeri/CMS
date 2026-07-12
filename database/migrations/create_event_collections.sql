-- Event Collections and Contributions Migration
-- This migration adds support for budget/collection tracking for events

-- Add has_collection column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS has_collection BOOLEAN DEFAULT FALSE;

-- Create event_collections table
CREATE TABLE IF NOT EXISTS event_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  current_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  visibility VARCHAR(20) NOT NULL DEFAULT 'department' CHECK (visibility IN ('department', 'church')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for event_collections
CREATE INDEX IF NOT EXISTS idx_event_collections_event ON event_collections(event_id);
CREATE INDEX IF NOT EXISTS idx_event_collections_visibility ON event_collections(visibility);
CREATE INDEX IF NOT EXISTS idx_event_collections_status ON event_collections(status);
CREATE INDEX IF NOT EXISTS idx_event_collections_created_by ON event_collections(created_by);

-- Add comments to event_collections table
COMMENT ON TABLE event_collections IS 'Stores collection/budget tracking information for events';
COMMENT ON COLUMN event_collections.event_id IS 'Reference to the event this collection belongs to';
COMMENT ON COLUMN event_collections.title IS 'Title of the collection (e.g., "Building Fund", "Special Offering")';
COMMENT ON COLUMN event_collections.description IS 'Description of the collection purpose';
COMMENT ON COLUMN event_collections.target_amount IS 'Target amount to be raised';
COMMENT ON COLUMN event_collections.current_amount IS 'Current amount raised';
COMMENT ON COLUMN event_collections.visibility IS 'Who can view this collection: department or church-wide';
COMMENT ON COLUMN event_collections.status IS 'Current status: active, completed, or cancelled';
COMMENT ON COLUMN event_collections.created_by IS 'User who created this collection';

-- Create collection_contributions table
CREATE TABLE IF NOT EXISTS collection_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES event_collections(id) ON DELETE CASCADE,
  contributor_id UUID REFERENCES users(id),
  contributor_name VARCHAR(255),
  amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for collection_contributions
CREATE INDEX IF NOT EXISTS idx_collection_contributions_collection ON collection_contributions(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_contributions_contributor ON collection_contributions(contributor_id);
CREATE INDEX IF NOT EXISTS idx_collection_contributions_created_at ON collection_contributions(created_at DESC);

-- Add comments to collection_contributions table
COMMENT ON TABLE collection_contributions IS 'Stores individual contributions to event collections';
COMMENT ON COLUMN collection_contributions.collection_id IS 'Reference to the collection this contribution belongs to';
COMMENT ON COLUMN collection_contributions.contributor_id IS 'User who made the contribution (nullable for anonymous)';
COMMENT ON COLUMN collection_contributions.contributor_name IS 'Name of contributor (for anonymous contributions)';
COMMENT ON COLUMN collection_contributions.amount IS 'Amount contributed';
COMMENT ON COLUMN collection_contributions.payment_method IS 'Payment method: cash, mobile_money, bank_transfer, card';
COMMENT ON COLUMN collection_contributions.notes IS 'Additional notes about the contribution';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_event_collections_updated_at BEFORE UPDATE ON event_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
