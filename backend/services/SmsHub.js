const logger = require('../config/logging');
const hybridSMS = require('./hybridSMS');

/**
 * SmsHub — DEPRECATED thin delegate to hybridSMS.
 *
 * Historically this was a second router (hardcoded BlessedTexts bulk path).
 * Routing now lives exclusively in services/hybridSMS.js — presence-checked
 * JOSms relay, provider-table bulk, settings gates, failover and the
 * sms_deliveries ledger. This shim remains so existing callers
 * (department_community.routes) keep working until migrated.
 */
class SmsHub {
  setIo(io) {
    // io wiring is handled by hybridSMS — forward so legacy bootstraps work.
    hybridSMS.setIo(io);
  }

  async sendSMS(payload) {
    return hybridSMS.sendSMS(payload);
  }
}

module.exports = new SmsHub();
