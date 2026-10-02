-- Chat tables for controllers/chat.controller.js.
-- chat_rooms / chat_messages were never created — every /api/chat call 500'd.
-- users.id is UUID, so sender_id is UUID; room ids are UUID too.

CREATE TABLE IF NOT EXISTS chat_rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   UUID NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  room_type   VARCHAR(30) NOT NULL DEFAULT 'group',
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  content      TEXT NOT NULL,
  message_type VARCHAR(30) NOT NULL DEFAULT 'text',
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_church     ON chat_rooms(church_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room    ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender  ON chat_messages(sender_id);
