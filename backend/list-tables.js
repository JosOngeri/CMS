const { pool } = require('./config/database');
async function listTables() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables in database:');
    res.rows.forEach(r => console.log(` - ${r.table_name}`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
listTables();
