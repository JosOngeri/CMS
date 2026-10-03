#!/usr/bin/env node

/**
 * Migration Runner Script
 *
 * L749/L750: this used to run a hardcoded, stale list from
 * database/migrations/ (ending in a file that doesn't exist) — one of four
 * parallel schema paths. The canonical path is now backend/migrate.js,
 * which applies backend/migrations/*.sql in numeric order with a
 * schema_migrations tracking table. This wrapper just delegates.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const result = spawnSync(process.execPath, [path.join(__dirname, 'backend', 'migrate.js'), ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);
