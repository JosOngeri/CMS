const { pool } = require('./config/database');
const { comparePassword } = require('./helpers/security');

async function testLogin() {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['admin@kmaincms.org']
    );
    
    if (result.rows.length === 0) {
      console.log('User not found');
      return;
    }
    
    const user = result.rows[0];
    console.log('User found:', user.email);
    console.log('Password hash exists:', !!user.password_hash);
    
    const isValid = await comparePassword('Admin123', user.password_hash);
    console.log('Password valid:', isValid);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();
