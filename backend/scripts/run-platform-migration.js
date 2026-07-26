const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting platform admin schema migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/020_platform_admin_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Platform admin schema migration completed successfully!');
    console.log('');
    console.log('Created tables:');
    console.log('  - platform_stats');
    console.log('  - platform_health');
    console.log('  - platform_alerts');
    console.log('  - platform_users');
    console.log('  - platform_audit_logs');
    console.log('');
    console.log('Default platform user created:');
    console.log('  Email: admin@kmaincms.org');
    console.log('  Role: platform_owner');
    console.log('  ⚠️  Please change the password immediately!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration process completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });