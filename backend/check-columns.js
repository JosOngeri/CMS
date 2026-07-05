const { pool } = require('./config/database');
async function check() {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
  console.log('Columns in users table:');
  res.rows.forEach(r => console.log(` - ${r.column_name}`));
  process.exit(0);
}
check();
