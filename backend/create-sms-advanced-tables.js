require('dotenv').config();
const { pool } = require('./config/database');

async function run() {
  try {
    console.log('Creating SMS advanced features tables...');

    // SMS template versions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sms_template_versions (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES sms_templates(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        version INTEGER NOT NULL,
        changed_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('sms_template_versions table ready');

    // SMS A/B tests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sms_ab_tests (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES sms_templates(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        variant_a_content TEXT NOT NULL,
        variant_b_content TEXT NOT NULL,
        variant_a_rate DECIMAL(5,2),
        variant_b_rate DECIMAL(5,2),
        winner BOOLEAN,
        status VARCHAR(20) DEFAULT 'running',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
    console.log('sms_ab_tests table ready');

    // Add new columns to sms_templates if they don't exist
    try {
      await pool.query(`ALTER TABLE sms_templates ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending'`);
      await pool.query(`ALTER TABLE sms_templates ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id)`);
      await pool.query(`ALTER TABLE sms_templates ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`);
      await pool.query(`ALTER TABLE sms_templates ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES users(id)`);
      await pool.query(`ALTER TABLE sms_templates ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP`);
      await pool.query(`ALTER TABLE sms_templates ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1`);
      await pool.query(`ALTER TABLE sms_templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0`);
      console.log('sms_templates columns added');
    } catch (error) {
      console.log('Columns may already exist:', error.message);
    }

    // Add new columns to sms_campaigns if they don't exist
    try {
      await pool.query(`ALTER TABLE sms_campaigns ADD COLUMN IF NOT EXISTS target_segments JSONB`);
      await pool.query(`ALTER TABLE sms_campaigns ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2)`);
      await pool.query(`ALTER TABLE sms_campaigns ADD COLUMN IF NOT EXISTS budget_spent DECIMAL(10,2) DEFAULT 0`);
      await pool.query(`ALTER TABLE sms_campaigns ADD COLUMN IF NOT EXISTS ab_test_active BOOLEAN DEFAULT false`);
      await pool.query(`ALTER TABLE sms_campaigns ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(20) DEFAULT 'compliant'`);
      console.log('sms_campaigns columns added');
    } catch (error) {
      console.log('Columns may already exist:', error.message);
    }

    console.log('All SMS advanced features tables created successfully');
  } catch (error) {
    console.error('Failed to create tables:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
