const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const dbHost = process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.TEST_DB_PORT || process.env.DB_PORT || '5432', 10);
const dbUser = process.env.TEST_DB_USER || process.env.DB_USER || 'postgres';
const dbPassword = process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres';
const targetDatabase = process.env.TEST_DB_NAME || 'msabato_test';
const maintenanceDatabase = process.env.TEST_DB_MAINTENANCE_DATABASE || 'postgres';

const connection = {
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
};

async function ensureDatabase() {
  const adminPool = new Pool({ ...connection, database: maintenanceDatabase });
  try {
    const existing = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDatabase]);
    if (existing.rowCount === 0) {
      const quotedName = `"${targetDatabase.replace(/"/g, '""')}"`;
      await adminPool.query(`CREATE DATABASE ${quotedName}`);
      console.log(`Created test database: ${targetDatabase}`);
    }
  } finally {
    await adminPool.end();
  }
}

// L726: failures must be loud. We track applied files in schema_migrations so
// re-runs skip cleanly; any error applying a *new* migration aborts setup —
// a test DB that silently diverges from prod schema masks schema bugs.
const BENIGN_CODES = new Set(['42P07', '42701', '42710', '42P04']); // already-exists class

async function runMigration(pool, filePath) {
  const filename = path.basename(filePath);
  const sql = fs.readFileSync(filePath, 'utf8');
  try {
    await pool.query(sql);
  } catch (error) {
    if (!BENIGN_CODES.has(error.code)) throw error; // real failures abort setup
    console.warn(`Migration ${filename} reported existing objects (${error.code}) — marking applied`);
  }
  await pool.query(
    'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
    [filename]
  );
  console.log(`Ran migration: ${filename}`);
}

async function setupTestDatabase() {
  console.log(`Setting up test database ${targetDatabase}...`);
  await ensureDatabase();

  const migrationsDir = path.join(__dirname, '../migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.warn(`Migrations directory not found: ${migrationsDir}`);
    return;
  }

  const pool = new Pool({ ...connection, database: targetDatabase });
  try {
    await pool.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())'
    );
    const applied = new Set(
      (await pool.query('SELECT filename FROM schema_migrations')).rows.map(r => r.filename)
    );

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      if (applied.has(file)) continue;
      await runMigration(pool, path.join(migrationsDir, file));
    }

    console.log('Test database setup complete');
  } finally {
    await pool.end();
  }
}

setupTestDatabase().catch(error => {
  console.error('Setup failed:', error.message);
  process.exit(1);
});
