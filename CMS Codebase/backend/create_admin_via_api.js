const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');

async function createAdminUser() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('Right123', 12);

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@kiseriansda.org']);
    
    let userId;
    if (existingUser.rows.length > 0) {
      // Update existing user
      userId = existingUser.rows[0].id;
      await pool.query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [hashedPassword, userId]
      );
      console.log('Admin user updated successfully:', userId);
    } else {
      // Insert new admin user
      const userResult = await pool.query(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, phone, is_active, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING id`,
        ['kmainadmin', 'admin@kiseriansda.org', hashedPassword, 'Admin', 'User', '+254700000000', true, true]
      );
      userId = userResult.rows[0].id;
      console.log('Admin user created successfully:', userId);
    }

    console.log('Admin user created/updated successfully:', userId);

    // Get or create Super Admin role
    let roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', ['Super Admin']);
    let roleId;

    if (roleResult.rows.length === 0) {
      const newRole = await pool.query(
        `INSERT INTO roles (name, description, permissions, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        ['Super Admin', 'Full system access', JSON.stringify(['all'])]
      );
      roleId = newRole.rows[0].id;
      console.log('Super Admin role created');
    } else {
      roleId = roleResult.rows[0].id;
    }

    // Assign Super Admin role to the user
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, roleId]
    );

    // Also set the role in the users table
    await pool.query(
      `UPDATE users SET role = 'Super Admin' WHERE id = $1`,
      [userId]
    );

    console.log('Super Admin role assigned successfully');
    console.log('Admin login credentials:');
    console.log('Email: admin@kiseriansda.org');
    console.log('Password: Right123');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdminUser();
