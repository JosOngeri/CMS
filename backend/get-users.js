const { pool } = require('./config/database');

async function getUsers() {
  const client = await pool.connect();
  try {
    const users = await client.query(`
      SELECT u.id, u.first_name, u.last_name, u.email,
             array_agg(r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY u.id, u.first_name, u.last_name, u.email
      ORDER BY u.first_name, u.last_name
    `);
    
    console.log('Current users:');
    users.rows.forEach(user => {
      console.log(`  ${user.first_name} ${user.last_name} (${user.email}) - Roles: ${user.roles?.join(', ') || 'None'}`);
    });
    
    console.log(`\nTotal users: ${users.rows.length}`);
    
    return users.rows;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

getUsers().catch(console.error);
