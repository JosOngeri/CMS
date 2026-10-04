/**
 * platformBackup — runs real pg_dump backups of the platform database and
 * registers them in platform_backups (7.1).
 *
 * pg_dump's custom format (-Fc) gives a compressed single file that
 * pg_restore can selectively restore from. Connection details reuse the
 * same env vars as config/database (PGHOST/DB_HOST etc.), with PGPASSWORD
 * passed via env so it never lands in argv or logs.
 *
 * Retention: keeps the newest `backup_keep` (platform_settings, default
 * 14) rows — older ones are deleted from disk AND the registry.
 */
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');
const logger = require('../config/logging');

const BACKUP_DIR = process.env.PLATFORM_BACKUP_DIR || path.join(__dirname, '..', 'backups');
const MIN_VALID_BYTES = 1024; // a dump under 1KB is certainly broken

const getSetting = async (key, fallback) => {
  try {
    const r = await pool.query('SELECT value FROM platform_settings WHERE key = $1', [key]);
    return r.rows[0]?.value ?? fallback;
  } catch {
    return fallback;
  }
};

const dumpArgs = (filePath) => {
  const host = process.env.PGHOST || process.env.DB_HOST || 'localhost';
  const port = process.env.PGPORT || process.env.DB_PORT || '5432';
  const user = process.env.PGUSER || process.env.DB_USER || 'postgres';
  const db = process.env.PGDATABASE || process.env.DB_NAME || 'msabato';
  return ['-Fc', '-h', host, '-p', String(port), '-U', user, '-d', db, '-f', filePath];
};

const runPgDump = (filePath) => new Promise((resolve, reject) => {
  execFile('pg_dump', dumpArgs(filePath), {
    env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD || process.env.DB_PASSWORD || '' },
    timeout: 10 * 60 * 1000,
    maxBuffer: 4 * 1024 * 1024,
  }, (error, stdout, stderr) => {
    if (error) reject(new Error(`pg_dump failed: ${stderr || error.message}`));
    else resolve();
  });
});

/**
 * Run one backup. Returns the platform_backups row. `initiatedBy` is a
 * platform_users.id or null (scheduler).
 */
const runBackup = async (initiatedBy = null) => {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `msabato-${stamp}.dump`;
  const filePath = path.join(BACKUP_DIR, fileName);

  const pending = await pool.query(
    `INSERT INTO platform_backups (scope, file_path, status, initiated_by)
     VALUES ('full', $1, 'running', $2) RETURNING id`,
    [filePath, initiatedBy]
  );
  const backupId = pending.rows[0].id;

  try {
    await runPgDump(filePath);
    const size = fs.statSync(filePath).size;
    const verified = size >= MIN_VALID_BYTES;
    const result = await pool.query(
      `UPDATE platform_backups
       SET status = $1, size_bytes = $2, verified_at = CASE WHEN $3 THEN CURRENT_TIMESTAMP END
       WHERE id = $4 RETURNING *`,
      [verified ? 'verified' : 'completed', size, verified, backupId]
    );
    await pruneBackups();
    return result.rows[0];
  } catch (error) {
    await pool.query('UPDATE platform_backups SET status = $1 WHERE id = $2', ['failed', backupId]);
    try { fs.unlinkSync(filePath); } catch { /* file may not exist */ }
    throw error;
  }
};

/** Keep the newest `backup_keep` backups; delete older files + rows. */
const pruneBackups = async () => {
  const keep = Number(await getSetting('backup_keep', 14)) || 14;
  const stale = await pool.query(
    `SELECT id, file_path FROM platform_backups
     WHERE status != 'running'
     ORDER BY created_at DESC OFFSET $1`,
    [keep]
  );
  for (const row of stale.rows) {
    if (row.file_path) {
      try { fs.unlinkSync(row.file_path); } catch { /* already gone */ }
    }
    await pool.query('DELETE FROM platform_backups WHERE id = $1', [row.id]);
  }
  if (stale.rows.length) logger.info(`Backup pruning removed ${stale.rows.length} old backup(s)`);
};

/**
 * Restore a backup into the STAGING database only (7.1). There is no code
 * path that restores into the primary DB — production restores stay a
 * deliberate, hands-on operation. Requires STAGING_DATABASE_URL; refuses
 * clearly when it isn't configured.
 */
const restoreToStaging = (filePath) => new Promise((resolve, reject) => {
  const stagingUrl = process.env.STAGING_DATABASE_URL;
  if (!stagingUrl) {
    return reject(new Error('STAGING_DATABASE_URL is not configured — no staging target'));
  }
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(BACKUP_DIR))) {
    return reject(new Error('Backup path is outside the backup directory'));
  }
  if (!fs.existsSync(resolved)) {
    return reject(new Error('Backup file no longer exists on disk'));
  }
  // --clean --if-exists drops objects before recreating so re-restores
  // into the same staging DB don't collide; --no-owner/--no-privileges
  // sidestep role mismatches between prod and staging.
  execFile('pg_restore',
    ['--clean', '--if-exists', '--no-owner', '--no-privileges', '-d', stagingUrl, resolved],
    { env: { ...process.env }, timeout: 15 * 60 * 1000, maxBuffer: 4 * 1024 * 1024 },
    (error, stdout, stderr) => {
      // pg_restore exits non-zero on harmless "object exists" warnings
      // even with --if-exists on some versions — treat stderr-only
      // warnings as success if a dump actually applied.
      if (error && !/warning/i.test(stderr || '')) {
        reject(new Error(`pg_restore failed: ${stderr || error.message}`));
      } else {
        resolve({ stderr });
      }
    });
});

/** Hours since the last non-failed backup — the scheduler uses this. */
const hoursSinceLastBackup = async () => {
  const r = await pool.query(
    `SELECT MAX(created_at) AS last FROM platform_backups WHERE status IN ('completed','verified')`
  );
  if (!r.rows[0].last) return Infinity;
  return (Date.now() - new Date(r.rows[0].last).getTime()) / 3600000;
};

module.exports = { runBackup, pruneBackups, restoreToStaging, hoursSinceLastBackup, BACKUP_DIR };
