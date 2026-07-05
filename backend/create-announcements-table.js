require('dotenv').config();
const { pool } = require('./config/database');

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        announcement_type VARCHAR(50) DEFAULT 'general',
        department_id INTEGER REFERENCES departments(id),
        author_id INTEGER REFERENCES users(id),
        is_public BOOLEAN DEFAULT true,
        priority VARCHAR(20) DEFAULT 'normal',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('announcements table ready');
  } catch (error) {
    console.error('Failed to create announcements table:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
