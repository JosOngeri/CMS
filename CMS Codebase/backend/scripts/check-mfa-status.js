require('dotenv').config();
const { pool } = require('../config/database');

async function checkMFAStatus() {
  const client = await pool.connect();
  try {
    const admin = await client.query(
      `SELECT u.id, u.email, u.mfa_enabled, u.mfa_secret 
       FROM users u 
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
    console.log('  MFA Enabled:', user.mfa_enabled);
    console.log('  MFA Secret:', user.mfa_secret ? 'Set' : 'Not set');
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkMFAStatus();
