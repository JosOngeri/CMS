const { pool } = require('../config/database');

async function fixTableColumns() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Audit log: add missing columns
    await client.query(`
      ALTER TABLE audit_log
      ADD COLUMN IF NOT EXISTS table_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS record_id UUID,
      ADD COLUMN IF NOT EXISTS old_values JSONB,
      ADD COLUMN IF NOT EXISTS new_values JSONB
    `);

    // Notifications: add missing columns
    await client.query(`
      ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS type_id UUID,
      ADD COLUMN IF NOT EXISTS action_url TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB,
      ADD COLUMN IF NOT EXISTS read_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS is_push BOOLEAN DEFAULT false
    `);

    // Notification types
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(100),
        color VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        church_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert a default notification type if none exists
    const typesResult = await client.query('SELECT COUNT(*) FROM notification_types');
    if (parseInt(typesResult.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO notification_types (name, icon, color)
        VALUES ('General', 'Bell', 'blue')
      `);
    }

    // Notification preferences
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        church_id UUID,
        email_enabled BOOLEAN DEFAULT true,
        sms_enabled BOOLEAN DEFAULT false,
        push_enabled BOOLEAN DEFAULT false,
        in_app_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notification templates
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        body TEXT,
        channel VARCHAR(100),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notification logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type_id UUID,
        title VARCHAR(255),
        message TEXT,
        status VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('Table columns and related tables fixed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing table columns:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixTableColumns();
