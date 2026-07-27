/**
 * Typography System
 * 
 * Deliberate type pairing with display, body, and utility faces
 * for distinctive church-focused design with accessibility excellence.
 * 
 * Design Philosophy:
 * - Display face: Characterful, memorable, used with restraint
 * - Body face: Highly readable, modern but warm
 * - Utility face: Data, captions, technical information
 * - Accessibility-first with WCAG 2.1 AA compliance
 * - Large text mode support (24px+ base font)
 */

// Typography System Configuration
export const typographySystem = {
  // Font Family Definitions
  fonts: {
    // Display face: Characterful serif for headlines and hero text
    // Used with restraint for memorable moments
    display: {
      family: "'Playfair Display', 'Georgia', 'Times New Roman', serif",
      weights: [400, 500, 600, 700],
      style: 'serif'
    },
    
    // Body face: Highly readable sans-serif for paragraphs and body text
    // Modern but warm and approachable
    body: {
      family: "'Inter', 'Segoe UI', 'system-ui', '-apple-system', 'BlinkMacSystemFont', sans-serif",
      weights: [300, 400, 500, 600, 700],
      style: 'sans-serif'
    },
    
    // Utility face: Monospace for data, captions, technical information
    utility: {
      family: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      weights: [400, 500],
      style: 'monospace'
    }
  },
  
  // Type Scale with exact pixel values
  scale: {
    // Base size: 18px (accessible default)
    base: 18,
    
    // Display sizes: Clear hierarchy for headlines
    display: {
      xl: 48,    // Hero headlines
      lg: 36,    // Page titles
      md: 24,    // Section headers
      sm: 20     // Subsection headers
    },
    
    // Body sizes: Readable text for content
    body: {
      lg: 20,    // Large body text
      md: 18,    // Standard body text (base)
      sm: 16,    // Small body text
      xs: 14     // Extra small body text
    },
    
    // Caption sizes: Supporting information
    caption: {
      md: 14,    // Standard captions
      sm: 12     // Small captions and labels
    }
  },
  
  // Line heights: Generous for readability
  lineHeight: {
    tight: 1.2,   // Display text
    normal: 1.5,  // Body text
    relaxed: 1.6,  // Long-form content
    loose: 1.8    // Large text mode
  },
  
  // Letter spacing: Optimized for readability
  letterSpacing: {
    tight: '-0.02em',   // Display text
    normal: '0em',      // Body text
    relaxed: '0.01em',  // Large text
    wide: '0.05em'      // Small text
  },
  
  // Font weights: Clear hierarchy
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  }
};

// Large Text Mode Configuration
export const largeTextMode = {
  base: 24,  // Enhanced base font size for accessibility
  
  scale: {
    display: {
      xl: 60,    // Hero headlines
      lg: 48,    // Page titles
      md: 32,    // Section headers
      sm: 28     // Subsection headers
    },
    body: {
      lg: 28,    // Large body text
      md: 24,    // Standard body text (base)
      sm: 20,    // Small body text
      xs: 18     // Extra small body text
    },
    caption: {
      md: 18,    // Standard captions
      sm: 16     // Small captions and labels
    }
  },
  
  lineHeight: {
    tight: 1.3,
    normal: 1.6,
    relaxed: 1.7,
    loose: 1.9
  },
  
  letterSpacing: {
    tight: '-0.01em',
    normal: '0.01em',
    relaxed: '0.02em',
    wide: '0.06em'
  }
};

// Typography utility functions
export const getFontFamily = (role = 'body') => {
  return typographySystem.fonts[role]?.family || typographySystem.fonts.body.family;
};

export const getFontSize = (type = 'body', size = 'md', isLargeText = false) => {
  const mode = isLargeText ? largeTextMode : typographySystem;
  return mode.scale[type]?.[size] || mode.scale.body.md;
};

export const getLineHeight = (context = 'normal', isLargeText = false) => {
  const mode = isLargeText ? largeTextMode : typographySystem;
  return mode.lineHeight[context] || mode.lineHeight.normal;
};

export const getLetterSpacing = (context = 'normal', isLargeText = false) => {
  const mode = isLargeText ? largeTextMode : typographySystem;
  return mode.letterSpacing[context] || mode.letterSpacing.normal;
};

export const getFontWeight = (weight = 'regular') => {
  return typographySystem.fontWeight[weight] || typographySystem.fontWeight.regular;
};

// Typography class generator for CSS
export const generateTypographyClasses = (isLargeText = false) => {
  const mode = isLargeText ? largeTextMode : typographySystem;
  
  return {
    // Display type classes
    'display-xl': `font-size: ${mode.scale.display.xl}px; line-height: ${mode.lineHeight.tight}; letter-spacing: ${mode.letterSpacing.tight}; font-weight: ${typographySystem.fontWeight.bold}; font-family: ${typographySystem.fonts.display.family};`,
    'display-lg': `font-size: ${mode.scale.display.lg}px; line-height: ${mode.lineHeight.tight}; letter-spacing: ${mode.letterSpacing.tight}; font-weight: ${typographySystem.fontWeight.semibold}; font-family: ${typographySystem.fonts.display.family};`,
    'display-md': `font-size: ${mode.scale.display.md}px; line-height: ${mode.lineHeight.tight}; letter-spacing: ${mode.letterSpacing.tight}; font-weight: ${typographySystem.fontWeight.semibold}; font-family: ${typographySystem.fonts.display.family};`,
    'display-sm': `font-size: ${mode.scale.display.sm}px; line-height: ${mode.lineHeight.normal}; letter-spacing: ${mode.letterSpacing.normal}; font-weight: ${typographySystem.fontWeight.medium}; font-family: ${typographySystem.fonts.display.family};`,
    
    // Body type classes
    'body-lg': `font-size: ${mode.scale.body.lg}px; line-height: ${mode.lineHeight.normal}; letter-spacing: ${mode.letterSpacing.normal}; font-weight: ${typographySystem.fontWeight.regular}; font-family: ${typographySystem.fonts.body.family};`,
    'body-md': `font-size: ${mode.scale.body.md}px; line-height: ${mode.lineHeight.normal}; letter-spacing: ${mode.letterSpacing.normal}; font-weight: ${typographySystem.fontWeight.regular}; font-family: ${typographySystem.fonts.body.family};`,
    'body-sm': `font-size: ${mode.scale.body.sm}px; line-height: ${mode.lineHeight.normal}; letter-spacing: ${mode.letterSpacing.normal}; font-weight: ${typographySystem.fontWeight.regular}; font-family: ${typographySystem.fonts.body.family};`,
    'body-xs': `font-size: ${mode.scale.body.xs}px; line-height: ${mode.lineHeight.relaxed}; letter-spacing: ${mode.letterSpacing.relaxed}; font-weight: ${typographySystem.fontWeight.regular}; font-family: ${typographySystem.fonts.body.family};`,
    
    // Caption type classes
    'caption-md': `font-size: ${mode.scale.caption.md}px; line-height: ${mode.lineHeight.relaxed}; letter-spacing: ${mode.letterSpacing.relaxed}; font-weight: ${typographySystem.fontWeight.regular}; font-family: ${typographySystem.fonts.utility.family};`,
    'caption-sm': `font-size: ${mode.scale.caption.sm}px; line-height: ${mode.lineHeight.relaxed}; letter-spacing: ${mode.letterSpacing.wide}; font-weight: ${typographySystem.fontWeight.medium}; font-family: ${typographySystem.fonts.utility.family};`
  };
};

// Export typography system
export default typographySystem;