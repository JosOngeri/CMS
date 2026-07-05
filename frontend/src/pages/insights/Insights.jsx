import React from 'react';
import { useAlternativeSection } from '../../hooks/useFeatureFlag';
import InsightsOriginal from './InsightsOriginal';
import InsightsAlternative from './InsightsAlternative';

const Insights = () => {
  const useAlternative = useAlternativeSection('insights');

  if (useAlternative) {
    return <InsightsAlternative />;
  }

  return <InsightsOriginal />;
};

export default Insights;
