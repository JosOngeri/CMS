const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const financialForecastingRepository = require('../repositories/FinancialForecastingRepository');
const FinancialForecastingService = require('../services/FinancialForecastingService');

/**
 * Financial Forecasting Controller
 * Handles financial forecasting and trend analysis
 */
class FinancialForecastingController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('FinancialForecastingController');
  }

  async getRevenueForecast(req, res) {
    try {
      const { months = 12, method = 'moving_average', category_id } = req.query;

      const forecastMonths = parseInt(months);
      const forecastMethod = method;

      const historicalResult = await financialForecastingRepository.getRevenueHistoricalData(category_id);
      const forecast = FinancialForecastingService.generateForecast(historicalResult, forecastMethod, forecastMonths);

      this.success(res, {
        data: {
          method: forecastMethod,
          forecast_months: forecastMonths,
          historical_data: historicalResult,
          forecast: forecast
        }
      });
    } catch (error) {
      this.logger.error('getRevenueForecast', error);
      this.error(res, 'Failed to generate revenue forecast');
    }
  }

  async getExpenseForecast(req, res) {
    try {
      const { months = 12, method = 'moving_average', category_id } = req.query;

      const forecastMonths = parseInt(months);
      const forecastMethod = method;

      const historicalResult = await financialForecastingRepository.getExpenseHistoricalData(category_id);
      const forecast = FinancialForecastingService.generateForecast(historicalResult, forecastMethod, forecastMonths);

      this.success(res, {
        data: {
          method: forecastMethod,
          forecast_months: forecastMonths,
          historical_data: historicalResult,
          forecast: forecast
        }
      });
    } catch (error) {
      this.logger.error('getExpenseForecast', error);
      this.error(res, 'Failed to generate expense forecast');
    }
  }

  async getBudgetForecast(req, res) {
    try {
      const { budget_id } = req.params;
      const { method = 'trend' } = req.query;

      const budget = await financialForecastingRepository.getBudgetById(budget_id);

      if (!budget) {
        return this.notFound(res, 'Budget not found');
      }

      const historicalResult = await financialForecastingRepository.getBudgetHistoricalActuals(budget.account_id);
      const forecast = FinancialForecastingService.generateForecast(historicalResult, method, 12);

      const totalForecast = forecast.reduce((sum, f) => sum + parseFloat(f.forecast_amount), 0);
      const varianceData = FinancialForecastingService.calculateVariance(budget.budgeted_amount, totalForecast);

      this.success(res, {
        data: {
          budget: budget,
          method: method,
          historical_data: historicalResult,
          forecast: forecast,
          total_forecast: totalForecast,
          variance: varianceData.variance,
          variance_percentage: varianceData.variance_percentage
        }
      });
    } catch (error) {
      this.logger.error('getBudgetForecast', error);
      this.error(res, 'Failed to generate budget forecast');
    }
  }

  async getCashFlowForecast(req, res) {
    try {
      const { months = 6 } = req.query;

      const forecastMonths = parseInt(months);
      const historicalResult = await financialForecastingRepository.getCashFlowHistoricalData();
      const forecast = FinancialForecastingService.generateCashFlowForecast(historicalResult, forecastMonths);

      this.success(res, {
        data: {
          forecast_months: forecastMonths,
          historical_data: historicalResult,
          forecast: forecast
        }
      });
    } catch (error) {
      this.logger.error('getCashFlowForecast', error);
      this.error(res, 'Failed to generate cash flow forecast');
    }
  }
}

module.exports = new FinancialForecastingController();
