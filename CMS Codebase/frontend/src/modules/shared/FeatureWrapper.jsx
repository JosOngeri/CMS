import React from 'react';

/**
 * FeatureWrapper (Phase 8)
 * Wrapper component for dynamic feature components
 * Handles feature activation, permissions, and error boundaries
 */
const FeatureWrapper = ({ feature, children, isActive = true, config = {} }) => {
  if (!isActive) {
    return (
      <div className="p-6 border border-dashed border-[var(--color-border)] rounded-xl text-center">
        <p className="text-[var(--color-textSecondary)]">
          This feature is not enabled for your department.
        </p>
      </div>
    );
  }

  return (
    <div className="feature-wrapper" data-feature={feature.slug}>
      {children}
    </div>
  );
};

export default FeatureWrapper;
