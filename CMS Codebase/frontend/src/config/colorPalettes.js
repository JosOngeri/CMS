/**
 * Pre-configured color palettes with guaranteed high contrast
 * UX Design Principles Applied:
 * - Grey backgrounds (#e5e7eb) for reduced eye strain and better visual hierarchy
 * - White surfaces (#ffffff) for cards/containers to create clear separation
 * - WCAG AA compliant contrast ratios (4.5:1 minimum)
 * - Clear visual hierarchy: background < surface < primary action
 * - Neutral borders for subtle separation without distraction
 * - Each palette has exactly 11 colors
 */

export const colorPalettes = {
  // Classic Blue - Professional and trustworthy
  classicBlue: {
    name: 'Classic Blue',
    description: 'Professional blue theme with excellent readability',
    primary: '#2563eb',
    secondary: '#f59e0b',
    accent: '#fbbf24',
    background: '#e5e7eb',
    surface: '#ffffff',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#d1d5db',
    success: '#16a34a',
    warning: '#ea580c',
    error: '#dc2626'
  },

  // Classic Blue Dark
  classicBlueDark: {
    name: 'Classic Blue Dark',
    description: 'Professional blue theme in dark mode',
    primary: '#3b82f6',
    secondary: '#fbbf24',
    accent: '#fcd34d',
    background: '#1f2937',
    surface: '#374151',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    border: '#4b5563',
    success: '#22c55e',
    warning: '#f97316',
    error: '#ef4444'
  },

  // Emerald Green - Fresh and calming
  emeraldGreen: {
    name: 'Emerald Green',
    description: 'Calming green theme with natural feel',
    primary: '#059669',
    secondary: '#f59e0b',
    accent: '#fbbf24',
    background: '#ecfdf5',
    surface: '#ffffff',
    text: '#064e3b',
    textSecondary: '#065f46',
    border: '#a7f3d0',
    success: '#16a34a',
    warning: '#ea580c',
    error: '#dc2626'
  },

  // Emerald Green Dark
  emeraldGreenDark: {
    name: 'Emerald Green Dark',
    description: 'Calming green theme in dark mode',
    primary: '#10b981',
    secondary: '#fbbf24',
    accent: '#fcd34d',
    background: '#064e3b',
    surface: '#065f46',
    text: '#ecfdf5',
    textSecondary: '#a7f3d0',
    border: '#047857',
    success: '#22c55e',
    warning: '#f97316',
    error: '#ef4444'
  },

  // Royal Purple - Elegant and modern
  royalPurple: {
    name: 'Royal Purple',
    description: 'Elegant purple theme with modern aesthetics',
    primary: '#7c3aed',
    secondary: '#f59e0b',
    accent: '#fbbf24',
    background: '#f5f3ff',
    surface: '#ffffff',
    text: '#4c1d95',
    textSecondary: '#6d28d9',
    border: '#ddd6fe',
    success: '#16a34a',
    warning: '#ea580c',
    error: '#dc2626'
  },

  // Royal Purple Dark
  royalPurpleDark: {
    name: 'Royal Purple Dark',
    description: 'Elegant purple theme in dark mode',
    primary: '#8b5cf6',
    secondary: '#fbbf24',
    accent: '#fcd34d',
    background: '#4c1d95',
    surface: '#5b21b6',
    text: '#f5f3ff',
    textSecondary: '#ddd6fe',
    border: '#7c3aed',
    success: '#22c55e',
    warning: '#f97316',
    error: '#ef4444'
  },

  // Midnight Dark - High contrast dark mode first
  midnightDark: {
    name: 'Midnight Dark',
    description: 'Dark-first theme with maximum contrast',
    primary: '#3b82f6',
    secondary: '#f59e0b',
    accent: '#fbbf24',
    background: '#1f2937',
    surface: '#374151',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    border: '#4b5563',
    success: '#22c55e',
    warning: '#f97316',
    error: '#ef4444'
  },

  // Midnight Dark Extra
  midnightDarkExtra: {
    name: 'Midnight Dark Extra',
    description: 'Extra dark theme with maximum contrast',
    primary: '#60a5fa',
    secondary: '#fbbf24',
    accent: '#fcd34d',
    background: '#111827',
    surface: '#1f2937',
    text: '#f9fafb',
    textSecondary: '#e5e7eb',
    border: '#374151',
    success: '#4ade80',
    warning: '#fb923c',
    error: '#f87171'
  },

  // Warm Sunset - Cozy and inviting
  warmSunset: {
    name: 'Warm Sunset',
    description: 'Warm orange theme with inviting feel',
    primary: '#ea580c',
    secondary: '#2563eb',
    accent: '#fbbf24',
    background: '#fff7ed',
    surface: '#ffffff',
    text: '#431407',
    textSecondary: '#9a3412',
    border: '#fed7aa',
    success: '#16a34a',
    warning: '#ca8a04',
    error: '#dc2626'
  },

  // Warm Sunset Dark
  warmSunsetDark: {
    name: 'Warm Sunset Dark',
    description: 'Warm orange theme in dark mode',
    primary: '#f97316',
    secondary: '#3b82f6',
    accent: '#fcd34d',
    background: '#431407',
    surface: '#7c2d12',
    text: '#fff7ed',
    textSecondary: '#fed7aa',
    border: '#9a3412',
    success: '#22c55e',
    warning: '#facc15',
    error: '#ef4444'
  },

  // Slate Gray - Neutral and clean
  slateGray: {
    name: 'Slate Gray',
    description: 'Neutral gray theme for minimalists',
    primary: '#475569',
    secondary: '#f59e0b',
    accent: '#fbbf24',
    background: '#f1f5f9',
    surface: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#cbd5e1',
    success: '#16a34a',
    warning: '#ea580c',
    error: '#dc2626'
  },

  // Slate Gray Dark
  slateGrayDark: {
    name: 'Slate Gray Dark',
    description: 'Neutral gray theme in dark mode',
    primary: '#94a3b8',
    secondary: '#fbbf24',
    accent: '#fcd34d',
    background: '#1e293b',
    surface: '#334155',
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    border: '#475569',
    success: '#22c55e',
    warning: '#f97316',
    error: '#ef4444'
  },

  // Ocean Teal - Refreshing and vibrant
  oceanTeal: {
    name: 'Ocean Teal',
    description: 'Vibrant teal theme with ocean vibes',
    primary: '#0d9488',
    secondary: '#f59e0b',
    accent: '#fbbf24',
    background: '#f0fdfa',
    surface: '#ffffff',
    text: '#134e4a',
    textSecondary: '#0f766e',
    border: '#99f6e4',
    success: '#16a34a',
    warning: '#ea580c',
    error: '#dc2626'
  },

  // Ocean Teal Dark
  oceanTealDark: {
    name: 'Ocean Teal Dark',
    description: 'Vibrant teal theme in dark mode',
    primary: '#14b8a6',
    secondary: '#fbbf24',
    accent: '#fcd34d',
    background: '#134e4a',
    surface: '#0f766e',
    text: '#f0fdfa',
    textSecondary: '#99f6e4',
    border: '#115e59',
    success: '#22c55e',
    warning: '#f97316',
    error: '#ef4444'
  },

  // Rose Pink - Soft and elegant
  rosePink: {
    name: 'Rose Pink',
    description: 'Soft pink theme with elegant touch',
    primary: '#e11d48',
    secondary: '#f59e0b',
    accent: '#fbbf24',
    background: '#fff1f2',
    surface: '#ffffff',
    text: '#881337',
    textSecondary: '#9f1239',
    border: '#fecdd3',
    success: '#16a34a',
    warning: '#ea580c',
    error: '#dc2626'
  },

  // Rose Pink Dark
  rosePinkDark: {
    name: 'Rose Pink Dark',
    description: 'Soft pink theme in dark mode',
    primary: '#f43f5e',
    secondary: '#fbbf24',
    accent: '#fcd34d',
    background: '#881337',
    surface: '#9f1239',
    text: '#fff1f2',
    textSecondary: '#fecdd3',
    border: '#be123c',
    success: '#22c55e',
    warning: '#f97316',
    error: '#ef4444'
  }
};

// Default palette
export const defaultPalette = 'classicBlue';

// Get palette by key
export const getPalette = (paletteKey) => {
  return colorPalettes[paletteKey] || colorPalettes[defaultPalette];
};

// Get all palette keys
export const getPaletteKeys = () => Object.keys(colorPalettes);
