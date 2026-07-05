const { pool } = require('../config/database');

async function checkUsers() {
  try {
    console.log('Checking users table structure and data...\n');

    // Check if is_active column exists
    const columnCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Users table columns:');
    columnCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Check total users
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`\nTotal users: ${totalUsers.rows[0].count}`);

    // Check active users (if column exists)
    const hasIsActive = columnCheck.rows.some(col => col.column_name === 'is_active');
    
    if (hasIsActive) {
      const activeUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
      console.log(`Active users (is_active = true): ${activeUsers.rows[0].count}`);
      
      const inactiveUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = false OR is_active IS NULL');
      console.log(`Inactive users: ${inactiveUsers.rows[0].count}`);
    } else {
      console.log('\nNo is_active column found - all users would be counted as active');
    }

    // Sample user data
    const sampleUsers = await pool.query('SELECT id, username, first_name, last_name, is_active FROM users LIMIT 5');
    console.log('\nSample users:');
    sampleUsers.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.first_name} ${user.last_name}): is_active = ${user.is_active}`);
    });

  } catch (error) {
    console.error('Error checking users:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
