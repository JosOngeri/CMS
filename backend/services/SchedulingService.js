const logger = require('../config/logging');

/**
 * Scheduling Service
 * Handles date calculations and interval logic for recurring payments
 * Provides retry logic and scheduling utilities
 */
class SchedulingService {
  /**
   * Calculate the next payment date based on frequency and start date
   * @param {string|Date} startDate - The start date for the calculation
   * @param {string} frequency - The frequency (weekly, bi_weekly, monthly, quarterly, annual)
   * @returns {string} ISO date string of the next payment date
   */
  calculateNextPaymentDate(startDate, frequency) {
    const date = new Date(startDate);
    
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'bi_weekly':
        date.setDate(date.getDate() + 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'semi_annual':
        date.setMonth(date.getMonth() + 6);
        break;
      case 'annual':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        // Default to monthly if frequency not recognized
        date.setMonth(date.getMonth() + 1);
    }
    
    return date.toISOString().split('T')[0];
  }

  /**
   * Calculate next payment date with retry offset
   * Used when a payment fails and needs to be retried after a delay
   * @param {string|Date} originalDate - The original payment date
   * @param {number} retryAttempt - The retry attempt number (1, 2, 3...)
   * @param {string} frequency - The payment frequency
   * @returns {string} ISO date string of the retry date
   */
  calculateRetryDate(originalDate, retryAttempt, frequency) {
    const date = new Date(originalDate);
    
    // Exponential backoff: 1 day, 2 days, 4 days, 8 days, max 30 days
    const backoffDays = Math.min(Math.pow(2, retryAttempt - 1), 30);
    date.setDate(date.getDate() + backoffDays);
    
    return date.toISOString().split('T')[0];
  }

  /**
   * Generate a payment schedule for a date range
   * @param {string|Date} startDate - Start date
   * @param {string|Date} endDate - End date (optional)
   * @param {string} frequency - Payment frequency
   * @returns {Array<string>} Array of ISO date strings for scheduled payments
   */
  generatePaymentSchedule(startDate, endDate, frequency) {
    const schedule = [];
    let currentDate = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date('2099-12-31'); // Far future if no end date
    
    while (currentDate <= end) {
      schedule.push(currentDate.toISOString().split('T')[0]);
      currentDate = new Date(this.calculateNextPaymentDate(currentDate, frequency));
    }
    
    return schedule;
  }

  /**
   * Check if a payment is due based on current date and next payment date
   * @param {string} nextPaymentDate - The next scheduled payment date
   * @param {number} graceDays - Grace period days (default: 3)
   * @returns {boolean} True if payment is due or overdue
   */
  isPaymentDue(nextPaymentDate, graceDays = 3) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(nextPaymentDate);
    dueDate.setHours(0, 0, 0, 0);
    
    const graceDate = new Date(dueDate);
    graceDate.setDate(graceDate.getDate() + graceDays);
    
    return today >= dueDate && today <= graceDate;
  }

  /**
   * Check if a payment is overdue
   * @param {string} nextPaymentDate - The next scheduled payment date
   * @param {number} graceDays - Grace period days (default: 3)
   * @returns {boolean} True if payment is overdue
   */
  isPaymentOverdue(nextPaymentDate, graceDays = 3) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(nextPaymentDate);
    dueDate.setHours(0, 0, 0, 0);
    
    const graceDate = new Date(dueDate);
    graceDate.setDate(graceDate.getDate() + graceDays);
    
    return today > graceDate;
  }

  /**
   * Calculate the number of payments between two dates
   * @param {string|Date} startDate - Start date
   * @param {string|Date} endDate - End date
   * @param {string} frequency - Payment frequency
   * @returns {number} Number of payments in the period
   */
  calculatePaymentCount(startDate, endDate, frequency) {
    const schedule = this.generatePaymentSchedule(startDate, endDate, frequency);
    return schedule.length;
  }

  /**
   * Validate frequency string
   * @param {string} frequency - Frequency to validate
   * @returns {boolean} True if valid
   */
  isValidFrequency(frequency) {
    const validFrequencies = ['weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'];
    return validFrequencies.includes(frequency);
  }

  /**
   * Get retry configuration for failed payments
   * @param {number} attemptNumber - Current attempt number
   * @returns {Object} Retry configuration with delay and max attempts
   */
  getRetryConfig(attemptNumber) {
    const maxAttempts = 5;
    const baseDelayDays = 1;
    
    return {
      shouldRetry: attemptNumber <= maxAttempts,
      attemptNumber: attemptNumber,
      maxAttempts: maxAttempts,
      delayDays: Math.min(Math.pow(2, attemptNumber - 1), 30), // Exponential backoff, max 30 days
      nextAttemptDate: attemptNumber <= maxAttempts 
        ? this.calculateRetryDate(new Date(), attemptNumber, 'monthly')
        : null
    };
  }

  /**
   * Process payment failure and determine next action
   * @param {Object} payment - Payment object with retry information
   * @returns {Object} Next action configuration
   */
  processPaymentFailure(payment) {
    const currentRetries = payment.retry_count || 0;
    const retryConfig = this.getRetryConfig(currentRetries + 1);
    
    return {
      shouldRetry: retryConfig.shouldRetry,
      nextRetryDate: retryConfig.nextAttemptDate,
      retryCount: currentRetries + 1,
      shouldCancel: !retryConfig.shouldRetry,
      reason: retryConfig.shouldRetry 
        ? `Payment failed, scheduling retry ${currentRetries + 1} of ${retryConfig.maxAttempts}`
        : 'Payment failed after maximum retry attempts, cancelling recurring payment'
    };
  }
}

module.exports = new SchedulingService();