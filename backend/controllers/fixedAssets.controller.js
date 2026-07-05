const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const fixedAssetsRepository = require('../repositories/FixedAssetsRepository');

/**
 * Fixed Assets Controller
 * Handles fixed asset tracking and depreciation
 */
class FixedAssetsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('FixedAssetsController');
  }

  async getAllFixedAssets(req, res) {
    try {
      const { status, category, fund_id } = req.query;
      
      const result = await fixedAssetsRepository.getAllFixedAssets({ status, category, fund_id });

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('getAllFixedAssets', error);
      res.status(500).json({ success: false, error: 'Failed to fetch fixed assets' });
    }
  }

  async getFixedAssetById(req, res) {
    try {
      const { id } = req.params;

      const asset = await fixedAssetsRepository.getFixedAssetById(id);

      if (!asset) {
        return res.status(404).json({ success: false, error: 'Fixed asset not found' });
      }

      // Calculate depreciation
      const depreciation = this.calculateDepreciation(asset);
      const currentValue = this.calculateCurrentValue(asset);
      const remainingLife = this.calculateRemainingLife(asset);

      res.json({ 
        success: true, 
        data: {
          ...asset,
          annual_depreciation: depreciation,
          current_value: currentValue,
          remaining_life_years: remainingLife
        }
      });
    } catch (error) {
      this.logger.error('getFixedAssetById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch fixed asset' });
    }
  }

  async createFixedAsset(req, res) {
    try {
      const { 
        asset_code, asset_name, description, asset_type, 
        purchase_date, purchase_price, current_value, 
        depreciation_method, useful_life, location, 
        fund_id, account_id, vendor_id 
      } = req.body;

      const result = await fixedAssetsRepository.createFixedAsset({
        asset_code, asset_name, description, asset_type, 
        purchase_date, purchase_price, current_value, 
        depreciation_method, useful_life, location, 
        fund_id, account_id, vendor_id, created_by: req.user.id
      });

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('createFixedAsset', error);
      res.status(500).json({ success: false, error: 'Failed to create fixed asset' });
    }
  }

  async updateFixedAsset(req, res) {
    try {
      const { id } = req.params;
      const { 
        asset_name, description, asset_type, purchase_date, 
        purchase_price, current_value, depreciation_method, 
        useful_life, location, status, fund_id, account_id, vendor_id 
      } = req.body;

      const result = await fixedAssetsRepository.updateFixedAsset(id, {
        asset_name, description, asset_type, purchase_date, 
        purchase_price, current_value, depreciation_method, 
        useful_life, location, status, fund_id, account_id, vendor_id 
      });

      if (!result) {
        return res.status(404).json({ success: false, error: 'Fixed asset not found' });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('updateFixedAsset', error);
      res.status(500).json({ success: false, error: 'Failed to update fixed asset' });
    }
  }

  async deleteFixedAsset(req, res) {
    try {
      const { id } = req.params;

      const result = await fixedAssetsRepository.deleteFixedAsset(id);

      if (!result) {
        return res.status(404).json({ success: false, error: 'Fixed asset not found' });
      }

      res.json({ success: true, message: 'Fixed asset deleted successfully' });
    } catch (error) {
      this.logger.error('deleteFixedAsset', error);
      res.status(500).json({ success: false, error: 'Failed to delete fixed asset' });
    }
  }

  async recordDepreciation(req, res) {
    try {
      const { id } = req.params;
      const { year } = req.body;

      // Get asset
      const asset = await fixedAssetsRepository.getAssetById(id);
      if (!asset) {
        return res.status(404).json({ success: false, error: 'Fixed asset not found' });
      }

      // Calculate depreciation
      const annualDepreciation = this.calculateDepreciation(asset);
      const newAccumulatedDepreciation = parseFloat(asset.accumulated_depreciation) + annualDepreciation;
      const newCurrentValue = this.calculateCurrentValue(asset);

      // Update asset
      const result = await fixedAssetsRepository.updateDepreciation(id, newAccumulatedDepreciation, newCurrentValue);

      res.json({ 
        success: true, 
        data: {
          ...result,
          depreciation_recorded: annualDepreciation,
          year: year || new Date().getFullYear()
        }
      });
    } catch (error) {
      this.logger.error('recordDepreciation', error);
      res.status(500).json({ success: false, error: 'Failed to record depreciation' });
    }
  }

  async disposeAsset(req, res) {
    try {
      const { id } = req.params;
      const { disposal_amount, disposal_date, disposal_reason } = req.body;

      // Get asset
      const asset = await fixedAssetsRepository.getAssetById(id);
      if (!asset) {
        return res.status(404).json({ success: false, error: 'Fixed asset not found' });
      }

      const currentValue = this.calculateCurrentValue(asset);
      const gainLoss = disposal_amount - currentValue;

      // Update asset
      const result = await fixedAssetsRepository.updateAssetDisposal(
        id, 
        disposal_amount, 
        disposal_date || new Date(), 
        currentValue
      );

      res.json({ 
        success: true, 
        data: {
          ...result,
          gain_loss: gainLoss,
          disposal_reason
        }
      });
    } catch (error) {
      this.logger.error('disposeAsset', error);
      res.status(500).json({ success: false, error: 'Failed to dispose asset' });
    }
  }

  async getDepreciationSchedule(req, res) {
    try {
      const { id } = req.params;

      const asset = await fixedAssetsRepository.getAssetById(id);
      if (!asset) {
        return res.status(404).json({ success: false, error: 'Fixed asset not found' });
      }

      const schedule = [];

      const purchasePrice = parseFloat(asset.purchase_price);
      const usefulLife = parseInt(asset.useful_life);
      const depreciationMethod = asset.depreciation_method;

      for (let year = 1; year <= usefulLife; year++) {
        let annualDepreciation;
        let accumulatedDepreciation = 0;
        let bookValue = purchasePrice;

        if (year > 1) {
          accumulatedDepreciation = schedule[year - 2].accumulated_depreciation;
          bookValue = schedule[year - 2].book_value;
        }

        if (depreciationMethod === 'straight_line') {
          annualDepreciation = purchasePrice / usefulLife;
        } else if (depreciationMethod === 'declining_balance') {
          const rate = 2 / usefulLife;
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

      res.json({ 
        success: true, 
        data: {
          asset: asset,
          schedule: schedule
        }
      });
    } catch (error) {
      this.logger.error('getDepreciationSchedule', error);
      res.status(500).json({ success: false, error: 'Failed to get depreciation schedule' });
    }
  }

  calculateDepreciation(asset) {
    const purchasePrice = parseFloat(asset.purchase_price);
    const usefulLife = parseInt(asset.useful_life);
    const accumulatedDepreciation = parseFloat(asset.accumulated_depreciation);
    const depreciationMethod = asset.depreciation_method;

    if (depreciationMethod === 'straight_line') {
      return purchasePrice / usefulLife;
    } else if (depreciationMethod === 'declining_balance') {
      const rate = 2 / usefulLife;
      const bookValue = purchasePrice - accumulatedDepreciation;
      return bookValue * rate;
    }

    return 0;
  }

  calculateCurrentValue(asset) {
    const purchasePrice = parseFloat(asset.purchase_price);
    const accumulatedDepreciation = parseFloat(asset.accumulated_depreciation);
    return Math.max(0, purchasePrice - accumulatedDepreciation);
  }

  calculateRemainingLife(asset) {
    if (!asset.purchase_date) return parseInt(asset.useful_life);
    
    const purchase = new Date(asset.purchase_date);
    const now = new Date();
    const yearsElapsed = (now - purchase) / (365.25 * 24 * 60 * 60 * 1000);
    
    return Math.max(0, parseInt(asset.useful_life) - yearsElapsed);
  }
}

module.exports = new FixedAssetsController();
