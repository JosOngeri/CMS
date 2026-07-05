const BaseController = require('./BaseController');
const ContentRepository = require('../repositories/ContentRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Content Controller
 * Handles content management with revisions and SEO
 */
class ContentController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('ContentController');
  }

  /**
   * Get all content with filtering and pagination
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.status] - Filter by status
   * @param {string} [req.query.category] - Filter by category ID
   * @param {string} [req.query.type] - Filter by content type
   * @param {number} [req.query.limit=50] - Items per page
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllContent(req, res) {
    try {
      const { status, category, type, limit = 50, offset = 0 } = req.query;
      const churchId = req.user.church_id;

      const content = await ContentRepository.getAllWithFilters(
        { status, category, type, limit, offset },
        churchId
      );

      res.json({ success: true, data: content });
    } catch (error) {
      this.logger.error('getAllContent', error);
      res.status(500).json({ success: false, error: 'Failed to fetch content' });
    }
  }

  /**
   * Get content by slug
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.slug - Content slug
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getContentBySlug(req, res) {
    try {
      const { slug } = req.params;

      const content = await ContentRepository.getBySlugWithDetails(slug);

      if (!content) {
        return res.status(404).json({ success: false, error: 'Content not found' });
      }

      const tags = await ContentRepository.getTagsByContentItemId(content.id);

      res.json({
        success: true,
        data: { ...content, tags }
      });
    } catch (error) {
      this.logger.error('getContentBySlug', error);
      res.status(500).json({ success: false, error: 'Failed to fetch content' });
    }
  }

  /**
   * Create new content item
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.title - Content title
   * @param {string} req.body.content - Content body
   * @param {string} [req.body.contentType] - Content type
   * @param {string} [req.body.categoryId] - Category ID
   * @param {string} [req.body.status] - Content status
   * @param {string} [req.body.publishedAt] - Publish date
   * @param {string} [req.body.expiresAt] - Expiration date
   * @param {number} [req.body.priority] - Content priority
   * @param {string} [req.body.seoTitle] - SEO title
   * @param {string} [req.body.seoDescription] - SEO description
   * @param {string} [req.body.ogImage] - Open Graph image
   * @param {string[]} [req.body.tags] - Array of tag IDs
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createContent(req, res) {
    try {
      const { title, content, contentType, categoryId, status, publishedAt, expiresAt, priority, seoTitle, seoDescription, ogImage, tags } = req.body;
      const userId = req.user.id;

      // Generate slug from title
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');

      const contentItem = await ContentRepository.createContentItem({
        title,
        slug,
        content,
        contentType: contentType || 'page',
        categoryId,
        authorId: userId,
        status: status || 'draft',
        publishedAt,
        expiresAt,
        priority: priority || 0,
        seoTitle,
        seoDescription,
        ogImage
      });

      if (tags && tags.length > 0) {
        for (const tagId of tags) {
          await ContentRepository.addContentItemTag(contentItem.id, tagId);
        }
      }

      await ContentRepository.createInitialRevision({
        contentItemId: contentItem.id,
        title,
        content,
        authorId: userId
      });

      res.status(201).json({
        success: true,
        message: 'Content created successfully',
        data: contentItem
      });
    } catch (error) {
      this.logger.error('createContent', error);
      res.status(500).json({ success: false, error: 'Failed to create content' });
    }
  }

  /**
   * Update content item
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Content ID
   * @param {Object} req.body - Request body with content fields to update
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateContent(req, res) {
    try {
      const { id } = req.params;
      const { title, content, contentType, categoryId, status, publishedAt, expiresAt, priority, seoTitle, seoDescription, ogImage, tags } = req.body;
      const userId = req.user.id;

      const current = await ContentRepository.findContentItemById(id);
      if (!current) {
        return res.status(404).json({ success: false, error: 'Content not found' });
      }

      // Update slug if title changed
      let slug = current.slug;
      if (title && title !== current.title) {
        slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
      }

      const updated = await ContentRepository.updateContentItem(id, {
        title,
        slug,
        content,
        contentType,
        categoryId,
        status,
        publishedAt,
        expiresAt,
        priority,
        seoTitle,
        seoDescription,
        ogImage
      });

      if (tags !== undefined) {
        await ContentRepository.deleteContentItemTags(id);
        for (const tagId of tags) {
          await ContentRepository.addContentItemTag(id, tagId);
        }
      }

      if (content && content !== current.content) {
        const nextRev = await ContentRepository.getMaxRevisionNumber(id) + 1;
        await ContentRepository.createUpdateRevision({
          contentItemId: id,
          title: title || current.title,
          content,
          authorId: userId,
          revisionNumber: nextRev
        });
      }

      res.json({
        success: true,
        message: 'Content updated successfully',
        data: updated
      });
    } catch (error) {
      this.logger.error('updateContent', error);
      res.status(500).json({ success: false, error: 'Failed to update content' });
    }
  }

  async deleteContent(req, res) {
    try {
      const { id } = req.params;

      await ContentRepository.deleteContentItem(id);

      res.json({
        success: true,
        message: 'Content deleted successfully'
      });
    } catch (error) {
      this.logger.error('deleteContent', error);
      res.status(500).json({ success: false, error: 'Failed to delete content' });
    }
  }

  /**
   * Publish content item
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Content ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async publishContent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const published = await ContentRepository.publishContentItem(id);

      if (!published) {
        return res.status(404).json({ success: false, error: 'Content not found' });
      }

      res.json({
        success: true,
        message: 'Content published successfully',
        data: published
      });
    } catch (error) {
      this.logger.error('publishContent', error);
      res.status(500).json({ success: false, error: 'Failed to publish content' });
    }
  }

  /**
   * Get content revisions
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Content ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getRevisions(req, res) {
    try {
      const { id } = req.params;

      const revisions = await ContentRepository.getRevisionsByContentItemId(id);

      res.json({
        success: true,
        data: revisions
      });
    } catch (error) {
      this.logger.error('getRevisions', error);
      res.status(500).json({ success: false, error: 'Failed to fetch revisions' });
    }
  }

  /**
   * Rollback content to a specific revision
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Content ID
   * @param {string} req.params.revisionId - Revision ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async rollbackToRevision(req, res) {
    try {
      const { id, revisionId } = req.params;
      const userId = req.user.id;

      const revision = await ContentRepository.findRevisionById(revisionId);

      if (!revision) {
        return res.status(404).json({ success: false, error: 'Revision not found' });
      }

      const currentRev = await ContentRepository.getMaxRevisionNumber(id);

      await ContentRepository.update(id, {
        title: revision.title,
        content: revision.content,
        updated_at: new Date().toISOString()
      });

      await ContentRepository.createRollbackRevision({
        contentItemId: id,
        title: revision.title,
        content: revision.content,
        authorId: userId,
        revisionNumber: currentRev + 1,
        targetRevisionNumber: revision.revision_number
      });

      res.json({
        success: true,
        message: 'Content rolled back successfully'
      });
    } catch (error) {
      this.logger.error('rollbackToRevision', error);
      res.status(500).json({ success: false, error: 'Failed to rollback revision' });
    }
  }

  /**
   * Get content categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getCategories(req, res) {
    try {
      const categories = await ContentRepository.getCategoriesOrdered();

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      this.logger.error('getCategories', error);
      res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
  }

  /**
   * Get content tags
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTags(req, res) {
    try {
      const tags = await ContentRepository.getTagsOrdered();

      res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      this.logger.error('getTags', error);
      res.status(500).json({ success: false, error: 'Failed to fetch tags' });
    }
  }

  /**
   * Get website settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getWebsiteSettings(req, res) {
    try {
      const settings = await ContentRepository.getWebsiteSettingsOrdered();

      // Group by category
      const grouped = settings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push(setting);
        return acc;
      }, {});

      res.json({
        success: true,
        data: grouped
      });
    } catch (error) {
      this.logger.error('getWebsiteSettings', error);
      res.status(500).json({ success: false, error: 'Failed to fetch website settings' });
    }
  }

  /**
   * Update website settings
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {Array} req.body.settings - Array of settings to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateWebsiteSettings(req, res) {
    try {
      const { settings } = req.body;

      for (const setting of settings) {
        await ContentRepository.upsertWebsiteSetting({
          keyName: setting.keyName,
          value: setting.value,
          valueType: setting.valueType || 'string',
          category: setting.category || 'general',
          description: setting.description || ''
        });
      }

      res.json({
        success: true,
        message: 'Website settings updated successfully'
      });
    } catch (error) {
      this.logger.error('updateWebsiteSettings', error);
      res.status(500).json({ success: false, error: 'Failed to update website settings' });
    }
  }

  /**
   * Get content collaborators
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.contentId - Content ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getContentCollaborators(req, res) {
    try {
      const { contentId } = req.params;

      const collaborators = await ContentRepository.getCollaboratorsByContentItemId(contentId);

      res.json({ success: true, data: collaborators });
    } catch (error) {
      this.logger.error('getContentCollaborators', error);
      res.status(500).json({ success: false, error: 'Failed to fetch collaborators' });
    }
  }

  /**
   * Add content collaborator
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.contentId - Content ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.userId - User ID
   * @param {string} req.body.role - Role (owner, editor, viewer)
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async addContentCollaborator(req, res) {
    try {
      const { contentId } = req.params;
      const { userId, role } = req.body;

      const collaborator = await ContentRepository.upsertContentCollaborator(
        contentId,
        userId,
        role || 'editor'
      );

      res.json({ success: true, data: collaborator });
    } catch (error) {
      this.logger.error('addContentCollaborator', error);
      res.status(500).json({ success: false, error: 'Failed to add collaborator' });
    }
  }

  /**
   * Remove content collaborator
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.contentId - Content ID
   * @param {string} req.params.userId - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async removeContentCollaborator(req, res) {
    try {
      const { contentId, userId } = req.params;

      await ContentRepository.deleteContentCollaborator(contentId, userId);

      res.json({ success: true, message: 'Collaborator removed successfully' });
    } catch (error) {
      this.logger.error('removeContentCollaborator', error);
      res.status(500).json({ success: false, error: 'Failed to remove collaborator' });
    }
  }

  /**
   * Get content comments
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.contentId - Content ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getContentComments(req, res) {
    try {
      const { contentId } = req.params;

      const comments = await ContentRepository.getCommentsByContentItemId(contentId);

      res.json({ success: true, data: comments });
    } catch (error) {
      this.logger.error('getContentComments', error);
      res.status(500).json({ success: false, error: 'Failed to fetch comments' });
    }
  }

  /**
   * Add content comment
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.contentId - Content ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.comment - Comment text
   * @param {string} [req.body.parentId] - Parent comment ID for replies
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async addContentComment(req, res) {
    try {
      const { contentId } = req.params;
      const { comment, parentId } = req.body;

      const newComment = await ContentRepository.createContentComment({
        contentItemId: contentId,
        userId: req.user.id,
        comment,
        parentId: parentId || null
      });

      res.json({ success: true, data: newComment });
    } catch (error) {
      this.logger.error('addContentComment', error);
      res.status(500).json({ success: false, error: 'Failed to add comment' });
    }
  }

  /**
   * Lock content for editing
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.contentId - Content ID
   * @param {Object} req.body - Request body
   * @param {number} [req.body.expiresIn] - Lock duration in minutes
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async lockContent(req, res) {
    try {
      const { contentId } = req.params;
      const { expiresIn } = req.body;

      const existingLock = await ContentRepository.getActiveContentLock(contentId);

      if (existingLock) {
        const lock = existingLock.rows[0];
        if (lock.user_id !== req.user.id) {
          return res.status(409).json({
            success: false,
            error: 'Content is already locked by another user',
            locked_by: lock.user_id,
            locked_at: lock.locked_at,
            expires_at: lock.expires_at
          });
        }
      }

      // Calculate expiration time
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 60 * 1000) : null;

      const lock = await ContentRepository.upsertContentLock(contentId, req.user.id, expiresAt);

      res.json({ success: true, data: lock });
    } catch (error) {
      this.logger.error('lockContent', error);
      res.status(500).json({ success: false, error: 'Failed to lock content' });
    }
  }

  /**
   * Unlock content
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.contentId - Content ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async unlockContent(req, res) {
    try {
      const { contentId } = req.params;

      const existingLock = await ContentRepository.getContentLockByContentItemId(contentId);

      if (existingLock) {
        if (existingLock.user_id !== req.user.id) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to unlock this content'
          });
        }
      }

      await ContentRepository.deleteContentLock(contentId);

      res.json({ success: true, message: 'Content unlocked successfully' });
    } catch (error) {
      this.logger.error('unlockContent', error);
      res.status(500).json({ success: false, error: 'Failed to unlock content' });
    }
  }

  /**
   * Get content lock status
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.contentId - Content ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getContentLockStatus(req, res) {
    try {
      const { contentId } = req.params;

      const lockStatus = await ContentRepository.getContentLockStatus(contentId);

      if (!lockStatus) {
        return res.json({ success: true, locked: false });
      }

      res.json({
        success: true,
        locked: true,
        data: lockStatus
      });
    } catch (error) {
      this.logger.error('getContentLockStatus', error);
      res.status(500).json({ success: false, error: 'Failed to get lock status' });
    }
  }

  /**
   * Schedule content publishing
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Content ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.scheduled_publish_at - Scheduled publish timestamp
   * @param {string} [req.body.scheduled_unpublish_at] - Scheduled unpublish timestamp
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async schedulePublish(req, res) {
    try {
      const { id } = req.params;
      const { scheduled_publish_at, scheduled_unpublish_at } = req.body;

      const scheduled = await ContentRepository.schedulePublish(id, scheduled_publish_at, scheduled_unpublish_at);

      if (!scheduled) {
        return res.status(404).json({ success: false, error: 'Content not found' });
      }

      res.json({ success: true, data: scheduled });
    } catch (error) {
      this.logger.error('schedulePublish', error);
      res.status(500).json({ success: false, error: 'Failed to schedule publishing' });
    }
  }

  /**
   * Unpublish content immediately
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Content ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async unpublishContent(req, res) {
    try {
      const { id } = req.params;

      const unpublished = await ContentRepository.unpublishContent(id);

      if (!unpublished) {
        return res.status(404).json({ success: false, error: 'Content not found' });
      }

      res.json({ success: true, message: 'Content unpublished successfully' });
    } catch (error) {
      this.logger.error('unpublishContent', error);
      res.status(500).json({ success: false, error: 'Failed to unpublish content' });
    }
  }

  /**
   * Get scheduled content
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.status] - Filter by status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getScheduledContent(req, res) {
    try {
      const scheduled = await ContentRepository.getScheduledContent(status);

      res.json({ success: true, data: scheduled });
    } catch (error) {
      this.logger.error('getScheduledContent', error);
      res.status(500).json({ success: false, error: 'Failed to fetch scheduled content' });
    }
  }

  /**
   * Auto-save content draft
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Content ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.content - Content to auto-save
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async autoSaveContent(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;

      const saved = await ContentRepository.autoSaveContent(id, content);

      if (!saved) {
        return res.status(404).json({ success: false, error: 'Content not found' });
      }

      res.json({ success: true, data: saved });
    } catch (error) {
      this.logger.error('autoSaveContent', error);
      res.status(500).json({ success: false, error: 'Failed to auto-save content' });
    }
  }

  /**
   * Check for duplicate content
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.title - Title to check for duplicates
   * @param {string} [req.query.excludeId] - Content ID to exclude from check
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async checkDuplicateContent(req, res) {
    try {
      const { title, excludeId } = req.query;

      const duplicates = await ContentRepository.checkDuplicateContent(title, excludeId);

      res.json({
        success: true,
        data: {
          is_duplicate: duplicates.length > 0,
          duplicates
        }
      });
    } catch (error) {
      this.logger.error('checkDuplicateContent', error);
      res.status(500).json({ success: false, error: 'Failed to check for duplicates' });
    }
  }

  /**
   * Export content items
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.category] - Filter by category
   * @param {string} [req.query.status] - Filter by status
   * @param {string} [req.query.format] - Export format (json, csv)
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async exportContent(req, res) {
    try {
      const { category, status, format = 'json' } = req.query;

      const contentItems = await ContentRepository.exportContent(category, status);

      if (format === 'csv') {
        const headers = Object.keys(contentItems[0] || {}).join(',');
        const rows = contentItems.map(row => Object.values(row).join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=content-export.csv');
        res.send(`${headers}\n${rows}`);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=content-export.json');
        res.json({ success: true, data: contentItems });
      }
    } catch (error) {
      this.logger.error('exportContent', error);
      res.status(500).json({ success: false, error: 'Failed to export content' });
    }
  }

  /**
   * Import content items
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {Array} req.body.items - Array of content items to import
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async importContent(req, res) {
    try {
      const { items } = req.body;
      const userId = req.user.id;

      const imported = [];
      const errors = [];

      for (const item of items) {
        try {
          const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');

          const importedItem = await ContentRepository.importContentItem({
            title: item.title,
            slug,
            content: item.content,
            contentType: item.content_type || 'page',
            categoryId: item.category_id,
            authorId: userId,
            status: item.status || 'draft',
            publishedAt: item.published_at,
            expiresAt: item.expires_at,
            priority: item.priority || 0,
            seoTitle: item.seo_title,
            seoDescription: item.seo_description,
            ogImage: item.og_image
          });

          imported.push(importedItem);
        } catch (error) {
          errors.push({ item: item.title, error: error.message });
        }
      }

      res.json({ 
        success: true, 
        data: {
          imported,
          errors,
          total: items.length,
          success_count: imported.length,
          error_count: errors.length
        }
      });
    } catch (error) {
      this.logger.error('importContent', error);
      res.status(500).json({ success: false, error: 'Failed to import content' });
    }
  }

  /**
   * Get content analytics
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.startDate] - Start date for analytics
   * @param {string} [req.query.endDate] - End date for analytics
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getContentAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const byStatus = await ContentRepository.getContentByStatus();
      const byType = await ContentRepository.getContentByType();
      const byCategory = await ContentRepository.getContentByCategory();
      const publishedOverTime = await ContentRepository.getPublishedContentOverTime(startDate, endDate);

      res.json({
        success: true,
        data: {
          by_status: byStatus,
          by_type: byType,
          by_category: byCategory,
          published_over_time: publishedOverTime
        }
      });
    } catch (error) {
      this.logger.error('getContentAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch content analytics' });
    }
  }
}

module.exports = new ContentController();