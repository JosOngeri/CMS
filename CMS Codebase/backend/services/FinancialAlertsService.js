/**
 * Financial Alerts Service
 * Handles financial alert checking and generation logic
 */
class FinancialAlertsService {
  /**
   * Check if alert priority should be high
   * @param {number} variance - Variance percentage
   * @param {number} threshold - Threshold percentage
   * @returns {string} Priority level
   */
  determineBudgetPriority(variance, threshold) {
    return Math.abs(variance) > 20 ? 'high' : 'medium';
  }

  /**
   * Check if low balance priority should be high
   * @param {number} currentBalance - Current balance
   * @param {number} threshold - Threshold amount
   * @returns {string} Priority level
   */
  determineBalancePriority(currentBalance, threshold) {
    return currentBalance < threshold / 2 ? 'high' : 'medium';
  }

  /**
   * Generate budget variance alert message
   * @param {string} budgetName - Budget name
   * @param {number} variance - Variance percentage
   * @param {number} threshold - Threshold percentage
   * @returns {string} Alert message
   */
  generateBudgetVarianceMessage(budgetName, variance, threshold) {
    return `Budget variance of ${variance.toFixed(2)}% exceeds threshold of ${threshold}%`;
  }

  /**
   * Generate low balance alert message
   * @param {string} fundName - Fund name
   * @param {number} currentBalance - Current balance
   * @param {number} threshold - Threshold amount
   * @returns {string} Alert message
   */
  generateLowBalanceMessage(fundName, currentBalance, threshold) {
    return `Fund balance of ${currentBalance} is below threshold of ${threshold}`;
  }

  /**
   * Generate overdue payment alert message
   * @param {string} description - Payment description
   * @param {number} amount - Payment amount
   * @param {number} overdueDays - Days overdue
   * @returns {string} Alert message
   */
  generateOverduePaymentMessage(description, amount, overdueDays) {
    const desc = description || 'Payment';
    return `Payment of ${amount} has been pending for over ${overdueDays} days`;
  }
}

module.exports = new FinancialAlertsService();
