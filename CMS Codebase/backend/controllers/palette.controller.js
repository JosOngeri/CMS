const BaseController = require('./BaseController');
const PaletteRepository = require('../repositories/PaletteRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Palette Controller
 * Handles color palette management
 */
class PaletteController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('PaletteController');
  }

  /**
   * Get all palettes
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPalettes(req, res) {
    try {
      const churchId = req.user.church_id;

      const palettes = await PaletteRepository.getAllWithColors(churchId);

      return this.success(res, { palettes });
    } catch (error) {
      this.logger.error('getPalettes', error);
      return this.error(res, 'Failed to fetch palettes');
    }
  }

  /**
   * Get single palette by ID
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Palette ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPalette(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const palette = await PaletteRepository.getPaletteWithColors(id, churchId);

      if (!palette) {
        return this.notFound(res, 'Palette not found');
      }

      return this.success(res, { palette });
    } catch (error) {
      this.logger.error('getPalette', error);
      return this.error(res, 'Failed to fetch palette');
    }
  }

  /**
   * Get palette by name
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.name - Palette name
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPaletteByName(req, res) {
    try {
      const { name } = req.params;
      const churchId = req.user.church_id;

      const palettes = await PaletteRepository.getAllWithColors(churchId);
      const palette = palettes.find(p => p.name === name);

      if (!palette) {
        return this.notFound(res, 'Palette not found');
      }

      return this.success(res, { palette });
    } catch (error) {
      this.logger.error('getPaletteByName', error);
      return this.error(res, 'Failed to fetch palette');
    }
  }

  /**
   * Create custom palette (admin only)
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.name - Palette name
   * @param {string} req.body.display_name - Display name
   * @param {string} [req.body.description] - Description
   * @param {Object} req.body.colors - Color key-value pairs
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createPalette(req, res) {
    try {
      const { name, display_name, description, colors } = req.body;
      const userId = req.user.id;

      // Check if palette name already exists
      const existing = await PaletteRepository.findByName(name);

      if (existing) {
        return this.error(res, 'Palette with this name already exists', 400);
      }

      // Insert palette with colors using repository method
      const palette = await PaletteRepository.createPaletteWithColors({
        name,
        display_name,
        description,
        colors,
        created_by: userId
      });

      return this.success(res, palette, 'Palette created successfully', 201);
    } catch (error) {
      this.logger.error('createPalette', error);
      return this.error(res, 'Failed to create palette');
    }
  }

  /**
   * Update palette (admin only)
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Palette ID
   * @param {Object} req.body - Request body
   * @param {string} [req.body.display_name] - Display name
   * @param {string} [req.body.description] - Description
   * @param {Object} [req.body.colors] - Color key-value pairs
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updatePalette(req, res) {
    try {
      const { id } = req.params;
      const { display_name, description, colors } = req.body;

      // Get palette
      const palette = await PaletteRepository.findById(id);

      if (!palette) {
        return this.notFound(res, 'Palette not found');
      }

      // Prevent editing system palettes
      if (palette.is_system) {
        return this.forbidden(res, 'Cannot edit system palettes');
      }

      // Update palette with colors using repository method
      await PaletteRepository.updatePaletteWithColors(id, {
        display_name,
        description,
        colors
      });

      return this.success(res, null, 'Palette updated successfully');
    } catch (error) {
      this.logger.error('updatePalette', error);
      return this.error(res, 'Failed to update palette');
    }
  }

  /**
   * Delete palette (admin only)
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Palette ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deletePalette(req, res) {
    try {
      const { id } = req.params;

      // Get palette
      const palette = await PaletteRepository.findById(id);

      if (!palette) {
        return this.notFound(res, 'Palette not found');
      }

      // Prevent deleting system palettes
      if (palette.is_system) {
        return this.forbidden(res, 'Cannot delete system palettes');
      }

      // Delete colors and palette
      await PaletteRepository.deletePalette(id);

      return this.success(res, null, 'Palette deleted successfully');
    } catch (error) {
      this.logger.error('deletePalette', error);
      return this.error(res, 'Failed to delete palette');
    }
  }

  /**
   * Set default palette (admin only)
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Palette ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async setDefaultPalette(req, res) {
    try {
      const { id } = req.params;

      // Reset all palettes to non-default
      await PaletteRepository.resetAllDefaults();

      // Set selected palette as default
      await PaletteRepository.setDefault(id);

      return this.success(res, null, 'Default palette set successfully');
    } catch (error) {
      this.logger.error('setDefaultPalette', error);
      return this.error(res, 'Failed to set default palette');
    }
  }

  /**
   * Get default palette
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDefaultPalette(req, res) {
    try {
      const churchId = req.user.church_id;

      const palette = await PaletteRepository.getDefaultPalette(churchId);

      if (!palette) {
        return this.notFound(res, 'No default palette found');
      }

      return this.success(res, { palette });
    } catch (error) {
      this.logger.error('getDefaultPalette', error);
      return this.error(res, 'Failed to fetch default palette');
    }
  }

  /**
   * Apply palette to user preferences
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Palette ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async applyPalette(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Update user preference
      await PaletteRepository.setUserPreference(userId, id);

      return this.success(res, null, 'Palette applied successfully');
    } catch (error) {
      this.logger.error('applyPalette', error);
      return this.error(res, 'Failed to apply palette');
    }
  }
}

module.exports = PaletteController;
