const { pool } = require('../config/database');

async function addColumn() {
  try {
    await pool.query(`ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    console.log('created_at column added to gallery_photos');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addColumn();
