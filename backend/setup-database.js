const fs = require('fs').promises;
const { pool } = require('./config/database');
const { requireDevDatabase } = require('./scripts/_scriptSafety');

// LEGACY PATH — applies database/schema.sql wholesale, bypassing the
// canonical migration runner (backend/migrate.js → backend/migrations/*).
// Prefer `node migrate.js` — tracked, idempotent, applies ALL migrations.
requireDevDatabase('setup-database.js');
console.warn('WARNING: setup-database.js applies a legacy full-schema file. ' +
  'Prefer `node migrate.js` (canonical path, backend/migrations/*).');

async function setupDatabase() {
  try {
    console.log('Setting up database schema...');
    
    // Read the schema file
    const schemaSQL = await fs.readFile('../database/schema.sql', 'utf8');
    
    // Execute the schema
    await pool.query(schemaSQL);
    
    console.log('Database schema created successfully!');
    
    // Close the connection
    await pool.end();
    
    // Now run the seed script
    console.log('Running seed script...');
    require('./seed-database.js');
    
  } catch (error) {
    console.error('Error setting up database:', error);
    await pool.end();
  }
}

setupDatabase();
