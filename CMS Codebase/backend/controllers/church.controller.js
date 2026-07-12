const BaseController = require('./BaseController');
const ChurchRepository = require('../repositories/ChurchRepository');
const ChurchService = require('../services/ChurchService');
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
      this.success(res, { churches });
    } catch (error) {
      this.logger.error('getAllChurches', error);
      this.error(res, 'Failed to fetch churches');
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
        return this.notFound(res, 'Church not found');
      }

      this.success(res, { church });
    } catch (error) {
      this.logger.error('getChurchById', error);
      this.error(res, 'Failed to fetch church');
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
        return this.notFound(res, 'Church not found');
      }

      this.success(res, { church });
    } catch (error) {
      this.logger.error('getChurchBySlug', error);
      this.error(res, 'Failed to fetch church');
    }
  }

  /**
   * Create new church (Super Admin only)
   */
  async createChurch(req, res) {
    const { name, slug, settings = {} } = req.body;

    try {
      if (!ChurchService.isValidSlug(slug)) {
        return this.badRequest(res, 'Slug must contain only lowercase letters, numbers, and hyphens');
      }

      const existing = await ChurchRepository.getChurchBySlugForCheck(slug);

      if (existing) {
        return this.conflict(res, 'Church slug already exists');
      }

      const church = await ChurchRepository.createChurch({
        name,
        slug,
        settings
      });

      this.logger.info(`Church created: ${name} (${slug})`);
      this.created(res, { church });
    } catch (error) {
      this.logger.error('createChurch', error);
      this.error(res, 'Failed to create church');
    }
  }

  /**
   * Update church settings
   */
  async updateChurch(req, res) {
    const { id } = req.params;
    const { name, slug, settings } = req.body;

    try {
      const existing = await ChurchRepository.getChurchById(id);

      if (!existing) {
        return this.notFound(res, 'Church not found');
      }

      if (slug && !ChurchService.isValidSlug(slug)) {
        return this.badRequest(res, 'Slug must contain only lowercase letters, numbers, and hyphens');
      }

      if (slug) {
        const slugCheck = await ChurchRepository.checkSlugExists(slug, id);

        if (slugCheck) {
          return this.conflict(res, 'Church slug already exists');
        }
      }

      const { queryParts, values, paramCount } = ChurchService.buildUpdateQuery({ name, slug, settings });

      if (queryParts.length === 0) {
        return this.badRequest(res, 'No valid fields to update');
      }

      values.push(id);

      const query = `
        UPDATE churches
        SET ${queryParts.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const church = await ChurchRepository.updateChurch(id, queryParts, values);

      this.logger.info(`Church updated: ${id}`);
      this.success(res, { church });
    } catch (error) {
      this.logger.error('updateChurch', error);
      this.error(res, 'Failed to update church');
    }
  }

  /**
   * Delete church (Super Admin only)
   */
  async deleteChurch(req, res) {
    const { id } = req.params;

    try {
      const existing = await ChurchRepository.getChurchById(id);

      if (!existing) {
        return this.notFound(res, 'Church not found');
      }

      const userCount = await ChurchRepository.getUserCount(id);

      if (userCount > 0) {
        return this.badRequest(res, 'Cannot delete church with existing users. Reassign or delete users first.');
      }

      await ChurchRepository.deleteChurch(id);

      this.logger.info(`Church deleted: ${id}`);
      this.success(res, { message: 'Church deleted successfully' });
    } catch (error) {
      this.logger.error('deleteChurch', error);
      this.error(res, 'Failed to delete church');
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

      const stats = ChurchService.formatStats({
        userCount,
        memberCount,
        paymentCount,
        departmentCount
      });

      this.success(res, { stats });
    } catch (error) {
      this.logger.error('getChurchStats', error);
      this.error(res, 'Failed to fetch church statistics');
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
        return this.notFound(res, 'Church not found');
      }

      this.success(res, { church });
    } catch (error) {
      this.logger.error('updateChurchSettings', error);
      this.error(res, 'Failed to update church settings');
    }
  }
}

module.exports = new ChurchController();