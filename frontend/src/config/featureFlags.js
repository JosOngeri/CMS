// Feature Flags Configuration
// These flags control which features are enabled and for what percentage of users

export const FEATURE_FLAGS = {
  // Tab Structure Feature Flags
  USE_ALTERNATIVE_TAB_STRUCTURE: false, // Master switch for alternative tab structure
  ALTERNATIVE_TABS_PERCENTAGE: 0, // Percentage of users to see alternative approach (0-100)
  
  // Individual section flags (for granular control)
  DEPARTMENTS_USE_ALTERNATIVE: false,
  RESOURCES_USE_ALTERNATIVE: false,
  INSIGHTS_USE_ALTERNATIVE: false,
  ADMINISTRATION_USE_ALTERNATIVE: false,
  SETTINGS_USE_ALTERNATIVE: false,
  
  // Individual section percentages
  DEPARTMENTS_ALTERNATIVE_PERCENTAGE: 0,
  RESOURCES_ALTERNATIVE_PERCENTAGE: 0,
  INSIGHTS_ALTERNATIVE_PERCENTAGE: 0,
  ADMINISTRATION_ALTERNATIVE_PERCENTAGE: 0,
  SETTINGS_ALTERNATIVE_PERCENTAGE: 0,
};

// Helper function to check if user is in test group
export const isInTestGroup = (userId, percentage) => {
  if (!userId) return false;
  // Use user ID modulo 100 to determine if they're in the test group
  return (userId % 100) < percentage;
};

// Get feature flag value for a specific user
export const getFeatureFlagForUser = (flagName, userId) => {
  const flag = FEATURE_FLAGS[flagName];
  
  // Handle percentage-based flags
  if (flagName.includes('PERCENTAGE')) {
    return flag;
  }
  
  // Handle boolean flags with percentage
  if (flagName === 'USE_ALTERNATIVE_TAB_STRUCTURE') {
    return flag && isInTestGroup(userId, FEATURE_FLAGS.ALTERNATIVE_TABS_PERCENTAGE);
  }
  
  // Handle individual section flags
  if (flagName.endsWith('_USE_ALTERNATIVE')) {
    const sectionName = flagName.replace('_USE_ALTERNATIVE', '');
    const percentageFlag = `${sectionName}_ALTERNATIVE_PERCENTAGE`;
    return flag && isInTestGroup(userId, FEATURE_FLAGS[percentageFlag]);
  }
  
  return flag;
};
