const { pool } = require('../config/database');

async function check() {
  try {
    const result = await pool.query(
      "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('photo_tag_assignments','photo_tags') ORDER BY table_name, ordinal_position"
    );
    console.log(result.rows.map(r => `${r.table_name}.${r.column_name}=${r.data_type}`).join(', '));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
