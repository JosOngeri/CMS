const { pool } = require('../config/database');

async function checkColumns() {
  const tables = ['users', 'roles', 'churches'];
  for (const table of tables) {
    try {
      const result = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [table]
      );
      console.log(`\n${table} columns:`, result.rows.map(r => r.column_name).join(', '));
    } catch (error) {
      console.error(`Error checking ${table}:`, error.message);
    }
  }
  await pool.end();
}

checkColumns();
