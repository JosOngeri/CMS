import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

const STORAGE_KEY = 'msabato_church';
const CHANGE_EVENT = 'msabato:church-changed';

function readStoredChurch() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Select the church the visitor wants to brand the site by.
 * Pass a church object { id, name, slug } or null to clear.
 */
export function setSelectedChurch(church) {
  if (church) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(church));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getSelectedChurch() {
  return readStoredChurch();
}

/**
 * Returns the church-specific brand strings.
 *
 * - If the user is logged in and the backend resolves their church, or a church
 *   has been chosen from the public list, that church name is returned.
 * - Otherwise returns the generic product name "Msabato".
 */
export function useChurchBranding() {
  const { getSetting, loading } = useSettings();
  const [selectedChurch, setSelectedChurch] = useState(readStoredChurch);

  useEffect(() => {
    const handler = () => setSelectedChurch(readStoredChurch());
    window.addEventListener(CHANGE_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const rawName = selectedChurch?.name || getSetting('church_name');
  const slug = selectedChurch?.slug || getSetting('church_slug') || 'default';
  const product = 'Msabato CMS';

  const churchName = rawName || 'Msabato';
  const shortName = rawName || 'Msabato';
  const fullName = rawName
    ? `${rawName} Church Management System`
    : 'Msabato Church Management System';

  return {
    product,
    churchName,
    shortName,
    fullName,
    slug,
    loading,
    isMsabato: !rawName || slug === 'default',
    availableChurches: getSetting('available_churches') || [],
    selectedChurch,
    setChurch: setSelectedChurch
  };
}
