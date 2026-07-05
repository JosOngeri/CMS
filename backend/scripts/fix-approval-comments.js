const { pool } = require('../config/database');

async function fix() {
  try {
    await pool.query(`ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS comments TEXT`);
    console.log('Added comments to approval_requests');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fix();
