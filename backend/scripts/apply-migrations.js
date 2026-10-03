#!/usr/bin/env node

/**
 * Idempotent migration runner for backend/migrations/NNN_*.sql
 *
 * Applies numbered SQL files in filename order, tracking completed files in
 * a schema_migrations table so re-runs are safe. Each file runs via a single
 * pool.query call (files carry their own BEGIN/COMMIT where needed).
 *
 * Usage:  node scripts/apply-migrations.js                    — apply pending
 *         node scripts/apply-migrations.js --status           — list applied/pending
 *         node scripts/apply-migrations.js --mark-applied NNN — record all files
 *                  numbered <= NNN as applied without executing them
 *                  (bootstrap for databases migrated manually before this tool)
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { pool } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function main() {
  const statusOnly = process.argv.includes('--status');
  const markIdx = process.argv.indexOf('--mark-applied');
  const markThrough = markIdx >= 0 ? process.argv[markIdx + 1] : null;
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => /^\d{3}_.+\.sql$/i.test(f))
    .sort();

  const client = await pool.connect();
  try {
    await ensureTable(client);
    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map(r => r.filename));
    const pending = files.filter(f => !applied.has(f));

    if (markThrough) {
      const toMark = files.filter(f => parseInt(f.slice(0, 3), 10) <= parseInt(markThrough, 10) && !applied.has(f));
      for (const f of toMark) {
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [f]);
      }
      console.log(`Marked ${toMark.length} file(s) <= ${markThrough} as applied (no SQL executed).`);
      return;
    }

    if (statusOnly) {
      console.log(`applied: ${applied.size} · pending: ${pending.length}`);
      pending.forEach(f => console.log('  pending:', f));
      return;
    }

    if (pending.length === 0) {
      console.log('All migrations already applied — nothing to do.');
      return;
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        console.log(`✓ ${file}`);
      } catch (err) {
        // Idempotent reruns may hit benign "already exists" errors only if the
        // file itself is written defensively — anything else is a real failure.
        console.error(`✗ ${file}: ${err.message}`);
        process.exitCode = 1;
        return;
      }
    }
    console.log(`Applied ${pending.length} migration(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Migration runner failed:', err.message);
  process.exit(1);
});
