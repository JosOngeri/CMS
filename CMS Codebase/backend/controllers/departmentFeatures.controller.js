const BaseController = require('./BaseController');
const DepartmentFeaturesRepository = require('../repositories/DepartmentFeaturesRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Department Features Controller (Phase 8)
 * Manages dynamic department feature allocation and configuration
 */
class DepartmentFeaturesController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('DepartmentFeaturesController');
  }

  /**
   * Get all available features
   */
  async getAllFeatures(req, res) {
    try {
      const churchId = req.church_id || req.user?.church_id;
      const features = await DepartmentFeaturesRepository.getAllFeatures(churchId);

      this.success(res, features);
    } catch (error) {
      this.logger.error('getAllFeatures', error);
      this.error(res, 'Failed to fetch features');
    }
  }

  /**
   * Get features by category
   */
  async getFeaturesByCategory(req, res) {
    const { category } = req.params;

    try {
      const churchId = req.church_id || req.user?.church_id;
      const features = await DepartmentFeaturesRepository.getFeaturesByCategory(category, churchId);

      this.success(res, features);
    } catch (error) {
      this.logger.error('getFeaturesByCategory', error);
      this.error(res, 'Failed to fetch features by category');
    }
  }

  /**
   * Get features allocated to a specific department
   */
  async getDepartmentFeatures(req, res) {
    const { departmentId } = req.params;

    try {
      const features = await DepartmentFeaturesRepository.getDepartmentFeatures(departmentId);

      this.success(res, features);
    } catch (error) {
      this.logger.error('getDepartmentFeatures', error);
      this.error(res, 'Failed to fetch department features');
    }
  }

  /**
   * Allocate a feature to a department
   */
  async allocateFeature(req, res) {
    const { departmentId } = req.params;
    const { featureSlug, config = {} } = req.body;

    try {
      const churchId = req.church_id || req.user?.church_id;

      const feature = await DepartmentFeaturesRepository.getFeatureBySlug(featureSlug, churchId);
      if (!feature) {
        return this.notFound(res, 'Feature not found');
      }

      const allocation = await DepartmentFeaturesRepository.allocateFeatureToDepartment(
        departmentId,
        feature.id,
        config,
        churchId
      );

      this.logger.info(`Feature ${featureSlug} allocated to department ${departmentId}`);
      this.created(res, allocation);
    } catch (error) {
      this.logger.error('allocateFeature', error);
      this.error(res, 'Failed to allocate feature');
    }
  }

  /**
   * Remove a feature from a department
   */
  async removeFeature(req, res) {
    const { departmentId, featureSlug } = req.params;

    try {
      const feature = await DepartmentFeaturesRepository.getFeatureBySlug(featureSlug);
      if (!feature) {
        return this.notFound(res, 'Feature not found');
      }

      const result = await DepartmentFeaturesRepository.removeFeatureFromDepartment(departmentId, feature.id);

      this.logger.info(`Feature ${featureSlug} removed from department ${departmentId}`);
      this.success(res, { message: 'Feature removed successfully' });
    } catch (error) {
      this.logger.error('removeFeature', error);
      this.error(res, 'Failed to remove feature');
    }
  }

  /**
   * Update feature configuration for a department
   */
  async updateFeatureConfig(req, res) {
    const { departmentId, featureSlug } = req.params;
    const { config } = req.body;

    try {
      const feature = await DepartmentFeaturesRepository.getFeatureBySlug(featureSlug);
      if (!feature) {
        return this.notFound(res, 'Feature not found');
      }

      const result = await DepartmentFeaturesRepository.updateFeatureConfig(departmentId, feature.id, config);

      this.logger.info(`Feature ${featureSlug} config updated for department ${departmentId}`);
      this.success(res, { message: 'Feature configuration updated successfully' });
    } catch (error) {
      this.logger.error('updateFeatureConfig', error);
      this.error(res, 'Failed to update feature configuration');
    }
  }

  /**
   * Get feature categories
   */
  async getFeatureCategories(req, res) {
    try {
      const churchId = req.church_id || req.user?.church_id;
      const features = await DepartmentFeaturesRepository.getAllFeatures(churchId);

      const categories = [...new Set(features.map(f => f.category))].map(category => ({
        name: category,
        count: features.filter(f => f.category === category).length
      }));

      this.success(res, categories);
    } catch (error) {
      this.logger.error('getFeatureCategories', error);
      this.error(res, 'Failed to fetch feature categories');
    }
  }
}

module.exports = new DepartmentFeaturesController();
