/**
 * Setup Test Database
 * Runs migrations to create test database tables
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kmaincms',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigration(filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log(`✅ Ran migration: ${path.basename(filePath)}`);
  } catch (error) {
    console.warn(`⚠️  Skipped migration: ${path.basename(filePath)} - ${error.message}`);
    // Don't throw error, continue with next migration
  }
}

async function setupTestDatabase() {
  console.log('🔧 Setting up test database...');

  const migrationsDir = path.join(__dirname, '../migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    await runMigration(filePath);
  }

  console.log('✅ Test database setup complete');
  await pool.end();
}

setupTestDatabase().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
