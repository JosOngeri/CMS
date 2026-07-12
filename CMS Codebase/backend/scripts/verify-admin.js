require('dotenv').config();
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function verifyAdmin() {
  const client = await pool.connect();
  try {
    const admin = await client.query(
      `SELECT u.id, u.email, u.username, u.password_hash, u.is_active, u.email_verified, r.name as role 
       FROM users u 
       JOIN user_roles ur ON u.id = ur.user_id 
       JOIN roles r ON ur.role_id = r.id 
       WHERE u.email = $1`,
      ['admin@kmaincms.org']
    );
    
    if (admin.rows.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }
    
    const user = admin.rows[0];
    console.log('✅ Admin user found:');
    console.log('  Email:', user.email);
    console.log('  Username:', user.username);
    console.log('  Role:', user.role);
    console.log('  Active:', user.is_active);
    console.log('  Email Verified:', user.email_verified);
    
    const passwordMatch = await bcrypt.compare('password123', user.password_hash);
    console.log('  Password Match:', passwordMatch ? '✅' : '❌');
    
  } finally {
    client.release();
    await pool.end();
  }
}

verifyAdmin();
