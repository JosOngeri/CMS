const BaseController = require('./BaseController');
const SEORepository = require('../repositories/SEORepository');
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
      res.json({ success: true, seoData });
    } catch (error) {
      this.logger.error('getSettings', error);
      res.status(500).json({ success: false, error: 'Failed to fetch settings' });
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
      res.json({ success: true });
    } catch (error) {
      this.logger.error('updateSettings', error);
      res.status(500).json({ success: false, error: 'Failed to update settings' });
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
      const issues = [];

      if (!metaTitle || metaTitle.length < 30) {
        issues.push({
          severity: 'warning',
          title: 'Meta Title Too Short',
          description: 'Meta title should be at least 30 characters for better SEO'
        });
      }
      if (metaTitle && metaTitle.length > 60) {
        issues.push({
          severity: 'warning',
          title: 'Meta Title Too Long',
          description: 'Meta title should be under 60 characters to avoid truncation in search results'
        });
      }
      if (!metaDescription || metaDescription.length < 120) {
        issues.push({
          severity: 'warning',
          title: 'Meta Description Too Short',
          description: 'Meta description should be at least 120 characters for better SEO'
        });
      }
      if (metaDescription && metaDescription.length > 160) {
        issues.push({
          severity: 'warning',
          title: 'Meta Description Too Long',
          description: 'Meta description should be under 160 characters to avoid truncation'
        });
      }
      if (!keywords || keywords.length === 0) {
        issues.push({
          severity: 'error',
          title: 'No Keywords Defined',
          description: 'Add relevant keywords to improve search engine visibility'
        });
      } else {
        issues.push({
          severity: 'success',
          title: 'Keywords Defined',
          description: `${keywords.length} keywords defined for SEO optimization`
        });
      }

      res.json({ success: true, analysis: { issues } });
    } catch (error) {
      this.logger.error('analyzeSEO', error);
      res.status(500).json({ success: false, error: 'Failed to analyze SEO' });
    }
  }
}

module.exports = new SEOController();
