const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { requireDevDatabase } = require('./scripts/_scriptSafety');

// LEGACY PATH — applies database/003_members_schema.sql directly, bypassing
// the canonical runner (node migrate.js → backend/migrations/*). Members
// schema is already covered by the numbered migrations.
requireDevDatabase('migrate-members.js');
console.warn('WARNING: migrate-members.js is a legacy one-off — ' +
  'the members schema lives in backend/migrations/* via `node migrate.js`.');

async function migrate() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'msabato',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('Running members migration...');

    const migrationPath = path.join(__dirname, '../database/003_members_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(migrationSQL);
    console.log('Members migration completed successfully');

    await pool.end();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
