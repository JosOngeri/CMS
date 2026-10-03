-- 064_notification_templates.sql
-- Ported from legacy database/migrations/add_notification_templates.sql —
-- NotificationService.getTemplate() queries this table; approval/document
-- flows 500 without it on a fresh DB.

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type_id VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  variables JSONB DEFAULT '{}',
  church_id UUID REFERENCES churches(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, church_id)
);

-- Pre-existing legacy notification_templates tables (subject/body/channel
-- shape, e.g. older prod DBs) skip the CREATE above — ALTER them up to the
-- canonical column set so the indexes and inserts below work everywhere.
-- Columns are added nullable because legacy tables may hold rows.
ALTER TABLE notification_templates
  ADD COLUMN IF NOT EXISTS type_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE SET NULL;

-- Legacy NOT NULL columns the canonical inserts don't populate must not
-- block them. Conditional DO block — ALTER COLUMN IF EXISTS isn't portable
-- across the PG versions in use.
DO $$
DECLARE col TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY['subject','body','channel','created_by'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'notification_templates' AND column_name = col AND is_nullable = 'NO'
    ) THEN
      EXECUTE format('ALTER TABLE notification_templates ALTER COLUMN %I DROP NOT NULL', col);
    END IF;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS notification_delivery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_church ON notification_templates(church_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_notification ON notification_delivery(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_status ON notification_delivery(status);

INSERT INTO notification_templates (name, type_id, title, message, action_url, variables) VALUES
  ('new_member', 'membership', 'New Member Added', 'Welcome {{name}} to the church family!', '/members/{{member_id}}', '["name", "member_id"]'),
  ('payment_received', 'payment', 'Payment Received', 'Thank you for your payment of {{amount}}', '/payments/{{payment_id}}', '["amount", "payment_id"]'),
  ('event_reminder', 'event', 'Event Reminder', 'Reminder: {{event_name}} is on {{event_date}}', '/events/{{event_id}}', '["event_name", "event_date", "event_id"]'),
  ('announcement', 'announcement', 'New Announcement', '{{title}} - {{summary}}', '/announcements/{{announcement_id}}', '["title", "summary", "announcement_id"]'),
  ('meeting_scheduled', 'department', 'Meeting Scheduled', 'Meeting: {{meeting_title}} on {{meeting_date}}', '/departments/{{department_id}}/meetings/{{meeting_id}}', '["meeting_title", "meeting_date", "department_id", "meeting_id"]'),
  ('approval_request', 'approval', 'Approval Requested', '{{requesterName}} requested {{approvalLevel}} approval for {{documentTitle}}', '/approvals/{{documentId}}', '["requesterName", "approvalLevel", "documentTitle", "documentId"]'),
  ('approval_approved', 'approval', 'Approval Granted', 'Your request for {{documentTitle}} has been approved', '/approvals/{{documentId}}', '["documentTitle", "documentId"]'),
  ('approval_progress', 'approval', 'Approval Progress', 'Approval {{votesReceived}}/{{requiredApprovals}} for {{documentTitle}}', '/approvals/{{documentId}}', '["documentTitle", "documentId", "votesReceived", "requiredApprovals"]'),
  ('approval_rejected', 'approval', 'Approval Rejected', 'Your request for {{documentTitle}} was rejected', '/approvals/{{documentId}}', '["documentTitle", "documentId"]')
-- No column list: dedupes against whatever unique constraint the table has
-- (canonical UNIQUE(name, church_id) or legacy UNIQUE(name)).
ON CONFLICT DO NOTHING;
