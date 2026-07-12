/**
 * Church Service
 * Handles church business logic including slug validation and settings management
 */
class ChurchService {
  /**
   * Validate church slug format
   * @param {string} slug - Slug to validate
   * @returns {boolean} True if valid
   */
  isValidSlug(slug) {
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(slug);
  }

  /**
   * Build dynamic update query for church
   * @param {Object} updates - Object with fields to update
   * @returns {Object} Query parts and values
   */
  buildUpdateQuery(updates) {
    const queryParts = [];
    const values = [];
    let paramCount = 1;

    if (updates.name) {
      queryParts.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }

    if (updates.slug) {
      queryParts.push(`slug = $${paramCount++}`);
      values.push(updates.slug);
    }

    if (updates.settings) {
      queryParts.push(`settings = $${paramCount++}`);
      values.push(JSON.stringify(updates.settings));
    }

    return { queryParts, values, paramCount };
  }

  /**
   * Generate church statistics object
   * @param {Object} counts - Object with various counts
   * @returns {Object} Formatted stats
   */
  formatStats(counts) {
    return {
      users: counts.userCount || 0,
      members: counts.memberCount || 0,
      payments: counts.paymentCount || 0,
      departments: counts.departmentCount || 0
    };
  }
}

module.exports = new ChurchService();
