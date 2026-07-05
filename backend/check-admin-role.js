const { pool } = require('./config/database');
async function check() {
  const query = `
    SELECT u.email, r.name as role
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE u.email = 'admin@sda.org'
  `;
  const res = await pool.query(query);
  console.log('Admin roles:', res.rows);
  process.exit(0);
}
check();
