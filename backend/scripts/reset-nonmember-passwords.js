/**
 * One-off: reset passwords for non-seeded (non "member*" username) accounts
 * to the shared dev password so they can be documented.
 * Usage: node scripts/reset-nonmember-passwords.js [password]
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const password = process.argv[2] || 'right123';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cms_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

(async () => {
  const hash = bcrypt.hashSync(password, 10);
  const res = await pool.query(
    "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE username NOT LIKE 'member%' RETURNING username",
    [hash]
  );
  res.rows.forEach(r => console.log('reset:', r.username));
  console.log(`total reset: ${res.rows.length}`);
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
