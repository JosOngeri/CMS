const fs = require('fs').promises;
const { pool } = require('./config/database');

async function setupTreasuryDatabase() {
  const client = await pool.connect();
  try {
    console.log('Checking if treasury tables exist on remote database...');
    
    // Check if any treasury table exists
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'funds'
      )
    `);
    
    const treasuryExists = checkResult.rows[0].exists;
    
    if (treasuryExists) {
      console.log('Treasury schema tables already exist - skipping');
      return;
    }
    
    console.log('Setting up treasury database schema on remote database...');
    
    await client.query('BEGIN');
    
    // Read the treasury schema file
    const schemaSQL = await fs.readFile('../database/treasury_schema.sql', 'utf8');
    
    // Execute the entire schema as a single transaction
    await client.query(schemaSQL);
    
    await client.query('COMMIT');
    
    console.log('Treasury database schema created successfully on remote database!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up treasury database:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupTreasuryDatabase();
