const { pool } = require('../config/database');

async function createSecurityTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(100),
        description TEXT,
        severity VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        blocked BOOLEAN DEFAULT false,
        suspicious BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS failed_login_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255),
        ip_address INET,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS blocked_ips (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_address INET NOT NULL,
        reason TEXT,
        blocked_by UUID REFERENCES users(id) ON DELETE SET NULL,
        blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_token TEXT,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS security_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        password_policy JSONB,
        session_timeout INTEGER DEFAULT 60,
        mfa_enabled BOOLEAN DEFAULT false,
        ip_whitelist JSONB,
        ip_blacklist JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const settingsResult = await client.query('SELECT COUNT(*) FROM security_settings');
    if (parseInt(settingsResult.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO security_settings (id, password_policy, session_timeout, mfa_enabled, ip_whitelist, ip_blacklist)
        VALUES (1, '{}', 60, false, '[]', '[]')
      `);
    }

    await client.query('COMMIT');
    console.log('Security tables created successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating security tables:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createSecurityTables();
