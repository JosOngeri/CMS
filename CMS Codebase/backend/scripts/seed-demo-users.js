const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 8;

const demoUsers = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@sda.org',
    password: 'admin123',
    role: 'Super Admin',
  },
  {
    firstName: 'Pastor',
    lastName: 'John',
    email: 'pastor@sda.org',
    password: 'pastor123',
    role: 'Pastor',
  },
  {
    firstName: 'Church',
    lastName: 'Member',
    email: 'member@sda.org',
    password: 'member123',
    role: 'Member',
  },
];

async function seedDemoUsers() {
  try {
    for (const demo of demoUsers) {
      const passwordHash = await bcrypt.hash(demo.password, SALT_ROUNDS);

      // Insert or update the user
      const userResult = await pool.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, is_active, email_verified, created_at)
         VALUES ($1, $2, $3, $4, true, true, NOW())
         ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             is_active = EXCLUDED.is_active
         RETURNING id`,
        [demo.firstName, demo.lastName, demo.email, passwordHash]
      );

      const userId = userResult.rows[0].id;

      // Get the role id
      const roleResult = await pool.query(
        `SELECT id FROM roles WHERE name = $1`,
        [demo.role]
      );

      if (roleResult.rows.length === 0) {
        console.warn(`Role "${demo.role}" not found; skipping role assignment for ${demo.email}`);
        continue;
      }

      const roleId = roleResult.rows[0].id;

      // Assign role
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [userId, roleId]
      );

      console.log(`Demo user ready: ${demo.email} / ${demo.password} (${demo.role})`);
    }

    console.log('Demo users seeded successfully.');
  } catch (error) {
    console.error('Error seeding demo users:', error.message);
  } finally {
    await pool.end();
  }
}

seedDemoUsers();
