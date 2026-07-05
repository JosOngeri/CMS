const fieldPermissionService = require('../helpers/fieldPermissionService');
const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Field Permissions Controller
 * Handles field-level permissions for roles and modules
 */
class FieldPermissionsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('FieldPermissionsController');
  }

  /**
   * Get field permissions for a role and module
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.role - Role name
   * @param {string} req.query.module - Module name
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getFieldPermissions(req, res) {
    try {
      const { role, module } = req.query;
      
      if (!role || !module) {
        return res.status(400).json({ success: false, error: 'Role and module are required' });
      }
      
      const permissions = await fieldPermissionService.getFieldPermissions(role, module);
      
      res.json({ success: true, permissions });
    } catch (error) {
      this.logger.error('getFieldPermissions', error);
      res.status(500).json({ success: false, error: 'Failed to fetch field permissions' });
    }
  }

  /**
   * Set field permissions for a role and module
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.role - Role name
   * @param {string} req.body.module - Module name
   * @param {Object} req.body.fieldPermissions - Field permissions object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async setFieldPermissions(req, res) {
    try {
      const { role, module, fieldPermissions } = req.body;
      
      if (!role || !module || !fieldPermissions) {
        return res.status(400).json({ success: false, error: 'Role, module, and fieldPermissions are required' });
      }
      
      const result = await fieldPermissionService.setFieldPermissions(role, module, fieldPermissions);
      
      res.json(result);
    } catch (error) {
      this.logger.error('setFieldPermissions', error);
      res.status(500).json({ success: false, error: 'Failed to set field permissions' });
    }
  }

  /**
   * Get module permissions for the current user
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.module - Module name
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getModulePermissions(req, res) {
    try {
      const { module } = req.params;
      
      const permissions = await fieldPermissionService.getModulePermissions(req.user.id, module);
      
      res.json({ success: true, permissions });
    } catch (error) {
      this.logger.error('getModulePermissions', error);
      res.status(500).json({ success: false, error: 'Failed to fetch module permissions' });
    }
  }

  /**
   * Check if user has permission for a specific field action
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.module - Module name
   * @param {string} req.query.field - Field name
   * @param {string} req.query.action - Action (read/write)
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async checkFieldPermission(req, res) {
    try {
      const { module, field, action } = req.query;
      
      if (!module || !field || !action) {
        return res.status(400).json({ success: false, error: 'Module, field, and action are required' });
      }
      
      const hasPermission = await fieldPermissionService.checkFieldPermission(
        req.user.id,
        module,
        field,
        action
      );
      
      res.json({ success: true, hasPermission });
    } catch (error) {
      this.logger.error('checkFieldPermission', error);
      res.status(500).json({ success: false, error: 'Failed to check field permission' });
    }
  }
}

module.exports = new FieldPermissionsController();
