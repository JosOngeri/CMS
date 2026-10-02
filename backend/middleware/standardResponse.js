const ResponseHandler = require('../utils/ResponseHandler');

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
    const { statusCode, body: normalizedBody } = ResponseHandler.normalize(body, res.statusCode);
    res.status(statusCode);
    return originalJson(normalizedBody);
  };

  next();
};

module.exports = standardResponse;
