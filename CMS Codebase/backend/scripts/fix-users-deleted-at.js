const { pool } = require('../config/database');

async function fix() {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
    console.log('Added deleted_at to users');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fix();
