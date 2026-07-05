import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * FeatureLoader (Phase 8)
 * Dynamically loads feature components based on allocations
 * Handles lazy loading and component registration
 */
const FeatureLoader = ({ featureSlug, departmentId, fallback = null }) => {
  const [Component, setComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadFeature = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if feature is enabled for this department
        const response = await axios.get(
          `/api/department-features/departments/${departmentId}/features`
        );

        const features = response.data.data || [];
        const feature = features.find(f => f.slug === featureSlug);

        if (!feature || !feature.is_enabled) {
          setError('Feature not enabled');
          return;
        }

        // Dynamically import the feature component
        // This would be enhanced with actual component loading logic
        // For now, we'll use a placeholder
        setComponent(() => () => (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">{feature.name}</h2>
            <p className="text-[var(--color-textSecondary)]">
              Feature component: {feature.component_name}
            </p>
            <pre className="mt-4 p-4 bg-[var(--color-background)] rounded-lg overflow-auto">
              {JSON.stringify(feature.config, null, 2)}
            </pre>
          </div>
        ));
      } catch (error) {
        console.error('Failed to load feature:', error);
        setError('Failed to load feature');
      } finally {
        setLoading(false);
      }
    };

    if (departmentId && featureSlug) {
      loadFeature();
    }
  }, [departmentId, featureSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error) {
    return fallback || (
      <div className="p-6 border border-[var(--color-error)] rounded-xl text-center">
        <p className="text-[var(--color-error)]">{error}</p>
      </div>
    );
  }

  if (!Component) {
    return fallback || null;
  }

  return <Component />;
};

export default FeatureLoader;
