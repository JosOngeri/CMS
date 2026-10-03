/**
 * Jest globalSetup — seeds the minimal dataset integration/e2e suites need.
 * Runs ONCE in the main process before any suite (unlike setupFilesAfterEach,
 * which is per-worker). Migrations have already run via setup-test-db.js;
 * this adds the login accounts + role links the suites hardcode.
 *
 * Seeded users (church_id → the migration-seeded kiserian-main-sda church):
 *   admin@sda.org       / admin123          — Super Admin (user-workflows)
 *   admin@msabato.test  / TestPassword123!  — Super Admin (integration suites)
 * Other users in those suites self-register through /api/auth/register.
 * Idempotent: ON CONFLICT refreshes the hash so stale passwords can't drift.
 */
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connection = {
  host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || process.env.DB_PORT || '5432', 10),
  user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
  database: process.env.TEST_DB_NAME || 'msabato_test',
};

const SEED_USERS = [
  {
    email: 'admin@sda.org',
    username: 'admin_sda',
    password: 'admin123',
    first_name: 'Test',
    last_name: 'Admin',
    role: 'Super Admin',
  },
  {
    email: 'admin@msabato.test',
    username: 'admin_msabato',
    password: 'TestPassword123!',
    first_name: 'Test',
    last_name: 'Admin',
    role: 'Super Admin',
  },
];

module.exports = async () => {
  const client = new Client(connection);
  await client.connect();
  try {
    const { rows } = await client.query(
      "SELECT id FROM churches WHERE slug = 'kiserian-main-sda' LIMIT 1"
    );
    if (rows.length === 0) {
      throw new Error('seed-test-db: kiserian-main-sda church missing — run migrations first');
    }
    const churchId = rows[0].id;

    for (const u of SEED_USERS) {
      const hash = await bcrypt.hash(u.password, 4); // low cost — test speed
      const { rows: userRows } = await client.query(
        `INSERT INTO users (email, username, password_hash, first_name, last_name,
                            church_id, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, true, true)
         ON CONFLICT (email) DO UPDATE
           SET password_hash = EXCLUDED.password_hash,
               is_active = true,
               church_id = EXCLUDED.church_id
         RETURNING id`,
        [u.email, u.username, hash, u.first_name, u.last_name, churchId]
      );
      const userId = userRows[0].id;

      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT $1, id FROM roles WHERE name = $2
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [userId, u.role]
      );
    }
    console.log('Test DB seeded: admin login accounts ready');
  } finally {
    await client.end();
  }
};
