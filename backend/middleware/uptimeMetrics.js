/**
 * uptimeMetrics — §4.3 uptime & latency instrumentation.
 *
 * Times every /api request and keeps a small in-memory sliding window
 * (last 500 observations). At most once per FLUSH_INTERVAL_MS — checked
 * piggyback on requests, no timers — the window is summarized into
 * platform_health (service_name 'api.http'): avg response_time ms,
 * error_rate (% of >=500), last_check. The Monitoring page reads the
 * same table for the rest of its components.
 *
 * Design constraints:
 *   - Never blocks a request: DB flush is fire-and-forget and every
 *     failure is swallowed (observability must not take down the app).
 *   - Skips NODE_ENV=test (the suite mocks pool.query and would consume
 *     mock resolutions meant for controllers).
 */
const { pool } = require('../config/database');

const WINDOW_MAX = 500;
const FLUSH_INTERVAL_MS = 5 * 60 * 1000;

const window_ = [];
let lastFlushAt = 0;
let flushInFlight = false;

const summarize = () => {
  const n = window_.length;
  if (n === 0) return null;
  let sum = 0, errors = 0;
  for (const s of window_) { sum += s.ms; if (s.status >= 500) errors++; }
  return { avgMs: Math.round(sum / n), errorRate: Math.round((errors * 1000) / n) / 10, samples: n };
};

const flush = async () => {
  const summary = summarize();
  if (!summary) return;
  try {
    await pool.query(
      `INSERT INTO platform_health (service_name, status, response_time, error_rate, last_check, metadata, created_at, updated_at)
       VALUES ('api.http', $1, $2, $3, CURRENT_TIMESTAMP, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [summary.errorRate > 10 ? 'degraded' : 'healthy', summary.avgMs, summary.errorRate,
       JSON.stringify({ samples: summary.samples, window: '5m' })]
    );
  } catch {
    /* observability must never break the request path */
  }
};

const uptimeMetrics = (req, res, next) => {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    window_.push({ ms, status: res.statusCode });
    if (window_.length > WINDOW_MAX) window_.shift();
    const now = Date.now();
    if (!flushInFlight && now - lastFlushAt >= FLUSH_INTERVAL_MS) {
      lastFlushAt = now;
      flushInFlight = true;
      flush().finally(() => { flushInFlight = false; });
    }
  });
  next();
};

const middleware = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : uptimeMetrics;

module.exports = middleware;
