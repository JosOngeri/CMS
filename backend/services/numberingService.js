/**
 * Numbering Service
 * Centralized generation of human-readable business document numbers
 * (pledges, recurring payments, refunds, vendor codes, receipt sequences)
 */
class NumberingService {
  /**
   * Generate a random-suffix document number.
   * Pattern: {PREFIX}-{YYYY}-{NNNN} (year optional)
   * @param {string} prefix - Document prefix (e.g. 'PLEDGE', 'REC', 'VND')
   * @param {Object} [options]
   * @param {boolean} [options.includeYear=true] - Include the current year segment
   * @returns {string} Generated document number
   */
  generateNumber(prefix, { includeYear = true } = {}) {
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return includeYear
      ? `${prefix}-${new Date().getFullYear()}-${random}`
      : `${prefix}-${random}`;
  }

  generatePledgeNumber() {
    return this.generateNumber('PLEDGE');
  }

  generateRecurringNumber() {
    return this.generateNumber('REC');
  }

  generateRefundNumber() {
    return this.generateNumber('REF');
  }

  generateVendorCode() {
    return this.generateNumber('VND', { includeYear: false });
  }

  /**
   * Generate a sequential daily number: {PREFIX}-{YYYYMMDD}-{NNNN}
   * @param {string} prefix - Document prefix (e.g. 'KMC')
   * @param {number} sequence - Sequence for the day (1-based)
   * @returns {string} Generated document number
   */
  generateDailySequenceNumber(prefix, sequence) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${prefix}-${dateStr}-${String(sequence).padStart(4, '0')}`;
  }
}

module.exports = new NumberingService();
