const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function migrate() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Connect to default database first
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('Connecting to PostgreSQL...');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'kmaincms';
    await pool.query(`DROP DATABASE IF EXISTS ${dbName}`);
    await pool.query(`CREATE DATABASE ${dbName}`);
    console.log(`Database ${dbName} created`);

    // Close connection and reconnect to the new database
    await pool.end();

    const dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: dbName,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    });

    // Read and execute migration file
    const migrationPath = path.join(__dirname, '../database/001_auth_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await dbPool.query(migrationSQL);
    console.log('Migration completed successfully');

    await dbPool.end();
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
