import React from 'react';
import { useAlternativeSection } from '../../hooks/useFeatureFlag';
import ResourcesOriginal from './ResourcesOriginal';
import ResourcesAlternative from './ResourcesAlternative';

const Resources = () => {
  const useAlternative = useAlternativeSection('resources');

  if (useAlternative) {
    return <ResourcesAlternative />;
  }

  return <ResourcesOriginal />;
};

export default Resources;
