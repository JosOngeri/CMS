/**
 * Financial Forecasting Service
 * Handles financial forecasting algorithms and calculations
 */
class FinancialForecastingService {
  /**
   * Generate forecast using moving average method
   * @param {Array} historicalData - Historical data array
   * @param {number} months - Number of months to forecast
   * @returns {Array} Forecast data
   */
  generateMovingAverageForecast(historicalData, months) {
    const forecast = [];
    const avgAmount = historicalData.length > 0
      ? historicalData.reduce((sum, h) => sum + parseFloat(h.total_amount), 0) / historicalData.length
      : 0;

    for (let i = 1; i <= months; i++) {
      const targetMonth = ((new Date().getMonth() + i) % 12) + 1;
      const historicalMonth = historicalData.find(h => parseInt(h.month) === targetMonth);
      const seasonalFactor = historicalMonth ? parseFloat(historicalMonth.total_amount) / (avgAmount || 1) : 1;

      forecast.push({
        month: targetMonth,
        forecast_amount: avgAmount * seasonalFactor * 1.02 // 2% growth
      });
    }

    return forecast;
  }

  /**
   * Generate forecast using trend analysis method
   * @param {Array} historicalData - Historical data array
   * @param {number} months - Number of months to forecast
   * @returns {Array} Forecast data
   */
  generateTrendForecast(historicalData, months) {
    const forecast = [];

    if (historicalData.length >= 2) {
      const firstAmount = parseFloat(historicalData[0].total_amount);
      const lastAmount = parseFloat(historicalData[historicalData.length - 1].total_amount);
      const trend = (lastAmount - firstAmount) / historicalData.length;

      for (let i = 1; i <= months; i++) {
        const targetMonth = ((new Date().getMonth() + i) % 12) + 1;
        const historicalMonth = historicalData.find(h => parseInt(h.month) === targetMonth);
        const baseAmount = historicalMonth ? parseFloat(historicalMonth.total_amount) : lastAmount;

        forecast.push({
          month: targetMonth,
          forecast_amount: baseAmount + (trend * i)
        });
      }
    } else {
      // Fallback to simple average if not enough data
      const avgAmount = historicalData.length > 0
        ? historicalData.reduce((sum, h) => sum + parseFloat(h.total_amount), 0) / historicalData.length
        : 0;

      for (let i = 1; i <= months; i++) {
        const targetMonth = ((new Date().getMonth() + i) % 12) + 1;
        forecast.push({
          month: targetMonth,
          forecast_amount: avgAmount
        });
      }
    }

    return forecast;
  }

  /**
   * Generate cash flow forecast
   * @param {Array} historicalData - Historical cash flow data
   * @param {number} months - Number of months to forecast
   * @returns {Array} Cash flow forecast
   */
  generateCashFlowForecast(historicalData, months) {
    const forecast = [];

    for (let i = 1; i <= months; i++) {
      const targetMonth = ((new Date().getMonth() + i) % 12) + 1;
      const historicalMonth = historicalData.find(h => parseInt(h.month) === targetMonth);

      const incomeForecast = historicalMonth ? parseFloat(historicalMonth.income) * 1.05 : 0; // 5% growth assumption
      const expenseForecast = historicalMonth ? parseFloat(historicalMonth.expense) * 1.03 : 0; // 3% growth assumption
      const netCashFlow = incomeForecast - expenseForecast;

      forecast.push({
        month: targetMonth,
        income_forecast: incomeForecast,
        expense_forecast: expenseForecast,
        net_cash_flow: netCashFlow
      });
    }

    return forecast;
  }

  /**
   * Calculate variance between budget and forecast
   * @param {number} budgetedAmount - Budgeted amount
   * @param {number} totalForecast - Total forecast amount
   * @returns {Object} Variance data
   */
  calculateVariance(budgetedAmount, totalForecast) {
    const variance = budgetedAmount - totalForecast;
    const variancePercentage = budgetedAmount > 0 ? (variance / budgetedAmount) * 100 : 0;

    return {
      variance,
      variance_percentage: variancePercentage
    };
  }

  /**
   * Main forecast generation method
   * @param {Array} historicalData - Historical data array
   * @param {string} method - Forecast method (moving_average, trend)
   * @param {number} months - Number of months to forecast
   * @returns {Array} Forecast data
   */
  generateForecast(historicalData, method, months) {
    switch (method) {
      case 'moving_average':
        return this.generateMovingAverageForecast(historicalData, months);
      case 'trend':
        return this.generateTrendForecast(historicalData, months);
      default:
        return this.generateMovingAverageForecast(historicalData, months);
    }
  }
}

module.exports = new FinancialForecastingService();
