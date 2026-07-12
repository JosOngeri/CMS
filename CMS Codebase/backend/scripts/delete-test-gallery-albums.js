const { pool } = require('../config/database');

async function remove() {
  try {
    const result = await pool.query("DELETE FROM gallery_albums WHERE title = 'Test Album'");
    console.log('deleted', result.rowCount);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

remove();
