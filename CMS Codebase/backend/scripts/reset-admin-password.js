const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ 
  host: 'localhost', 
  port: 5432, 
  database: 'kmaincms', 
  user: 'postgres', 
  password: 'postgres' 
});

async function resetAdminPassword() {
  try {
    const newPassword = 'admin123';
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('Resetting admin password...');
    console.log('New password:', newPassword);
    console.log('Password hash:', passwordHash);
    
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email',
      [passwordHash, 'admin@kmaincms.org']
    );
    
    if (result.rows.length > 0) {
      console.log('Password reset successfully for user:', result.rows[0]);
      console.log('You can now login with:');
      console.log('Email: admin@kmaincms.org');
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
