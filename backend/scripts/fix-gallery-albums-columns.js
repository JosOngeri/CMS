const { pool } = require('../config/database');

async function fix() {
  try {
    await pool.query(`ALTER TABLE gallery_albums ALTER COLUMN created_by TYPE UUID USING created_by::text::UUID`);
    await pool.query(`ALTER TABLE gallery_albums ALTER COLUMN cover_photo_id TYPE UUID USING cover_photo_id::text::UUID`);
    console.log('Updated gallery_albums created_by and cover_photo_id to UUID');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fix();
