/**
 * WHAT THIS FILE DOES
 * -------------------
 * Picks the church's colour theme and injects it into the page as CSS
 * variables (for example `--color-primary`, `--color-background`). Any
 * component can then use those variables instead of hard-coded colours.
 *
 * Priority order:
 *   1. Custom colours saved by the church admin
 *   2. A named palette chosen by the church
 *   3. The default light/dark palette
 *
 * FILES IT TALKS TO
 * -----------------
 * - config/colorPalettes.js → palette definitions
 * - SettingsContext.jsx   → custom colours stored in the database
 * - Any component using Tailwind classes like bg-[var(--color-primary)]
 */

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { getPalette, defaultPalette, colorPalettes } from '../config/colorPalettes';
import { useSettings } from './SettingsContext';

const ColorPaletteContext = createContext(null);

// Generate a set of lighter/darker shades from a single hex colour.
function generateShades(hexColor) {
  if (!hexColor || typeof hexColor !== 'string' || !hexColor.startsWith('#')) {
    return { DEFAULT: hexColor || 'var(--color-text)' };
  }

  const hex = hexColor.replace('#', '');
  if (hex.length !== 6 && hex.length !== 3) return { DEFAULT: hexColor };

  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }

  const clamp = (n) => Math.max(0, Math.min(255, n));
  const lighten = (amount) => {
    const factor = 1 + amount;
    return `#${clamp(Math.round(r * factor)).toString(16).padStart(2, '0')}${clamp(Math.round(g * factor)).toString(16).padStart(2, '0')}${clamp(Math.round(b * factor)).toString(16).padStart(2, '0')}`;
  };
  const darken = (amount) => {
    const factor = 1 - amount;
    return `#${Math.round(r * factor).toString(16).padStart(2, '0')}${Math.round(g * factor).toString(16).padStart(2, '0')}${Math.round(b * factor).toString(16).padStart(2, '0')}`;
  };

  return {
    DEFAULT: hexColor,
    50: lighten(0.9),
    100: lighten(0.8),
    200: lighten(0.6),
    300: lighten(0.4),
    400: lighten(0.2),
    500: hexColor,
    600: darken(0.1),
    700: darken(0.2),
    800: darken(0.3),
    900: darken(0.4),
  };
}

// Apply the chosen colours as CSS variables on the <html> element.
function applyColorsToDOM(colors) {
  if (!colors) return;
  const root = document.documentElement;

  Object.entries(colors).forEach(([key, value]) => {
    if (typeof value === 'string' && value.startsWith('#')) {
      root.style.setProperty(`--color-${key}`, value);
    }
  });

  if (colors.primary) {
    Object.entries(generateShades(colors.primary)).forEach(([shade, value]) => {
      root.style.setProperty(`--color-primary-${shade}`, value);
    });
  }

  if (colors.secondary) {
    Object.entries(generateShades(colors.secondary)).forEach(([shade, value]) => {
      root.style.setProperty(`--color-secondary-${shade}`, value);
    });
  }
}

// List of colour keys the admin can customise.
const CUSTOMIZABLE_COLOR_KEYS = [
  'primary', 'secondary', 'accent', 'background', 'surface',
  'text', 'textSecondary', 'border', 'success', 'warning', 'error'
];

export const ColorPaletteProvider = ({ children }) => {
  const { settings, loading: settingsLoading } = useSettings();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [localPaletteKey, setLocalPaletteKey] = useState(localStorage.getItem('palette') || defaultPalette);
  const [localCustomColors, setLocalCustomColors] = useState(() => {
    const saved = localStorage.getItem('customColors');
    return saved ? JSON.parse(saved) : null;
  });

  // When database settings load, prefer the colours saved there.
  useEffect(() => {
    if (!settingsLoading && settings) {
      const dbColors = {};
      CUSTOMIZABLE_COLOR_KEYS.forEach(key => {
        if (settings[key]) dbColors[key] = settings[key];
      });

      if (Object.keys(dbColors).length > 0) {
        setLocalCustomColors(dbColors);
      }

      if (settings.selected_palette) {
        setLocalPaletteKey(settings.selected_palette);
      }
    }
  }, [settings, settingsLoading]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const isDark = theme === 'dark';

  const colors = useMemo(() => {
    if (localCustomColors) return localCustomColors;

    if (isDark) {
      return colorPalettes[`${localPaletteKey}Dark`] || colorPalettes.classicBlueDark;
    }
    return colorPalettes[localPaletteKey] || colorPalettes[defaultPalette];
  }, [isDark, localPaletteKey, localCustomColors]);

  useEffect(() => {
    applyColorsToDOM(colors);
  }, [colors]);

  const toggleDarkMode = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const setPalette = useCallback((paletteKey) => {
    setLocalPaletteKey(paletteKey);
    setLocalCustomColors(null);
    localStorage.setItem('palette', paletteKey);
    localStorage.removeItem('customColors');
  }, []);

  const updateColors = useCallback((newColors) => {
    setLocalCustomColors(newColors);
    localStorage.setItem('customColors', JSON.stringify(newColors));
  }, []);

  const value = useMemo(() => ({
    isDark,
    toggleDarkMode,
    theme,
    colors,
    selectedPalette: localPaletteKey,
    setPalette,
    updateColors,
    paletteName: localCustomColors ? 'Custom' : (colorPalettes[localPaletteKey]?.name || 'Default')
  }), [isDark, toggleDarkMode, theme, colors, localPaletteKey, setPalette, updateColors, localCustomColors]);

  return (
    <ColorPaletteContext.Provider value={value}>
      {children}
    </ColorPaletteContext.Provider>
  );
};

export const useColorPalette = () => useContext(ColorPaletteContext);
