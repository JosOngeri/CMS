/**
 * Church-Focused Color Palette
 * 
 * A distinctive church-focused color palette with warm, inviting colors
 * that reflect spiritual growth, community, and stewardship.
 * 
 * Design Philosophy:
 * - Warm, inviting colors (not corporate cold blues)
 * - Spiritual growth metaphors (natural greens, golden accents)
 * - Community-focused colors (warm oranges, rich purples)
 * - Stewardship colors (warm ambers, soft reds)
 * - Accessibility-first with WCAG 2.1 AA compliance
 */

// Helper function to generate color shades
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

// Church Warm Palette - Light Mode
export const churchWarm = {
  name: 'Church Warm',
  description: 'Warm, inviting church-focused palette with spiritual growth metaphors',
  accessibilityRating: 'WCAG 2.1 AA',
  
  // Primary: Warm, inviting soft blue (not corporate cold blue)
  // Represents peace, clarity, and guidance
  primary: '#4A6FA5',
  
  // Secondary: Natural green for spiritual growth
  // Represents growth, renewal, and spiritual journey
  secondary: '#6B8E23',
  
  // Accent: Warm orange for community and fellowship
  // Represents warmth, gathering, and community
  accent: '#E07A5F',
  
  // Success: Warm golden yellow for abundance and blessing
  // Represents blessing, abundance, and gratitude
  success: '#D4A017',
  
  // Warning: Warm amber for stewardship and care
  // Represents stewardship, careful attention, and pastoral care
  warning: '#CC8E35',
  
  // Error: Soft red for critical attention
  // Represents urgency while maintaining warmth
  error: '#C45C3E',
  
  // Background: Off-white with warmth (not clinical white)
  // Represents warmth and welcome
  background: '#FEFDFB',
  
  // Surface: Warm white with subtle warmth
  // Represents clean but approachable surfaces
  surface: '#FAF8F5',
  
  // Text: High contrast dark with warmth (not pure black)
  // Represents readability with warmth
  text: '#2C3E50',
  
  // Text Secondary: Medium contrast with warmth
  // Represents supporting text with warmth
  textSecondary: '#5D6D7E',
  
  // Border: Soft, warm gray (not cold gray)
  // Represents gentle separation
  border: '#E8E4E0'
};

// Church Warm Palette - Dark Mode
export const churchWarmDark = {
  name: 'Church Warm Dark',
  description: 'Warm church-focused palette in dark mode',
  accessibilityRating: 'WCAG 2.1 AA',
  
  primary: '#5B8BD4',
  secondary: '#8FBC8F',
  accent: '#F0A080',
  success: '#EBC944',
  warning: '#E6B355',
  error: '#E07A5F',
  background: '#1A1F2C',
  surface: '#252B3A',
  text: '#F5F3EF',
  textSecondary: '#C5C3BF',
  border: '#3A4152'
};

// Church Warm Palette - High Contrast Mode
export const churchWarmHighContrast = {
  name: 'Church Warm High Contrast',
  description: 'High contrast mode for accessibility (7:1 contrast ratio)',
  accessibilityRating: 'WCAG 2.1 AAA',
  
  primary: '#3A5F8F',
  secondary: '#5A7E1F',
  accent: '#D06A4F',
  success: '#B49017',
  warning: '#AC7E25',
  error: '#A44C2E',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#1A1A1A',
  border: '#000000'
};

// Church Warm Palette - Large Text Mode
export const churchWarmLargeText = {
  name: 'Church Warm Large Text',
  description: 'Enhanced contrast for large text mode (24px+ base font)',
  accessibilityRating: 'WCAG 2.1 AA Enhanced',
  
  primary: '#4A6FA5',
  secondary: '#6B8E23',
  accent: '#E07A5F',
  success: '#D4A017',
  warning: '#CC8E35',
  error: '#C45C3E',
  background: '#FEFDFB',
  surface: '#FAF8F5',
  text: '#1A2A3A',
  textSecondary: '#4A5A6A',
  border: '#D8D4D0'
};

// Generate shade scales for primary and secondary colors
const primaryShades = generateShades(churchWarm.primary);
const secondaryShades = generateShades(churchWarm.secondary);

// Export shade generators for use in CSS
export const getPrimaryShades = () => primaryShades;
export const getSecondaryShades = () => secondaryShades;

// Export all church palette variants
export const churchPalettes = {
  churchWarm,
  churchWarmDark,
  churchWarmHighContrast,
  churchWarmLargeText
};

// Default church palette
export const defaultChurchPalette = 'churchWarm';

// Get church palette by key
export const getChurchPalette = (paletteKey) => {
  return churchPalettes[paletteKey] || churchPalettes[defaultChurchPalette];
};

// Get all church palette keys
export const getChurchPaletteKeys = () => Object.keys(churchPalettes);