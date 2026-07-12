const { pool } = require('../config/database');

async function fix() {
  try {
    await pool.query(`ALTER TABLE gallery_albums ADD COLUMN IF NOT EXISTS church_slug VARCHAR(255)`);
    console.log('Added church_slug to gallery_albums');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fix();
