const AIContentService = require('../services/aiContentService');
const AIRepository = require('../repositories/AIRepository');
const ResponseHandler = require('../utils/ResponseHandler');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * AI Assistant Controller (REQ-FR-005)
 * Proxies requests to Google Gemini with church-specific context
 * Includes audit logging and rate limiting (Phase 13/14)
 */
class AIController {
  constructor() {
    this.aiContentService = AIContentService;
    this.logger = createLogger('AIController');
  }

  async condenseAnnouncement(req, res) {
    const { content } = req.body;
    const churchId = req.user?.church_id;
    const userId = req.user?.id;

    try {
      const result = await this.aiContentService.condenseForSMS({
        content,
        maxLength: 500,
        churchId,
        userId
      });

      // Set rate limit headers from service response
      if (result.rateLimit) {
        res.setHeader('X-RateLimit-Remaining', result.rateLimit.remaining);
        res.setHeader('X-RateLimit-Reset', result.rateLimit.reset_at);
      }

      return ResponseHandler.success(res, result.data, 'Content condensed successfully');
    } catch (error) {
      this.logger.error('condenseAnnouncement', error);
      if (error.message.includes('Rate limit') || error.message.includes('exceeded')) {
        return ResponseHandler.error(res, error.message, 429);
      }
      return ResponseHandler.error(res, 'AI processing failed');
    }
  }

  /**
   * Generate announcement content
   */
  async generateAnnouncement(req, res) {
    const { topic, tone, audience, keyPoints } = req.body;
    const churchId = req.user?.church_id;
    const userId = req.user?.id;

    try {
      const result = await this.aiContentService.generateAnnouncement({
        topic,
        tone,
        audience,
        keyPoints,
        churchId,
        userId
      });

      // Set rate limit headers from service response
      if (result.rateLimit) {
        res.setHeader('X-RateLimit-Remaining', result.rateLimit.remaining);
        res.setHeader('X-RateLimit-Reset', result.rateLimit.reset_at);
      }

      return ResponseHandler.success(res, result.data, 'Announcement generated successfully');
    } catch (error) {
      this.logger.error('generateAnnouncement', error);
      if (error.message.includes('Rate limit') || error.message.includes('exceeded')) {
        return ResponseHandler.error(res, error.message, 429);
      }
      return ResponseHandler.error(res, 'Failed to generate announcement');
    }
  }

  /**
   * Generate document content
   */
  async generateDocument(req, res) {
    const { documentType, topic, sections, tone } = req.body;
    const churchId = req.user?.church_id;
    const userId = req.user?.id;

    try {
      const result = await this.aiContentService.generateDocument({
        documentType,
        topic,
        sections,
        tone,
        churchId,
        userId
      });

      // Set rate limit headers from service response
      if (result.rateLimit) {
        res.setHeader('X-RateLimit-Remaining', result.rateLimit.remaining);
        res.setHeader('X-RateLimit-Reset', result.rateLimit.reset_at);
      }

      return ResponseHandler.success(res, result.data, 'Document generated successfully');
    } catch (error) {
      this.logger.error('generateDocument', error);
      if (error.message.includes('Rate limit') || error.message.includes('exceeded')) {
        return ResponseHandler.error(res, error.message, 429);
      }
      return ResponseHandler.error(res, 'Failed to generate document');
    }
  }

  /**
   * Generate member communication
   */
  async generateMemberCommunication(req, res) {
    const { memberName, communicationType, purpose, context } = req.body;
    const churchId = req.user?.church_id;
    const userId = req.user?.id;

    try {
      const result = await this.aiContentService.generateMemberCommunication({
        memberName,
        communicationType,
        purpose,
        context,
        churchId,
        userId
      });

      // Set rate limit headers from service response
      if (result.rateLimit) {
        res.setHeader('X-RateLimit-Remaining', result.rateLimit.remaining);
        res.setHeader('X-RateLimit-Reset', result.rateLimit.reset_at);
      }

      return ResponseHandler.success(res, result.data, 'Communication generated successfully');
    } catch (error) {
      this.logger.error('generateMemberCommunication', error);
      if (error.message.includes('Rate limit') || error.message.includes('exceeded')) {
        return ResponseHandler.error(res, error.message, 429);
      }
      return ResponseHandler.error(res, 'Failed to generate communication');
    }
  }

  /**
   * Generate content suggestions
   */
  async generateSuggestions(req, res) {
    const { contentType, context, existingContent } = req.body;
    const churchId = req.user?.church_id;
    const userId = req.user?.id;

    try {
      const result = await this.aiContentService.generateSuggestions({
        contentType,
        context,
        existingContent,
        churchId,
        userId
      });

      // Set rate limit headers from service response
      if (result.rateLimit) {
        res.setHeader('X-RateLimit-Remaining', result.rateLimit.remaining);
        res.setHeader('X-RateLimit-Reset', result.rateLimit.reset_at);
      }

      return ResponseHandler.success(res, result.data, 'Suggestions generated successfully');
    } catch (error) {
      this.logger.error('generateSuggestions', error);
      if (error.message.includes('Rate limit') || error.message.includes('exceeded')) {
        return ResponseHandler.error(res, error.message, 429);
      }
      return ResponseHandler.error(res, 'Failed to generate suggestions');
    }
  }

  /**
   * Get AI usage statistics for a church
   */
  async getUsageStats(req, res) {
    const churchId = req.user.church_id;
    const { period = '7d' } = req.query;

    try {
      const stats = await AIRepository.getUsageStats(churchId, period);

      const result = stats || {
        total_requests: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_tokens: 0,
        total_cost: 0,
        successful_requests: 0,
        failed_requests: 0
      };

      return ResponseHandler.success(res, result);
    } catch (error) {
      this.logger.error('getUsageStats', error);
      return ResponseHandler.error(res, 'Failed to fetch usage statistics');
    }
  }

  /**
   * Update church AI settings
   */
  async updateAISettings(req, res) {
    const { aiTone, aiEnabled } = req.body;
    const churchId = req.user.church_id;

    try {
      const settings = {};
      if (aiTone) settings.ai_tone = aiTone;
      if (aiEnabled !== undefined) settings.ai_enabled = aiEnabled;

      const result = await AIRepository.updateChurchSettings(churchId, settings);

      return ResponseHandler.success(res, result, 'AI settings updated successfully');
    } catch (error) {
      this.logger.error('updateAISettings', error);
      return ResponseHandler.error(res, 'Failed to update AI settings');
    }
  }
}

module.exports = new AIController();
