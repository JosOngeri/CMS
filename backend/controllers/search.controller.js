const BaseController = require('./BaseController');
const SearchRepository = require('../repositories/SearchRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Search Controller
 * Handles global search, advanced search, suggestions, and saved searches
 */
class SearchController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('SearchController');
  }

  /**
   * Perform global search across multiple entities
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.query - Search query
   * @param {string} [req.query.type] - Filter by type (members/content/departments/documents/users)
   * @param {number} [req.query.limit=20] - Limit results per type
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async globalSearch(req, res) {
    try {
      const { query, type, limit = 20 } = req.query;

      if (!query || query.length < 2) {
        return res.status(400).json({ success: false, error: 'Query must be at least 2 characters' });
      }

      const searchQuery = `%${query}%`;
      const results = {};

      // Search members
      if (!type || type === 'members') {
        const members = await SearchRepository.searchMembers(query);
        results.members = members.map(m => ({ ...m, type: 'member' }));
      }

      // Search content
      if (!type || type === 'content') {
        const content = await SearchRepository.searchContent(query);
        results.content = content.map(c => ({ ...c, type: 'content' }));
      }

      // Search departments
      if (!type || type === 'departments') {
        const departments = await SearchRepository.searchDepartments(query);
        results.departments = departments.map(d => ({ ...d, type: 'department' }));
      }

      // Search documents
      if (!type || type === 'documents') {
        const documents = await SearchRepository.searchDocuments(query);
        results.documents = documents.map(d => ({ ...d, type: 'document' }));
      }

      // Search users
      if (!type || type === 'users') {
        const users = await SearchRepository.searchUsers(query);
        results.users = users.map(u => ({ ...u, type: 'user' }));
      }

      res.json({ success: true, data: results });
    } catch (error) {
      this.logger.error('globalSearch', error);
      res.status(500).json({ success: false, error: 'Search failed' });
    }
  }

  /**
   * Perform advanced search with filters
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.query - Search query
   * @param {Object} req.body.filters - Filter options
   * @param {string} [req.body.filters.type] - Filter by type
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async advancedSearch(req, res) {
    try {
      const { query, filters } = req.body;
      const searchQuery = `%${query}%`;
      const results = [];

      // Search based on type filter
      if (!filters.type || filters.type === 'all' || filters.type === 'members') {
        const members = await SearchRepository.globalSearchMembers(query);
        results.push(...members);
      }

      if (!filters.type || filters.type === 'all' || filters.type === 'documents') {
        const documents = await SearchRepository.globalSearchDocuments(query);
        results.push(...documents);
      }

      if (!filters.type || filters.type === 'all' || filters.type === 'events') {
        const events = await SearchRepository.globalSearchEvents(query);
        results.push(...events);
      }

      if (!filters.type || filters.type === 'all' || filters.type === 'announcements') {
        const announcements = await SearchRepository.globalSearchAnnouncements(query);
        results.push(...announcements);
      }

      if (!filters.type || filters.type === 'all' || filters.type === 'departments') {
        const departments = await SearchRepository.globalSearchDepartments(query);
        results.push(...departments);
      }

      res.json({ success: true, results });
    } catch (error) {
      this.logger.error('advancedSearch', error);
      res.status(500).json({ success: false, error: 'Search failed' });
    }
  }

  /**
   * Get search suggestions
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.query - Search query
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSearchSuggestions(req, res) {
    try {
      const { query } = req.query;

      if (!query || query.length < 2) {
        return res.json({ success: true, data: [] });
      }

      const searchQuery = `%${query}%`;
      const suggestions = [];

      const [members, content, departments] = await Promise.all([
        SearchRepository.getMemberSuggestions(searchQuery),
        SearchRepository.getContentSuggestions(searchQuery),
        SearchRepository.getDepartmentSuggestions(searchQuery)
      ]);

      suggestions.push(...members, ...content, ...departments);

      res.json({ success: true, data: suggestions.slice(0, 10) });
    } catch (error) {
      this.logger.error('getSearchSuggestions', error);
      res.status(500).json({ success: false, error: 'Failed to get suggestions' });
    }
  }

  /**
   * Save a search query
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.query - Search query
   * @param {Object} [req.body.filters] - Filter options
   * @param {string} req.body.name - Saved search name
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async saveSearch(req, res) {
    try {
      const { query, filters, name } = req.body;
      const savedSearch = await SearchRepository.saveSearch(req.user.id, name, query, filters);
      res.json({ success: true, savedSearch });
    } catch (error) {
      this.logger.error('saveSearch', error);
      res.status(500).json({ success: false, error: 'Failed to save search' });
    }
  }

  /**
   * Get saved searches for the current user
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSavedSearches(req, res) {
    try {
      const savedSearches = await SearchRepository.getSavedSearches(req.user.id);
      res.json({ success: true, savedSearches });
    } catch (error) {
      this.logger.error('getSavedSearches', error);
      res.status(500).json({ success: false, error: 'Failed to get saved searches' });
    }
  }

  /**
   * Delete a saved search
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Saved search ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteSavedSearch(req, res) {
    try {
      await SearchRepository.deleteSavedSearch(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (error) {
      this.logger.error('deleteSavedSearch', error);
      res.status(500).json({ success: false, error: 'Failed to delete saved search' });
    }
  }
}

module.exports = new SearchController();