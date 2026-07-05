const { pool } = require('../config/database');

async function remove() {
  try {
    const result = await pool.query("DELETE FROM payments WHERE notes = 'Test' AND phone_number = '254712345678'");
    console.log('deleted', result.rowCount);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

remove();
