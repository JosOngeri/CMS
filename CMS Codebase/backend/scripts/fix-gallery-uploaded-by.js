const { pool } = require('../config/database');

async function fix() {
  try {
    await pool.query(`ALTER TABLE gallery_photos ALTER COLUMN uploaded_by TYPE UUID USING NULL`);
    console.log('uploaded_by column changed to UUID');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fix();
