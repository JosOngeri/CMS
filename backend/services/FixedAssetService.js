const logger = require('../config/logging');

/**
 * Fixed Asset Service
 * Handles depreciation calculations, asset valuation, and financial logic for fixed assets
 * Supports multiple depreciation methods: straight-line and declining balance
 */
class FixedAssetService {
  /**
   * Calculate annual depreciation for an asset
   * @param {Object} asset - Asset object with purchase_price, useful_life, accumulated_depreciation, depreciation_method
   * @returns {number} Annual depreciation amount
   */
  calculateDepreciation(asset) {
    const purchasePrice = parseFloat(asset.purchase_price);
    const usefulLife = parseInt(asset.useful_life);
    const accumulatedDepreciation = parseFloat(asset.accumulated_depreciation || 0);
    const depreciationMethod = asset.depreciation_method || 'straight_line';

    if (depreciationMethod === 'straight_line') {
      return purchasePrice / usefulLife;
    } else if (depreciationMethod === 'declining_balance') {
      const rate = 2 / useful_life;
      const bookValue = purchasePrice - accumulatedDepreciation;
      return bookValue * rate;
    }

    return 0;
  }

  /**
   * Calculate current book value of an asset
   * @param {Object} asset - Asset object with purchase_price, accumulated_depreciation
   * @returns {number} Current book value (never negative)
   */
  calculateCurrentValue(asset) {
    const purchasePrice = parseFloat(asset.purchase_price);
    const accumulatedDepreciation = parseFloat(asset.accumulated_depreciation || 0);
    return Math.max(0, purchasePrice - accumulatedDepreciation);
  }

  /**
   * Calculate remaining useful life in years
   * @param {Object} asset - Asset object with purchase_date, useful_life
   * @returns {number} Remaining life in years (never negative)
   */
  calculateRemainingLife(asset) {
    if (!asset.purchase_date) return parseInt(asset.useful_life);
    
    const purchase = new Date(asset.purchase_date);
    const now = new Date();
    const yearsElapsed = (now - purchase) / (365.25 * 24 * 60 * 60 * 1000);
    
    return Math.max(0, Math.floor(parseInt(asset.useful_life) - yearsElapsed));
  }

  /**
   * Generate complete depreciation schedule for an asset
   * @param {Object} asset - Asset object with purchase_price, useful_life, depreciation_method
   * @returns {Array<Object>} Array of yearly depreciation data
   */
  generateDepreciationSchedule(asset) {
    const schedule = [];
    const purchasePrice = parseFloat(asset.purchase_price);
    const usefulLife = parseInt(asset.useful_life);
    const depreciationMethod = asset.depreciation_method || 'straight_line';

    for (let year = 1; year <= usefulLife; year++) {
      let annualDepreciation;
      let accumulatedDepreciation = 0;
      let bookValue = purchasePrice;

      if (year > 1) {
        accumulatedDepreciation = schedule[year - 2].accumulated_depreciation;
        bookValue = schedule[year - 2].book_value;
      }

      if (depreciationMethod === 'straight_line') {
        annualDepreciation = purchasePrice / useful_life;
      } else if (depreciationMethod === 'declining_balance') {
        const rate = 2 / useful_life;
        annualDepreciation = bookValue * rate;
      }

      accumulatedDepreciation += annualDepreciation;
      bookValue = Math.max(0, bookValue - annualDepreciation);

      schedule.push({
        year,
        annual_depreciation: annualDepreciation,
        accumulated_depreciation: accumulatedDepreciation,
        book_value: bookValue
      });
    }

    return schedule;
  }

  /**
   * Calculate gain/loss on asset disposal
   * @param {Object} asset - Asset object
   * @param {number} disposalAmount - Amount received on disposal
   * @returns {number} Gain (positive) or loss (negative)
   */
  calculateGainLoss(asset, disposalAmount) {
    const currentValue = this.calculateCurrentValue(asset);
    return disposalAmount - currentValue;
  }

  /**
   * Validate depreciation method
   * @param {string} method - Depreciation method to validate
   * @returns {boolean} True if valid
   */
  isValidDepreciationMethod(method) {
    const validMethods = ['straight_line', 'declining_balance'];
    return validMethods.includes(method);
  }

  /**
   * Calculate depreciation for a specific year
   * @param {Object} asset - Asset object
   * @param {number} targetYear - Target year (1-based)
   * @returns {Object} Depreciation data for the target year
   */
  calculateDepreciationForYear(asset, targetYear) {
    const schedule = this.generateDepreciationSchedule(asset);
    return schedule[targetYear - 1] || null;
  }

  /**
   * Check if asset is fully depreciated
   * @param {Object} asset - Asset object
   * @returns {boolean} True if fully depreciated
   */
  isFullyDepreciated(asset) {
    const currentValue = this.calculateCurrentValue(asset);
    return currentValue <= 0.01; // Allow for rounding errors
  }

  /**
   * Get asset summary with calculated values
   * @param {Object} asset - Asset object
   * @returns {Object} Asset with calculated depreciation values
   */
  getAssetSummary(asset) {
    return {
      ...asset,
      annual_depreciation: this.calculateDepreciation(asset),
      current_value: this.calculateCurrentValue(asset),
      remaining_life_years: this.calculateRemainingLife(asset),
      is_fully_depreciated: this.isFullyDepreciated(asset)
    };
  }
}

module.exports = new FixedAssetService();