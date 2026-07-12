const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../config/database');

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

    console.log('Running migration files 004-010...');
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = [
      '004_gallery_schema.sql',
      '005_fix_missing_columns.sql',
      '006_settings_schema.sql',
      '007_auth_tables.sql',
      '008_permissions_schema.sql',
      '009_add_church_id_to_main_schema.sql',
      '010_documents_schema.sql'
    ];

    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      try {
        console.log(`  Executing ${migrationFile}...`);
        const migrationSQL = await fs.readFile(migrationPath, 'utf8');
        await client.query(migrationSQL);
        console.log(`  ✅ ${migrationFile} completed`);
      } catch (error) {
        console.error(`  ❌ Error executing ${migrationFile}:`, error.message);
        // Continue with other migrations even if one fails
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
