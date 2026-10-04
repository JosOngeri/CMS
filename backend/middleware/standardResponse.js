const ResponseHandler = require('../utils/ResponseHandler');
const { pgClientErrorStatus } = require('../helpers/pgClientError');

/**
 * Ensures every JSON API response uses the standard envelope:
 * { success, message, data, error, timestamp }.
 *
 * Existing named top-level fields are preserved for compatibility while route
 * handlers are migrated to ResponseHandler directly.
 */
const standardResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    let { statusCode, body: normalizedBody } = ResponseHandler.normalize(body, res.statusCode);
    // A query in this request rejected with a client-input SQLSTATE — the
    // controller's generic 500 is really a bad-request/conflict response.
    if (statusCode >= 500) {
      statusCode = pgClientErrorStatus() || statusCode;
    }
    res.status(statusCode);
    return originalJson(normalizedBody);
  };

  next();
};

module.exports = standardResponse;
