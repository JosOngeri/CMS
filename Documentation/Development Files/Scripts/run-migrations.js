#!/usr/bin/env node

/**
 * Migration Runner Script
 * Runs all database migrations in the correct order
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'database', 'migrations');

// Migration order is critical - must run in this sequence
const migrationOrder = [
  'add_tenancy_core.sql',
  'add_church_slug_indexes.sql',
  'enable_rls_policies.sql',
  'add_sms_providers.sql',
  'add_notification_templates.sql',
  'add_gallery_sync.sql',
  'add_payment_tracking.sql',
  'add_document_approval_workflow.sql',
  'add_ai_audit_logging.sql',
  'add_performance_indexes.sql',
  'add_sda_content_tables.sql'
];

console.log('🗄️  Running KMainCMS Database Migrations...\n');

// Check if migrations directory exists
if (!fs.existsSync(migrationsDir)) {
  console.error('❌ Migrations directory not found:', migrationsDir);
  process.exit(1);
}

// Get database config from environment or use defaults
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbName = process.env.DB_NAME || 'kmaincms';
const dbUser = process.env.DB_USER || 'postgres';

console.log(`📊 Database: ${dbUser}@${dbHost}:${dbPort}/${dbName}\n`);

// Run migrations in order
let successCount = 0;
let failCount = 0;

for (const migrationFile of migrationOrder) {
  const migrationPath = path.join(migrationsDir, migrationFile);
  
  if (!fs.existsSync(migrationPath)) {
    console.warn(`⚠️  Migration not found: ${migrationFile} (skipping)`);
    continue;
  }

  console.log(`▶️  Running: ${migrationFile}`);
  
  try {
    execSync(`psql -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -f "${migrationPath}"`, {
      stdio: 'inherit',
      cwd: __dirname
    });
    console.log(`✅ Completed: ${migrationFile}\n`);
    successCount++;
  } catch (error) {
    console.error(`❌ Failed: ${migrationFile}`);
    console.error(`   Error: ${error.message}\n`);
    failCount++;
  }
}

console.log('========================================');
console.log(`Migration Summary:`);
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`📊 Total: ${successCount + failCount}`);
console.log('========================================');

if (failCount > 0) {
  console.error('\n❌ Some migrations failed. Please review the errors above.');
  process.exit(1);
} else {
  console.log('\n🎉 All migrations completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Verify tables: psql -U postgres -d kmaincms -c "\\dt"');
  console.log('2. Run tests: node run-tests.js');
  console.log('3. Start application: cd backend && npm start');
}
