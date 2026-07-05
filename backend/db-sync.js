const { pool } = require('./config/database');

async function sync() {
  const client = await pool.connect();
  try {
    console.log('🔄 Syncing Database Schema...');

    // 1. Core tables if missing
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS churches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(50) UNIQUE NOT NULL,
        settings JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        module VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );

      CREATE TABLE IF NOT EXISTS members (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        membership_status VARCHAR(30) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Add church_id to users and roles if missing
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='church_id') THEN
          ALTER TABLE users ADD COLUMN church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mfa_enabled') THEN
          ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT false;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mfa_secret') THEN
          ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(255);
        END IF;
      END $$;
    `);

    console.log('✅ Base infrastructure ready');

    // 3. Insert Default Church
    const churchRes = await client.query(`
      INSERT INTO churches (name, slug)
      VALUES ('Kiserian Main SDA', 'kiserian-main-sda')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    const churchId = churchRes.rows[0].id;

    // 4. Link existing users to church
    await client.query('UPDATE users SET church_id = $1 WHERE church_id IS NULL', [churchId]);

    console.log('✅ Database synced successfully');

  } catch (err) {
    console.error('❌ Sync failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

sync();
