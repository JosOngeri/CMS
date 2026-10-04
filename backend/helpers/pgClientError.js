/**
 * Request-scoped marker for Postgres client-input errors.
 *
 * Most controllers answer every thrown error with a generic
 * `res.status(500).json({ error: 'static message' })` — the raw error never
 * reaches the response, so a NOT NULL violation or bad UUID surfaces as a
 * server crash instead of the 400 it really is.
 *
 * This module correlates without touching those handlers: config/database
 * marks the request when a query rejects with a client-input PG code, and
 * middleware/standardResponse downgrades a 500 to 400 when the request was
 * marked. AsyncLocalStorage keeps the mark scoped to the in-flight request.
 */
const { AsyncLocalStorage } = require('async_hooks');

const store = new AsyncLocalStorage();

// SQLSTATEs caused by the request payload/params, not by server state.
const PG_CLIENT_CODES = new Set([
  '22P02', // invalid_text_representation — bad UUID/int/date literal
  '22001', // string_data_right_truncation — value too long
  '22003', // numeric_value_out_of_range
  '22007', // invalid_datetime_format
  '22008', // datetime_field_overflow
  '23502', // not_null_violation — missing required field
  '23503', // foreign_key_violation — references a nonexistent row
  '23505', // unique_violation — duplicate
  '23514', // check_violation
  '42P02', // undefined_parameter — malformed query args
]);

/** Express middleware — must run before any code that may query. */
const pgClientErrorContext = (req, res, next) =>
  store.run({ marked: false, statusCode: 400 }, () => next());

/** Called from the query wrapper when a client-input PG error occurs. */
const markPgClientError = (err) => {
  const ctx = store.getStore();
  if (ctx) {
    ctx.marked = true;
    // unique violation reads naturally as 409; everything else is a 400.
    ctx.statusCode = err && err.code === '23505' ? 409 : 400;
  }
};

/** Returns the downgraded status for a marked request, else null. */
const pgClientErrorStatus = () => {
  const ctx = store.getStore();
  return ctx && ctx.marked ? ctx.statusCode : null;
};

// Thrown-Error message patterns that mean "the request was bad", not the
// server. Services throw plain Errors for lookup misses and validation;
// controllers then log the error and answer a static 500. Logging happens
// inside the request's async context, so logger.error can mark the request
// and standardResponse downgrades the response just like PG violations.
const CLIENT_ERROR_PATTERNS = [
  { re: /not found/i, status: 404 },
  { re: /does not exist/i, status: 404 },
  { re: /does not belong/i, status: 403 },
  { re: /invalid credentials/i, status: 401 },
  { re: /is required|required field|missing required/i, status: 400 },
  { re: /invalid|not a valid|illegal arguments|must be|cannot be empty|non-empty/i, status: 400 },
];

/**
 * Inspect a thrown error the way a careful handler would: honor an explicit
 * statusCode (AppError), then fall back to message patterns. TypeErrors and
 * unrecognized errors are left alone — they are real crashes.
 * @returns {number|null} the status the request was marked with
 */
const markRequestError = (err) => {
  const ctx = store.getStore();
  if (!ctx || !err || typeof err !== 'object') return null;
  const explicit = Number(err.statusCode || err.status);
  if (explicit >= 400 && explicit < 500) {
    ctx.marked = true;
    ctx.statusCode = explicit;
    return explicit;
  }
  if (err instanceof TypeError || err instanceof ReferenceError || err instanceof SyntaxError) return null;
  const message = String(err.message || '');
  for (const { re, status } of CLIENT_ERROR_PATTERNS) {
    if (re.test(message)) {
      ctx.marked = true;
      ctx.statusCode = status;
      return status;
    }
  }
  return null;
};

module.exports = { PG_CLIENT_CODES, pgClientErrorContext, markPgClientError, markRequestError, pgClientErrorStatus };
