const { pool } = require('../config/database');

async function remove() {
  try {
    const result = await pool.query("DELETE FROM departments WHERE name LIKE 'Test Department%'");
    console.log('deleted', result.rowCount);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

remove();
