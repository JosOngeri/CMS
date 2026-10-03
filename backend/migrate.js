// Safe migrator — replaces the old landmine version (L725):
//   * creates the DB only if missing (DROP requires explicit --fresh flag)
//   * applies ALL backend/migrations/*.sql in numeric order
//   * refuses --fresh when NODE_ENV=production
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const FRESH = process.argv.includes('--fresh');

async function migrate() {
  const dbName = process.env.DB_NAME || 'msabato';
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Connect to default database first
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('Connecting to PostgreSQL...');

    if (FRESH) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Refusing --fresh (drops the database) with NODE_ENV=production');
      }
      console.warn(`--fresh: dropping database ${dbName}`);
      await pool.query(`DROP DATABASE IF EXISTS ${dbName}`);
    }

    const exists = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rowCount === 0) {
      await pool.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database ${dbName} created`);
    } else {
      console.log(`Database ${dbName} already exists — applying pending migrations`);
    }

    await pool.end();

    const dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: dbName,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    });

    // Track applied migrations so re-runs are safe.
    await dbPool.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())'
    );
    const applied = new Set(
      (await dbPool.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename)
    );

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10)); // numeric prefix order

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      console.log(`Applying ${file}...`);
      await dbPool.query(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
      await dbPool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      ran++;
    }

    await dbPool.end();
    console.log(`Database setup complete — ${ran} new migrations applied (${files.length} total).`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
