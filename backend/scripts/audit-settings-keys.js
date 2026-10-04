/**
 * Reconciles the `settings` table against constants/settingKeys.js.
 * Flags: manifest keys with no global row, DB rows not in the manifest,
 * secret keys that are church-editable, overrides on platform-managed keys.
 * Usage: node scripts/audit-settings-keys.js
 */
require('dotenv').config({ quiet: true });
const { pool } = require('../config/database');
const { KEYS, GLOBAL_ONLY_KEYS, SECRET_KEYS } = require('../constants/settingKeys');

(async () => {
  const manifestKeys = new Set(KEYS.map((k) => k.key));
  const globals = await pool.query('SELECT key, is_editable FROM settings WHERE church_id IS NULL');
  const dbGlobalKeys = new Set(globals.rows.map((r) => r.key));
  const issues = [];

  for (const k of KEYS) {
    if (!dbGlobalKeys.has(k.key)) issues.push(`MISSING GLOBAL ROW: ${k.category}/${k.key}`);
  }
  for (const r of globals.rows) {
    if (!manifestKeys.has(r.key)) issues.push(`DB ROW NOT IN MANIFEST: ${r.key}`);
    if (GLOBAL_ONLY_KEYS.has(r.key) && r.is_editable) issues.push(`PLATFORM-MANAGED KEY STILL CHURCH-EDITABLE: ${r.key}`);
    if (SECRET_KEYS.has(r.key) && r.is_editable) issues.push(`SECRET KEY EDITABLE: ${r.key}`);
  }
  const badOverrides = await pool.query(
    'SELECT key, church_id FROM settings WHERE church_id IS NOT NULL AND key = ANY($1)',
    [[...GLOBAL_ONLY_KEYS]]
  );
  for (const r of badOverrides.rows) {
    issues.push(`CHURCH OVERRIDE ON PLATFORM-MANAGED KEY: ${r.key} (church ${r.church_id})`);
  }

  if (issues.length) {
    console.log('ISSUES FOUND:');
    issues.forEach((i) => console.log(' -', i));
    process.exit(1);
  }
  console.log(`OK — ${KEYS.length} manifest keys, ${dbGlobalKeys.size} global rows, no drift.`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
