/**
 * platformDeploys.service — records each boot as a deploy row (8.3).
 *
 * A real rollback is a git operation on the VPS (checkout previous sha +
 * rebuild + restart); this table exists so the Config page can show the
 * deploy timeline and the exact sha to roll back to. The record writes
 * itself at boot, so no workflow secrets are needed.
 */
const { pool } = require('../config/database');

const getVersionInfo = () => {
  const pkg = require('../../package.json');
  let sha = null;
  try {
    const { execSync } = require('child_process');
    sha = execSync('git rev-parse --short HEAD', { cwd: require('path').join(__dirname, '..', '..') }).toString().trim();
  } catch { /* deployed box may not have git — fine */ }
  return { version: pkg.version, sha };
};

const recordBoot = async () => {
  try {
    const { version, sha } = getVersionInfo();
    const latest = await pool.query(
      'SELECT version, sha FROM platform_deploys ORDER BY deployed_at DESC LIMIT 1'
    );
    if (latest.rows[0]?.version === version && latest.rows[0]?.sha === sha) return;
    await pool.query(
      `INSERT INTO platform_deploys (version, sha, environment, deployed_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [version, sha, process.env.NODE_ENV || 'development', 'boot', 'recorded at server start']
    );
  } catch {
    /* table may not exist yet pre-migration — non-fatal */
  }
};

module.exports = { recordBoot, getVersionInfo };
