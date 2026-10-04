-- 082: platform message templates (11.4). ASCII only.
-- Reusable email/SMS bodies for welcome, dunning, and security notices.
-- Variables use {{name}} placeholders rendered at send time.

CREATE TABLE IF NOT EXISTS platform_message_templates (
  id SERIAL PRIMARY KEY,
  key VARCHAR(60) NOT NULL UNIQUE,
  channel VARCHAR(10) NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  updated_by INTEGER REFERENCES platform_users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO platform_message_templates (key, channel, subject, body) VALUES
  ('tenant_welcome', 'email', 'Welcome to Msabato, {{church_name}}',
   'Hi {{contact_name}}, your church workspace is ready. Sign in at {{login_url}} with the admin account we created. Your trial ends on {{trial_end}}.'),
  ('dunning_reminder', 'email', 'Payment reminder - invoice {{invoice_number}}',
   'Hi {{church_name}}, invoice {{invoice_number}} for {{amount}} {{currency}} is now overdue. Please settle it within {{grace_days}} days to keep your workspace active.'),
  ('security_new_session', 'email', 'New sign-in to your platform account',
   'A new session was opened for {{email}} at {{time}} from IP {{ip}}. If this was not you, revoke it from the Security page immediately.'),
  ('tenant_suspension', 'sms', NULL,
   'Msabato: {{church_name}} workspace suspended - invoice {{invoice_number}} is past the grace period. Pay to restore access.'),
  ('tenant_restored', 'sms', NULL,
   'Msabato: payment received - {{church_name}} workspace is active again. Thank you.')
ON CONFLICT (key) DO NOTHING;
