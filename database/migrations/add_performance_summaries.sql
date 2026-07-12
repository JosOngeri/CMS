-- Phase 2: Lightweight Operations & Pre-aggregation
-- Create summaries table for O(1) dashboard performance

CREATE TABLE IF NOT EXISTS summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID,
    total_members INTEGER DEFAULT 0,
    total_revenue DECIMAL(15, 2) DEFAULT 0.00,
    upcoming_events_count INTEGER DEFAULT 0,
    recent_announcements_count INTEGER DEFAULT 0,
    pending_approvals_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize with a default row if empty
INSERT INTO summaries (total_members, total_revenue, upcoming_events_count, recent_announcements_count)
SELECT 0, 0.00, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM summaries);

-- Trigger Function for Revenue
CREATE OR REPLACE FUNCTION update_revenue_summary()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'completed') THEN
        UPDATE summaries SET total_revenue = total_revenue + NEW.amount, last_updated = CURRENT_TIMESTAMP;
    ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') THEN
        UPDATE summaries SET total_revenue = total_revenue + NEW.amount, last_updated = CURRENT_TIMESTAMP;
    ELSIF (TG_OP = 'UPDATE' AND NEW.status != 'completed' AND OLD.status = 'completed') THEN
        UPDATE summaries SET total_revenue = total_revenue - OLD.amount, last_updated = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger Function for Members
CREATE OR REPLACE FUNCTION update_members_summary()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE summaries SET total_members = total_members + 1, last_updated = CURRENT_TIMESTAMP;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE summaries SET total_members = total_members - 1, last_updated = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger Function for Events
CREATE OR REPLACE FUNCTION update_events_summary()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE summaries SET upcoming_events_count = upcoming_events_count + 1, last_updated = CURRENT_TIMESTAMP;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE summaries SET upcoming_events_count = upcoming_events_count - 1, last_updated = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger Function for Announcements
CREATE OR REPLACE FUNCTION update_announcements_summary()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE summaries SET recent_announcements_count = recent_announcements_count + 1, last_updated = CURRENT_TIMESTAMP;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE summaries SET recent_announcements_count = recent_announcements_count - 1, last_updated = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Triggers
DROP TRIGGER IF EXISTS trg_update_revenue ON payments;
CREATE TRIGGER trg_update_revenue
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_revenue_summary();

DROP TRIGGER IF EXISTS trg_update_members ON members;
CREATE TRIGGER trg_update_members
AFTER INSERT OR DELETE ON members
FOR EACH ROW EXECUTE FUNCTION update_members_summary();

DROP TRIGGER IF EXISTS trg_update_events ON events;
CREATE TRIGGER trg_update_events
AFTER INSERT OR DELETE ON events
FOR EACH ROW EXECUTE FUNCTION update_events_summary();

DROP TRIGGER IF EXISTS trg_update_announcements ON announcements;
CREATE TRIGGER trg_update_announcements
AFTER INSERT OR DELETE ON announcements
FOR EACH ROW EXECUTE FUNCTION update_announcements_summary();
