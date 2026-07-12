const BaseController = require('./BaseController');
const AccessibilityRepository = require('../repositories/AccessibilityRepository');
const AccessibilityService = require('../services/AccessibilityService');
const ResponseHandler = require('../utils/ResponseHandler');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Accessibility Controller
 * Handles accessibility settings and audits
 */
class AccessibilityController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('AccessibilityController');
  }

  /**
   * Get accessibility settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSettings(req, res) {
    try {
      const settings = await AccessibilityRepository.getSettings();
      return ResponseHandler.success(res, { settings });
    } catch (error) {
      this.logger.error('getSettings', error);
      return ResponseHandler.error(res, 'Failed to fetch settings');
    }
  }

  /**
   * Update accessibility settings
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {boolean} [req.body.highContrast] - High contrast mode
   * @param {boolean} [req.body.reducedMotion] - Reduced motion preference
   * @param {string} [req.body.textSize] - Text size preference
   * @param {boolean} [req.body.screenReader] - Screen reader optimization
   * @param {boolean} [req.body.keyboardNavigation] - Keyboard navigation preference
   * @param {boolean} [req.body.focusIndicators] - Focus indicators preference
   * @param {boolean} [req.body.skipLinks] - Skip links preference
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateSettings(req, res) {
    try {
      const { highContrast, reducedMotion, textSize, screenReader, keyboardNavigation, focusIndicators, skipLinks } = req.body;
      await AccessibilityRepository.updateSettings({
        highContrast, reducedMotion, textSize, screenReader, keyboardNavigation, focusIndicators, skipLinks
      });
      return ResponseHandler.success(res, null, 'Settings updated successfully');
    } catch (error) {
      this.logger.error('updateSettings', error);
      return ResponseHandler.error(res, 'Failed to update settings');
    }
  }

  /**
   * Run accessibility audit
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} [req.body.url] - URL to audit
   * @param {string} [req.body.html] - HTML content to audit
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async audit(req, res) {
    try {
      // Check RBAC - only admins can run accessibility audits
      if (!AccessibilityService.canRunAudit(req.user)) {
        return ResponseHandler.forbidden(res, 'Admin access required to run accessibility audits');
      }

      const { url, html } = req.body;
      
      // Perform actual accessibility audit using service
      const results = await AccessibilityService.performAudit(url, html);

      return ResponseHandler.success(res, { results }, 'Accessibility audit completed');
    } catch (error) {
      this.logger.error('audit', error);
      return ResponseHandler.error(res, 'Failed to run accessibility audit');
    }
  }
}

module.exports = new AccessibilityController();
