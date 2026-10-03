const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../config/database');
const { requireDevDatabase } = require('./_scriptSafety');

// L753: DROP SCHEMA public CASCADE — full wipe. Refuse on prod/remote DBs.
requireDevDatabase('reset-db.js');

async function resetDatabase() {
  const client = await pool.connect();
  try {
    console.log('Starting full database reset...');

    // Drop existing public schema and recreate it
    console.log('Dropping and recreating public schema...');
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO postgres');
    await client.query('GRANT ALL ON SCHEMA public TO public');

    console.log('Executing complete UUID-based schema...');
    const schemaPath = path.join(__dirname, '../../database/complete_schema.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');

    await client.query(schemaSQL);

    console.log('Running migrations in numeric order...');
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = (await fs.readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    const BENIGN = new Set(['42P07', '42701', '42710']); // already-exists class
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      try {
        console.log(`  Executing ${migrationFile}...`);
        const migrationSQL = await fs.readFile(migrationPath, 'utf8');
        await client.query(migrationSQL);
        console.log(`  ✅ ${migrationFile} completed`);
      } catch (error) {
        if (BENIGN.has(error.code)) {
          console.log(`  ⏭️  ${migrationFile} — objects already present in complete_schema, skipped`);
        } else {
          console.error(`  ❌ Error executing ${migrationFile}:`, error.message);
          throw error; // real failures must abort, not silently diverge schema
        }
      }
    }

    console.log('✅ Database reset and schema initialization completed successfully!');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase();
