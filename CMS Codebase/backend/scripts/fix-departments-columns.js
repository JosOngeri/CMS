const { pool } = require('../config/database');

async function fix() {
  try {
    await pool.query(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS leader_name VARCHAR(255)`);
    await pool.query(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS leader_contact VARCHAR(255)`);
    console.log('Added leader_name and leader_contact to departments');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fix();
