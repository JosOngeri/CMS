import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { getPalette, defaultPalette, colorPalettes } from '../config/colorPalettes';
import { useSettings } from './SettingsContext';

const ColorPaletteContext = createContext(null);

// Helper to generate color shades
function generateShades(hexColor) {
  if (!hexColor || typeof hexColor !== 'string' || !hexColor.startsWith('#')) {
    return { DEFAULT: hexColor || '#000000' };
  }

  const hex = hexColor.replace('#', '');
  if (hex.length !== 6 && hex.length !== 3) {
    return { DEFAULT: hexColor };
  }

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

  const lighten = (amount) => {
    const factor = 1 + amount;
    const newR = Math.min(255, Math.round(r * factor));
    const newG = Math.min(255, Math.round(g * factor));
    const newB = Math.min(255, Math.round(b * factor));
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  const darken = (amount) => {
    const factor = 1 - amount;
    const newR = Math.round(r * factor);
    const newG = Math.round(g * factor);
    const newB = Math.round(b * factor);
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
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

// Apply colors as CSS variables to the root element
function applyColorsToDOM(colors) {
  if (!colors) return;

  const root = document.documentElement;
  
  // Apply base colors
  Object.entries(colors).forEach(([key, value]) => {
    if (typeof value === 'string' && value.startsWith('#')) {
      root.style.setProperty(`--color-${key}`, value);
    }
  });

  // Generate and apply primary shades
  if (colors.primary) {
    const primaryShades = generateShades(colors.primary);
    Object.entries(primaryShades).forEach(([shade, value]) => {
      root.style.setProperty(`--color-primary-${shade}`, value);
    });
  }

  // Generate and apply secondary shades
  if (colors.secondary) {
    const secondaryShades = generateShades(colors.secondary);
    Object.entries(secondaryShades).forEach(([shade, value]) => {
      root.style.setProperty(`--color-secondary-${shade}`, value);
    });
  }
}

export const ColorPaletteProvider = ({ children }) => {
  const { settings, loading: settingsLoading } = useSettings();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // We'll use a local state for immediate feedback, but sync it with settings
  const [localPaletteKey, setLocalPaletteKey] = useState(localStorage.getItem('palette') || defaultPalette);
  const [localCustomColors, setLocalCustomColors] = useState(() => {
    const saved = localStorage.getItem('customColors');
    return saved ? JSON.parse(saved) : null;
  });

  // Sync with settings when they load
  useEffect(() => {
    if (!settingsLoading && settings) {
      // If the database has color settings, use them as overrides
      const dbColors = {};
      let hasDbColors = false;
      const colorKeys = ['primary', 'secondary', 'accent', 'background', 'surface', 'text', 'textSecondary', 'border', 'success', 'warning', 'error'];

      colorKeys.forEach(key => {
        if (settings[key]) {
          dbColors[key] = settings[key];
          hasDbColors = true;
        }
      });

      if (hasDbColors) {
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
  
  // Compute final colors
  const colors = useMemo(() => {
    // If we have custom colors, use them
    if (localCustomColors) {
      return localCustomColors;
    }

    let basePalette;
    if (isDark) {
      const darkPaletteKey = localPaletteKey + 'Dark';
      basePalette = colorPalettes[darkPaletteKey] || colorPalettes['classicBlueDark'];
    } else {
      basePalette = colorPalettes[localPaletteKey] || colorPalettes[defaultPalette];
    }

    return basePalette;
  }, [isDark, localPaletteKey, localCustomColors]);

  // Apply colors when colors change
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
