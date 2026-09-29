/**
 * Apply a SQL migration file.
 * Usage: node scripts/apply-migration.js migrations/034_department_hierarchy_leadership.sql
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/apply-migration.js <migration-file>');
    process.exit(1);
  }
  const migrationPath = path.isAbsolute(file) ? file : path.join(__dirname, '..', file);
  if (!fs.existsSync(migrationPath)) {
    console.error(`File not found: ${migrationPath}`);
    process.exit(1);
  }
  const sql = fs.readFileSync(migrationPath, 'utf8');
  try {
    await pool.query(sql);
    console.log(`Applied ${path.basename(migrationPath)}`);
  } catch (e) {
    console.error(`Migration failed: ${e.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
