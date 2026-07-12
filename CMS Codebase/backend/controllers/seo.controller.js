const BaseController = require('./BaseController');
const SEORepository = require('../repositories/SEORepository');
const SEOService = require('../services/SEOService');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * SEO Controller
 * Handles SEO settings and analysis
 */
class SEOController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('SEOController');
  }

  /**
   * Get SEO settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSettings(req, res) {
    try {
      const seoData = await SEORepository.getSettings();
      this.success(res, { seoData });
    } catch (error) {
      this.logger.error('getSettings', error);
      this.error(res, 'Failed to fetch settings');
    }
  }

  /**
   * Update SEO settings
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} [req.body.metaTitle] - Meta title
   * @param {string} [req.body.metaDescription] - Meta description
   * @param {Array} [req.body.keywords] - SEO keywords
   * @param {string} [req.body.ogImage] - Open Graph image URL
   * @param {string} [req.body.canonicalUrl] - Canonical URL
   * @param {string} [req.body.robots] - Robots.txt content
   * @param {boolean} [req.body.sitemapEnabled] - Sitemap enabled flag
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateSettings(req, res) {
    try {
      const { metaTitle, metaDescription, keywords, ogImage, canonicalUrl, robots, sitemapEnabled } = req.body;
      await SEORepository.updateSettings({
        metaTitle, metaDescription, keywords: JSON.stringify(keywords), ogImage, canonicalUrl, robots, sitemapEnabled
      });
      this.success(res, { message: 'SEO settings updated successfully' });
    } catch (error) {
      this.logger.error('updateSettings', error);
      this.error(res, 'Failed to update settings');
    }
  }

  /**
   * Analyze SEO content
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} [req.body.metaTitle] - Meta title to analyze
   * @param {string} [req.body.metaDescription] - Meta description to analyze
   * @param {Array} [req.body.keywords] - Keywords to analyze
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async analyzeSEO(req, res) {
    try {
      const { metaTitle, metaDescription, keywords } = req.body;
      const analysis = SEOService.analyzeSEO({ metaTitle, metaDescription, keywords });
      const score = SEOService.calculateScore(analysis.issues);
      
      this.success(res, { analysis: { ...analysis, score } });
    } catch (error) {
      this.logger.error('analyzeSEO', error);
      this.error(res, 'Failed to analyze SEO');
    }
  }
}

module.exports = new SEOController();
