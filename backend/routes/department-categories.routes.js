const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate, validationRules } = require('../middleware/validation');
const departmentCategoriesRepository = require('../repositories/DepartmentCategoriesRepository');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('department-categories.routes');

// Get all categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await departmentCategoriesRepository.getAllActive();
    res.json({ categories: result });
  } catch (error) {
    logger.error('getCategories', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single category
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await departmentCategoriesRepository.getById(id);

    if (!result) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ category: result });
  } catch (error) {
    logger.error('getCategory', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create category (admin only)
router.post('/',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder']),
  validate,
  async (req, res) => {
    try {
      const { name, description, color } = req.body;

      const result = await departmentCategoriesRepository.create({ name, description, color });

      res.status(201).json({
        message: 'Category created successfully',
        category: result
      });
    } catch (error) {
      logger.error('createCategory', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Category name already exists' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update category (admin only)
router.put('/:id',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder']),
  validate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, color, is_active } = req.body;

      const result = await departmentCategoriesRepository.update(id, { name, description, color, is_active });

      if (!result) {
        return res.status(404).json({ error: 'Category not found' });
      }

      res.json({
        message: 'Category updated successfully',
        category: result
      });
    } catch (error) {
      logger.error('updateCategory', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Category name already exists' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete category (admin only)
router.delete('/:id',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder']),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Get category name first
      const category = await departmentCategoriesRepository.getById(id);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Check if category is in use
      const usageCount = await departmentCategoriesRepository.checkCategoryUsage(category.name);

      if (usageCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete category that is in use by departments' 
        });
      }

      await departmentCategoriesRepository.delete(id);

      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      logger.error('deleteCategory', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
