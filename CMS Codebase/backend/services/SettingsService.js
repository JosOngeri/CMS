/**
 * Settings Service
 * Handles settings export/import and validation logic
 */
class SettingsService {
  /**
   * Validate settings before import
   * @param {Array} settings - Array of settings to validate
   * @returns {Object} Validation result with valid/invalid settings
   */
  validateSettingsForImport(settings) {
    const valid = [];
    const invalid = [];

    if (!Array.isArray(settings)) {
      return { valid: [], invalid: [], error: 'Settings must be an array' };
    }

    for (const setting of settings) {
      const errors = [];

      if (!setting.key) errors.push('key is required');
      if (setting.value === undefined) errors.push('value is required');
      if (!setting.value_type) errors.push('value_type is required');
      if (!setting.category) errors.push('category is required');
      if (!setting.label) errors.push('label is required');

      const validTypes = ['string', 'number', 'boolean', 'json'];
      if (setting.value_type && !validTypes.includes(setting.value_type)) {
        errors.push(`value_type must be one of: ${validTypes.join(', ')}`);
      }

      if (errors.length > 0) {
        invalid.push({ setting, errors });
      } else {
        valid.push(setting);
      }
    }

    return { valid, invalid };
  }

  /**
   * Format settings for export
   * @param {Array} settings - Settings array from repository
   * @returns {Object} Formatted export data
   */
  formatExportData(settings) {
    return {
      exported_at: new Date().toISOString(),
      settings
    };
  }

  /**
   * Parse and validate import data
   * @param {Object} importData - Import data from request
   * @returns {Object} Parsed and validated data
   */
  parseImportData(importData) {
    if (!importData || !importData.settings) {
      return { error: 'Invalid import data format' };
    }

    return this.validateSettingsForImport(importData.settings);
  }
}

module.exports = new SettingsService();
