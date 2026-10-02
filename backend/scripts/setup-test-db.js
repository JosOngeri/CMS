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

async function runMigration(pool, filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log(`Ran migration: ${path.basename(filePath)}`);
  } catch (error) {
    console.warn(`Skipped migration: ${path.basename(filePath)} - ${error.message}`);
  }
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
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
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
