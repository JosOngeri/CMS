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

  static unauthorized(res, message = 'Authentication Required') {
    return this.error(res, message, 401);
  }

  /**
   * Success response with automatic PII masking
   */
  static successWithPII(res, data = {}, message = 'Success', code = 200) {
    return this.success(res, data, message, code, true);
  }
}

module.exports = ResponseHandler;
