const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

/**
 * Mobile Integration Migration Script
 * This script executes the mobile_integration.sql migration
 */

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Mobile Integration Migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../database/migrations/mobile_integration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    
    // Start transaction
    await client.query('BEGIN');
    console.log('🔒 Transaction started');
    
    // Execute migration
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully');
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('💾 Transaction committed');
    
    // Verify migration
    const verificationQuery = `
      SELECT 
        (SELECT COUNT(*) FROM mobile_devices) as devices,
        (SELECT COUNT(*) FROM mobile_sync_status) as sync_status,
        (SELECT COUNT(*) FROM mobile_sync_conflicts) as conflicts,
        (SELECT COUNT(*) FROM mobile_analytics_cache) as analytics_cache,
        (SELECT COUNT(*) FROM mobile_push_notifications) as push_notifications,
        (SELECT COUNT(*) FROM mobile_offline_queue) as offline_queue,
        (SELECT COUNT(*) FROM mobile_settings) as settings
    `;
    
    const verificationResult = await client.query(verificationQuery);
    console.log('📊 Migration verification:', verificationResult.rows[0]);
    
    console.log('🎉 Mobile Integration Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- 7 new tables created');
    console.log('- 4 existing tables extended');
    console.log('- 15+ indexes created');
    console.log('- 3 database views created');
    console.log('- 3 cleanup functions created');
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error('🔄 Transaction rolled back');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✨ Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };