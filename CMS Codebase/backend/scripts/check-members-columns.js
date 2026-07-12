const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

(async () => {
  const client = await pool.connect();
  try {
    const columns = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'members' AND table_schema = 'public' ORDER BY ordinal_position");
    console.log('Members table columns:');
    columns.rows.forEach(col => console.log(col.column_name, ':', col.data_type));
  } finally {
    client.release();
    pool.end();
  }
})();