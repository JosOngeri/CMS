const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function setupSettingsDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Starting settings database setup...');
    
    // Read the settings schema file
    const schemaPath = path.join(__dirname, '../database/settings_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema as a single transaction
    await client.query('BEGIN');
    try {
      await client.query(schema);
      await client.query('COMMIT');
      console.log('Settings database setup completed successfully!');
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Check if it's a "already exists" error
      if (error.code === '42P07' || error.message.includes('already exists')) {
        console.log('Settings table already exists. Skipping creation.');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error setting up settings database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the setup
setupSettingsDatabase()
  .then(() => {
    console.log('Settings database setup finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Settings database setup failed:', error);
    process.exit(1);
  });
