/**
 * Spacing System
 * 
 * Consistent spacing architecture with 8px base unit and semantic spacing tokens
 * for distinctive church-focused design with accessibility excellence.
 * 
 * Design Philosophy:
 * - Base unit: 8px (maintains Tailwind compatibility)
 * - Semantic spacing tokens with clear meaning
 * - Component-specific spacing for consistency
 * - Large text mode spacing adjustments
 * - Touch-friendly target spacing
 */

// Spacing System Configuration
export const spacingSystem = {
  // Base unit: 8px (maintains Tailwind compatibility)
  baseUnit: 8,
  
  // Spacing scale with exact pixel/rem values
  scale: {
    xs: 4,      // 0.25rem - Extra small spacing
    sm: 8,      // 0.5rem - Small spacing
    md: 16,     // 1rem - Medium spacing (2x base)
    lg: 24,     // 1.5rem - Large spacing (3x base)
    xl: 32,     // 2rem - Extra large spacing (4x base)
    '2xl': 48,  // 3rem - Double extra large (6x base)
    '3xl': 64,  // 4rem - Triple extra large (8x base)
    '4xl': 96,  // 6rem - Quadruple extra large (12x base)
    '5xl': 128  // 8rem - Five times extra large (16x base)
  },
  
  // Semantic spacing tokens with usage guidelines
  semantic: {
    // Content spacing
    content: {
      xs: 8,      // Inline content spacing
      sm: 16,     // Small content blocks
      md: 24,     // Standard content sections
      lg: 32,     // Large content sections
      xl: 48      // Major content divisions
    },
    
    // Component spacing
    component: {
      xs: 12,     // Compact components
      sm: 16,     // Small components
      md: 24,     // Standard components
      lg: 32,     // Large components
      xl: 48      // Extra large components
    },
    
    // Layout spacing
    layout: {
      xs: 16,     // Tight layout
      sm: 24,     // Compact layout
      md: 32,     // Standard layout
      lg: 48,     // Spacious layout
      xl: 64,     // Extra spacious layout
      '2xl': 96   // Maximum spacing
    },
    
    // Section spacing
    section: {
      sm: 32,     // Small sections
      md: 48,     // Standard sections
      lg: 64,     // Large sections
      xl: 96      // Extra large sections
    }
  },
  
  // Component-specific spacing constants
  components: {
    // Card spacing
    card: {
      padding: {
        sm: 16,
        md: 24,
        lg: 32
      },
      margin: {
        sm: 8,
        md: 16,
        lg: 24
      },
      gap: {
        sm: 12,
        md: 16,
        lg: 24
      }
    },
    
    // Button spacing
    button: {
      padding: {
        sm: '8px 16px',
        md: '12px 20px',
        lg: '16px 24px'
      },
      gap: 8
    },
    
    // Input spacing
    input: {
      padding: {
        sm: '8px 12px',
        md: '12px 16px',
        lg: '16px 20px'
      },
      gap: 8
    },
    
    // Grid spacing
    grid: {
      gap: {
        sm: 12,
        md: 16,
        lg: 24,
        xl: 32
      }
    }
  },
  
  // Touch-friendly target spacing (minimum 48x48px)
  touchTargets: {
    minimum: 48,
    recommended: 56,
    large: 64
  }
};

// Large Text Mode Configuration
export const largeTextModeSpacing = {
  baseUnit: 8,
  
  scale: {
    xs: 6,      // Slightly increased for large text
    sm: 12,
    md: 20,
    lg: 28,
    xl: 40,
    '2xl': 56,
    '3xl': 72,
    '4xl': 104,
    '5xl': 136
  },
  
  semantic: {
    content: {
      xs: 12,
      sm: 20,
      md: 28,
      lg: 40,
      xl: 56
    },
    
    component: {
      xs: 16,
      sm: 20,
      md: 28,
      lg: 40,
      xl: 56
    },
    
    layout: {
      xs: 20,
      sm: 28,
      md: 40,
      lg: 56,
      xl: 72,
      '2xl': 104
    },
    
    section: {
      sm: 40,
      md: 56,
      lg: 72,
      xl: 104
    }
  },
  
  components: {
    card: {
      padding: {
        sm: 20,
        md: 28,
        lg: 40
      },
      margin: {
        sm: 12,
        md: 20,
        lg: 28
      },
      gap: {
        sm: 16,
        md: 20,
        lg: 28
      }
    },
    
    button: {
      padding: {
        sm: '12px 20px',
        md: '16px 24px',
        lg: '20px 32px'
      },
      gap: 12
    },
    
    input: {
      padding: {
        sm: '12px 16px',
        md: '16px 20px',
        lg: '20px 24px'
      },
      gap: 12
    },
    
    grid: {
      gap: {
        sm: 16,
        md: 20,
        lg: 28,
        xl: 40
      }
    }
  },
  
  touchTargets: {
    minimum: 56,  // Increased for large text mode
    recommended: 64,
    large: 72
  }
};

// Spacing utility functions
export const getSpacing = (size = 'md', isLargeText = false) => {
  const mode = isLargeText ? largeTextModeSpacing : spacingSystem;
  return mode.scale[size] || mode.scale.md;
};

export const getSemanticSpacing = (type = 'content', size = 'md', isLargeText = false) => {
  const mode = isLargeText ? largeTextModeSpacing : spacingSystem;
  return mode.semantic[type]?.[size] || mode.semantic.content.md;
};

export const getComponentSpacing = (component = 'card', property = 'padding', size = 'md', isLargeText = false) => {
  const mode = isLargeText ? largeTextModeSpacing : spacingSystem;
  return mode.components[component]?.[property]?.[size] || mode.components.card.padding.md;
};

export const getTouchTarget = (size = 'minimum', isLargeText = false) => {
  const mode = isLargeText ? largeTextModeSpacing : spacingSystem;
  return mode.touchTargets[size] || mode.touchTargets.minimum;
};

// Spacing class generator for CSS
export const generateSpacingClasses = (isLargeText = false) => {
  const mode = isLargeText ? largeTextModeSpacing : spacingSystem;
  
  return {
    // Scale classes
    'spacing-xs': `margin: ${mode.scale.xs}px; padding: ${mode.scale.xs}px;`,
    'spacing-sm': `margin: ${mode.scale.sm}px; padding: ${mode.scale.sm}px;`,
    'spacing-md': `margin: ${mode.scale.md}px; padding: ${mode.scale.md}px;`,
    'spacing-lg': `margin: ${mode.scale.lg}px; padding: ${mode.scale.lg}px;`,
    'spacing-xl': `margin: ${mode.scale.xl}px; padding: ${mode.scale.xl}px;`,
    'spacing-2xl': `margin: ${mode.scale['2xl']}px; padding: ${mode.scale['2xl']}px;`,
    
    // Semantic spacing classes
    'content-sm': `margin: ${mode.semantic.content.sm}px; padding: ${mode.semantic.content.sm}px;`,
    'content-md': `margin: ${mode.semantic.content.md}px; padding: ${mode.semantic.content.md}px;`,
    'content-lg': `margin: ${mode.semantic.content.lg}px; padding: ${mode.semantic.content.lg}px;`,
    
    'component-sm': `margin: ${mode.semantic.component.sm}px; padding: ${mode.semantic.component.sm}px;`,
    'component-md': `margin: ${mode.semantic.component.md}px; padding: ${mode.semantic.component.md}px;`,
    'component-lg': `margin: ${mode.semantic.component.lg}px; padding: ${mode.semantic.component.lg}px;`,
    
    // Touch target classes
    'touch-target': `min-width: ${mode.touchTargets.minimum}px; min-height: ${mode.touchTargets.minimum}px;`,
    'touch-target-large': `min-width: ${mode.touchTargets.recommended}px; min-height: ${mode.touchTargets.recommended}px;`
  };
};

// Export spacing system
export default spacingSystem;