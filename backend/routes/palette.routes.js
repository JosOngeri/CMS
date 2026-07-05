const express = require('express');
const router = express.Router();
const PaletteController = require('../controllers/palette.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

const paletteController = new PaletteController();

// Public routes
router.get('/', (req, res) => paletteController.getPalettes(req, res));
router.get('/:id', (req, res) => paletteController.getPalette(req, res));
router.get('/name/:name', (req, res) => paletteController.getPaletteByName(req, res));
router.get('/default', (req, res) => paletteController.getDefaultPalette(req, res));

// Protected routes (require authentication)
router.post('/:id/apply', authenticateToken, (req, res) => paletteController.applyPalette(req, res));
router.post('/:id/set-default', authenticateToken, requireRole(['Super Admin', 'Pastor', 'First Elder']), (req, res) => paletteController.setDefaultPalette(req, res));

// Admin-only routes
router.post('/', authenticateToken, requireRole(['Super Admin', 'Pastor', 'First Elder']), (req, res) => paletteController.createPalette(req, res));
router.put('/:id', authenticateToken, requireRole(['Super Admin', 'Pastor', 'First Elder']), (req, res) => paletteController.updatePalette(req, res));
router.delete('/:id', authenticateToken, requireRole(['Super Admin', 'Pastor', 'First Elder']), (req, res) => paletteController.deletePalette(req, res));

module.exports = router;
