const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting Comprehensive Seeding...');

    await client.query('BEGIN');

    // 1. Ensure Churches table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS churches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(50) UNIQUE NOT NULL,
        settings JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Insert Default Church
    const churchResult = await client.query(`
      INSERT INTO churches (name, slug, settings)
      VALUES ('Kiserian Main SDA', 'kiserian-main-sda', '{"timezone": "Africa/Nairobi"}')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    const churchId = churchResult.rows[0].id;
    console.log(`✅ Church initialized: ${churchId}`);

    // 3. Ensure Permissions table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        module VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Ensure Role Permissions table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      )
    `);

    // 5. Seed Permissions
    const permissions = [
      ['manage_users', 'Can create and edit users', 'auth'],
      ['view_dashboard', 'Can view admin dashboard', 'core'],
      ['manage_departments', 'Can manage all departments', 'departments'],
      ['manage_announcements', 'Can manage all announcements', 'content']
    ];

    for (const [name, desc, mod] of permissions) {
      await client.query(
        'INSERT INTO permissions (name, description, module) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
        [name, desc, mod]
      );
    }

    // 6. Get Roles and map them
    const rolesRes = await client.query('SELECT id, name FROM roles');
    const roleMap = {};
    rolesRes.rows.forEach(r => roleMap[r.name] = r.id);

    // 7. Assign permissions to Super Admin
    if (roleMap['Super Admin']) {
      await client.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT $1, id FROM permissions
        ON CONFLICT DO NOTHING
      `, [roleMap['Super Admin']]);
    }

    // 8. Create Admin User
    const passwordHash = await bcrypt.hash('admin123', 10);
    const userResult = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, username, is_active, church_id)
      VALUES ('admin@sda.org', $1, 'Admin', 'User', 'admin', true, $2)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        church_id = EXCLUDED.church_id
      RETURNING id
    `, [passwordHash, churchId]);

    const adminId = userResult.rows[0].id;

    // 9. Assign Role
    if (roleMap['Super Admin']) {
      await client.query(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [adminId, roleMap['Super Admin']]);
    }

    await client.query('COMMIT');
    console.log('🎉 Seeding complete! Login with: admin@sda.org / admin123');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
