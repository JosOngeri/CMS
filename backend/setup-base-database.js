const fs = require('fs').promises;
const { pool } = require('./config/database');

async function setupBaseDatabase() {
  const client = await pool.connect();
  try {
    console.log('Setting up base database schema on remote database...');
    
    await client.query('BEGIN');
    
    // Read the base schema file
    const schemaSQL = await fs.readFile('../database/schema.sql', 'utf8');
    
    // Execute the schema
    await client.query(schemaSQL);
    
    await client.query('COMMIT');
    
    console.log('Base database schema created successfully on remote database!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '42P07') {
      console.log('Base schema tables already exist - skipping');
    } else {
      console.error('Error setting up base database:', error.message);
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

setupBaseDatabase();
