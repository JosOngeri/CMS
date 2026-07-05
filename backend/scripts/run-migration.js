const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting database indexes migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../../database/add_indexes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolon to get individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        // Filter out empty lines and comments
        const lines = s.split('\n').filter(line => line.trim() && !line.trim().startsWith('--'));
        return lines.length > 0;
      })
      .map(s => {
        // Remove any comment lines from within statements
        return s.split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
      });

    console.log(`Executing ${statements.length} index creation statements...`);

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      if (!statement || statement.length === 0) continue;

      try {
        await client.query(statement);
        successCount++;
        console.log(`✓ Executed successfully`);
      } catch (error) {
        // Ignore errors for indexes that already exist
        if (error.message.includes('already exists')) {
          console.log(`⊘ Index already exists, skipping`);
          successCount++;
        } else {
          errorCount++;
          console.error(`✗ Error executing statement:`, error.message);
        }
      }
    }

    console.log(`\nMigration complete: ${successCount} successful, ${errorCount} errors`);

    if (errorCount > 0) {
      console.warn('Some errors occurred during migration. Please review the output above.');
    } else {
      console.log('All indexes created successfully!');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
