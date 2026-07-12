const { pool } = require('../config/database');

async function check() {
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name='website_settings'"
    );
    console.log(result.rows.length ? 'exists' : 'missing');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
