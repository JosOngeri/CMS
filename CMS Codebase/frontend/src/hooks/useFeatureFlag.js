import { useAuth } from '../contexts/AuthContext';
import { FEATURE_FLAGS, getFeatureFlagForUser } from '../config/featureFlags';

/**
 * Get user's tab structure preference from localStorage
 * @returns {boolean|null} - User's preference (true for alternative, false for original, null for default)
 */
const getUserTabPreference = () => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('userTabPreference');
    return stored === 'true' ? true : stored === 'false' ? false : null;
  } catch {
    return null;
  }
};

/**
 * Set user's tab structure preference in localStorage
 * @param {boolean} useAlternative - Whether to use alternative tab structure
 */
export const setUserTabPreference = (useAlternative) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('userTabPreference', String(useAlternative));
  } catch (error) {
    console.error('Failed to save tab preference:', error);
  }
};

/**
 * Hook to check if a feature flag is enabled for the current user
 * @param {string} flagName - The name of the feature flag
 * @returns {boolean} - Whether the feature is enabled for the current user
 */
export const useFeatureFlag = (flagName) => {
  const { user } = useAuth();
  const userId = user?.id || 0;

  return getFeatureFlagForUser(flagName, userId);
};

/**
 * Hook to check if the alternative tab structure should be used
 * Respects user preference if set, otherwise uses feature flag logic
 * @returns {boolean} - Whether to use the alternative tab structure
 */
export const useAlternativeTabStructure = () => {
  const { user } = useAuth();
  const userId = user?.id || 0;

  // Check user preference first
  const userPreference = getUserTabPreference();
  if (userPreference !== null) {
    return userPreference;
  }

  // Fall back to feature flag logic
  const masterSwitch = FEATURE_FLAGS.USE_ALTERNATIVE_TAB_STRUCTURE;
  const percentage = FEATURE_FLAGS.ALTERNATIVE_TABS_PERCENTAGE;

  // User is in test group if their ID modulo 100 is less than the percentage
  const isInTestGroup = (userId % 100) < percentage;

  return masterSwitch && isInTestGroup;
};

/**
 * Hook to check if a specific section should use the alternative approach
 * Respects user preference if set, otherwise uses feature flag logic
 * @param {string} section - The section name (departments, resources, insights, administration, settings)
 * @returns {boolean} - Whether to use the alternative approach for this section
 */
export const useAlternativeSection = (section) => {
  const { user } = useAuth();
  const userId = user?.id || 0;

  // Check user preference first
  const userPreference = getUserTabPreference();
  if (userPreference !== null) {
    return userPreference;
  }

  // Fall back to feature flag logic
  const sectionFlag = `${section.toUpperCase()}_USE_ALTERNATIVE`;
  const sectionPercentage = `${section.toUpperCase()}_ALTERNATIVE_PERCENTAGE`;

  const flagEnabled = FEATURE_FLAGS[sectionFlag];
  const percentage = FEATURE_FLAGS[sectionPercentage];

  const isInTestGroup = (userId % 100) < percentage;

  return flagEnabled && isInTestGroup;
};

/**
 * Hook to get all feature flags for the current user
 * @returns {object} - Object with all feature flags and their values for the current user
 */
export const useAllFeatureFlags = () => {
  const { user } = useAuth();
  const userId = user?.id || 0;
  
  return {
    useAlternativeTabStructure: getFeatureFlagForUser('USE_ALTERNATIVE_TAB_STRUCTURE', userId),
    departmentsUseAlternative: getFeatureFlagForUser('DEPARTMENTS_USE_ALTERNATIVE', userId),
    resourcesUseAlternative: getFeatureFlagForUser('RESOURCES_USE_ALTERNATIVE', userId),
    insightsUseAlternative: getFeatureFlagForUser('INSIGHTS_USE_ALTERNATIVE', userId),
    administrationUseAlternative: getFeatureFlagForUser('ADMINISTRATION_USE_ALTERNATIVE', userId),
    settingsUseAlternative: getFeatureFlagForUser('SETTINGS_USE_ALTERNATIVE', userId),
  };
};
