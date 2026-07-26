const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function createLocalAdmin() {
  try {
    console.log('Creating local admin user...');

    // Hash password
    const passwordHash = await bcrypt.hash('Right123', 12);
    console.log('Password hashed');

    // Add missing columns if they don't exist
    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)");
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE");
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255)");
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0");
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP");
      console.log('Missing columns added');
    } catch (e) {
      console.log('Column check skipped:', e.message);
    }

    // Check if admin exists
    const existing = await pool.query(
      "SELECT id FROM users WHERE username = 'Admin' OR email = 'admin@kiserian-sda.co.ke'"
    );

    if (existing.rows.length > 0) {
      console.log('Admin user already exists, updating password...');
      await pool.query(
        "UPDATE users SET password_hash = $1 WHERE username = 'Admin'",
        [passwordHash]
      );
      await pool.query(
        "UPDATE users SET phone = phone_number WHERE phone IS NULL"
      );
    } else {
      // Get church ID
      const church = await pool.query(
        "SELECT id FROM churches WHERE slug = 'kiserian-main-sda'"
      );

      if (church.rows.length === 0) {
        console.log('Creating default church...');
        await pool.query(
          `INSERT INTO churches (id, name, slug, is_active) 
           VALUES (gen_random_uuid(), 'Kiserian Main SDA', 'kiserian-main-sda', true)`
        );
      }

      const churchResult = await pool.query(
        "SELECT id FROM churches WHERE slug = 'kiserian-main-sda'"
      );
      const churchId = churchResult.rows[0].id;

      // Get Super Admin role
      const roleResult = await pool.query(
        "SELECT id FROM roles WHERE name = 'Super Admin'"
      );

      if (roleResult.rows.length === 0) {
        console.log('Creating Super Admin role...');
        await pool.query(
          `INSERT INTO roles (id, name) 
           VALUES (gen_random_uuid(), 'Super Admin')`
        );
      }

      const roleResult2 = await pool.query(
        "SELECT id FROM roles WHERE name = 'Super Admin'"
      );
      const roleId = roleResult2.rows[0].id;

      // Create user (without church_slug and slug columns if they don't exist)
      const userResult = await pool.query(
        `INSERT INTO users (id, username, email, password_hash, first_name, last_name, phone_number, is_active, church_id)
         VALUES (gen_random_uuid(), 'Admin', 'admin@kiserian-sda.co.ke', $1, 'Admin', 'User', '+254700000000', true, $2)
         RETURNING id`,
        [passwordHash, churchId]
      );

      const userId = userResult.rows[0].id;

      // Update phone column
      await pool.query(
        "UPDATE users SET phone = phone_number WHERE id = $1",
        [userId]
      );

      // Assign role
      await pool.query(
        "INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES ($1, $2, CURRENT_TIMESTAMP)",
        [userId, roleId]
      );

      console.log('Admin user created successfully');
    }

    console.log('Done! You can now login with:');
    console.log('Email: admin@kiserian-sda.co.ke');
    console.log('Password: Right123');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

createLocalAdmin();
