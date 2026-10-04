/**
 * uptimeProbe — §4.3 external uptime signal.
 *
 * The in-app uptimeMetrics middleware only proves the app can measure
 * itself; this script is the outside view — it fetches /api/health over
 * the public URL and records the result in platform_health as
 * 'api.external', so the Monitoring page can distinguish "app thinks
 * it's fine" from "the internet can actually reach it".
 *
 * Run on a schedule — PM2 cron_restart or system cron, e.g. every 5 min:
 *   node backend/scripts/uptimeProbe.js
 *
 * Env:
 *   PROBE_URL   full URL to hit (default: <PUBLIC_BASE_URL or APP_URL>/api/health)
 *   plus the usual DB_* / DATABASE_URL variables the pg pool needs.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../config/database');

const base = (process.env.PROBE_URL || '').trim() ||
  `${(process.env.PUBLIC_BASE_URL || process.env.APP_URL || 'http://localhost:5000').replace(/\/+$/, '')}/api/health`;

const run = async () => {
  const started = process.hrtime.bigint();
  let status = 'down';
  let detail = '';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(base, { signal: controller.signal });
    clearTimeout(timeout);
    detail = `HTTP ${res.status}`;
    status = res.ok ? 'healthy' : 'degraded';
  } catch (e) {
    detail = e.name === 'AbortError' ? 'timeout after 15s' : String(e.message || e);
  }
  const ms = Math.round(Number(process.hrtime.bigint() - started) / 1e6);

  await pool.query(
    `INSERT INTO platform_health (service_name, status, response_time, last_check, metadata, created_at, updated_at)
     VALUES ('api.external', $1, $2, CURRENT_TIMESTAMP, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [status, ms, JSON.stringify({ url: base, detail })]
  );
  console.log(`[uptime-probe] ${base} -> ${status} in ${ms}ms (${detail})`);
};

run()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error('[uptime-probe] failed:', e.message);
    try { await pool.end(); } catch { /* ignore */ }
    process.exitCode = 1;
  });
