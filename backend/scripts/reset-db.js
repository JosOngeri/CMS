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
