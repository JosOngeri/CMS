/**
 * Postgres connection pool + query helper that logs duration/failures without leaking params.
 * @exports {pool, queryWithLogging}
 * @deps config/logging
 * @tenant No scoping here — every caller is responsible for its own church_id filters.
 * @known Most repositories call pool.query directly, bypassing queryWithLogging.
 */
const { Pool } = require('pg');
const logger = require('./logging');
const { PG_CLIENT_CODES, markPgClientError } = require('../helpers/pgClientError');

const dbHost = process.env.PGHOST || process.env.DB_HOST || 'localhost';
const isLocalhost = dbHost === 'localhost' || dbHost === '127.0.0.1';

const pool = new Pool({
  host: dbHost,
  port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
  database: process.env.PGDATABASE || process.env.DB_NAME || 'msabato',
  user: process.env.PGUSER || process.env.DB_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Only use SSL in production when connecting to a remote database
  ...(process.env.NODE_ENV === 'production' && !isLocalhost && {
    ssl: { rejectUnauthorized: true, ca: process.env.DB_CA_CERT }
  }),
});

pool.on('error', (err) => {
  logger.error('Database pool idle client error, pool will auto-recover:', err.message);
});

// Tag rejected queries whose SQLSTATE means "bad input" — the request-scoped
// marker lets middleware/standardResponse downgrade the generic 500 to a
// 4xx even when the controller swallowed the error into a static message.
const markIfClientError = (err) => {
  if (err && PG_CLIENT_CODES.has(err.code)) markPgClientError(err);
  throw err;
};

const wrapQuery = (queryFn) => (...args) => {
  const result = queryFn(...args);
  return result && typeof result.catch === 'function' ? result.catch(markIfClientError) : result;
};

const wrapClient = (client) => {
  if (client && !client.__pgClientErrorWrapped) {
    client.__pgClientErrorWrapped = true;
    client.query = wrapQuery(client.query.bind(client));
  }
  return client;
};

pool.query = wrapQuery(pool.query.bind(pool));
const originalConnect = pool.connect.bind(pool);
pool.connect = (...args) => {
  // connect(callback) returns undefined — the client arrives via the callback.
  if (typeof args[args.length - 1] === 'function') {
    const cb = args.pop();
    return originalConnect(...args, (err, client, release) =>
      cb(err, err ? client : wrapClient(client), release));
  }
  return originalConnect(...args).then(wrapClient);
};

// Query helper with logging
async function queryWithLogging(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug({ query: text, duration, rows: result.rowCount }, 'Query executed');
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    // Never log raw params — they can carry passwords, tokens, phone numbers.
    logger.error(
      { query: text, paramCount: Array.isArray(params) ? params.length : 0, duration, error: error.message },
      'Query failed'
    );
    throw error;
  }
}

module.exports = { pool, queryWithLogging };
