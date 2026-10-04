/**
 * @purpose Buffered writable stream feeding warn+ pino lines into
 *          platform_app_logs for the console log explorer (tracker 4.7).
 * @exports appLogDbStream
 * @known Writes are batched (5s / 50 lines) and every failure is swallowed —
 *        a logging sink must never take the app down. Requires the pg pool,
 *        so the stream inertly buffers until the first successful insert.
 */
const { pool } = require('./database');

const FLUSH_MS = 5000;
const FLUSH_LINES = 50;
const MAX_BUFFER = 500; // drop oldest beyond this if the DB stays down

const LEVEL_NAMES = { 30: 'info', 40: 'warn', 50: 'error', 60: 'fatal' };
let buffer = [];
let timer = null;

const flush = async () => {
  if (buffer.length === 0) return;
  const lines = buffer;
  buffer = [];
  try {
    const values = [];
    const params = [];
    for (const line of lines) {
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }
      const level = LEVEL_NAMES[entry.level] || 'info';
      const { msg = '', level: _l, time: _t, pid: _p, hostname: _h, ...context } = entry;
      values.push(`($${params.length + 1}, $${params.length + 2}, $${params.length + 3})`);
      params.push(level, msg, JSON.stringify(context));
    }
    if (values.length === 0) return;
    await pool.query(
      `INSERT INTO platform_app_logs (level, msg, context) VALUES ${values.join(',')}`,
      params
    );
  } catch {
    // Table may not exist pre-migration — drop silently.
  }
};

const scheduleFlush = () => {
  if (timer) return;
  timer = setTimeout(() => { timer = null; flush(); }, FLUSH_MS);
  timer.unref();
};

const appLogDbStream = {
  write(line) {
    buffer.push(line);
    if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
    if (buffer.length >= FLUSH_LINES) { flush(); return; }
    scheduleFlush();
  },
};

module.exports = { appLogDbStream };
