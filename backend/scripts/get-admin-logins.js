require('dotenv').config();
const { pool } = require('../config/database');

async function getAdminLogins() {
  const client = await pool.connect();
  try {
    const admins = await client.query(
      `SELECT u.email, u.username, u.first_name, u.last_name, r.name as role 
       FROM users u 
       JOIN user_roles ur ON u.id = ur.user_id 
       JOIN roles r ON ur.role_id = r.id 
       WHERE r.name ILIKE '%admin%' OR r.name ILIKE '%super%' 
       ORDER BY r.name`
    );
    
    console.log('Admin Users:');
    admins.rows.forEach(a => {
      console.log(`- ${a.role}: ${a.email} (Username: ${a.username})`);
    });
  } finally {
    client.release();
    await pool.end();
  }
}

getAdminLogins();
