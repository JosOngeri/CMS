/**
 * platformScheduler — one timer driving the platform's recurring jobs.
 *
 * Each task has a cadence; last-run timestamps live in memory (the app is
 * a single PM2 process). Every run is recorded as a platform_jobs row so
 * the Fleet page's jobs table reflects real scheduler activity — and a
 * failing task shows up as a `failed` job, which the alert engine can
 * then flag.
 *
 * Disable with PLATFORM_SCHEDULER=false in .env.
 */
const { pool } = require('../config/database');
const logger = require('../config/logging');
const alertEngine = require('./platformAlertEngine.service');
const dunning = require('./platformDunning.service');
const backupService = require('./platformBackup.service');

const TICK_MS = 60 * 1000;

// name -> { intervalMs, run }
const TASKS = {
  alert_engine: { intervalMs: 5 * 60 * 1000, run: () => alertEngine.evaluate() },
  dunning: { intervalMs: 6 * 60 * 60 * 1000, run: () => dunning.run() },
  backups: {
    intervalMs: 60 * 60 * 1000, // checks hourly; runs only if stale >23h
    run: async () => {
      const hours = await backupService.hoursSinceLastBackup();
      if (hours < 23) return { skipped: true, hoursSince: Math.round(hours) };
      const row = await backupService.runBackup(null);
      return { status: row.status, size_bytes: row.size_bytes };
    },
  },
};

const lastRun = {};

const recordJob = async (name, status, payload, error) => {
  try {
    await pool.query(
      `INSERT INTO platform_jobs (job_type, status, payload, error, run_at, started_at, finished_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [`scheduler:${name}`, status, JSON.stringify(payload || {}), error || null]
    );
  } catch (e) {
    logger.warn(`platformScheduler: couldn't record job ${name}: ${e.message}`);
  }
};

const tick = async () => {
  const now = Date.now();
  for (const [name, task] of Object.entries(TASKS)) {
    if (now - (lastRun[name] || 0) < task.intervalMs) continue;
    lastRun[name] = now;
    try {
      const result = await task.run();
      await recordJob(name, 'completed', result);
      logger.info(`platformScheduler ${name}: ${JSON.stringify(result)}`);
    } catch (error) {
      await recordJob(name, 'failed', {}, error.message);
      logger.error(`platformScheduler ${name} failed: ${error.message}`);
    }
  }
};

const start = () => {
  if (process.env.PLATFORM_SCHEDULER === 'false') {
    logger.info('platformScheduler disabled via PLATFORM_SCHEDULER=false');
    return;
  }
  // First tick shortly after boot, then every minute. unref() so the
  // timer never keeps the process alive during shutdown.
  setTimeout(() => tick().catch((e) => logger.error(`platformScheduler tick: ${e.message}`)), 30 * 1000).unref();
  setInterval(() => tick().catch((e) => logger.error(`platformScheduler tick: ${e.message}`)), TICK_MS).unref();
  logger.info('platformScheduler started — alert_engine/5min, dunning/6h, backups/daily');
};

module.exports = { start, tick, TASKS };
