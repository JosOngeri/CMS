-- Mobile app parity support:
-- 1. users.avatar_url for profile photo uploads (used by mobile app & social auth)
-- 2. event_attendance.rsvp_status so RSVP responses are persisted
-- 3. Ensure event_attendance exists with the unique constraint the
--    register/rsvp endpoints rely on for ON CONFLICT.

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

CREATE TABLE IF NOT EXISTS event_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  member_id UUID NOT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  attended BOOLEAN DEFAULT false,
  rsvp_status VARCHAR(20),
  church_id UUID
);

ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS rsvp_status VARCHAR(20);
ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS church_id UUID;

-- ON CONFLICT (event_id, member_id) requires a unique constraint/index
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_attendance_event_member
  ON event_attendance (event_id, member_id);
