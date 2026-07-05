const BaseController = require('./BaseController');
const ResponseHandler = require('../utils/ResponseHandler');
const ChurchRepository = require('../repositories/ChurchRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Church Controller (Phase 6)
 * Manages church/tenant administration for multi-tenancy
 */
class ChurchController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('ChurchController');
  }

  /**
   * Get all churches (Super Admin only)
   */
  async getAllChurches(req, res) {
    try {
      const churches = await ChurchRepository.getAllChurches();

      return ResponseHandler.success(res, churches);
    } catch (error) {
      this.logger.error('getAllChurches', error);
      return ResponseHandler.error(res, 'Failed to fetch churches');
    }
  }

  /**
   * Get church by ID
   */
  async getChurchById(req, res) {
    const { id } = req.params;

    try {
      const church = await ChurchRepository.getChurchById(id);

      if (!church) {
        return ResponseHandler.error(res, 'Church not found', 404);
      }

      return ResponseHandler.success(res, church);
    } catch (error) {
      this.logger.error('getChurchById', error);
      return ResponseHandler.error(res, 'Failed to fetch church');
    }
  }

  /**
   * Get church by slug
   */
  async getChurchBySlug(req, res) {
    const { slug } = req.params;

    try {
      const church = await ChurchRepository.getChurchBySlug(slug);

      if (!church) {
        return ResponseHandler.error(res, 'Church not found', 404);
      }

      return ResponseHandler.success(res, church);
    } catch (error) {
      this.logger.error('getChurchBySlug', error);
      return ResponseHandler.error(res, 'Failed to fetch church');
    }
  }

  /**
   * Create new church (Super Admin only)
   */
  async createChurch(req, res) {
    const { name, slug, settings = {} } = req.body;
    
    try {
      // Validate slug format
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(slug)) {
        return ResponseHandler.error(res, 'Slug must contain only lowercase letters, numbers, and hyphens');
      }
      
      // Check if slug already exists
      const existing = await ChurchRepository.getChurchBySlugForCheck(slug);

      if (existing) {
        return ResponseHandler.error(res, 'Church slug already exists', 409);
      }

      const church = await ChurchRepository.createChurch({
        name,
        slug,
        settings
      });
      
      this.logger.info(`Church created: ${name} (${slug})`);
      return ResponseHandler.success(res, church, 'Church created successfully', 201);
    } catch (error) {
      this.logger.error('createChurch', error);
      return ResponseHandler.error(res, 'Failed to create church');
    }
  }

  /**
   * Update church settings
   */
  async updateChurch(req, res) {
    const { id } = req.params;
    const { name, slug, settings } = req.body;

    try {
      // Check if church exists
      const existing = await ChurchRepository.getChurchById(id);

      if (!existing) {
        return ResponseHandler.error(res, 'Church not found', 404);
      }
      
      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (name) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }
      
      if (slug) {
        // Validate slug format
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(slug)) {
          return ResponseHandler.error(res, 'Slug must contain only lowercase letters, numbers, and hyphens');
        }
        
        // Check if slug is taken by another church
        const slugCheck = await ChurchRepository.checkSlugExists(slug, id);

        if (slugCheck) {
          return ResponseHandler.error(res, 'Church slug already exists', 409);
        }
        
        updates.push(`slug = $${paramCount++}`);
        values.push(slug);
      }
      
      if (settings) {
        updates.push(`settings = $${paramCount++}`);
        values.push(JSON.stringify(settings));
      }
      
      if (updates.length === 0) {
        return ResponseHandler.error(res, 'No valid fields to update');
      }
      
      values.push(id);
      
      const query = `
        UPDATE churches
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const church = await ChurchRepository.updateChurch(id, updates, values);

      this.logger.info(`Church updated: ${id}`);
      return ResponseHandler.success(res, church, 'Church updated successfully');
    } catch (error) {
      this.logger.error('updateChurch', error);
      return ResponseHandler.error(res, 'Failed to update church');
    }
  }

  /**
   * Delete church (Super Admin only)
   */
  async deleteChurch(req, res) {
    const { id } = req.params;

    try {
      // Check if church exists
      const existing = await ChurchRepository.getChurchById(id);

      if (!existing) {
        return ResponseHandler.error(res, 'Church not found', 404);
      }

      // Check if church has users
      const userCount = await ChurchRepository.getUserCount(id);

      if (userCount > 0) {
        return ResponseHandler.error(res, 'Cannot delete church with existing users. Reassign or delete users first.');
      }

      await ChurchRepository.deleteChurch(id);

      this.logger.info(`Church deleted: ${id}`);
      return ResponseHandler.success(res, null, 'Church deleted successfully');
    } catch (error) {
      this.logger.error('deleteChurch', error);
      return ResponseHandler.error(res, 'Failed to delete church');
    }
  }

  /**
   * Get church statistics
   */
  async getChurchStats(req, res) {
    const { id } = req.params;

    try {
      const [userCount, memberCount, paymentCount, departmentCount] = await Promise.all([
        ChurchRepository.getUserCount(id),
        ChurchRepository.getMemberCount(id),
        ChurchRepository.getPaymentCount(id),
        ChurchRepository.getDepartmentCount(id)
      ]);

      const stats = {
        users: userCount,
        members: memberCount,
        payments: paymentCount,
        departments: departmentCount
      };

      return ResponseHandler.success(res, stats);
    } catch (error) {
      this.logger.error('getChurchStats', error);
      return ResponseHandler.error(res, 'Failed to fetch church statistics');
    }
  }

  /**
   * Update church settings (AI tone, branding, etc.)
   */
  async updateChurchSettings(req, res) {
    const { id } = req.params;
    const { settings } = req.body;

    try {
      const church = await ChurchRepository.updateChurchSettings(id, settings);

      if (!church) {
        return ResponseHandler.error(res, 'Church not found', 404);
      }

      return ResponseHandler.success(res, church, 'Church settings updated successfully');
    } catch (error) {
      this.logger.error('updateChurchSettings', error);
      return ResponseHandler.error(res, 'Failed to update church settings');
    }
  }
}

module.exports = new ChurchController();