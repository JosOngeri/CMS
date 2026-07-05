const { GoogleGenerativeAI } = require("@google/generative-ai");
const AIRepository = require('../repositories/AIRepository');
const AIContentService = require('../services/aiContentService');
const ResponseHandler = require('../utils/ResponseHandler');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * AI Assistant Controller (REQ-FR-005)
 * Proxies requests to Google Gemini with church-specific context
 * Includes audit logging and rate limiting (Phase 13/14)
 */
class AIController {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.aiContentService = AIContentService;
    this.logger = createLogger('AIController');
  }

  async condenseAnnouncement(req, res) {
    const { content, churchId } = req.body;
    const userId = req.user?.id;
    const endpoint = 'condense_announcement';
    const model = 'gemini-pro';

    try {
      const rateLimitResult = await AIRepository.checkAIRateLimit(churchId, endpoint, 100);

      const { allowed, remaining, reset_at } = rateLimitResult;

      if (!allowed) {
        await AIRepository.logAIUsage({
          churchId,
          userId,
          endpoint,
          model,
          inputTokens: 0,
          outputTokens: 0,
          status: 'rate_limited',
          error: 'Rate limit exceeded'
        });

        return ResponseHandler.error(res, 'Rate limit exceeded. Please try again later.', 429);
      }

      const result = await this.aiContentService.condenseForSMS({
        content,
        maxLength: 500,
        churchId,
        userId
      });

      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', reset_at);

      return ResponseHandler.success(res, result, 'Content condensed successfully');
    } catch (error) {
      this.logger.error('condenseAnnouncement', error);
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
    const endpoint = 'generate_announcement';

    try {
      const rateLimitResult = await AIRepository.checkAIRateLimit(churchId, endpoint, 50);

      if (!rateLimitResult.allowed) {
        return ResponseHandler.error(res, 'Rate limit exceeded. Please try again later.', 429);
      }

      const result = await this.aiContentService.generateAnnouncement({
        topic,
        tone,
        audience,
        keyPoints,
        churchId,
        userId
      });

      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimitResult.reset_at);

      return ResponseHandler.success(res, result, 'Announcement generated successfully');
    } catch (error) {
      this.logger.error('generateAnnouncement', error);
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
    const endpoint = 'generate_document';

    try {
      const rateLimitResult = await AIRepository.checkAIRateLimit(churchId, endpoint, 30);

      if (!rateLimitResult.allowed) {
        return ResponseHandler.error(res, 'Rate limit exceeded. Please try again later.', 429);
      }

      const result = await this.aiContentService.generateDocument({
        documentType,
        topic,
        sections,
        tone,
        churchId,
        userId
      });

      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimitResult.reset_at);

      return ResponseHandler.success(res, result, 'Document generated successfully');
    } catch (error) {
      this.logger.error('generateDocument', error);
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
    const endpoint = 'generate_member_communication';

    try {
      const rateLimitResult = await AIRepository.checkAIRateLimit(churchId, endpoint, 100);

      if (!rateLimitResult.allowed) {
        return ResponseHandler.error(res, 'Rate limit exceeded. Please try again later.', 429);
      }

      const result = await this.aiContentService.generateMemberCommunication({
        memberName,
        communicationType,
        purpose,
        context,
        churchId,
        userId
      });

      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimitResult.reset_at);

      return ResponseHandler.success(res, result, 'Communication generated successfully');
    } catch (error) {
      this.logger.error('generateMemberCommunication', error);
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
    const endpoint = 'generate_suggestions';

    try {
      const rateLimitResult = await AIRepository.checkAIRateLimit(churchId, endpoint, 50);

      if (!rateLimitResult.allowed) {
        return ResponseHandler.error(res, 'Rate limit exceeded. Please try again later.', 429);
      }

      const result = await this.aiContentService.generateSuggestions({
        contentType,
        context,
        existingContent,
        churchId,
        userId
      });

      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimitResult.reset_at);

      return ResponseHandler.success(res, result, 'Suggestions generated successfully');
    } catch (error) {
      this.logger.error('generateSuggestions', error);
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
      let dateFilter = '';
      if (period === '24h') {
        dateFilter = "AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'";
      } else if (period === '7d') {
        dateFilter = "AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'";
      } else if (period === '30d') {
        dateFilter = "AND created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'";
      }

      const stats = await AIRepository.getUsageStats(churchId, dateFilter);

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
