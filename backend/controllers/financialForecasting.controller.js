const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const financialForecastingRepository = require('../repositories/FinancialForecastingRepository');

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

      // Get historical data for the same period last year
      const historicalResult = await financialForecastingRepository.getRevenueHistoricalData(category_id);

      // Generate forecast based on method
      const forecast = this.generateForecast(historicalResult, forecastMethod, forecastMonths);

      res.json({ 
        success: true, 
        data: {
          method: forecastMethod,
          forecast_months: forecastMonths,
          historical_data: historicalResult,
          forecast: forecast
        }
      });
    } catch (error) {
      this.logger.error('getRevenueForecast', error);
      res.status(500).json({ success: false, error: 'Failed to generate revenue forecast' });
    }
  }

  async getExpenseForecast(req, res) {
    try {
      const { months = 12, method = 'moving_average', category_id } = req.query;
      
      const forecastMonths = parseInt(months);
      const forecastMethod = method;

      // Get historical expense data
      const historicalResult = await financialForecastingRepository.getExpenseHistoricalData(category_id);

      // Generate forecast
      const forecast = this.generateForecast(historicalResult, forecastMethod, forecastMonths);

      res.json({ 
        success: true, 
        data: {
          method: forecastMethod,
          forecast_months: forecastMonths,
          historical_data: historicalResult,
          forecast: forecast
        }
      });
    } catch (error) {
      this.logger.error('getExpenseForecast', error);
      res.status(500).json({ success: false, error: 'Failed to generate expense forecast' });
    }
  }

  async getBudgetForecast(req, res) {
    try {
      const { budget_id } = req.params;
      const { method = 'trend' } = req.query;

      // Get budget details
      const budget = await financialForecastingRepository.getBudgetById(budget_id);

      if (!budget) {
        return res.status(404).json({ success: false, error: 'Budget not found' });
      }

      // Get historical actuals for similar period
      const historicalResult = await financialForecastingRepository.getBudgetHistoricalActuals(budget.account_id);

      // Generate forecast
      const forecast = this.generateForecast(historicalResult, method, 12);

      // Calculate forecast vs budget
      const totalForecast = forecast.reduce((sum, f) => sum + parseFloat(f.forecast_amount), 0);
      const variance = budget.budgeted_amount - totalForecast;
      const variancePercentage = budget.budgeted_amount > 0 ? (variance / budget.budgeted_amount) * 100 : 0;

      res.json({ 
        success: true, 
        data: {
          budget: budget,
          method: method,
          historical_data: historicalResult,
          forecast: forecast,
          total_forecast: totalForecast,
          variance: variance,
          variance_percentage: variancePercentage
        }
      });
    } catch (error) {
      this.logger.error('getBudgetForecast', error);
      res.status(500).json({ success: false, error: 'Failed to generate budget forecast' });
    }
  }

  async getCashFlowForecast(req, res) {
    try {
      const { months = 6 } = req.query;
      
      const forecastMonths = parseInt(months);

      // Get historical cash flow data
      const historicalResult = await financialForecastingRepository.getCashFlowHistoricalData();

      // Generate cash flow forecast
      const forecast = [];
      for (let i = 1; i <= forecastMonths; i++) {
        const targetMonth = ((new Date().getMonth() + i) % 12) + 1;
        const historicalMonth = historicalResult.find(h => parseInt(h.month) === targetMonth);
        
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

      res.json({ 
        success: true, 
        data: {
          forecast_months: forecastMonths,
          historical_data: historicalResult,
          forecast: forecast
        }
      });
    } catch (error) {
      this.logger.error('getCashFlowForecast', error);
      res.status(500).json({ success: false, error: 'Failed to generate cash flow forecast' });
    }
  }

  generateForecast(historicalData, method, months) {
    const forecast = [];

    switch (method) {
      case 'moving_average':
        // Simple moving average
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
        break;

      case 'trend':
        // Linear trend analysis
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
        break;

      default:
        // Default to moving average
        const defaultAvg = historicalData.length > 0 
          ? historicalData.reduce((sum, h) => sum + parseFloat(h.total_amount), 0) / historicalData.length 
          : 0;
        
        for (let i = 1; i <= months; i++) {
          const targetMonth = ((new Date().getMonth() + i) % 12) + 1;
          forecast.push({
            month: targetMonth,
            forecast_amount: defaultAvg
          });
        }
    }

    return forecast;
  }
}

module.exports = new FinancialForecastingController();
