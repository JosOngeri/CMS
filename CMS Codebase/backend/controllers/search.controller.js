const BaseController = require('./BaseController');
const SearchRepository = require('../repositories/SearchRepository');
const SearchService = require('../services/SearchService');
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

      if (!SearchService.isValidQuery(query)) {
        return this.badRequest(res, 'Query must be at least 2 characters');
      }

      const searchQuery = SearchService.formatSearchQuery(query);
      const results = {};

      if (!type || type === 'members') {
        const members = await SearchRepository.searchMembers(query);
        results.members = SearchService.addTypeMetadata(members, 'member');
      }

      if (!type || type === 'content') {
        const content = await SearchRepository.searchContent(query);
        results.content = SearchService.addTypeMetadata(content, 'content');
      }

      if (!type || type === 'departments') {
        const departments = await SearchRepository.searchDepartments(query);
        results.departments = SearchService.addTypeMetadata(departments, 'department');
      }

      if (!type || type === 'documents') {
        const documents = await SearchRepository.searchDocuments(query);
        results.documents = SearchService.addTypeMetadata(documents, 'document');
      }

      if (!type || type === 'users') {
        const users = await SearchRepository.searchUsers(query);
        results.users = SearchService.addTypeMetadata(users, 'user');
      }

      this.success(res, { data: results });
    } catch (error) {
      this.logger.error('globalSearch', error);
      this.error(res, 'Search failed');
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
      const searchQuery = SearchService.formatSearchQuery(query);
      const results = [];

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

      this.success(res, { results });
    } catch (error) {
      this.logger.error('advancedSearch', error);
      this.error(res, 'Search failed');
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

      if (!SearchService.isValidQuery(query)) {
        return this.success(res, { data: [] });
      }

      const searchQuery = SearchService.formatSearchQuery(query);
      const suggestions = [];

      const [members, content, departments] = await Promise.all([
        SearchRepository.getMemberSuggestions(searchQuery),
        SearchRepository.getContentSuggestions(searchQuery),
        SearchRepository.getDepartmentSuggestions(searchQuery)
      ]);

      suggestions.push(...members, ...content, ...departments);

      this.success(res, { data: SearchService.limitSuggestions(suggestions) });
    } catch (error) {
      this.logger.error('getSearchSuggestions', error);
      this.error(res, 'Failed to get suggestions');
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
      this.created(res, { savedSearch });
    } catch (error) {
      this.logger.error('saveSearch', error);
      this.error(res, 'Failed to save search');
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
      this.success(res, { savedSearches });
    } catch (error) {
      this.logger.error('getSavedSearches', error);
      this.error(res, 'Failed to get saved searches');
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
      this.success(res, { message: 'Saved search deleted successfully' });
    } catch (error) {
      this.logger.error('deleteSavedSearch', error);
      this.error(res, 'Failed to delete saved search');
    }
  }
}

module.exports = new SearchController();