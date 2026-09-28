/**
 * Seed per-church role accounts so every dashboard view can be tested.
 *
 * Creates (idempotent):
 *   pastor@{slug}.com     -> Pastor
 *   elder@{slug}.com      -> First Elder
 *   treasurer@{slug}.com  -> Treasurer (role created if missing)
 *   depthead@{slug}.com   -> Department Head (assigned to first department)
 *
 * Password: right123 (same as seeded members)
 *
 * Run: node scripts/seed-role-accounts.js
 */
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const CHURCHES = ['newlife', 'mount-horeb', 'kiserian-dam', 'kiserian-main-sda'];

const ROLE_ACCOUNTS = [
  { prefix: 'pastor', role: 'Pastor', first: 'Church', last: 'Pastor' },
  { prefix: 'elder', role: 'First Elder', first: 'Church', last: 'Elder' },
  { prefix: 'treasurer', role: 'Treasurer', first: 'Church', last: 'Treasurer' },
  { prefix: 'depthead', role: 'Department Head', first: 'Department', last: 'Head' },
];

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cms_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });
  await client.connect();

  const passwordHash = bcrypt.hashSync('right123', 10);

  // Ensure Treasurer role exists
  await client.query(
    `INSERT INTO roles (name, description)
     VALUES ('Treasurer', 'Church treasurer — financial oversight')
     ON CONFLICT (name) DO NOTHING`
  );

  const roleIds = {};
  const rolesRes = await client.query(
    `SELECT id, name FROM roles WHERE name IN ('Pastor','First Elder','Treasurer','Department Head')`
  );
  rolesRes.rows.forEach(r => { roleIds[r.name] = r.id; });
  console.log('Roles:', roleIds);

  for (const slug of CHURCHES) {
    const church = await client.query('SELECT id FROM churches WHERE slug = $1', [slug]);
    if (!church.rows[0]) { console.log(`SKIP ${slug} — church not found`); continue; }
    const churchId = church.rows[0].id;
    console.log(`\n=== ${slug} ===`);

    for (const acct of ROLE_ACCOUNTS) {
      const roleId = roleIds[acct.role];
      if (!roleId) { console.log(`  SKIP ${acct.role} — role missing`); continue; }

      const email = `${acct.prefix}@${slug}.com`;
      const username = `${acct.prefix}.${slug}`;

      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, username, phone_number, phone, is_active, church_id, slug, church_slug)
         VALUES ($1, $2, $3, $4, $5, $6, $6, true, $7, $8, $9)
         ON CONFLICT (username) DO UPDATE SET
           email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
           is_active = true, church_id = EXCLUDED.church_id
         RETURNING id`,
        [email, passwordHash, acct.first, acct.last, username,
         `+25470000${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
         churchId, username, slug]
      );
      const userId = userRes.rows[0].id;

      await client.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [userId, roleId]
      );

      // Member record so dashboards with member joins don't skip them
      await client.query(
        `INSERT INTO members (user_id, first_name, last_name, email, phone, membership_status, joined_date, church_id, membership_number)
         VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_DATE - INTERVAL '3 years', $6, $7)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, acct.first, acct.last, email, null, churchId,
         `${slug.slice(0, 2).toUpperCase()}-R${acct.prefix.slice(0, 4).toUpperCase()}`]
      );

      console.log(`  ${acct.role.padEnd(16)} -> ${email}`);
    }

    // Attach the department head to the church's first department
    const dept = await client.query(
      'SELECT id FROM departments WHERE church_id = $1 ORDER BY name LIMIT 1', [churchId]
    );
    if (dept.rows[0]) {
      const head = await client.query(
        'SELECT id FROM users WHERE username = $1', [`depthead.${slug}`]
      );
      if (head.rows[0]) {
        const mem = await client.query(
          'SELECT id FROM members WHERE user_id = $1', [head.rows[0].id]
        );
        await client.query(
          `INSERT INTO department_members (user_id, member_id, department_id, role, role_in_department, status, is_active, joined_at, church_id)
           VALUES ($1, $2, $3, 'Head', 'Department Head', 'active', true, CURRENT_TIMESTAMP, $4)
           ON CONFLICT (user_id, department_id) DO UPDATE SET role_in_department = 'Department Head', is_active = true`,
          [head.rows[0].id, mem.rows[0] ? mem.rows[0].id : null, dept.rows[0].id, churchId]
        );
        console.log(`  depthead assigned to department ${dept.rows[0].id}`);
      }
    }
  }

  await client.end();
  console.log('\nDone.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
