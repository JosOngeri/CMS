const { pool } = require('../config/database');

async function fix() {
  try {
    await pool.query(`ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`);
    await pool.query(`ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP`);
    console.log('Added approved_at and rejected_at to approval_requests');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fix();
