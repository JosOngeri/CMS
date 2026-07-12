-- Add M-Pesa STK Push Settings to the settings table
-- This allows easy switching between sandbox and production credentials

-- M-Pesa Environment Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_environment', 'sandbox', 'select', 'payment', 'M-Pesa Environment', 'Select sandbox for testing or production for live transactions', false, true, '{"enum": ["sandbox", "production"]}')
ON CONFLICT (key) DO NOTHING;

-- M-Pesa STK Push Credentials (Sandbox)
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_sandbox_consumer_key', 'zRIIzmbsF9eSivvxpnMjUIl3goKx9V0CxAG0m53KQai4lYkf', 'text', 'payment', 'Sandbox Consumer Key', 'Consumer Key from Daraja sandbox app', false, true, '{"minLength": 10}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_sandbox_consumer_secret', 'WVhz6kHVABQGHK23DWHV1r4pOSxgqIfEwQdvMUxkbuHFR0AAMedUXLxYmlr4FhCQ', 'text', 'payment', 'Sandbox Consumer Secret', 'Consumer Secret from Daraja sandbox app', false, true, '{"minLength": 10}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_sandbox_passkey', 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919', 'text', 'payment', 'Sandbox Passkey', 'Passkey from Daraja sandbox test data', false, true, '{"minLength": 10}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_sandbox_shortcode', '174379', 'text', 'payment', 'Sandbox Shortcode', 'Test shortcode for sandbox (default: 174379)', false, true, '{"minLength": 5, "maxLength": 6}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_sandbox_callback_url', 'https://webhook.site/fe92fd8e-1324-46b7-b730-fb89bc424a46', 'text', 'payment', 'Sandbox Callback URL', 'Callback URL for sandbox testing (use webhook.site for local testing)', false, true, '{"minLength": 10}')
ON CONFLICT (key) DO NOTHING;

-- M-Pesa STK Push Credentials (Production)
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_production_consumer_key', '', 'text', 'payment', 'Production Consumer Key', 'Consumer Key from Daraja production app (after go-live)', false, true, '{"minLength": 10}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_production_consumer_secret', '', 'text', 'payment', 'Production Consumer Secret', 'Consumer Secret from Daraja production app (after go-live)', false, true, '{"minLength": 10}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_production_passkey', '', 'text', 'payment', 'Production Passkey', 'Passkey sent via email after go-live', false, true, '{"minLength": 10}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_production_shortcode', '', 'text', 'payment', 'Production Shortcode', 'Your actual Paybill/Till number for production', false, true, '{"minLength": 5, "maxLength": 6}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_production_callback_url', '', 'text', 'payment', 'Production Callback URL', 'Your production callback URL (must be HTTPS)', false, true, '{"minLength": 10}')
ON CONFLICT (key) DO NOTHING;

-- M-Pesa B2C Credentials (for payouts)
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_b2c_consumer_key', '4R9DRy6md4HMDC4G044HCYA4Rhleh4zdGDjOFnSOyjPGnngc', 'text', 'payment', 'B2C Consumer Key', 'Consumer Key for B2C payouts', false, true, '{"minLength": 10}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_b2c_consumer_secret', 'S2b6efnuf6ATMpKVyEHze8zC7QCcEzrPwTngGPs9Et9G3Pr4KWXJHcABWfnimDuE', 'text', 'payment', 'B2C Consumer Secret', 'Consumer Secret for B2C payouts', false, true, '{"minLength": 10}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_b2c_initiator_name', 'Linet Gitonga', 'text', 'payment', 'B2C Initiator Name', 'Initiator name from M-Pesa Org portal', false, true, '{"minLength": 2}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_b2c_initiator_password', 'Sleepylynn@1', 'text', 'payment', 'B2C Initiator Password', 'Initiator password from M-Pesa Org portal', false, true, '{"minLength": 5}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_b2c_shortcode', '5229801', 'text', 'payment', 'B2C Shortcode', 'Shortcode for B2C payouts', false, true, '{"minLength": 5, "maxLength": 6}')
ON CONFLICT (key) DO NOTHING;

-- Payment Settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_minimum_amount', '1', 'number', 'payment', 'Minimum Payment Amount', 'Minimum amount for M-Pesa payments', false, true, '{"min": 1, "max": 100000}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_maximum_amount', '250000', 'number', 'payment', 'Maximum Payment Amount', 'Maximum amount per transaction (Safaricom limit: 250,000)', false, true, '{"min": 1, "max": 250000}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_transaction_timeout', '300', 'number', 'payment', 'Transaction Timeout (seconds)', 'Time to wait for payment confirmation', false, true, '{"min": 60, "max": 600}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules)
VALUES ('mpesa_auto_retry', 'true', 'boolean', 'payment', 'Auto Retry Failed Payments', 'Automatically retry failed STK push requests', false, true, '{}')
ON CONFLICT (key) DO NOTHING;

-- Add helpful comments
COMMENT ON COLUMN settings.category IS 'Payment settings include M-Pesa STK Push and B2C configuration';
