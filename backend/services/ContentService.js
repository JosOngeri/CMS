/**
 * Content Service
 * Handles content business logic including slug generation and time formatting
 */
class ContentService {
  /**
   * Generate URL-friendly slug from title
   * @param {string} title - Content title
   * @returns {string} Generated slug
   */
  generateSlug(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
  }

  /**
   * Format relative time for display
   * @param {Date} date - Date to format
   * @returns {string} Relative time string
   */
  formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  /**
   * Validate content status
   * @param {string} status - Status to validate
   * @returns {boolean} True if valid
   */
  isValidStatus(status) {
    const validStatuses = ['draft', 'published', 'archived', 'scheduled'];
    return validStatuses.includes(status);
  }

  /**
   * Validate content type
   * @param {string} type - Type to validate
   * @returns {boolean} True if valid
   */
  isValidContentType(type) {
    const validTypes = ['page', 'post', 'news', 'event', 'announcement'];
    return validTypes.includes(type);
  }
}

module.exports = new ContentService();
