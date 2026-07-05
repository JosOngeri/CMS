const { pool } = require('../config/database');

async function remove() {
  try {
    const result = await pool.query("DELETE FROM events WHERE title = 'Test Event'");
    console.log('deleted', result.rowCount);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

remove();
