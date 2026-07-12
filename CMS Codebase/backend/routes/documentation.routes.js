const express = require('express');
const router = express.Router();
const documentationController = require('../controllers/documentation.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Documentation CRUD
router.get('/', documentationController.getAll);
router.get('/:id', documentationController.getById);
router.post('/', requireRole(['Super Admin', 'Content Manager']), documentationController.create);
router.put('/:id', requireRole(['Super Admin', 'Content Manager']), documentationController.update);
router.delete('/:id', requireRole(['Super Admin', 'Content Manager']), documentationController.delete);

module.exports = router;
