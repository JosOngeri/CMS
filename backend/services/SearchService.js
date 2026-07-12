/**
 * Search Service
 * Handles search query processing and result formatting
 */
class SearchService {
  /**
   * Validate search query
   * @param {string} query - Search query
   * @returns {boolean} True if valid
   */
  isValidQuery(query) {
    return query && query.length >= 2;
  }

  /**
   * Format search query for SQL LIKE
   * @param {string} query - Search query
   * @returns {string} Formatted query
   */
  formatSearchQuery(query) {
    return `%${query}%`;
  }

  /**
   * Add type metadata to search results
   * @param {Array} results - Search results
   * @param {string} type - Result type
   * @returns {Array} Results with type metadata
   */
  addTypeMetadata(results, type) {
    return results.map(item => ({ ...item, type }));
  }

  /**
   * Limit suggestions
   * @param {Array} suggestions - Suggestions array
   * @param {number} limit - Maximum number of suggestions
   * @returns {Array} Limited suggestions
   */
  limitSuggestions(suggestions, limit = 10) {
    return suggestions.slice(0, limit);
  }
}

module.exports = new SearchService();
