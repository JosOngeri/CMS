const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    database: process.env.DB_NAME || 'cms_db',
    password: process.env.DB_PASSWORD,
  });
  await client.connect();

  await client.query(`
    INSERT INTO roles (name, description) VALUES
      ('Super Admin', 'Full system access'),
      ('Pastor', 'Church pastor with administrative access'),
      ('First Elder', 'Church elder with administrative access'),
      ('Member', 'Regular church member')
    ON CONFLICT (name) DO NOTHING
  `);

  const passwordHash = bcrypt.hashSync('right123', 10);
  const church = await client.query(
    "SELECT id FROM churches WHERE slug = 'kiserian-main-sda'"
  );
  const churchId = church.rows[0] && church.rows[0].id;
  if (!churchId) {
    throw new Error('Church kiserian-main-sda not found');
  }

  await client.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, username, is_active, church_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       is_active = true,
       church_id = EXCLUDED.church_id`,
    ['admin@kiseriansda.org', passwordHash, 'Admin', 'User', 'admin@kiseriansda.org', true, churchId]
  );

  await client.query(`
    INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, r.id
    FROM users u, roles r
    WHERE u.email = 'admin@kiseriansda.org' AND r.name = 'Super Admin'
    ON CONFLICT (user_id, role_id) DO NOTHING
  `);

  const user = await client.query(
    "SELECT id, email, username, is_active FROM users WHERE email = 'admin@kiseriansda.org'"
  );
  console.log('Seeded user:', user.rows[0]);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
