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
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = 'gemini-pro';
    this.cache = new Map(); // Simple in-memory cache
    this.cacheTTL = 10 * 60 * 1000; // 10 minutes in milliseconds
    this.dailyLimit = parseInt(process.env.GEMINI_DAILY_LIMIT || '100', 10); // Default 100 requests per day per church
  }

  /**
   * Generate a simple hash for caching
   * @param {string} str - String to hash
   * @returns {string} Hash
   */
  hashString(str) {
    if (!str) return '';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get cached response if available and not expired
   * @param {string} key - Cache key
   * @returns {object|null} Cached response or null
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set cached response with TTL
   * @param {string} key - Cache key
   * @param {object} data - Data to cache
   */
  setCached(key, data) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.cacheTTL
    });
  }

  /**
   * Retry function with exponential backoff
   * @param {Function} fn - Function to retry
   * @param {number} maxRetries - Maximum number of retries (default: 3)
   * @returns {Promise<any>} Result of the function
   */
  async retryWithBackoff(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        // Retry on 429 Too Many Requests or network errors
        const isRetryable = error.status === 429 || 
                           error.code === 'ECONNRESET' || 
                           error.code === 'ETIMEDOUT' ||
                           error.message?.includes('429');
        
        if (!isRetryable || i === maxRetries - 1) {
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, i) * 1000;
        logger.warn(`Retrying API call after ${delay}ms (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Sanitize prompt to prevent injection attacks
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text
   */
  sanitizePrompt(text) {
    if (!text || typeof text !== 'string') return text;
    
    // Remove common injection patterns
    const injectionPatterns = [
      /ignore previous instructions/gi,
      /ignore all previous/gi,
      /disregard previous/gi,
      /forget previous/gi,
      /system:/gi,
      /assistant:/gi,
      /user:/gi,
      /developer:/gi,
      /new instruction:/gi,
      /override:/gi,
      /bypass:/gi,
      /jailbreak/gi,
      /<\|im_start\|>/gi,
      /<\|im_end\|>/gi,
      /\[INST\]/gi,
      /\[\/INST\]/gi,
    ];

    let sanitized = text;
    for (const pattern of injectionPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }
    
    return sanitized;
  }

  /**
   * Moderate content for prohibited categories
   * @param {string} text - Text to moderate
   * @returns {object} Moderation result { allowed: boolean, reason: string }
   */
  moderateContent(text) {
    if (!text || typeof text !== 'string') return { allowed: true, reason: '' };

    // Basic prohibited content patterns (can be expanded)
    const prohibitedPatterns = [
      { pattern: /violence|kill|murder|attack|weapon/gi, category: 'violence' },
      { pattern: /hate|discriminat|racist|sexist|homophobic/gi, category: 'hate speech' },
      { pattern: /porn|explicit|sexual|nude/gi, category: 'sexual content' },
      { pattern: /illegal|drug|criminal|fraud/gi, category: 'illegal activities' },
    ];

    for (const { pattern, category } of prohibitedPatterns) {
      if (pattern.test(text)) {
        logger.warn(`Content moderation: ${category} detected in AI response`);
        return {
          allowed: false,
          reason: `Content contains ${category}`
        };
      }
    }

    return { allowed: true, reason: '' };
  }

  /**
   * Mask PII (Personally Identifiable Information) from text
   * @param {string} text - Text to mask
   * @returns {string} Text with PII masked
   */
  maskPII(text) {
    if (!text || typeof text !== 'string') return text;

    let masked = text;

    // Mask email addresses
    masked = masked.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[EMAIL_REDACTED]');

    // Mask phone numbers (various formats)
    masked = masked.replace(/(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g, '[PHONE_REDACTED]');

    // Mask national IDs (basic pattern - can be expanded for specific formats)
    masked = masked.replace(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, '[ID_REDACTED]'); // SSN pattern
    masked = masked.replace(/\b[A-Z]{2}\d{6}\b/g, '[ID_REDACTED]'); // UK NI pattern

    // Mask proper names in sensitive context (simple pattern - can be improved)
    // This masks capitalized words that might be names, but may have false positives
    masked = masked.replace(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, '[NAME_REDACTED]');

    return masked;
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

      // Sanitize user inputs to prevent prompt injection
      const sanitizedTopic = this.sanitizePrompt(topic);
      const sanitizedAudience = this.sanitizePrompt(audience);
      const sanitizedKeyPoints = Array.isArray(keyPoints) ? keyPoints.map(point => this.sanitizePrompt(point)) : [];

      // Mask PII before sending to API
      const maskedTopic = this.maskPII(sanitizedTopic);
      const maskedAudience = this.maskPII(sanitizedAudience);
      const maskedKeyPoints = sanitizedKeyPoints.map(point => this.maskPII(point));

      const prompt = `
        You are an assistant for ${churchName}.
        The church's preferred tone is: ${churchTone}.
        
        Generate an announcement about: ${maskedTopic}
        Target audience: ${maskedAudience}
        
        Key points to include:
        ${maskedKeyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}
        
        Format the announcement with:
        - A compelling title
        - An engaging opening
        - Body paragraphs covering the key points
        - A clear call to action
        - Appropriate closing
        
        Keep it warm, welcoming, and aligned with Christian values.
      `;

      // Check cache for identical prompts
      const cacheKey = this.hashString(prompt);
      const cachedResponse = this.getCached(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Check rate limit
      const rateLimitCheck = await AIRepository.checkAIRateLimit(churchId, 'generate_announcement', this.dailyLimit);
      if (rateLimitCheck && rateLimitCheck.exceeded) {
        throw new Error(`Daily AI usage limit exceeded (${this.dailyLimit} requests per day). Please try again tomorrow.`);
      }

      const result = await this.retryWithBackoff(async () => {
        return await generativeModel.generateContent(prompt);
      });
      const response = await result.response;
      const text = response.text();

      // Moderate content
      const moderation = this.moderateContent(text);
      if (!moderation.allowed) {
        await AIRepository.logAIUsage({
          churchId,
          userId,
          endpoint: 'generate_announcement',
          model: this.model,
          inputTokens: prompt.length,
          outputTokens: text.length,
          status: 'rejected',
          error: moderation.reason
        });
        throw new Error(`Content moderation rejected: ${moderation.reason}`);
      }

      // Log usage (with masked PII)
      await AIRepository.logAIUsage({
        churchId,
        userId,
        endpoint: 'generate_announcement',
        model: this.model,
        inputTokens: prompt.length,
        outputTokens: text.length,
        status: 'success',
        requestMetadata: JSON.stringify({ topic: maskedTopic, audience: maskedAudience }),
        responseMetadata: JSON.stringify({ outputLength: text.length })
      });

      const finalResult = {
        data: {
          success: true,
          content: text,
          metadata: {
            tone: churchTone,
            audience,
            wordCount: text.split(/\s+/).length
          }
        },
        rateLimit: {
          remaining: rateLimitCheck.remaining || 0,
          reset_at: rateLimitCheck.reset_at
        }
      };

      // Cache the response
      this.setCached(cacheKey, finalResult.data);

      return finalResult;
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

      // Check rate limit
      const rateLimitCheck = await AIRepository.checkAIRateLimit(churchId, 'generate_document', this.dailyLimit);
      if (rateLimitCheck && rateLimitCheck.exceeded) {
        throw new Error(`Daily AI usage limit exceeded (${this.dailyLimit} requests per day). Please try again tomorrow.`);
      }

      const generativeModel = this.genAI.getGenerativeModel({ model: this.model });

      // Sanitize user inputs to prevent prompt injection
      const sanitizedTopic = this.sanitizePrompt(topic);
      const sanitizedDocumentType = this.sanitizePrompt(documentType);
      const sanitizedSections = Array.isArray(sections) ? sections.map(section => this.sanitizePrompt(section)) : [];

      const prompt = `
        You are an assistant for ${churchName}.
        The church's preferred tone is: ${churchTone}.

        Generate a ${sanitizedDocumentType} about: ${sanitizedTopic}

        Include the following sections:
        ${sanitizedSections.map((section, i) => `${i + 1}. ${section}`).join('\n')}

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
        data: {
          success: true,
          content: text,
          metadata: {
            documentType,
            tone: churchTone,
            wordCount: text.split(/\s+/).length
          }
        },
        rateLimit: {
          remaining: rateLimitCheck.remaining || 0,
          reset_at: rateLimitCheck.reset_at
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

      // Check rate limit
      const rateLimitCheck = await AIRepository.checkAIRateLimit(churchId, 'generate_member_communication', this.dailyLimit);
      if (rateLimitCheck && rateLimitCheck.exceeded) {
        throw new Error(`Daily AI usage limit exceeded (${this.dailyLimit} requests per day). Please try again tomorrow.`);
      }

      const generativeModel = this.genAI.getGenerativeModel({ model: this.model });

      // Sanitize user inputs to prevent prompt injection
      const sanitizedMemberName = this.sanitizePrompt(memberName);
      const sanitizedCommunicationType = this.sanitizePrompt(communicationType);
      const sanitizedPurpose = this.sanitizePrompt(purpose);
      const sanitizedContext = this.sanitizePrompt(context);

      const prompt = `
        You are an assistant for ${churchName}.
        The church's preferred tone is: ${churchTone}.

        Generate a ${sanitizedCommunicationType} for member: ${sanitizedMemberName}
        Purpose: ${sanitizedPurpose}

        Context: ${sanitizedContext}

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
        data: {
          success: true,
          content: text,
          metadata: {
            communicationType,
            tone: churchTone,
            wordCount: text.split(/\s+/).length
          }
        },
        rateLimit: {
          remaining: rateLimitCheck.remaining || 0,
          reset_at: rateLimitCheck.reset_at
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

      // Check rate limit
      const rateLimitCheck = await AIRepository.checkAIRateLimit(churchId, 'generate_suggestions', this.dailyLimit);
      if (rateLimitCheck && rateLimitCheck.exceeded) {
        throw new Error(`Daily AI usage limit exceeded (${this.dailyLimit} requests per day). Please try again tomorrow.`);
      }

      const generativeModel = this.genAI.getGenerativeModel({ model: this.model });

      // Sanitize user inputs to prevent prompt injection
      const sanitizedContentType = this.sanitizePrompt(contentType);
      const sanitizedContext = this.sanitizePrompt(context);
      const sanitizedExistingContent = this.sanitizePrompt(existingContent);

      const prompt = `
        You are an assistant for a church communications team.
        The church's preferred tone is: ${churchTone}.

        Provide 5 suggestions for improving this ${sanitizedContentType}:

        Context: ${sanitizedContext}

        Existing content:
        ${sanitizedExistingContent}

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
        data: {
          success: true,
          suggestions: text,
          metadata: {
            contentType,
            tone: churchTone
          }
        },
        rateLimit: {
          remaining: rateLimitCheck.remaining || 0,
          reset_at: rateLimitCheck.reset_at
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

      // Check rate limit
      const rateLimitCheck = await AIRepository.checkAIRateLimit(churchId, 'condense_sms', this.dailyLimit);
      if (rateLimitCheck && rateLimitCheck.exceeded) {
        throw new Error(`Daily AI usage limit exceeded (${this.dailyLimit} requests per day). Please try again tomorrow.`);
      }

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
        data: {
          success: true,
          condensedContent: text,
          metadata: {
            originalLength: content.length,
            condensedLength: text.length,
            characterCount: text.length
          }
        },
        rateLimit: {
          remaining: rateLimitCheck.remaining || 0,
          reset_at: rateLimitCheck.reset_at
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
