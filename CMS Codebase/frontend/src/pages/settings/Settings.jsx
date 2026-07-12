import React from 'react';
import { useAlternativeSection } from '../../hooks/useFeatureFlag';
import SettingsOriginal from './SettingsOriginal';
import SettingsAlternative from './SettingsAlternative';

const Settings = () => {
  const useAlternative = useAlternativeSection('settings');

  if (useAlternative) {
    return <SettingsAlternative />;
  }

  return <SettingsOriginal />;
};

export default Settings;
