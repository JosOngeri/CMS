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

      res.json({ success: true, palettes });
    } catch (error) {
      this.logger.error('getPalettes', error);
      res.status(500).json({ success: false, error: 'Failed to fetch palettes' });
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
        return res.status(404).json({ success: false, error: 'Palette not found' });
      }

      res.json({ success: true, palette });
    } catch (error) {
      this.logger.error('getPalette', error);
      res.status(500).json({ success: false, error: 'Failed to fetch palette' });
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
        return res.status(404).json({ success: false, error: 'Palette not found' });
      }

      res.json({ success: true, palette });
    } catch (error) {
      this.logger.error('getPaletteByName', error);
      res.status(500).json({ success: false, error: 'Failed to fetch palette' });
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
        return res.status(400).json({ success: false, error: 'Palette with this name already exists' });
      }

      // Insert palette
      const palette = await PaletteRepository.createPalette({
        name,
        display_name,
        description,
        created_by: userId
      });

      const paletteId = palette.id;

      // Insert colors
      for (const [colorKey, colorValue] of Object.entries(colors)) {
        await PaletteRepository.addColor(paletteId, colorKey, colorValue);
      }

      res.status(201).json({ success: true, palette });
    } catch (error) {
      this.logger.error('createPalette', error);
      res.status(500).json({ success: false, error: 'Failed to create palette' });
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
        return res.status(404).json({ success: false, error: 'Palette not found' });
      }

      // Prevent editing system palettes
      if (palette.is_system) {
        return res.status(403).json({ success: false, error: 'Cannot edit system palettes' });
      }

      // Update palette
      await PaletteRepository.updatePalette(id, {
        display_name,
        description
      });

      // Update colors if provided
      if (colors) {
        // Delete existing colors
        await PaletteRepository.removeAllColors(id);

        // Insert new colors
        for (const [colorKey, colorValue] of Object.entries(colors)) {
          await PaletteRepository.addColor(id, colorKey, colorValue);
        }
      }

      res.json({ success: true, message: 'Palette updated successfully' });
    } catch (error) {
      this.logger.error('updatePalette', error);
      res.status(500).json({ success: false, error: 'Failed to update palette' });
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
        return res.status(404).json({ success: false, error: 'Palette not found' });
      }

      // Prevent deleting system palettes
      if (palette.is_system) {
        return res.status(403).json({ success: false, error: 'Cannot delete system palettes' });
      }

      // Delete colors
      await PaletteRepository.removeAllColors(id);

      // Delete palette
      await PaletteRepository.deletePalette(id);

      res.json({ success: true, message: 'Palette deleted successfully' });
    } catch (error) {
      this.logger.error('deletePalette', error);
      res.status(500).json({ success: false, error: 'Failed to delete palette' });
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

      res.json({ success: true, message: 'Default palette set successfully' });
    } catch (error) {
      this.logger.error('setDefaultPalette', error);
      res.status(500).json({ success: false, error: 'Failed to set default palette' });
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
        return res.status(404).json({ success: false, error: 'No default palette found' });
      }

      res.json({ success: true, palette });
    } catch (error) {
      this.logger.error('getDefaultPalette', error);
      res.status(500).json({ success: false, error: 'Failed to fetch default palette' });
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

      res.json({ success: true, message: 'Palette applied successfully' });
    } catch (error) {
      this.logger.error('applyPalette', error);
      res.status(500).json({ success: false, error: 'Failed to apply palette' });
    }
  }
}

module.exports = PaletteController;
