const { pool } = require('../config/database');

async function check() {
  try {
    const result = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='gallery_albums' ORDER BY ordinal_position"
    );
    console.log(result.rows.map(r => `${r.column_name}=${r.data_type}`).join(', '));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
