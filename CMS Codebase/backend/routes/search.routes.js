const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Global search
router.get('/global', searchController.globalSearch);

// Advanced search
router.post('/', searchController.advancedSearch);

// Saved searches
router.post('/saved', searchController.saveSearch);
router.get('/saved', searchController.getSavedSearches);
router.delete('/saved/:id', searchController.deleteSavedSearch);

// Search suggestions
router.get('/suggestions', searchController.getSearchSuggestions);

module.exports = router;