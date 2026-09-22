const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

/**
 * Runs migrations/026_mobile_parity.sql
 * Adds users.avatar_url and event_attendance.rsvp_status,
 * and ensures the event_attendance unique index used by RSVP ON CONFLICT.
 */
async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Starting migration 026_mobile_parity...');

    const migrationPath = path.join(__dirname, '../migrations/026_mobile_parity.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');

    const verification = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name = 'users' AND column_name = 'avatar_url') AS avatar_url_col,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name = 'event_attendance' AND column_name = 'rsvp_status') AS rsvp_status_col,
        (SELECT COUNT(*) FROM pg_indexes
         WHERE indexname = 'uq_event_attendance_event_member') AS unique_index
    `);
    console.log('Verification:', verification.rows[0]);
    console.log('Migration 026 completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigration };
