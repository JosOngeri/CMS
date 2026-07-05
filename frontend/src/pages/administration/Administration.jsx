import React from 'react';
import { useAlternativeSection } from '../../hooks/useFeatureFlag';
import AdministrationOriginal from './AdministrationOriginal';
import AdministrationAlternative from './AdministrationAlternative';

const Administration = () => {
  const useAlternative = useAlternativeSection('administration');

  if (useAlternative) {
    return <AdministrationAlternative />;
  }

  return <AdministrationOriginal />;
};

export default Administration;
