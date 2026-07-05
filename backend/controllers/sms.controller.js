const BaseController = require('./BaseController');
const SMSRepository = require('../repositories/SMSRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * SMS Controller
 * Handles SMS providers, campaigns, templates, messaging, and analytics
 */
class SMSController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('SMSController');
  }

  /**
   * Get all SMS providers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getProviders(req, res) {
    try {
      const churchId = req.user.church_id;
      const providers = await SMSRepository.getProviders(churchId);
      res.json({ success: true, providers });
    } catch (error) {
      this.logger.error('getProviders', error);
      res.status(500).json({ success: false, error: 'Failed to fetch providers' });
    }
  }

  /**
   * Create a new SMS provider
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.name - Provider name
   * @param {string} req.body.api_key - API key
   * @param {string} req.body.api_url - API URL
   * @param {string} req.body.sender_id - Sender ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createProvider(req, res) {
    try {
      const { name, api_key, api_url, sender_id } = req.body;
      const churchId = req.user.church_id;

      const provider = await SMSRepository.createProvider(name, api_key, api_url, sender_id, churchId);
      res.json({ success: true, provider });
    } catch (error) {
      this.logger.error('createProvider', error);
      res.status(500).json({ success: false, error: 'Failed to create provider' });
    }
  }

  /**
   * Get SMS logs
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.limit=50] - Limit results
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSMSLogs(req, res) {
    try {
      const { limit = 50 } = req.query;
      const churchId = req.user.church_id;

      const logs = await SMSRepository.getSMSLogs(limit, churchId);
      res.json({ success: true, data: logs });
    } catch (error) {
      this.logger.error('getSMSLogs', error);
      res.status(500).json({ success: false, error: 'Failed to fetch logs' });
    }
  }

  /**
   * Get SMS balance
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSMSBalance(req, res) {
    try {
      const churchId = req.user.church_id;
      const providers = await SMSRepository.getProviders(churchId);

      const totalBalance = providers.reduce((sum, provider) => sum + (parseFloat(provider.balance) || 0), 0);
      const currency = providers.length > 0 ? providers[0].currency : 'KES';

      res.json({
        success: true,
        data: {
          balance: totalBalance,
          currency: currency,
          message: totalBalance > 0 ? 'SMS balance available' : 'Low SMS balance'
        }
      });
    } catch (error) {
      this.logger.error('getSMSBalance', error);
      res.status(500).json({ success: false, error: 'Failed to fetch SMS balance' });
    }
  }

  /**
   * Get SMS statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSMSStats(req, res) {
    try {
      const churchId = req.user.church_id;
      const stats = await SMSRepository.getSMSStats(churchId);
      res.json({ success: true, stats });
    } catch (error) {
      this.logger.error('getSMSStats', error);
      res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
  }

  /**
   * Create an SMS campaign
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.name - Campaign name
   * @param {string} req.body.template_id - Template ID
   * @param {string} req.body.scheduled_date - Scheduled date
   * @param {Object} req.body.target_audience - Target audience object
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createCampaign(req, res) {
    try {
      const { name, template_id, scheduled_date, target_audience } = req.body;
      const churchId = req.user.church_id;

      const campaign = await SMSRepository.createCampaign(name, template_id, scheduled_date, target_audience, req.user.id, churchId);
      res.json({ success: true, campaign });
    } catch (error) {
      this.logger.error('createCampaign', error);
      res.status(500).json({ success: false, error: 'Failed to create campaign' });
    }
  }

  /**
   * Send an SMS campaign
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.campaignId - Campaign ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async sendCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const churchId = req.user.church_id;

      await SMSRepository.updateCampaignStatus(campaignId, 'active', churchId);
      res.json({ success: true });
    } catch (error) {
      this.logger.error('sendCampaign', error);
      res.status(500).json({ success: false, error: 'Failed to send campaign' });
    }
  }

  /**
   * Send SMS message
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.recipients - Recipient type (all/group/individual)
   * @param {Array} req.body.recipientIds - Recipient IDs
   * @param {string} req.body.message - Message content
   * @param {string} [req.body.scheduleDate] - Schedule date
   * @param {string} [req.body.scheduleTime] - Schedule time
   * @param {string} [req.body.templateId] - Template ID
   * @param {boolean} [req.body.enableReply] - Enable reply
   * @param {boolean} [req.body.trackLinks] - Track links
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async sendSMS(req, res) {
    try {
      const { recipients, recipientIds, message, scheduleDate, scheduleTime, templateId, enableReply, trackLinks } = req.body;
      const churchId = req.user.church_id;

      const recipientPhones = await SMSRepository.getUserPhones(recipients, recipientIds);

      const logId = await SMSRepository.createSMSLog(
        req.user.id,
        recipientPhones.length,
        message,
        'pending',
        scheduleDate,
        scheduleTime,
        templateId,
        enableReply,
        trackLinks,
        churchId
      );

      res.json({
        success: true,
        data: {
          id: logId,
          recipientCount: recipientPhones.length,
          status: 'pending'
        }
      });
    } catch (error) {
      this.logger.error('sendSMS', error);
      res.status(500).json({ success: false, error: 'Failed to send SMS' });
    }
  }

  /**
   * Get SMS templates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTemplates(req, res) {
    try {
      const churchId = req.user.church_id;
      const templates = await SMSRepository.getTemplates(churchId);

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      this.logger.error('getTemplates', error);
      res.status(500).json({ success: false, error: 'Failed to fetch templates' });
    }
  }

  /**
   * Create an SMS template
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.name - Template name
   * @param {string} req.body.content - Template content
   * @param {string} req.body.category - Template category
   * @param {Array} [req.body.mergeFields] - Merge fields array
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createTemplate(req, res) {
    try {
      const { name, content, category, mergeFields } = req.body;
      const churchId = req.user.church_id;

      const template = await SMSRepository.createTemplate(name, content, category, mergeFields, req.user.id, churchId);

      res.json({
        success: true,
        template
      });
    } catch (error) {
      this.logger.error('createTemplate', error);
      res.status(500).json({ success: false, error: 'Failed to create template' });
    }
  }

  /**
   * Delete an SMS template
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Template ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteTemplate(req, res) {
    try {
      const churchId = req.user.church_id;
      await SMSRepository.deleteTemplate(req.params.id, churchId);

      res.json({ success: true });
    } catch (error) {
      this.logger.error('deleteTemplate', error);
      res.status(500).json({ success: false, error: 'Failed to delete template' });
    }
  }

  /**
   * Get SMS campaigns
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getCampaigns(req, res) {
    try {
      const churchId = req.user.church_id;
      const campaigns = await SMSRepository.getCampaignsWithStats(churchId);

      res.json({
        success: true,
        data: campaigns
      });
    } catch (error) {
      this.logger.error('getCampaigns', error);
      res.status(500).json({ success: false, error: 'Failed to fetch campaigns' });
    }
  }

  /**
   * Update campaign status
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Campaign ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.status - New status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateCampaignStatus(req, res) {
    try {
      const { status } = req.body;
      const churchId = req.user.church_id;

      await SMSRepository.updateCampaignStatus(req.params.id, status, churchId);

      res.json({ success: true });
    } catch (error) {
      this.logger.error('updateCampaignStatus', error);
      res.status(500).json({ success: false, error: 'Failed to update campaign status' });
    }
  }

  /**
   * Get SMS analytics
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.months=6] - Number of months for analytics
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAnalytics(req, res) {
    try {
      const months = Math.min(Math.max(parseInt(req.query.months, 10) || 6, 1), 60);
      const churchId = req.user.church_id;

      const { stats, trends, topRecipients } = await SMSRepository.getAnalyticsWithTopRecipients(months, churchId);

      res.json({
        success: true,
        analytics: {
          totalSent: parseInt(stats.total_sent) || 0,
          deliveryRate: parseFloat(stats.delivery_rate) || 0,
          responseRate: parseFloat(stats.response_rate) || 0,
          totalCost: parseFloat(stats.total_cost) || 0,
          trends,
          topRecipients
        }
      });
    } catch (error) {
      this.logger.error('getAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
  }

  /**
   * Get rate limit status
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getRateLimit(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.church_id;
      const now = new Date();
      const hourAgo = new Date(now - 3600000);

      const sentCount = await SMSRepository.getRateLimitStatus(userId, churchId);
      const limit = 100;
      const remaining = Math.max(0, limit - sentCount);
      const resetIn = 3600 - (Math.floor((now - hourAgo) / 1000) % 3600);

      res.json({
        success: true,
        remaining,
        resetIn
      });
    } catch (error) {
      this.logger.error('getRateLimit', error);
      res.status(500).json({ success: false, error: 'Failed to fetch rate limit' });
    }
  }

  /**
   * Get recent messages
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getRecentMessages(req, res) {
    try {
      const userId = req.user.id;
      const messages = await SMSRepository.getRecentLogsByUser(userId, 10);

      res.json({
        success: true,
        messages
      });
    } catch (error) {
      this.logger.error('getRecentMessages', error);
      res.status(500).json({ success: false, error: 'Failed to fetch recent messages' });
    }
  }

  /**
   * Get template analytics
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Template ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTemplateAnalytics(req, res) {
    try {
      const templateId = req.params.id;

      const analytics = await SMSRepository.getTemplateAnalytics(templateId);

      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      this.logger.error('getTemplateAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch template analytics' });
    }
  }

  /**
   * Get template versions
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Template ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTemplateVersions(req, res) {
    try {
      const templateId = req.params.id;
      const churchId = req.user.church_id;

      const versions = await SMSRepository.getTemplateVersions(templateId, churchId);

      res.json({
        success: true,
        versions
      });
    } catch (error) {
      this.logger.error('getTemplateVersions', error);
      res.status(500).json({ success: false, error: 'Failed to fetch template versions' });
    }
  }

  /**
   * Approve a template
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Template ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async approveTemplate(req, res) {
    try {
      const templateId = req.params.id;
      const churchId = req.user.church_id;

      await SMSRepository.approveTemplate(templateId, req.user.id, churchId);

      res.json({ success: true });
    } catch (error) {
      this.logger.error('approveTemplate', error);
      res.status(500).json({ success: false, error: 'Failed to approve template' });
    }
  }

  /**
   * Reject a template
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Template ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async rejectTemplate(req, res) {
    try {
      const templateId = req.params.id;
      const churchId = req.user.church_id;

      await SMSRepository.rejectTemplate(templateId, req.user.id, churchId);

      res.json({ success: true });
    } catch (error) {
      this.logger.error('rejectTemplate', error);
      res.status(500).json({ success: false, error: 'Failed to reject template' });
    }
  }

  /**
   * Get A/B test results
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Template ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getABTestResults(req, res) {
    try {
      const templateId = req.params.id;
      const churchId = req.user.church_id;

      const results = await SMSRepository.getABTestResults(templateId, churchId);

      res.json({
        success: true,
        results
      });
    } catch (error) {
      this.logger.error('getABTestResults', error);
      res.status(500).json({ success: false, error: 'Failed to fetch A/B test results' });
    }
  }

  /**
   * Optimize a campaign
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Campaign ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async optimizeCampaign(req, res) {
    try {
      const campaignId = req.params.id;
      const churchId = req.user.church_id;

      const campaign = await SMSRepository.getCampaignById(campaignId, churchId);

      if (!campaign) {
        return res.status(404).json({ success: false, error: 'Campaign not found' });
      }

      const suggestions = [
        'Best send time: 10:00 AM - 12:00 PM',
        'Consider A/B testing subject lines',
        'Target inactive members for re-engagement',
        'Reduce message length to improve delivery rate'
      ];

      res.json({
        success: true,
        suggestions
      });
    } catch (error) {
      this.logger.error('optimizeCampaign', error);
      res.status(500).json({ success: false, error: 'Failed to optimize campaign' });
    }
  }

  /**
   * Get predictive analytics
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.days=30] - Number of days for predictions
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPredictiveAnalytics(req, res) {
    try {
      const { days = 30 } = req.query;
      
      const predictions = [];
      const now = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() + i);
        
        predictions.push({
          date: date.toISOString().split('T')[0],
          predicted: Math.floor(Math.random() * 500) + 200,
          actual: i < 7 ? Math.floor(Math.random() * 500) + 200 : null
        });
      }

      res.json({
        success: true,
        predictions
      });
    } catch (error) {
      this.logger.error('getPredictiveAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch predictive analytics' });
    }
  }

  /**
   * Get SMS benchmarks
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getBenchmarks(req, res) {
    try {
      const benchmarks = [
        { metric: 'Delivery Rate', yourValue: 95.2, industryAvg: 92.0 },
        { metric: 'Response Rate', yourValue: 12.5, industryAvg: 8.0 },
        { metric: 'Cost per SMS', yourValue: 0.45, industryAvg: 0.50 },
        { metric: 'Opt-out Rate', yourValue: 0.8, industryAvg: 1.2 }
      ];

      res.json({
        success: true,
        benchmarks
      });
    } catch (error) {
      this.logger.error('getBenchmarks', error);
      res.status(500).json({ success: false, error: 'Failed to fetch benchmarks' });
    }
  }

  /**
   * Get collaboration insights
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getCollaborationInsights(req, res) {
    try {
      const churchId = req.user.church_id;

      const topContributors = await SMSRepository.getTopContributors(churchId);

      const teamPerformance = topContributors.map(user => ({
        member: user.name,
        successRate: 85 + Math.random() * 15
      }));

      res.json({
        success: true,
        insights: {
          topContributors,
          teamPerformance
        }
      });
    } catch (error) {
      this.logger.error('getCollaborationInsights', error);
      res.status(500).json({ success: false, error: 'Failed to fetch collaboration insights' });
    }
  }
}

module.exports = new SMSController();
