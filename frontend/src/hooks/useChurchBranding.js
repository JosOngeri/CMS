import { useSettings } from '../contexts/SettingsContext';

/**
 * Returns the church-specific brand strings, defaulting to Msabato CMS.
 *
 * - If the active church has a name, that becomes the visible brand.
 * - If not, the page falls back to "Msabato CMS" / "Msabato Church
 *   Management System".
 */
export function useChurchBranding() {
  const { getSetting, loading } = useSettings();

  const rawName = getSetting('church_name');
  const slug = getSetting('church_slug') || 'default';
  const product = 'Msabato CMS';

  const churchName = rawName || product;
  const shortName = rawName || product;
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
    isMsabato: !rawName || slug === 'default'
  };
}
