import React from 'react';
import { useAlternativeSection } from '../../hooks/useFeatureFlag';
import DepartmentsOriginal from './DepartmentsOriginal';
import DepartmentsAlternative from './DepartmentsAlternative';

const Departments = () => {
  const useAlternative = useAlternativeSection('departments');

  if (useAlternative) {
    return <DepartmentsAlternative />;
  }

  return <DepartmentsOriginal />;
};

export default Departments;
