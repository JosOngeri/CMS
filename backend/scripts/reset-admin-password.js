const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ 
  host: 'localhost', 
  port: 5432, 
  database: 'msabato', 
  user: 'postgres', 
  password: 'postgres' 
});

async function resetAdminPassword() {
  try {
    const { requireDevDatabase, seedPassword } = require('./_scriptSafety');
    requireDevDatabase('reset-admin-password.js');
    const newPassword = seedPassword('admin reset');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('Resetting admin password...');
    // never print the password hash — it's an offline-crack target
    
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email',
      [passwordHash, 'admin@msabato.org']
    );
    
    if (result.rows.length > 0) {
      console.log('Password reset successfully for user:', result.rows[0]);
      console.log('You can now login with:');
      console.log('Email: admin@msabato.org');
      console.log('Password: admin123');
    } else {
      console.log('Admin user not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();
