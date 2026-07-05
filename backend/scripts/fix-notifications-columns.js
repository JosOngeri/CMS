const { pool } = require('../config/database');

async function fix() {
  try {
    await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS church_id UUID`);
    await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS church_slug VARCHAR(255)`);
    console.log('Added church_id and church_slug to notifications');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fix();
