const { pool } = require('./config/database');
const { hashPassword } = require('./helpers/security');

async function createAdmin() {
  try {
    const email = 'admin@kmaincms.org';
    const password = 'Admin123';
    const firstName = 'Admin';
    const lastName = 'User';

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified)
       VALUES ($1, $2, $3, $4, true, true)
       RETURNING id, email, first_name, last_name`,
      [email, passwordHash, firstName, lastName]
    );

    const user = result.rows[0];

    // Assign Super Admin role
    const roleResult = await pool.query(
      'SELECT id FROM roles WHERE name = $1',
      ['Super Admin']
    );

    if (roleResult.rows.length > 0) {
      await pool.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [user.id, roleResult.rows[0].id]
      );
    }

    console.log('Admin user created successfully:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`User ID: ${user.id}`);

    await pool.end();
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
