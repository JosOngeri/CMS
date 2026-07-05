const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting fix missing columns migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/005_fix_missing_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration...');

    await client.query(migrationSQL);

    console.log('✓ Migration completed successfully!');
    console.log('Added missing columns: refresh_tokens.used, documents.is_active');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
