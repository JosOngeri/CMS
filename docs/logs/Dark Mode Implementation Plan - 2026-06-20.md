# Dark Mode Implementation Plan

**Date:** 2026-06-20  
**Project:** KMainCMS  
**Goal:** Implement palette-based dark mode across the entire frontend codebase

---

## Problem Statement

1. **Complex dual-mode system**: Current implementation has separate `colors` and `dark` properties in each palette, making it complex to manage
2. **Dark mode toggle issue**: The `toggleDarkMode` function resets colors to hardcoded `darkColors`/`lightColors`, losing custom palette overrides
3. **Missing dark variants**: Most components use light-only Tailwind classes (e.g., `bg-white`, `text-gray-900`) without dark variants
4. **Hardcoded colors in CSS**: CSS files contain hardcoded colors that don't respond to palette changes
5. **Inline styles with hardcoded colors**: Many components use inline styles with hardcoded hex colors instead of CSS variables
6. **Unnecessary complexity**: The `dark` class and `isDark` state add unnecessary complexity when palettes should be self-contained

---

## Audit Results

### Files with Hardcoded Hex Colors (28 files)
- `frontend/src/contexts/ToastContext.jsx`
- `frontend/src/pages/departments/DepartmentDashboard.jsx`
- `frontend/src/components/public/HeroSection.jsx`
- `frontend/src/pages/telegram/*.jsx` (multiple files)
- `frontend/src/pages/auth/*.jsx` (multiple files)
- `frontend/src/components/settings/SettingColor.jsx`
- `frontend/src/components/sms/SMSAnalytics.jsx`
- `frontend/src/App.css`
- `frontend/src/index.css`
- `frontend/src/config/colorPalettes.js` (expected - this is the palette config)
- `frontend/src/styles/dashboard.css`
- `frontend/src/pages/departments/CategoryManagement.jsx`
- `frontend/src/components/settings/PaletteSelector.jsx` (expected - palette definitions)
- `frontend/src/components/settings/PalettePreviewCard.jsx`

### Files with Inline Styles (30+ files)
- `frontend/src/pages/departments/DepartmentDashboard.jsx` (26 matches)
- `frontend/src/components/ui/Modal.jsx`
- `frontend/src/pages/telegram/TelegramPhotoUpload.jsx` (16 matches)
- `frontend/src/pages/auth/Login.jsx` (11 matches)
- `frontend/src/pages/telegram/TelegramChannels.jsx` (31 matches)
- `frontend/src/pages/auth/EmailVerification.jsx` (15 matches)
- `frontend/src/pages/auth/Sessions.jsx` (19 matches)
- `frontend/src/pages/auth/MFASetup.jsx` (18 matches)
- `frontend/src/pages/auth/ResetPassword.jsx` (23 matches)
- `frontend/src/pages/telegram/TelegramCacheHealth.jsx` (35 matches)
- `frontend/src/pages/telegram/TelegramSettings.jsx` (36 matches)
- `frontend/src/components/gallery/ApplePhotoGrid.jsx`
- `frontend/src/components/gallery/GalleryNavigation.jsx`
- `frontend/src/components/common/SidebarMenuItem.jsx`
- `frontend/src/components/common/Loading.jsx`
- `frontend/src/components/common/GmailMessageList.jsx`
- `frontend/src/components/common/EmptyState.jsx`
- `frontend/src/components/ui/Input.jsx`
- `frontend/src/pages/departments/components/DepartmentBranding.jsx` (24 matches)
- `frontend/src/pages/content/ContentManagement.jsx` (25 matches)
- `frontend/src/pages/telegram/TelegramPostMessage.jsx` (16 matches)
- `frontend/src/pages/telegram/TelegramPosts.jsx` (23 matches)
- `frontend/src/pages/departments/components/PermissionManagement.jsx` (30 matches)
- `frontend/src/pages/departments/components/ComponentAllocation.jsx` (26 matches)
- `frontend/src/components/ui/Card.jsx`
- `frontend/src/layouts/AuthLayout.jsx`
- `frontend/src/pages/departments/CategoryManagement.jsx`
- `frontend/src/components/settings/PalettePreviewCard.jsx`

### CSS Files with Hardcoded Colors

#### `frontend/src/index.css`
- Has CSS variables defined (good)
- But also has hardcoded colors in Tailwind component classes (lines 73-118)
- `@layer components` section uses hardcoded colors like `bg-white`, `text-gray-900`, etc.

#### `frontend/src/App.css`
- Hardcoded scrollbar colors (lines 5-7)
- Hardcoded glass morphism colors (lines 10-20)

#### `frontend/src/styles/dashboard.css`
- Hardcoded colors throughout (lines 10-127)
- Has some dark mode support with `.dark` selectors (good)
- But colors are hardcoded, not using CSS variables

---

## Solution Approach

### Core Principle: Everything Calls from Palette

**Dark mode is just another palette option.** Each palette is self-contained with 11 colors. No separate "dark mode" concept - just switch between palettes.

### Palette Structure (11 colors per palette)

Each palette contains:
1. `primary` - Main brand color
2. `secondary` - Secondary brand color
3. `accent` - Accent/highlight color
4. `background` - Page background
5. `surface` - Card/component background
6. `text` - Primary text color
7. `textSecondary` - Secondary text color
8. `border` - Border color
9. `error` - Error state color
10. `success` - Success state color
11. `warning` - Warning state color

**Example:**
```javascript
// Light palette
classicBlue: {
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
}

// Dark palette (just another palette option)
midnightDark: {
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
}
```

### 1. Simplify ColorPaletteContext
- **Remove** `isDark` state - not needed
- **Remove** `toggleDarkMode` function - not needed
- **Remove** `setDarkMode` function - not needed
- **Remove** `isDarkColor` helper - not needed
- **Keep** `setPalette` function - this is the only way to switch colors
- **Update** `applyColorsToDOM` to NOT apply `dark` class
- **Remove** separate `lightColors` and `darkColors` - use palettes directly
- **Keep** `updateColors` for individual color overrides

### 2. Simplify PaletteSelector
- **Keep** `setPalette` usage
- **Remove** any dark mode toggle UI
- Just show all palette options (including dark palettes)

### 3. Component Updates - Use CSS Variables
- **Replace ALL hardcoded Tailwind classes with CSS variables**
- `bg-white` → `bg-[var(--color-surface)]`
- `text-gray-900` → `text-[var(--color-text)]`
- `text-gray-500` → `text-[var(--color-textSecondary)]`
- `border-gray-200` → `border-[var(--color-border)]`
- No need for `dark:` variants - CSS variables automatically respond to palette changes

### 4. CSS File Updates - Use CSS Variables
- Replace ALL hardcoded colors in CSS files with CSS variables
- Remove all `.dark` selectors (not needed)
- Tailwind component classes should use CSS variables

### 5. Inline Style Updates - Use CSS Variables
- Replace ALL hardcoded hex colors in inline styles with CSS variables
- `style={{ backgroundColor: '#ffffff' }}` → `style={{ backgroundColor: 'var(--color-surface)' }}`
- `style={{ color: '#1e293b' }}` → `style={{ color: 'var(--color-text)' }}`

### 6. Dynamic Patterns - Use CSS Variables
- Dynamic `className={` patterns should include CSS variables
- Dynamic `style={` patterns should use CSS variables

### 7. Update colorPalettes.js
- Remove the nested `dark` property from each palette
- Add `accent` color to each palette
- Ensure each palette has exactly 11 colors
- Dark palettes are just separate palette options (e.g., `midnightDark`)

---

## Implementation Plan

### Phase 1: Core Context Updates

#### File: `frontend/src/contexts/ColorPaletteContext.jsx`

**Changes:**
1. **Remove** `isDark` state - not needed
2. **Remove** `toggleDarkMode` function - not needed
3. **Remove** `setDarkMode` function - not needed
4. **Remove** `isDarkColor` helper function - not needed
5. **Remove** separate `lightColors` and `darkColors` constants
6. **Update** `applyColorsToDOM` to NOT apply `dark` class
7. **Add** `setPalette` function that applies a palette directly
8. **Keep** `updateColors` for individual color overrides
9. **Update** provider value to expose `setPalette` only

**Simplified Context:**
```jsx
export const ColorPaletteProvider = ({ children }) => {
  const { settings, getSetting, updateSetting } = useSettings();
  const [colors, setColors] = useState(lightColors);

  // Load colors from settings on mount
  useEffect(() => {
    const primary = getSetting('primary_color');
    const secondary = getSetting('secondary_color');
    const background = getSetting('background_color');
    const text = getSetting('text_color');
    const selectedPalette = getSetting('selected_palette');

    if (selectedPalette) {
      // Load from saved palette
      const palette = getPalette(selectedPalette);
      const newColors = {
        ...palette,
        primary: primary || palette.primary,
        secondary: secondary || palette.secondary,
        background: background || palette.background,
        text: text || palette.text,
      };
      setColors(newColors);
      applyColorsToDOM(newColors);
    } else if (primary || secondary || background || text) {
      // Load from individual color settings
      const newColors = {
        ...lightColors,
        primary: primary || lightColors.primary,
        secondary: secondary || lightColors.secondary,
        background: background || lightColors.background,
        text: text || lightColors.text,
      };
      setColors(newColors);
      applyColorsToDOM(newColors);
    } else {
      setColors(lightColors);
      applyColorsToDOM(lightColors);
    }
  }, [settings, getSetting]);

  // Set a palette (the only way to switch colors)
  const setPalette = (palette) => {
    setColors(palette);
    updateSetting('selected_palette', palette.name);
    applyColorsToDOM(palette);
  };

  // Update individual colors without changing palette
  const updateColors = (newColors) => {
    setColors(newColors);
    applyColorsToDOM(newColors);
  };

  return (
    <ColorPaletteContext.Provider value={{ colors, setPalette, updateColors }}>
      {children}
    </ColorPaletteContext.Provider>
  );
};
```

**Simplified applyColorsToDOM:**
```jsx
function applyColorsToDOM(colors) {
  const root = document.documentElement;
  
  // Apply base colors
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  // Generate and apply primary shades
  const primaryShades = generateShades(colors.primary);
  Object.entries(primaryShades).forEach(([shade, value]) => {
    root.style.setProperty(`--color-primary-${shade}`, value);
  });

  // Generate and apply secondary shades
  const secondaryShades = generateShades(colors.secondary);
  Object.entries(secondaryShades).forEach(([shade, value]) => {
    root.style.setProperty(`--color-secondary-${shade}`, value);
  });
  
  // NO dark class application - not needed
}
```

---

### Phase 2: Palette Selector Update

#### File: `frontend/src/components/settings/PaletteSelector.jsx`

**Changes:**
- Replace `setColors` with `setPalette`
- When a palette is selected, call `setPalette(palette)` instead of `setColors(palette)`
- Remove any dark mode toggle UI (not needed)
- **Add color pickers for all 11 palette colors** (currently only has 4)
- Add color pickers for: `accent`, `surface`, `textSecondary`, `border`, `success`, `warning`, `error`

**Before:**
```jsx
const { setColors } = useColorPalette();
const handlePaletteSelect = (palette) => {
  setColors(palette);
};

// Only 4 color pickers (primary, secondary, background, text)
```

**After:**
```jsx
const { setPalette } = useColorPalette();
const handlePaletteSelect = (palette) => {
  setPalette(palette);
};

// 11 color pickers for all palette colors:
// - primary
// - secondary
// - accent (NEW)
// - background
// - surface (NEW)
// - text
// - textSecondary (NEW)
// - border (NEW)
// - success (NEW)
// - warning (NEW)
// - error (NEW)
```

---

### Phase 3: Update colorPalettes.js

#### File: `frontend/src/config/colorPalettes.js`

**Changes:**
- Remove the nested `dark` property from each palette
- Add `accent` color to each palette
- Ensure each palette has exactly 11 colors
- Dark palettes are just separate palette options (e.g., `midnightDark`)

**Before:**
```javascript
classicBlue: {
  name: 'Classic Blue',
  colors: {
    primary: '#2563eb',
    secondary: '#f59e0b',
    background: '#e5e7eb',
    surface: '#ffffff',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#d1d5db',
    success: '#16a34a',
    warning: '#ea580c',
    error: '#dc2626'
  },
  dark: {
    primary: '#3b82f6',
    secondary: '#fbbf24',
    background: '#1f2937',
    surface: '#374151',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    border: '#4b5563',
    success: '#22c55e',
    warning: '#f97316',
    error: '#ef4444'
  }
}
```

**After:**
```javascript
classicBlue: {
  name: 'Classic Blue',
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

midnightDark: {
  name: 'Midnight Dark',
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
}
```

---

### Phase 4: Component Dark Mode Variants

#### Class Mapping Reference

| Light Class | Dark Variant |
|-------------|---------------|
| `bg-white` | `dark:bg-gray-800` |
| `bg-gray-50` | `dark:bg-gray-900` |
| `bg-gray-100` | `dark:bg-gray-800` |
| `text-gray-900` | `dark:text-gray-100` |
| `text-gray-800` | `dark:text-gray-100` |
| `text-gray-600` | `dark:text-gray-400` |
| `text-gray-500` | `dark:text-gray-400` |
| `border-gray-200` | `dark:border-gray-700` |
| `border-gray-300` | `dark:border-gray-700` |

#### Priority 1: Core Dashboard & Settings (High Impact)

| File | Key Classes to Update |
|------|----------------------|
| `frontend/src/pages/dashboard/Dashboard.jsx` | `bg-white` → `bg-white dark:bg-gray-800`, `text-gray-900` → `text-gray-900 dark:text-gray-100` |
| `frontend/src/pages/dashboard/DashboardHome.jsx` | `text-gray-900` → `text-gray-900 dark:text-gray-100` |
| `frontend/src/pages/settings/Settings.jsx` | `bg-white`, `bg-gray-50`, `text-gray-900`, `text-gray-500`, `border-gray-300` → add dark variants |
| `frontend/src/components/settings/PaletteSelector.jsx` | `bg-gray-50`, `border-gray-300`, `text-gray-900` → add dark variants |

#### Priority 2: Common UI Components (Used Everywhere)

| File | Key Classes to Update |
|------|----------------------|
| `frontend/src/components/common/Sidebar.jsx` | `bg-white`, `text-gray-800`, `text-gray-500` → add dark variants |
| `frontend/src/components/common/Header.jsx` | `bg-white`, `text-gray-900`, `text-gray-500`, `border-gray-200` → add dark variants |
| `frontend/src/components/common/DataTable.jsx` | `bg-gray-50`, `bg-gray-100`, `border-gray-300`, `text-gray-600` → add dark variants |
| `frontend/src/components/common/SearchAndFilter.jsx` | `bg-white`, `bg-gray-100`, `border-gray-300`, `text-gray-500` → add dark variants |
| `frontend/src/components/common/Pagination.jsx` | `bg-gray-100`, `border-gray-300`, `text-gray-600` → add dark variants |
| `frontend/src/components/common/TabNavigation.jsx` | `bg-gray-100`, `border-gray-200`, `text-gray-600` → add dark variants |

#### Priority 3: Module Pages (Members, Gallery, Departments, Treasury)

| File | Key Classes to Update |
|------|----------------------|
| `frontend/src/pages/members/MembersList.jsx` | `bg-white`, `bg-gray-50`, `bg-gray-100`, `text-gray-900`, `text-gray-600`, `text-gray-500`, `border-gray-200`, `border-gray-300` → add dark variants |
| `frontend/src/pages/gallery/GalleryManagement.jsx` | `bg-white`, `bg-gray-50`, `bg-gray-100`, `text-gray-900`, `text-gray-600`, `border-gray-300` → add dark variants |
| `frontend/src/pages/departments/DepartmentDashboard.jsx` | `bg-white`, `bg-gray-50`, `bg-gray-100`, `text-gray-900`, `text-gray-600`, `border-gray-200`, `border-gray-300` → add dark variants |
| `frontend/src/pages/treasury/TreasuryDashboard.jsx` | `bg-white`, `bg-gray-50`, `bg-gray-100`, `text-gray-900`, `text-gray-600`, `border-gray-300` → add dark variants |
| `frontend/src/pages/users/UserManagement.jsx` | `bg-white`, `bg-gray-100`, `text-gray-900`, `text-gray-600`, `border-gray-200`, `border-gray-300` → add dark variants |

#### Priority 4: Profile, Analytics, & Other Pages

| File | Key Classes to Update |
|------|----------------------|
| `frontend/src/pages/profile/Profile.jsx` | `bg-white`, `bg-gray-50`, `text-gray-900`, `text-gray-600`, `text-gray-500` → add dark variants |
| `frontend/src/pages/analytics/Analytics.jsx` | `bg-white`, `text-gray-900`, `text-gray-500` → add dark variants |
| `frontend/src/pages/payments/MyPayments.jsx` | `bg-white`, `bg-gray-50`, `bg-gray-100`, `text-gray-900`, `text-gray-500` → add dark variants |
| `frontend/src/pages/security/Security.jsx` | `bg-white`, `bg-gray-100`, `text-gray-900`, `text-gray-600`, `border-gray-300` → add dark variants |
| `frontend/src/pages/content/Content.jsx` | `bg-white`, `bg-gray-50`, `bg-gray-100` → add dark variants |

---

## Phase 4: CSS File Updates

### File: `frontend/src/index.css`

**Changes:**
- Update `@layer components` section to use CSS variables
- Add dark variants to all component classes

**Before:**
```css
@layer components {
  .card       { @apply bg-white rounded-2xl shadow-md transition-all duration-200; }
  .input {
    @apply w-full px-4 py-2.5 rounded-xl border border-gray-300
           bg-white text-gray-900 placeholder-gray-400
           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
           transition-colors duration-150;
  }
  .label { @apply block text-sm font-medium text-gray-700 mb-1.5; }
  .section-title { @apply text-xl font-semibold text-gray-900; }
  .page-title    { @apply text-2xl font-bold text-gray-900; }
  .page-subtitle { @apply text-gray-500; }
  .btn-primary { @apply btn bg-blue-800 text-white hover:bg-blue-900 focus:ring-blue-700 shadow-md hover:shadow-lg; }
  .btn-secondary { @apply btn bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400; }
  .table-header    { @apply bg-gray-50; }
  .table-header th { @apply px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider; }
  .table-row       { @apply hover:bg-gray-50 transition-colors; }
  .table-divider   { @apply divide-y divide-gray-200; }
  .table-cell          { @apply text-sm text-gray-900; }
  .table-cell-secondary { @apply text-sm text-gray-500; }
  .select {
    @apply px-4 py-2.5 border border-gray-300 bg-white text-gray-900
           rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500;
  }
  .panel { @apply bg-white shadow rounded-2xl p-6 mb-6; }
  .section-divider { @apply border-t border-gray-100 my-8; }
}
```

**After:**
```css
@layer components {
  .card       { 
    @apply rounded-2xl shadow-md transition-all duration-200;
    background-color: var(--color-surface);
  }
  .dark .card {
    background-color: var(--color-surface);
  }
  .input {
    @apply w-full px-4 py-2.5 rounded-xl
           placeholder-gray-400
           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
           transition-colors duration-150;
    background-color: var(--color-surface);
    color: var(--color-text);
    border-color: var(--color-border);
  }
  .label { 
    @apply block text-sm font-medium mb-1.5;
    color: var(--color-text);
  }
  .section-title { 
    @apply text-xl font-semibold;
    color: var(--color-text);
  }
  .page-title    { 
    @apply text-2xl font-bold;
    color: var(--color-text);
  }
  .page-subtitle { 
    color: var(--color-textSecondary);
  }
  .btn-primary { 
    @apply btn text-white shadow-md hover:shadow-lg;
    background-color: var(--color-primary);
  }
  .btn-primary:hover {
    filter: brightness(0.9);
  }
  .btn-secondary { 
    @apply btn focus:ring-gray-400;
    background-color: var(--color-background);
    color: var(--color-text);
  }
  .btn-secondary:hover {
    background-color: var(--color-border);
  }
  .table-header    { 
    background-color: var(--color-background);
  }
  .table-header th { 
    @apply px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider;
    color: var(--color-textSecondary);
  }
  .table-row       { 
    @apply transition-colors;
  }
  .table-row:hover {
    background-color: var(--color-background);
  }
  .table-divider   { 
    border-color: var(--color-border);
  }
  .table-cell          { 
    @apply text-sm;
    color: var(--color-text);
  }
  .table-cell-secondary { 
    @apply text-sm;
    color: var(--color-textSecondary);
  }
  .select {
    @apply px-4 py-2.5 rounded-xl
           focus:outline-none focus:ring-2 focus:ring-blue-500;
    background-color: var(--color-surface);
    color: var(--color-text);
    border-color: var(--color-border);
  }
  .panel { 
    @apply shadow rounded-2xl p-6 mb-6;
    background-color: var(--color-surface);
  }
  .section-divider { 
    @apply border-t my-8;
    border-color: var(--color-border);
  }
}
```

---

### File: `frontend/src/App.css`

**Changes:**
- Replace hardcoded scrollbar colors with CSS variables
- Replace hardcoded glass morphism colors with CSS variables

**Before:**
```css
::-webkit-scrollbar-track { background: #f1f5f9; }
::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #64748b; }

.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.dark .glass {
  background: rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

**After:**
```css
::-webkit-scrollbar-track { 
  background: var(--color-background); 
}
::-webkit-scrollbar-thumb { 
  background: var(--color-textSecondary); 
  border-radius: 4px; 
}
::-webkit-scrollbar-thumb:hover { 
  background: var(--color-text); 
}

.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.dark .glass {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

---

### File: `frontend/src/styles/dashboard.css`

**Changes:**
- Replace hardcoded colors with CSS variables
- Ensure dark mode selectors use CSS variables

**Before:**
```css
.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.dark .page-title {
  color: #f8fafc;
}

.page-subtitle {
  color: #64748b;
  font-size: 1rem;
}

.dark .page-subtitle {
  color: #cbd5e1;
}

.stat-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.stat-label {
  color: #64748b;
}

.dark .stat-label {
  color: #94a3b8;
}

.stat-value {
  color: #1e293b;
}

.dark .stat-value {
  color: #f8fafc;
}

.card {
  background: white;
  border: 1px solid #e5e7eb;
}

.dark .card {
  background: #1f2937;
  border-color: #374151;
}
```

**After:**
```css
.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.page-subtitle {
  color: var(--color-textSecondary);
  font-size: 1rem;
}

.stat-icon {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-700) 100%);
  color: white;
}

.stat-label {
  color: var(--color-textSecondary);
}

.stat-value {
  color: var(--color-text);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
```

---

## Phase 5: Inline Style Updates

### Priority 1: High-Impact Components

| File | Inline Style Changes |
|------|---------------------|
| `frontend/src/pages/departments/DepartmentDashboard.jsx` | Replace `style={{ color: '#...' }}` with `style={{ color: 'var(--color-...)' }}` |
| `frontend/src/pages/telegram/TelegramSettings.jsx` | Replace all inline color/background styles with CSS variables |
| `frontend/src/pages/telegram/TelegramCacheHealth.jsx` | Replace all inline color/background styles with CSS variables |
| `frontend/src/pages/telegram/TelegramChannels.jsx` | Replace all inline color/background styles with CSS variables |
| `frontend/src/pages/content/ContentManagement.jsx` | Replace all inline color/background styles with CSS variables |
| `frontend/src/pages/departments/components/DepartmentBranding.jsx` | Replace all inline color/background styles with CSS variables |

### Priority 2: Auth Pages

| File | Inline Style Changes |
|------|---------------------|
| `frontend/src/pages/auth/Login.jsx` | Replace inline styles with CSS variables |
| `frontend/src/pages/auth/EmailVerification.jsx` | Replace inline styles with CSS variables |
| `frontend/src/pages/auth/Sessions.jsx` | Replace inline styles with CSS variables |
| `frontend/src/pages/auth/MFASetup.jsx` | Replace inline styles with CSS variables |
| `frontend/src/pages/auth/ResetPassword.jsx` | Replace inline styles with CSS variables |

### Priority 3: UI Components

| File | Inline Style Changes |
|------|---------------------|
| `frontend/src/components/ui/Modal.jsx` | Replace inline styles with CSS variables |
| `frontend/src/components/ui/Button.jsx` | Replace inline styles with CSS variables |
| `frontend/src/components/ui/Input.jsx` | Replace inline styles with CSS variables |
| `frontend/src/components/ui/Card.jsx` | Replace inline styles with CSS variables |
| `frontend/src/components/common/Loading.jsx` | Replace inline styles with CSS variables |
| `frontend/src/components/common/EmptyState.jsx` | Replace inline styles with CSS variables |
| `frontend/src/components/common/GmailMessageList.jsx` | Replace inline styles with CSS variables |

### Priority 4: Gallery & Telegram Components

| File | Inline Style Changes |
|------|---------------------|
| `frontend/src/components/gallery/ApplePhotoGrid.jsx` | Replace inline styles with CSS variables |
| `frontend/src/components/gallery/GalleryNavigation.jsx` | Replace inline styles with CSS variables |
| `frontend/src/pages/telegram/TelegramPhotoUpload.jsx` | Replace inline styles with CSS variables |
| `frontend/src/pages/telegram/TelegramPostMessage.jsx` | Replace inline styles with CSS variables |
| `frontend/src/pages/telegram/TelegramPosts.jsx` | Replace inline styles with CSS variables |

### Priority 5: Department Components

| File | Inline Style Changes |
|------|---------------------|
| `frontend/src/pages/departments/components/PermissionManagement.jsx` | Replace inline styles with CSS variables |
| `frontend/src/pages/departments/components/ComponentAllocation.jsx` | Replace inline styles with CSS variables |
| `frontend/src/pages/departments/CategoryManagement.jsx` | Replace inline styles with CSS variables |

---

## Inline Style Migration Guide

### Common Pattern: Background Color

**Before:**
```jsx
<div style={{ backgroundColor: '#ffffff' }}>
```

**After:**
```jsx
<div style={{ backgroundColor: 'var(--color-surface)' }}>
```

### Common Pattern: Text Color

**Before:**
```jsx
<span style={{ color: '#1e293b' }}>
```

**After:**
```jsx
<span style={{ color: 'var(--color-text)' }}>
```

### Common Pattern: Border Color

**Before:**
```jsx
<div style={{ borderColor: '#e5e7eb' }}>
```

**After:**
```jsx
<div style={{ borderColor: 'var(--color-border)' }}>
```

### Common Pattern: Gradient

**Before:**
```jsx
<div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
```

**After:**
```jsx
<div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-700) 100%)' }}>
```

### Common Pattern: Dynamic Color Based on State

**Before:**
```jsx
<div style={{ 
  color: isActive ? '#10b981' : '#64748b' 
}}>
```

**After:**
```jsx
<div style={{ 
  color: isActive ? 'var(--color-success)' : 'var(--color-textSecondary)' 
}}>
```

---

## CSS Variable Migration Guide

### Core Principle: Replace Hardcoded Colors with CSS Variables

**Before (hardcoded Tailwind classes):**
```jsx
<div className="bg-white dark:bg-gray-800">
  <h3 className="text-gray-900 dark:text-gray-100">Title</h3>
</div>
```

**After (CSS variables from palette):**
```jsx
<div className="bg-[var(--color-surface)]">
  <h3 className="text-[var(--color-text)]">Title</h3>
</div>
```

**Before (inline styles):**
```jsx
<div style={{ backgroundColor: '#ffffff' }}>
  <span style={{ color: '#1e293b' }}>Text</span>
</div>
```

**After (CSS variables):**
```jsx
<div style={{ backgroundColor: 'var(--color-surface)' }}>
  <span style={{ color: 'var(--color-text)' }}>Text</span>
</div>
```

### Available CSS Variables

**Base Colors:**
- `--color-primary` - Primary brand color
- `--color-secondary` - Secondary brand color
- `--color-accent` - Accent color
- `--color-background` - Page background
- `--color-surface` - Card/component background
- `--color-text` - Primary text color
- `--color-textSecondary` - Secondary text color
- `--color-border` - Border color
- `--color-error` - Error color
- `--color-success` - Success color
- `--color-warning` - Warning color

**Primary Shades (auto-generated):**
- `--color-primary-50` to `--color-primary-900`

**Secondary Shades (auto-generated):**
- `--color-secondary-50` to `--color-secondary-900`

### Class Mapping Reference

| Hardcoded Class | CSS Variable Version |
|-----------------|---------------------|
| `bg-white` | `bg-[var(--color-surface)]` |
| `bg-gray-50` | `bg-[var(--color-background)]` |
| `bg-gray-100` | `bg-[var(--color-surface)]` |
| `text-gray-900` | `text-[var(--color-text)]` |
| `text-gray-800` | `text-[var(--color-text)]` |
| `text-gray-600` | `text-[var(--color-textSecondary)]` |
| `text-gray-500` | `text-[var(--color-textSecondary)]` |
| `border-gray-200` | `border-[var(--color-border)]` |
| `border-gray-300` | `border-[var(--color-border)]` |

---

## Implementation Order (Optimized for Find-and-Replace)

### Structural Changes (Prerequisites)
1. **Phase 1**: Simplify `ColorPaletteContext.jsx` (remove dark mode logic)
2. **Phase 2**: Update `colorPalettes.js` (remove nested dark, add accent)
3. **Phase 3**: Update `PaletteSelector.jsx` (use `setPalette`, add 7 color pickers)

### Find-and-Replace Operations (Grouped by Type)
4. **Phase 4**: Update CSS files - replace hardcoded colors with CSS variables
5. **Phase 5**: Update inline styles - replace hardcoded colors with CSS variables
6. **Phase 6**: Update all component classes - replace Tailwind classes with CSS variables

**Rationale:** Phases 4-6 are all similar find-and-replace operations that can be done systematically using the same patterns across all files.

**Important:** Phase 6 will cover ALL files found in the grep audit (200+ files total), including:
- 129 files with `bg-white`
- 90 files with `bg-gray-50`
- 89 files with `bg-gray-100`
- 103 files with `text-gray-600`
- 138 files with `text-gray-500`
- 85 files with `text-gray-900`
- 50 files with `border-gray-200`
- 75 files with `border-gray-300`
- And all other files with relevant Tailwind color classes

The find-and-replace will be applied globally to the entire frontend codebase, not just to specific files listed in examples.

---

## Testing Checklist

- [ ] Selecting any palette (including dark palettes) updates all colors correctly
- [ ] All 11 color pickers work and update the palette in real-time
- [ ] CSS variables are applied to the root element when palette changes
- [ ] All cards/sections display correctly with any palette
- [ ] Text contrast is readable with all palettes
- [ ] Borders are visible with all palettes
- [ ] Settings persist across page refreshes
- [ ] No `dark` class is applied to root element (not needed)
- [ ] All hardcoded Tailwind classes have been replaced with CSS variables
- [ ] All inline styles use CSS variables instead of hex colors

---

## Notes

### Match Counts (Updated After Re-Audit)

| Pattern | Total Matches (className) | Total Matches (all) | Files Affected |
|---------|---------------------------|---------------------|----------------|
| `bg-white` | 625 matches | 662 matches | 129 files |
| `bg-gray-50` | 217 matches | 232 matches | 90 files |
| `bg-gray-100` | 110 matches | 197 matches | 89 files |
| `text-gray-900` | 642 matches | 661 matches | 85 files |
| `text-gray-600` | 309 matches | 335 matches | 103 files |
| `text-gray-500` | 497 matches | 520 matches | 138 files |
| `border-gray-200` | 125 matches | 136 matches | 50 files |
| `border-gray-300` | 387 matches | 418 matches | 75 files |
| `#[0-9a-fA-F]{6}` (hex colors) | N/A | 350 matches | 28 files |
| `style=\{.*color:` (inline styles) | 308 matches | 450 matches | 30 files |
| `style=\{.*backgroundColor` | 160 matches | 279 matches | 34 files |
| `color:` (CSS) | N/A | 505 matches | 49 files |
| `className=\{` (dynamic) | 292 matches | N/A | ~50 files |
| `style=\{` (dynamic) | 552 matches | N/A | ~50 files |

### Summary
- **Total files with hardcoded hex colors**: 28
- **Total files with inline styles**: 30
- **Total files with backgroundColor**: 34
- **Total files with CSS color declarations**: 49
- **Total CSS files to update**: 3 (`index.css`, `App.css`, `dashboard.css`)
- **Total className patterns to update**: ~2,900 matches
- **Total inline style patterns to update**: ~468 matches
- **Total dynamic className/style patterns**: ~844 matches

This is a large-scale change affecting approximately **4,200+ individual matches** across **200+ files**. Consider implementing in phases and testing each phase before proceeding to the next.
