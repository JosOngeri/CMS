const BaseController = require('./BaseController');
const ResponseHandler = require('../utils/ResponseHandler');
const FixedAssetService = require('../services/FixedAssetService');
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

      return ResponseHandler.success(res, { assets: result });
    } catch (error) {
      this.logger.error('getAllFixedAssets', error);
      return ResponseHandler.error(res, 'Failed to fetch fixed assets');
    }
  }

  async getFixedAssetById(req, res) {
    try {
      const { id } = req.params;

      const asset = await fixedAssetsRepository.getFixedAssetById(id);

      if (!asset) {
        return ResponseHandler.notFound(res, 'Fixed asset not found');
      }

      // Use FixedAssetService for calculations
      const assetSummary = FixedAssetService.getAssetSummary(asset);

      return ResponseHandler.success(res, { asset: assetSummary });
    } catch (error) {
      this.logger.error('getFixedAssetById', error);
      return ResponseHandler.error(res, 'Failed to fetch fixed asset');
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

      // Validate depreciation method
      if (depreciation_method && !FixedAssetService.isValidDepreciationMethod(depreciation_method)) {
        return ResponseHandler.validationError(res, [{
          field: 'depreciation_method',
          message: 'Invalid depreciation method. Must be straight_line or declining_balance'
        }]);
      }

      const result = await fixedAssetsRepository.createFixedAsset({
        asset_code, asset_name, description, asset_type, 
        purchase_date, purchase_price, current_value, 
        depreciation_method, useful_life, location, 
        fund_id, account_id, vendor_id, created_by: req.user.id
      });

      return ResponseHandler.success(res, { asset: result }, 'Fixed asset created successfully', 201);
    } catch (error) {
      this.logger.error('createFixedAsset', error);
      return ResponseHandler.error(res, 'Failed to create fixed asset');
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

      // Validate depreciation method if provided
      if (depreciation_method && !FixedAssetService.isValidDepreciationMethod(depreciation_method)) {
        return ResponseHandler.validationError(res, [{
          field: 'depreciation_method',
          message: 'Invalid depreciation method. Must be straight_line or declining_balance'
        }]);
      }

      const result = await fixedAssetsRepository.updateFixedAsset(id, {
        asset_name, description, asset_type, purchase_date, 
        purchase_price, current_value, depreciation_method, 
        useful_life, location, status, fund_id, account_id, vendor_id 
      });

      if (!result) {
        return ResponseHandler.notFound(res, 'Fixed asset not found');
      }

      return ResponseHandler.success(res, { asset: result }, 'Fixed asset updated successfully');
    } catch (error) {
      this.logger.error('updateFixedAsset', error);
      return ResponseHandler.error(res, 'Failed to update fixed asset');
    }
  }

  async deleteFixedAsset(req, res) {
    try {
      const { id } = req.params;

      const result = await fixedAssetsRepository.deleteFixedAsset(id);

      if (!result) {
        return ResponseHandler.notFound(res, 'Fixed asset not found');
      }

      return ResponseHandler.success(res, null, 'Fixed asset deleted successfully');
    } catch (error) {
      this.logger.error('deleteFixedAsset', error);
      return ResponseHandler.error(res, 'Failed to delete fixed asset');
    }
  }

  async recordDepreciation(req, res) {
    try {
      const { id } = req.params;
      const { year } = req.body;

      // Get asset
      const asset = await fixedAssetsRepository.getAssetById(id);
      if (!asset) {
        return ResponseHandler.notFound(res, 'Fixed asset not found');
      }

      // Use FixedAssetService for calculations
      const annualDepreciation = FixedAssetService.calculateDepreciation(asset);
      const newAccumulatedDepreciation = parseFloat(asset.accumulated_depreciation) + annualDepreciation;
      const newCurrentValue = FixedAssetService.calculateCurrentValue(asset);

      // Update asset
      const result = await fixedAssetsRepository.updateDepreciation(id, newAccumulatedDepreciation, newCurrentValue);

      return ResponseHandler.success(res, { 
        asset: {
          ...result,
          depreciation_recorded: annualDepreciation,
          year: year || new Date().getFullYear()
        }
      }, 'Depreciation recorded successfully');
    } catch (error) {
      this.logger.error('recordDepreciation', error);
      return ResponseHandler.error(res, 'Failed to record depreciation');
    }
  }

  async disposeAsset(req, res) {
    try {
      const { id } = req.params;
      const { disposal_amount, disposal_date, disposal_reason } = req.body;

      // Get asset
      const asset = await fixedAssetsRepository.getAssetById(id);
      if (!asset) {
        return ResponseHandler.notFound(res, 'Fixed asset not found');
      }

      // Use FixedAssetService for calculations
      const currentValue = FixedAssetService.calculateCurrentValue(asset);
      const gainLoss = FixedAssetService.calculateGainLoss(asset, disposal_amount);

      // Update asset
      const result = await fixedAssetsRepository.updateAssetDisposal(
        id, 
        disposal_amount, 
        disposal_date || new Date(), 
        currentValue
      );

      return ResponseHandler.success(res, { 
        asset: {
          ...result,
          gain_loss: gainLoss,
          disposal_reason
        }
      }, 'Asset disposed successfully');
    } catch (error) {
      this.logger.error('disposeAsset', error);
      return ResponseHandler.error(res, 'Failed to dispose asset');
    }
  }

  async getDepreciationSchedule(req, res) {
    try {
      const { id } = req.params;

      const asset = await fixedAssetsRepository.getAssetById(id);
      if (!asset) {
        return ResponseHandler.notFound(res, 'Fixed asset not found');
      }

      // Use FixedAssetService for schedule generation
      const schedule = FixedAssetService.generateDepreciationSchedule(asset);

      return ResponseHandler.success(res, { 
        asset,
        schedule
      });
    } catch (error) {
      this.logger.error('getDepreciationSchedule', error);
      return ResponseHandler.error(res, 'Failed to get depreciation schedule');
    }
  }
}

module.exports = new FixedAssetsController();
