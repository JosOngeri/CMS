const { pool } = require('../config/database');

async function create() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key_name VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        value_type VARCHAR(50) DEFAULT 'string',
        category VARCHAR(100) DEFAULT 'general',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created website_settings table');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

create();
