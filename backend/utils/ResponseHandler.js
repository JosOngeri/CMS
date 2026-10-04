/**
 * ResponseHandler Utility (Phase 14)
 * Standardizes all API envelopes (REQ-DATA-01)
 * Includes PII masking for sensitive data protection
 */
const PIIMasker = require('./piiMasker');

class ResponseHandler {
  static success(res, data = {}, message = 'Success', code = 200, maskPII = false) {
    const processedData = maskPII ? PIIMasker.maskResponse(data) : data;
    return res.status(code).json({
      success: true,
      message,
      data: processedData,
      error: null,
      timestamp: new Date().toISOString()
    });
  }

  static error(res, error = 'Internal Server Error', code = 500) {
    const message = error instanceof Error ? error.message : error;
    return res.status(code).json({
      success: false,
      message,
      data: null,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  static forbidden(res, message = 'Access Denied') {
    return this.error(res, message, 403);
  }

  // Several controllers call this for express-validator-style errors —
  // without it the validation path threw TypeError and surfaced as 500.
  static validationError(res, errors = [], message = 'Validation failed') {
    const detail = Array.isArray(errors) && errors.length
      ? errors.map(e => e.message || e.msg || String(e)).join('; ')
      : message;
    return res.status(400).json({
      success: false,
      message,
      data: null,
      error: detail,
      errors: Array.isArray(errors) ? errors : [errors],
      timestamp: new Date().toISOString()
    });
  }

  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  static unauthorized(res, message = 'Authentication Required') {
    return this.error(res, message, 401);
  }

  /**
   * Success response with automatic PII masking
   */
  static successWithPII(res, data = {}, message = 'Success', code = 200) {
    return this.success(res, data, message, code, true);
  }

  /**
   * Normalize a legacy response payload into the standard API envelope.
   *
   * Non-envelope keys are copied back to the top level so older clients that
   * still read `response.data.departments` keep working while the canonical
   * `response.data.data.departments` contract is rolled out.
   */
  static normalize(body = {}, statusCode = 200) {
    const reservedKeys = new Set(['success', 'message', 'data', 'error', 'timestamp']);
    const payload = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const isError = statusCode >= 400 || body?.success === false || Boolean(body?.error);
    const timestamp = new Date().toISOString();

    // Handlers that send validation messages through a 500 path
    // (res.status(500).json / error(res, 'Group name is required')) get a
    // truthful 4xx — the message itself proves the request was bad.
    if (isError && statusCode >= 500) {
      const text = String(payload.error || payload.message || '');
      if (/^invalid |: invalid |not found|is required|must be|not a valid|non-empty|illegal arguments|does not exist|does not belong|no file uploaded/i.test(text)) {
        statusCode = /not found|does not exist/i.test(text) ? 404 : 400;
      }
    }

    if (isError) {
      const message = payload.message || payload.error || 'Request failed';
      const response = {
        success: false,
        message,
        data: Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : null,
        error: payload.error || message,
        timestamp,
        ...Object.fromEntries(Object.entries(payload).filter(([key]) => !reservedKeys.has(key)))
      };
      return { statusCode, body: response };
    }

    let data;
    if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
      data = payload.data;
    } else if (body && typeof body === 'object' && !Array.isArray(body)) {
      data = Object.fromEntries(Object.entries(payload).filter(([key]) => !reservedKeys.has(key)));
    } else {
      data = body;
    }

    const response = {
      success: true,
      message: payload.message || 'Success',
      data,
      error: null,
      timestamp,
      ...Object.fromEntries(Object.entries(payload).filter(([key]) => !reservedKeys.has(key)))
    };

    return { statusCode, body: response };
  }
}

module.exports = ResponseHandler;
