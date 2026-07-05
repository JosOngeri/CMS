const { GoogleGenerativeAI } = require("@google/generative-ai");
const AIRepository = require('../repositories/AIRepository');
const logger = require('../config/logging');

/**
 * AI Content Generation Service (Phase 13)
 * AI-powered content generation for announcements, documents, and communications
 * Church-specific tone and branding
 */
class AIContentService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = 'gemini-pro';
  }

  /**
   * Generate announcement content
   * @param {object} data - Generation data
   * @returns {Promise<object>} Generated content
   */
  async generateAnnouncement(data) {
    const { topic, tone, audience, keyPoints, churchId, userId } = data;

    try {
      const churchSettings = await AIRepository.getChurchSettings(churchId);
      const churchTone = churchSettings?.settings?.ai_tone || tone || 'Spiritual and Professional';
      const churchName = churchSettings?.name || 'our church';

      const generativeModel = this.genAI.getGenerativeModel({ model: this.model });

      const prompt = `
        You are an assistant for ${churchName}.
        The church's preferred tone is: ${churchTone}.
        
        Generate an announcement about: ${topic}
        Target audience: ${audience}
        
        Key points to include:
        ${keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}
        
        Format the announcement with:
        - A compelling title
        - An engaging opening
        - Body paragraphs covering the key points
        - A clear call to action
        - Appropriate closing
        
        Keep it warm, welcoming, and aligned with Christian values.
      `;

      const result = await generativeModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Log usage
      await AIRepository.logAIUsage({
        churchId,
        userId,
        endpoint: 'generate_announcement',
        model: this.model,
        inputTokens: prompt.length,
        outputTokens: text.length,
        status: 'success',
        requestMetadata: JSON.stringify({ topic, audience }),
        responseMetadata: JSON.stringify({ outputLength: text.length })
      });

      return {
        success: true,
        content: text,
        metadata: {
          tone: churchTone,
          audience,
          wordCount: text.split(/\s+/).length
        }
      };
    } catch (error) {
      logger.error('AI announcement generation error:', error);
      
      await AIRepository.logAIUsage({
        churchId,
        userId,
        endpoint: 'generate_announcement',
        model: this.model,
        inputTokens: 0,
        outputTokens: 0,
        status: 'error',
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Generate document content
   * @param {object} data - Generation data
   * @returns {Promise<object>} Generated content
   */
  async generateDocument(data) {
    const { documentType, topic, sections, tone, churchId, userId } = data;

    try {
      const churchSettings = await AIRepository.getChurchSettings(churchId);
      const churchTone = churchSettings?.settings?.ai_tone || tone || 'Professional';
      const churchName = churchSettings?.name || 'our church';

      const generativeModel = this.genAI.getGenerativeModel({ model: this.model });

      const prompt = `
        You are an assistant for ${churchName}.
        The church's preferred tone is: ${churchTone}.
        
        Generate a ${documentType} about: ${topic}
        
        Include the following sections:
        ${sections.map((section, i) => `${i + 1}. ${section}`).join('\n')}
        
        Format as a formal document with:
        - Clear section headings
        - Professional language
        - Appropriate structure for the document type
        - Christian values where applicable
      `;

      const result = await generativeModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Log usage
      await AIRepository.logAIUsage({
        churchId,
        userId,
        endpoint: 'generate_document',
        model: this.model,
        inputTokens: prompt.length,
        outputTokens: text.length,
        status: 'success',
        requestMetadata: JSON.stringify({ documentType, topic }),
        responseMetadata: JSON.stringify({ outputLength: text.length })
      });

      return {
        success: true,
        content: text,
        metadata: {
          documentType,
          tone: churchTone,
          wordCount: text.split(/\s+/).length
        }
      };
    } catch (error) {
      logger.error('AI document generation error:', error);
      
      await AIRepository.logAIUsage({
        churchId,
        userId,
        endpoint: 'generate_document',
        model: this.model,
        inputTokens: 0,
        outputTokens: 0,
        status: 'error',
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Generate member communication
   * @param {object} data - Generation data
   * @returns {Promise<object>} Generated content
   */
  async generateMemberCommunication(data) {
    const { memberName, communicationType, purpose, context, churchId, userId } = data;

    try {
      const churchSettings = await AIRepository.getChurchSettings(churchId);
      const churchTone = churchSettings?.settings?.ai_tone || 'Pastoral and Caring';
      const churchName = churchSettings?.name || 'our church';

      const generativeModel = this.genAI.getGenerativeModel({ model: this.model });

      const prompt = `
        You are an assistant for ${churchName}.
        The church's preferred tone is: ${churchTone}.
        
        Generate a ${communicationType} for member: ${memberName}
        Purpose: ${purpose}
        
        Context: ${context}
        
        Format the communication with:
        - Personal greeting
        - Warm and caring tone
        - Clear purpose
        - Appropriate closing
        - Christian encouragement
        
        Keep it personal, respectful, and pastoral.
      `;

      const result = await generativeModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Log usage
      await AIRepository.logAIUsage({
        churchId,
        userId,
        endpoint: 'generate_member_communication',
        model: this.model,
        inputTokens: prompt.length,
        outputTokens: text.length,
        status: 'success',
        requestMetadata: JSON.stringify({ communicationType, memberName }),
        responseMetadata: JSON.stringify({ outputLength: text.length })
      });

      return {
        success: true,
        content: text,
        metadata: {
          communicationType,
          tone: churchTone,
          wordCount: text.split(/\s+/).length
        }
      };
    } catch (error) {
      logger.error('AI member communication generation error:', error);
      
      await AIRepository.logAIUsage({
        churchId,
        userId,
        endpoint: 'generate_member_communication',
        model: this.model,
        inputTokens: 0,
        outputTokens: 0,
        status: 'error',
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Generate content suggestions
   * @param {object} data - Suggestion data
   * @returns {Promise<object>} Content suggestions
   */
  async generateSuggestions(data) {
    const { contentType, context, existingContent, churchId, userId } = data;

    try {
      const churchSettings = await AIRepository.getChurchSettings(churchId);
      const churchTone = churchSettings?.settings?.ai_tone || 'Spiritual and Professional';

      const generativeModel = this.genAI.getGenerativeModel({ model: this.model });

      const prompt = `
        You are an assistant for a church communications team.
        The church's preferred tone is: ${churchTone}.
        
        Provide 5 suggestions for improving this ${contentType}:
        
        Context: ${context}
        
        Existing content:
        ${existingContent}
        
        For each suggestion, provide:
        1. The suggestion
        2. Why it would help
        3. How to implement it
        
        Keep suggestions practical and aligned with church values.
      `;

      const result = await generativeModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Log usage
      await AIRepository.logAIUsage({
        churchId,
        userId,
        endpoint: 'generate_suggestions',
        model: this.model,
        inputTokens: prompt.length,
        outputTokens: text.length,
        status: 'success',
        requestMetadata: JSON.stringify({ contentType }),
        responseMetadata: JSON.stringify({ outputLength: text.length })
      });

      return {
        success: true,
        suggestions: text,
        metadata: {
          contentType,
          tone: churchTone
        }
      };
    } catch (error) {
      logger.error('AI suggestions generation error:', error);
      
      await AIRepository.logAIUsage({
        churchId,
        userId,
        endpoint: 'generate_suggestions',
        model: this.model,
        inputTokens: 0,
        outputTokens: 0,
        status: 'error',
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Condense content for SMS
   * @param {object} data - Condensation data
   * @returns {Promise<object>} Condensed content
   */
  async condenseForSMS(data) {
    const { content, maxLength = 500, churchId, userId } = data;

    try {
      const churchSettings = await AIRepository.getChurchSettings(churchId);
      const churchTone = churchSettings?.settings?.ai_tone || 'Concise and Clear';

      const generativeModel = this.genAI.getGenerativeModel({ model: this.model });

      const prompt = `
        You are an assistant for a church communications team.
        The church's preferred tone is: ${churchTone}.
        
        Condense the following content into an SMS message under ${maxLength} characters:
        
        Content:
        ${content}
        
        Keep the key message but make it concise and clear.
        Include any essential details (date, time, location).
      `;

      const result = await generativeModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Log usage
      await AIRepository.logAIUsage({
        churchId,
        userId,
        endpoint: 'condense_sms',
        model: this.model,
        inputTokens: prompt.length,
        outputTokens: text.length,
        status: 'success',
        requestMetadata: JSON.stringify({ maxLength }),
        responseMetadata: JSON.stringify({ outputLength: text.length })
      });

      return {
        success: true,
        condensedContent: text,
        metadata: {
          originalLength: content.length,
          condensedLength: text.length,
          characterCount: text.length
        }
      };
    } catch (error) {
      logger.error('AI SMS condensation error:', error);
      
      await AIRepository.logAIUsage({
        churchId,
        userId,
        endpoint: 'condense_sms',
        model: this.model,
        inputTokens: 0,
        outputTokens: 0,
        status: 'error',
        error: error.message
      });

      throw error;
    }
  }
}

module.exports = new AIContentService();
