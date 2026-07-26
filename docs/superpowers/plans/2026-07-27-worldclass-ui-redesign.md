# World-Class UI Redesign Implementation Plan

> **For agentic workers:** This plan is structured for 5-agent parallel execution. Each Part can be assigned to a different agent. REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for coordinated multi-agent execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform KMainCMS from generic admin template to distinctive church-focused UI with role-specific expression and accessibility excellence.

**Architecture:** Incremental redesign starting with design system foundation, then component library, followed by accessibility-focused MemberDashboard, then role-specific dashboards, ending with comprehensive testing and optimization.

**Tech Stack:** React, Tailwind CSS, CSS custom properties, Lucide icons, existing ColorPaletteContext, existing component structure

## Global Constraints

- WCAG 2.1 AA compliance throughout (minimum 4.5:1 contrast, 7:1 preferred)
- Base font size 18px+ for accessibility (24px+ for large text mode)
- Touch-friendly targets minimum 44x44px
- Maintain existing ColorPaletteContext architecture
- Preserve existing mobile app color scheme consistency (#3B82F6 primary, #F59E0B secondary)
- No breaking changes to existing API contracts
- Maintain React component reusability patterns
- Preserve existing authentication and permission systems
- Support existing dark mode functionality

## Agent Assignment Structure

This plan is divided into 5 Parts for parallel agent execution:

- **Part 1:** Design System Foundation - Color palette, typography system, spacing architecture
- **Part 2:** Component Library - Distinctive components replacing generic patterns
- **Part 3:** MemberDashboard Redesign - Accessibility-focused redesign for elderly members
- **Part 4:** Role-Specific Dashboard Redesigns - Pastor, Treasurer, Department Head, Super Admin
- **Part 5:** Accessibility Testing & Performance Optimization - Comprehensive validation

**Dependencies:** Parts must be executed in numerical order. Each Part includes verification tasks to ensure preceding Parts are complete before starting.

---

## Part 1: Design System Foundation

**Prerequisites:** None (this is the foundation)

**Verification Step:** Verify existing frontend structure exists at `D:\VIbeCode\KMainCMS\frontend\src\`

**Goal:** Create distinctive church-focused design system with warm, inviting color palette, deliberate typography pairing, and consistent spacing architecture.

### Subsection 1.1: Church-Focused Color Palette

**Files:**
- Create: `frontend/src/config/churchColorPalette.js`
- Modify: `frontend/src/config/colorPalettes.js`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: Existing color palette structure from colorPalettes.js
- Produces: New church-focused palette with warm, inviting colors, spiritual growth metaphors, community-focused accents

- [ ] **Step 1: Define church-focused color palette requirements**

Create color palette specification with these exact color categories:
- Primary: Warm, inviting color (not corporate blue) - consider warm earth tones or soft blues
- Secondary: Growth/spiritual metaphor color - consider natural greens or golden accents
- Accent: Community/fellowship color - consider warm oranges or rich purples
- Success: Abundance/blessing color - consider warm greens or golden yellows
- Warning: Stewardship/care color - consider warm ambers or soft reds
- Error: Critical attention color - maintain clarity but warm tone
- Background: Off-white with warmth (not clinical white)
- Surface: Warm white with subtle warmth
- Text: High contrast dark with warmth (not pure black)
- Text Secondary: Medium contrast with warmth
- Border: Soft, warm gray (not cold gray)

Each color must include 10-shade scale (50-900) for consistency with existing system.

- [ ] **Step 2: Implement churchColorPalette.js module**

Create new color palette module that exports:
- Default church palette object with all color categories
- Light and dark mode variants
- High contrast mode variant for accessibility
- Large text mode variant with enhanced contrast
- Palette metadata (name, description, accessibility rating)

Module must follow existing colorPalettes.js structure and be importable by ColorPaletteContext.

- [ ] **Step 3: Integrate church palette into colorPalettes.js**

Add church palette to existing colorPalettes object:
- Add as default palette option
- Maintain backward compatibility with existing palettes
- Add church palette to palette selection options
- Ensure proper naming convention (churchWarm, churchWarmDark)

- [ ] **Step 4: Update CSS custom properties in index.css**

Add new CSS custom properties for church palette:
- Root variables for all church palette colors
- Dark mode variants with data-theme attribute
- High contrast mode class support
- Large text mode class support
- Maintain existing CSS variable structure for compatibility

- [ ] **Step 5: Test color palette application**

Run frontend development server and verify:
- Church palette loads as default option
- Color palette switcher shows church option
- Dark mode works with church palette
- CSS custom properties are applied correctly
- No console errors related to color loading

- [ ] **Step 6: Commit**

Stage and commit with message: "feat(design): add church-focused color palette system

Add distinctive church-focused color palette with warm, inviting colors:
- Create churchColorPalette.js with spiritual growth metaphors
- Integrate into existing color palette system
- Add high contrast and large text mode variants
- Update CSS custom properties for church colors
- Maintain backward compatibility with existing palettes

Generated with Devin (https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"

### Subsection 1.2: Typography System

**Files:**
- Create: `frontend/src/config/typographySystem.js`
- Modify: `frontend/src/index.css`
- Modify: `frontend/tailwind.config.js`

**Interfaces:**
- Consumes: Existing font loading and CSS structure
- Produces: Deliberate type pairing with display, body, and utility faces

- [ ] **Step 1: Define typography system requirements**

Create typography specification with these exact type roles:
- Display face: Characterful, memorable, used with restraint (headlines, hero text)
- Body face: Highly readable, modern but warm (paragraphs, body text)
- Utility face: Data, captions, technical information (small text, labels)

Type scale requirements:
- Base size: 18px (accessible default)
- Display sizes: 48px, 36px, 24px (clear hierarchy)
- Caption sizes: 14px, 12px (supporting information)
- Line heights: Generous for readability (1.6-1.8)
- Letter spacing: Optimized for readability
- Font weights: Clear hierarchy (300, 400, 500, 600, 700)

- [ ] **Step 2: Implement typographySystem.js module**

Create typography system module that exports:
- Font family definitions for each type role
- Type scale with exact pixel values
- Line height and letter spacing specifications
- Font weight assignments for each scale step
- Responsive typography rules
- Large text mode variants (24px+ base)

Module must provide utility functions for applying typography classes.

- [ ] **Step 3: Update index.css with typography custom properties**

Add CSS custom properties for typography system:
- Font family variables for each type role
- Font size variables for type scale
- Line height and letter spacing variables
- Responsive typography breakpoints
- Large text mode class support
- Print typography support

- [ ] **Step 4: Update Tailwind config for typography integration**

Extend Tailwind configuration to use typography system:
- Add custom font families from typography system
- Extend font sizes with type scale values
- Add custom line heights and letter spacing
- Create utility classes for typography roles
- Add responsive typography utilities

- [ ] **Step 5: Test typography system application**

Run frontend development server and verify:
- Typography loads correctly without console errors
- Font families are applied correctly
- Type scale renders with proper hierarchy
- Responsive typography works at breakpoints
- Large text mode enhances base font size
- No conflicts with existing Tailwind classes

- [ ] **Step 6: Commit**

Stage and commit with message: "feat(design): implement deliberate typography system

Add characterful type pairing with clear hierarchy:
- Create typographySystem.js with display, body, utility faces
- Define accessible type scale (18px base, 24px+ large text)
- Add CSS custom properties for typography
- Integrate with Tailwind configuration
- Support large text mode for accessibility

Generated with Devin (https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"

### Subsection 1.3: Spacing and Layout System

**Files:**
- Create: `frontend/src/config/spacingSystem.js`
- Modify: `frontend/src/index.css`
- Modify: `frontend/tailwind.config.js`

**Interfaces:**
- Consumes: Existing Tailwind spacing system
- Produces: Consistent spacing architecture with 8px base unit and semantic spacing tokens

- [ ] **Step 1: Define spacing system requirements**

Create spacing specification with these exact categories:
- Base unit: 8px (maintains Tailwind compatibility)
- Semantic spacing tokens: xs, sm, md, lg, xl, 2xl
- Component-specific spacing: card padding, button padding, input padding
- Layout spacing: section gaps, container padding, grid gaps
- Responsive spacing: mobile-first approach with breakpoints

Spacing must support:
- Consistent vertical rhythm
- Clear information hierarchy
- Touch-friendly target spacing
- Large text mode spacing adjustments

- [ ] **Step 2: Implement spacingSystem.js module**

Create spacing system module that exports:
- Spacing scale with exact pixel/rem values
- Semantic spacing tokens with usage guidelines
- Component-specific spacing constants
- Responsive spacing rules
- Large text mode spacing adjustments
- Utility functions for applying spacing

- [ ] **Step 3: Update index.css with spacing custom properties**

Add CSS custom properties for spacing system:
- Spacing scale variables (4px, 8px, 16px, 24px, 32px, 48px, 64px, 96px)
- Semantic spacing token variables
- Component spacing variables
- Layout spacing variables
- Responsive spacing breakpoints
- Large text mode spacing adjustments

- [ ] **Step 4: Update Tailwind config for spacing integration**

Extend Tailwind configuration to use spacing system:
- Extend spacing scale with custom values
- Add semantic spacing utilities
- Create component-specific spacing classes
- Add responsive spacing utilities
- Maintain backward compatibility with existing spacing

- [ ] **Step 5: Test spacing system application**

Run frontend development server and verify:
- Spacing loads correctly without console errors
- Semantic spacing tokens work as expected
- Component spacing is consistent
- Responsive spacing works at breakpoints
- Large text mode adjusts spacing appropriately
- No conflicts with existing Tailwind spacing utilities

- [ ] **Step 6: Commit**

Stage and commit with message: "feat(design): implement consistent spacing architecture

Add deliberate spacing system with 8px base unit:
- Create spacingSystem.js with semantic spacing tokens
- Define component-specific spacing constants
- Add CSS custom properties for spacing
- Integrate with Tailwind configuration
- Support large text mode spacing adjustments

Generated with Devin (https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"

#### Part 1 Completion Verification

- [ ] **Verification Step:** Run `npm run dev` in frontend directory and verify no console errors, church palette loads as default, typography renders correctly, spacing system applies without conflicts
- [ ] **Success Criteria:** Development server starts successfully, church color palette is applied, typography system renders with proper hierarchy, spacing system works consistently, no console errors related to design system

---

## Part 2: Component Library

**Prerequisites:** Part 1 must be complete (design system foundation)

**Verification Step:** Verify design system files exist and frontend builds without errors

**Goal:** Create distinctive components that replace generic patterns with church-focused visual language and signature elements.

### Subsection 2.1: Signature Stats Card Component

**Files:**
- Create: `frontend/src/components/dashboard/ChurchStatsCard.jsx`
- Modify: `frontend/src/components/common/StatsCard.jsx` (deprecate, not delete)
- Test: `frontend/src/components/dashboard/__tests__/ChurchStatsCard.test.jsx`

**Interfaces:**
- Consumes: Design system (colors, typography, spacing), existing StatsCard interface
- Produces: Distinctive stats card with church-specific visual metaphors and signature elements

- [ ] **Step 1: Define ChurchStatsCard requirements**

Create component specification with these exact features:
- Church-specific visual metaphors (light, growth, community, stewardship)
- Signature element: distinctive visualization for each stat type
- Large text mode support (24px+ base font)
- High contrast mode support
- Touch-friendly targets (minimum 44x44px)
- Accessible keyboard navigation
- Screen reader support with proper ARIA labels
- Responsive design (mobile-first)
- Animation support (reduced motion respected)

Stat types to support:
- Member count (community/gathering metaphor)
- Financial metrics (stewardship/growth metaphor)
- Event attendance (spiritual journey metaphor)
- Engagement metrics (growth/illumination metaphor)

- [ ] **Step 2: Write failing test cases**

Create test cases for ChurchStatsCard:
- Render test with default props
- Render test with each stat type
- Accessibility test (keyboard navigation, ARIA labels)
- Large text mode test
- High contrast mode test
- Responsive design test (mobile, tablet, desktop)
- Animation test (reduced motion)
- Click interaction test
- Loading state test
- Error state test

- [ ] **Step 3: Run focused test command and confirm failure**

Run `npm test -- ChurchStatsCard.test.jsx` and confirm tests fail with "ChurchStatsCard not found" or similar error.

- [ ] **Step 4: Implement ChurchStatsCard component**

Create ChurchStatsCard component with these exact features:
- Props interface: title, value, change, changeType, trendPeriod, icon, statType, linkTo, onClick, isLoading, error, onRetry, className
- Church-specific visualizations per stat type
- Signature element: unique icon/background treatment for each type
- Large text mode support via CSS classes
- High contrast mode support via CSS classes
- Touch-friendly click targets
- Keyboard navigation support (tabindex, keydown handlers)
- ARIA labels and roles for accessibility
- Responsive layout with breakpoints
- CSS animations with reduced motion media query
- Loading and error states with accessible messaging

Component must use design system colors, typography, and spacing from Part 1.

- [ ] **Step 5: Run focused verification and confirm success**

Run `npm test -- ChurchStatsCard.test.jsx` and confirm all tests pass with no accessibility violations.

- [ ] **Step 6: Commit**

Stage and commit with message: "feat(components): add distinctive ChurchStatsCard component

Create church-focused stats card with signature visual elements:
- Implement church-specific metaphors for each stat type
- Add large text and high contrast mode support
- Ensure WCAG 2.1 AA compliance throughout
- Support keyboard navigation and screen readers
- Add responsive design with mobile-first approach
- Respect reduced motion preferences
- Replace generic StatsCard with distinctive design

Generated with Devin (https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"

### Subsection 2.2: Church-Focused Quick Actions Panel

**Files:**
- Create: `frontend/src/components/dashboard/ChurchQuickActions.jsx`
- Modify: `frontend/src/components/common/QuickActionsPanel.jsx` (deprecate, not delete)
- Test: `frontend/src/components/dashboard/__tests__/ChurchQuickActions.test.jsx`

**Interfaces:**
- Consumes: Design system, existing QuickActionsPanel interface
- Produces: Distinctive quick actions with community gathering metaphor and warm interactions

- [ ] **Step 1: Define ChurchQuickActions requirements**

Create component specification with these exact features:
- Community gathering metaphor in layout (circle/group arrangement)
- Warm, inviting interactions with micro-animations
- Signature element: distinctive action button treatment
- Large text mode support
- High contrast mode support
- Touch-friendly targets (minimum 44x44px)
- Accessible keyboard navigation
- Screen reader support
- Responsive design
- Customizable pinned actions
- Action grouping by category

- [ ] **Step 2: Write failing test cases**

Create test cases for ChurchQuickActions:
- Render test with default actions
- Render test with pinned actions
- Accessibility test (keyboard navigation, ARIA labels)
- Large text mode test
- High contrast mode test
- Responsive design test
- Click interaction test
- Customization test
- Action grouping test

- [ ] **Step 3: Run focused test command and confirm failure**

Run `npm test -- ChurchQuickActions.test.jsx` and confirm tests fail with "ChurchQuickActions not found" or similar error.

- [ ] **Step 4: Implement ChurchQuickActions component**

Create ChurchQuickActions component with these exact features:
- Props interface: actions, pinnedActions, onCustomize, className
- Community gathering layout (circular or grouped arrangement)
- Warm hover interactions with micro-animations
- Signature element: distinctive button/icon treatment
- Large text mode support via CSS classes
- High contrast mode support via CSS classes
- Touch-friendly click targets (minimum 44x44px)
- Keyboard navigation support
- ARIA labels and roles
- Responsive layout with breakpoints
- CSS animations with reduced motion support
- Customization interface for pinned actions
- Action grouping by ministry category

Component must use design system from Part 1.

- [ ] **Step 5: Run focused verification and confirm success**

Run `npm test -- ChurchQuickActions.test.jsx` and confirm all tests pass with no accessibility violations.

- [ ] **Step 6: Commit**

Stage and commit with message: "feat(components): add church-focused QuickActions panel

Create distinctive quick actions with community gathering metaphor:
- Implement circular/grouped layout for community feel
- Add warm interactions with micro-animations
- Support large text and high contrast modes
- Ensure WCAG 2.1 AA compliance
- Add action customization and grouping
- Replace generic QuickActionsPanel with distinctive design

Generated with Devin (https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"

### Subsection 2.3: Personal Growth Visualization Component

**Files:**
- Create: `frontend/src/components/dashboard/PersonalGrowthViz.jsx`
- Test: `frontend/src/components/dashboard/__tests__/PersonalGrowthViz.test.jsx`

**Interfaces:**
- Consumes: Design system, user data from API
- Produces: Signature visualization for member spiritual journey and engagement

- [ ] **Step 1: Define PersonalGrowthViz requirements**

Create component specification with these exact features:
- Spiritual journey visualization (growth path metaphor)
- Member engagement metrics display
- Signature element: distinctive growth chart/progress visualization
- Large text mode support
- High contrast mode support
- Touch-friendly interactive elements
- Accessible keyboard navigation
- Screen reader support
- Responsive design
- Animation support (reduced motion respected)

Metrics to visualize:
- Attendance rate (spiritual consistency)
- Contribution rate (stewardship)
- Activity level (community engagement)
- Ministry involvement (service)
- Personal growth journey (timeline/progress)

- [ ] **Step 2: Write failing test cases**

Create test cases for PersonalGrowthViz:
- Render test with mock data
- Accessibility test (keyboard navigation, ARIA labels)
- Large text mode test
- High contrast mode test
- Responsive design test
- Animation test (reduced motion)
- Data visualization accuracy test
- Interactive element test

- [ ] **Step 3: Run focused test command and confirm failure**

Run `npm test -- PersonalGrowthViz.test.jsx` and confirm tests fail with "PersonalGrowthViz not found" or similar error.

- [ ] **Step 4: Implement PersonalGrowthViz component**

Create PersonalGrowthViz component with these exact features:
- Props interface: growthData, engagementData, journeyData, className
- Spiritual journey visualization (growth path/progress metaphor)
- Member engagement metrics display
- Signature element: distinctive growth visualization
- Large text mode support via CSS classes
- High contrast mode support via CSS classes
- Touch-friendly interactive elements
- Keyboard navigation support
- ARIA labels and roles for data visualization
- Responsive layout with breakpoints
- CSS animations with reduced motion support
- Data accuracy and proper scaling

Component must use design system from Part 1.

- [ ] **Step 5: Run focused verification and confirm success**

Run `npm test -- PersonalGrowthViz.test.jsx` and confirm all tests pass with no accessibility violations.

- [ ] **Step 6: Commit**

Stage and commit with message: "feat(components): add PersonalGrowth visualization component

Create signature spiritual journey visualization for members:
- Implement growth path metaphor for spiritual journey
- Display member engagement metrics clearly
- Add distinctive growth chart/progress visualization
- Support large text and high contrast modes
- Ensure WCAG 2.1 AA compliance for data viz
- Add responsive design with reduced motion support

Generated with Devin (https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"

#### Part 2 Completion Verification

- [ ] **Verification Step:** Run `npm test` in frontend directory and verify all new component tests pass, run `npm run build` and verify build succeeds without errors
- [ ] **Success Criteria:** All component tests pass with no accessibility violations, build completes successfully, new components are importable and render without console errors

---

## Part 3: MemberDashboard Redesign

**Prerequisites:** Part 1 (design system) and Part 2 (component library) must be complete

**Verification Step:** Verify design system and component library files exist and tests pass

**Goal:** Redesign MemberDashboard with accessibility-first approach for elderly members like Mama Grace, establishing patterns for other dashboards.

### Subsection 3.1: MemberDashboard Layout Redesign

**Files:**
- Modify: `frontend/src/pages/dashboard/MemberDashboard.jsx`
- Modify: `frontend/src/styles/dashboard.css`

**Interfaces:**
- Consumes: Design system, new components from Part 2, existing API endpoints
- Produces: Redesigned MemberDashboard with accessibility-first layout

- [ ] **Step 1: Define MemberDashboard redesign requirements**

Create redesign specification with these exact features:
- Extra large text support (24px+ base font)
- High contrast mode support (7:1 contrast ratio)
- Simplified navigation with clear labels
- Warm, calming color scheme from church palette
- Focus on personal spiritual journey and community connection
- Signature element: PersonalGrowthViz integration
- Large touch targets (minimum 48x48px)
- Clear visual hierarchy with size and spacing
- Simplified cognitive load per screen
- Keyboard navigation optimization
- Screen reader optimization

Layout structure:
- Personal greeting with large, warm welcome
- Personal growth visualization as hero element
- Simplified stats with church-specific metaphors
- Streamlined quick actions with community grouping
- Recent activities with clear, large text
- Tab-based navigation with large, clear labels

- [ ] **Step 2: Update MemberDashboard component**

Modify MemberDashboard.jsx with these exact changes:
- Import new components from Part 2 (ChurchStatsCard, ChurchQuickActions, PersonalGrowthViz)
- Replace generic StatsCard with ChurchStatsCard
- Replace generic QuickActionsPanel with ChurchQuickActions
- Add PersonalGrowthViz as hero element
- Implement large text mode support via CSS classes
- Implement high contrast mode support via CSS classes
- Simplify layout structure with clear hierarchy
- Increase touch target sizes to minimum 48x48px
- Add ARIA labels and roles for accessibility
- Optimize keyboard navigation (tabindex, focus management)
- Simplify cognitive load (reduce information density)
- Add clear, descriptive labels for all interactive elements

Maintain existing API calls and data structure for backward compatibility.

- [ ] **Step 3: Update dashboard.css for MemberDashboard**

Add MemberDashboard-specific styles with these exact features:
- Large text mode styles (24px+ base font)
- High contrast mode styles (7:1 contrast ratio)
- Simplified layout with generous spacing
- Warm, calming color application
- Clear visual hierarchy with size and spacing
- Touch-friendly target sizing
- Focus indicator styles for keyboard navigation
- Reduced motion support for animations

- [ ] **Step 4: Test MemberDashboard accessibility**

Run frontend development server and perform manual accessibility testing:
- Navigate with keyboard only (tab, arrow keys, enter)
- Test with screen reader (NVDA or JAWS)
- Verify large text mode enhances readability
- Verify high contrast mode meets 7:1 contrast ratio
- Test touch targets on mobile device
- Verify ARIA labels provide context
- Check focus indicators are visible and clear
- Verify simplified navigation reduces cognitive load

- [ ] **Step 5: Commit**

Stage and commit with message: "feat(dashboard): redesign MemberDashboard for accessibility excellence

Transform MemberDashboard with elderly member accessibility focus:
- Implement large text mode (24px+ base font)
- Add high contrast mode (7:1 contrast ratio)
- Integrate PersonalGrowthViz as signature element
- Replace generic components with church-focused designs
- Simplify navigation and reduce cognitive load
- Optimize keyboard navigation and screen reader support
- Ensure WCAG 2.1 AA compliance throughout

Generated with Devin (https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"

### Subsection 3.2: MemberDashboard Accessibility Testing

**Files:**
- Create: `frontend/src/pages/dashboard/__tests__/MemberDashboard.a11y.test.jsx`
- Modify: `frontend/src/pages/dashboard/MemberDashboard.jsx` (fix any accessibility issues found)

**Interfaces:**
- Consumes: Redesigned MemberDashboard, accessibility testing tools
- Produces: WCAG 2.1 AA compliant MemberDashboard with verified accessibility

- [ ] **Step 1: Define accessibility test requirements**

Create accessibility test specification with these exact criteria:
- WCAG 2.1 AA compliance verification
- Color contrast ratio testing (4.5:1 minimum, 7:1 preferred)
- Keyboard navigation testing (all functionality accessible via keyboard)
- Screen reader testing (proper ARIA labels and roles)
- Touch target size testing (minimum 48x48px)
- Focus indicator testing (visible and clear focus states)
- Large text mode testing (24px+ base font renders correctly)
- High contrast mode testing (7:1 contrast ratio maintained)
- Reduced motion testing (animations respect preferences)
- Cognitive load testing (simplified navigation verified)

- [ ] **Step 2: Write accessibility test cases**

Create accessibility test cases for MemberDashboard:
- Automated contrast ratio test for all text and interactive elements
- Keyboard navigation test (tab order, focus management, keyboard shortcuts)
- ARIA labels and roles test (proper labeling for screen readers)
- Touch target size test (minimum 48x48px for all interactive elements)
- Focus indicator test (visible and clear focus states)
- Large text mode test (24px+ base font, proper scaling)
- High contrast mode test (7:1 contrast ratio maintained)
- Reduced motion test (animations respect prefers-reduced-motion)

- [ ] **Step 3: Run accessibility tests and identify issues**

Run `npm test -- MemberDashboard.a11y.test.jsx` and document any failures or accessibility violations found.

- [ ] **Step 4: Fix identified accessibility issues**

Modify MemberDashboard.jsx to fix any accessibility issues:
- Adjust color contrast ratios to meet WCAG 2.1 AA
- Fix keyboard navigation issues (tab order, focus management)
- Add missing ARIA labels and roles
- Increase touch target sizes to meet minimum requirements
- Improve focus indicators for clarity
- Fix large text mode scaling issues
- Fix high contrast mode contrast issues
- Ensure reduced motion is respected

- [ ] **Step 5: Re-run accessibility tests and confirm compliance**

Run `npm test -- MemberDashboard.a11y.test.jsx` and confirm all tests pass with no accessibility violations.

- [ ] **Step 6: Commit**

Stage and commit with message: "test(dashboard): add and fix MemberDashboard accessibility tests

Ensure WCAG 2.1 AA compliance for MemberDashboard:
- Add comprehensive accessibility test suite
- Fix color contrast ratios to meet standards
- Optimize keyboard navigation and focus management
- Ensure proper ARIA labels and screen reader support
- Verify touch target sizes meet requirements
- Test and fix large text and high contrast modes
- Confirm reduced motion preferences are respected

Generated with Devin (https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"

#### Part 3 Completion Verification

- [ ] **Verification Step:** Run `npm test -- MemberDashboard` and verify all tests pass, run manual accessibility testing with keyboard and screen reader, verify large text and high contrast modes work correctly
- [ ] **Success Criteria:** All accessibility tests pass with no WCAG violations, manual keyboard navigation works smoothly, screen reader provides proper context, large text mode enhances readability, high contrast mode meets 7:1 contrast ratio

---

## Part 4: Role-Specific Dashboard Redesigns

**Prerequisites:** Part 1 (design system), Part 2 (component library), and Part 3 (MemberDashboard) must be complete

**Verification Step:** Verify design system, component library, and MemberDashboard files exist and tests pass

**Goal:** Redesign remaining dashboards (Pastor, Treasurer, Department Head, Super Admin) with role-specific visual expression while maintaining system consistency.

### Subsection 4.1: PastorDashboard Redesign

**Files:**
- Modify: `frontend/src/pages/dashboard/PastorDashboard.jsx`
- Create: `frontend/src/components/dashboard/MinistryHealthViz.jsx`
- Test: `frontend/src/pages/dashboard/__tests__/PastorDashboard.test.jsx`

**Interfaces:**
- Consumes: Design system, new components, existing API endpoints
- Produces: Ministry-focused dashboard with flock/shepherd metaphor

- [ ] **Step 1: Define PastorDashboard redesign requirements**

Create redesign specification with these exact features:
- Ministry-focused metrics and spiritual health indicators
- Clear oversight of congregation and departments
- Warm, authoritative but approachable design
- Signature element: Flock/shepherd metaphor in data visualization
- Large text mode support
- High contrast mode support
- Touch-friendly targets
- Accessible keyboard navigation
- Screen reader support

Layout structure:
- Ministry overview with congregation health metrics
- Department oversight with clear status indicators
- Member engagement visualization
- Spiritual health indicators
- Ministry-focused quick actions
- Recent ministry activities

- [ ] **Step 2: Create MinistryHealthViz signature component**

Create MinistryHealthViz component with these exact features:
- Flock/shepherd metaphor for congregation oversight
- Ministry health indicators (engagement, growth, spiritual depth)
- Signature visualization distinctive from MemberDashboard
- Large text mode support
- High contrast mode support
- Accessible data visualization
- Responsive design

- [ ] **Step 3: Update PastorDashboard component**

Modify PastorDashboard.jsx with these exact changes:
- Import new components (ChurchStatsCard, ChurchQuickActions, MinistryHealthViz)
- Replace generic components with church-focused designs
- Add MinistryHealthViz as signature element
- Implement ministry-focused layout
- Add large text and high contrast mode support
- Optimize for accessibility
- Maintain existing API calls

- [ ] **Step 4: Test PastorDashboard functionality and accessibility**

Run frontend development server and verify:
- PastorDashboard renders without console errors
- Ministry health visualization displays correctly
- Large text and high contrast modes work
- Keyboard navigation functions properly
- Screen reader provides proper context

- [ ] **Step 5: Commit**

Stage and commit with message: "feat(dashboard): redesign PastorDashboard with ministry focus

Transform PastorDashboard with flock/shepherd metaphor:
- Add MinistryHealthViz signature component
- Implement ministry-focused metrics display
- Replace generic components with church designs
- Support large text and high contrast modes
- Ensure WCAG 2.1 AA compliance
- Maintain existing API compatibility

Generated with Devin (https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"

### Subsection 4.2: TreasurerDashboard Redesign

**Files:**
- Modify: `frontend/src/pages/dashboard/TreasurerDashboard.jsx`
- Create: `frontend/src/components/dashboard/StewardshipViz.jsx`
- Test: `frontend/src/pages/dashboard/__tests__/TreasurerDashboard.test.jsx`

**Interfaces:**
- Consumes: Design system, new components, existing API endpoints
- Produces: Financial dashboard with stewardship metaphor and trust indicators

- [ ] **Step 1: Define TreasurerDashboard redesign requirements**

Create redesign specification with these exact features:
- Precise, clear financial data presentation
- Trust indicators and transparency elements
- Professional but warm design
- Signature element: Stewardship visualization with growth metaphors
- Large text mode support
- High contrast mode support
- Accessible data visualization
- Clear financial hierarchy

- [ ] **Step 2: Create StewardshipViz signature component**

Create StewardshipViz component with these exact features:
- Stewardship/growth metaphor for financial oversight
- Financial health indicators (budget utilization, collection rate, growth)
- Trust indicators (transparency, accuracy, audit trails)
- Signature visualization distinctive from other dashboards
- Large text and high contrast mode support
- Accessible financial data visualization

- [ ] **Step 3: Update TreasurerDashboard component**

Modify TreasurerDashboard.jsx with these exact changes:
- Import new components (ChurchStatsCard, ChurchQuickActions, StewardshipViz)
- Replace generic components with church-focused designs
- Add StewardshipViz as signature element
- Implement financial-focused layout with trust indicators
- Add large text and high contrast mode support
- Optimize for accessibility
- Maintain existing API calls

- [ ] **Step 4: Test TreasurerDashboard functionality and accessibility**

Run frontend development server and verify:
- TreasurerDashboard renders without console errors
- Stewardship visualization displays correctly
- Financial data is clear and accurate
- Large text and high contrast modes work
- Keyboard navigation functions properly
- Screen reader provides proper financial context

- [ ] **Step 5: Commit**

Stage and commit with message: "feat(dashboard): redesign TreasurerDashboard with stewardship focus

Transform TreasurerDashboard with stewardship metaphor:
- Add StewardshipViz signature component
- Implement trust indicators and transparency elements
- Replace generic components with church designs
- Support large text and high contrast modes
- Ensure WCAG 2.1 AA compliance for financial data
- Maintain existing API compatibility

Generated with Devin (https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"

### Subsection 4.3: DepartmentHeadDashboard Redesign

**Files:**
- Modify: `frontend/src/pages/dashboard/DepartmentHeadDashboard.jsx`
- Create: `frontend/src/components/dashboard/DepartmentCommunityViz.jsx`
- Test: `frontend/src/pages/dashboard/__tests__/DepartmentHeadDashboard.test.jsx`

**Interfaces:**
- Consumes: Design system, new components, existing API endpoints
- Produces: Department-focused dashboard with community gathering metaphor

- [ ] **Step 1: Define DepartmentHeadDashboard redesign requirements**

Create redesign specification with these exact features:
- Modern, efficient interface for coordination
- Mobile-optimized quick actions
- Community-focused team visualization
- Signature element: Department community/gathering metaphor
- Large text mode support
- High contrast mode support
- Mobile-first responsive design
- Accessible team visualization

- [ ] **Step 2: Create DepartmentCommunityViz signature component**

Create DepartmentCommunityViz component with these exact features:
- Community/gathering metaphor for department team
- Department member visualization and coordination
- Team health indicators (participation, activity, communication)
- Signature visualization distinctive from other dashboards
- Large text and high contrast mode support
- Mobile-optimized layout
- Accessible team data visualization

- [ ] **Step 3: Update DepartmentHeadDashboard component**

Modify DepartmentHeadDashboard.jsx with these exact changes:
- Import new components (ChurchStatsCard, ChurchQuickActions, DepartmentCommunityViz)
- Replace generic components with church-focused designs
- Add DepartmentCommunityViz as signature element
- Implement mobile-optimized layout
- Add large text and high contrast mode support
- Optimize for accessibility and mobile use
- Maintain existing API calls

- [ ] **Step 4: Test DepartmentHeadDashboard functionality and accessibility**

Run frontend development server and verify:
- DepartmentHeadDashboard renders without console errors
- Department community visualization displays correctly
- Mobile layout is optimized and touch-friendly
- Large text and high contrast modes work
- Keyboard navigation functions properly
- Screen reader provides proper team context

- [ ] **Step 5: Commit**

Stage and commit with message: "feat(dashboard): redesign DepartmentHeadDashboard with community focus

Transform DepartmentHeadDashboard with community gathering metaphor:
- Add DepartmentCommunityViz signature component
- Implement mobile-optimized quick actions
- Replace generic components with church designs
- Support large text and high contrast modes
- Ensure WCAG 2.1 AA compliance
- Optimize for mobile coordination workflows

Generated with Devin (https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"

### Subsection 4.4: SuperAdminDashboard Redesign

**Files:**
- Modify: `frontend/src/pages/dashboard/SuperAdminDashboard.jsx`
- Create: `frontend/src/components/dashboard/SystemOrganismViz.jsx`
- Test: `frontend/src/pages/dashboard/__tests__/SuperAdminDashboard.test.jsx`

**Interfaces:**
- Consumes: Design system, new components, existing API endpoints
- Produces: System-focused dashboard with organism/body metaphor

- [ ] **Step 1: Define SuperAdminDashboard redesign requirements**

Create redesign specification with these exact features:
- Comprehensive system health visualization
- Technical depth with clear hierarchy
- Professional, reliable appearance
- Signature element: System as organism/body metaphor
- Large text mode support
- High contrast mode support
- Technical data accessibility
- Clear system status indicators

- [ ] **Step 2: Create SystemOrganismViz signature component**

Create SystemOrganismViz component with these exact features:
- Organism/body metaphor for system health
- System component visualization and interdependencies
- Health indicators (database, API, services, performance)
- Signature visualization distinctive from other dashboards
- Large text and high contrast mode support
- Accessible technical data visualization
- Clear status hierarchy

- [ ] **Step 3: Update SuperAdminDashboard component**

Modify SuperAdminDashboard.jsx with these exact changes:
- Import new components (ChurchStatsCard, ChurchQuickActions, SystemOrganismViz)
- Replace generic components with church-focused designs
- Add SystemOrganismViz as signature element
- Implement technical-focused layout with clear hierarchy
- Add large text and high contrast mode support
- Optimize for accessibility
- Maintain existing API calls

- [ ] **Step 4: Test SuperAdminDashboard functionality and accessibility**

Run frontend development server and verify:
- SuperAdminDashboard renders without console errors
- System organism visualization displays correctly
- Technical data is clear and hierarchical
- Large text and high contrast modes work
- Keyboard navigation functions properly
- Screen reader provides proper system context

- [ ] **Step 5: Commit**

Stage and commit with message: "feat(dashboard): redesign SuperAdminDashboard with system organism focus

Transform SuperAdminDashboard with organism/body metaphor:
- Add SystemOrganismViz signature component
- Implement comprehensive system health visualization
- Replace generic components with church designs
- Support large text and high contrast modes
- Ensure WCAG 2.11 AA compliance for technical data
- Maintain existing API compatibility

Generated with Devin (https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"

#### Part 4 Completion Verification

- [ ] **Verification Step:** Run `npm test` for all dashboard tests, run `npm run build` and verify build succeeds, manually test each dashboard for rendering and basic functionality
- [ ] **Success Criteria:** All dashboard tests pass, build completes successfully, each dashboard renders without console errors, signature elements display correctly, large text and high contrast modes work across all dashboards

---

## Part 5: Accessibility Testing & Performance Optimization

**Prerequisites:** Parts 1-4 must be complete (design system, components, all dashboards redesigned)

**Verification Step:** Verify all previous Parts are complete and tests pass

**Goal:** Comprehensive accessibility validation and performance optimization to ensure world-class user experience.

### Subsection 5.1: Comprehensive Accessibility Audit

**Files:**
- Create: `frontend/src/__tests__/accessibility/comprehensiveA11y.test.jsx`
- Modify: Any components failing accessibility tests

**Interfaces:**
- Consumes: All redesigned components and dashboards
- Produces: WCAG 2.1 AA compliant system with verified accessibility

- [ ] **Step 1: Define comprehensive accessibility audit requirements**

Create audit specification with these exact criteria:
- WCAG 2.1 AA compliance across all components
- Color contrast ratio testing (4.5:1 minimum, 7:1 preferred)
- Keyboard navigation testing (all functionality accessible)
- Screen reader testing (proper ARIA labels and roles)
- Touch target size testing (minimum 48x48px)
- Focus indicator testing (visible and clear focus states)
- Large text mode testing (24px+ base font)
- High contrast mode testing (7:1 contrast ratio)
- Reduced motion testing (animations respect preferences)
- Cognitive load testing (simplified navigation)

- [ ] **Step 2: Write comprehensive accessibility test suite**

Create accessibility test cases covering:
- All new components from Part 2
- All redesigned dashboards from Parts 3-4
- Color contrast ratios for all text and interactive elements
- Keyboard navigation for all interactive elements
- ARIA labels and roles for all components
- Touch target sizes for all interactive elements
- Focus indicators for all keyboard-navigable elements
- Large text mode rendering for all components
- High contrast mode contrast ratios
- Reduced motion compliance for all animations

- [ ] **Step 3: Run comprehensive accessibility tests**

Run `npm test -- comprehensiveA11y.test.jsx` and document all failures and accessibility violations.

- [ ] **Step 4: Fix all identified accessibility issues**

Modify components and dashboards to fix accessibility issues:
- Adjust color contrast ratios to meet WCAG 2.1 AA
- Fix keyboard navigation issues across all components
- Add missing ARIA labels and roles
- Increase touch target sizes where needed
- Improve focus indicators for clarity
- Fix large text mode scaling issues
- Fix high contrast mode contrast issues
- Ensure reduced motion is respected throughout

- [ ] **Step 5: Re-run accessibility tests and confirm compliance**

Run `npm test -- comprehensiveA11y.test.jsx` and confirm all tests pass with no accessibility violations.

- [ ] **Step 6: Commit**

Stage and commit with message: "test(accessibility): add comprehensive accessibility audit and fixes

Ensure WCAG 2.1 AA compliance across entire system:
- Add comprehensive accessibility test suite
- Fix color contrast ratios throughout system
- Optimize keyboard navigation globally
- Ensure proper ARIA labels and screen reader support
- Verify touch target sizes meet requirements
- Test and fix large text and high contrast modes globally
- Confirm reduced motion preferences are respected system-wide

Generated with Devin (https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"

### Subsection 5.2: Performance Optimization

**Files:**
- Modify: `frontend/vite.config.js`
- Modify: `frontend/package.json` (add performance scripts)
- Create: `frontend/.github/workflows/performance.yml`

**Interfaces:**
- Consumes: Redesigned frontend application
- Produces: Optimized build with Lighthouse 90+ scores

- [ ] **Step 1: Define performance optimization requirements**

Create performance specification with these exact targets:
- Lighthouse performance score 90+
- First Contentful Paint (FCP) under 1.8s
- Largest Contentful Paint (LCP) under 2.5s
- Time to Interactive (TTI) under 3.8s
- Cumulative Layout Shift (CLS) under 0.1
- Total blocking time (TBT) under 200ms
- Bundle size optimization (code splitting, lazy loading)
- Image optimization (compression, lazy loading)
- Font optimization (subsetting, preloading)
- CSS optimization (minification, critical CSS)

- [ ] **Step 2: Optimize Vite configuration**

Modify vite.config.js with these exact optimizations:
- Enable code splitting for routes
- Configure lazy loading for components
- Optimize bundle size with rollup options
- Enable compression for production builds
- Configure asset optimization
- Add performance monitoring

- [ ] **Step 3: Add performance testing scripts**

Add npm scripts to package.json:
- "test:lighthouse" - Run Lighthouse CI
- "test:performance" - Run performance tests
- "analyze:bundle" - Analyze bundle size

- [ ] **Step 4: Create GitHub Actions workflow for performance**

Create performance workflow that:
- Runs on every pull request
- Executes Lighthouse CI tests
- Checks performance scores against targets
- Fails if scores drop below thresholds
- Reports performance metrics

- [ ] **Step 5: Run performance tests and optimize**

Run `npm run test:performance` and:
- Analyze bundle size and identify large chunks
- Optimize images and fonts
- Implement code splitting where needed
- Fix any performance bottlenecks
- Re-test until Lighthouse scores meet targets

- [ ] **Step 6: Commit**

Stage and commit with message: "perf(frontend): optimize performance to Lighthouse 90+ targets

Achieve world-class performance scores:
- Optimize Vite configuration for code splitting
- Add performance testing scripts and CI workflow
- Optimize bundle size with lazy loading
- Compress and optimize images and fonts
- Implement critical CSS and resource hints
- Achieve Lighthouse 90+ performance scores

Generated with Devin (https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"

### Subsection 5.3: Cross-Browser Testing and Validation

**Files:**
- Create: `frontend/src/__tests__/crossBrowser/__tests__/browserCompatibility.test.jsx`
- Modify: Any components with browser compatibility issues

**Interfaces:**
- Consumes: Optimized frontend application
- Produces: Cross-browser compatible application with consistent experience

- [ ] **Step 1: Define cross-browser testing requirements**

Create testing specification with these exact browsers:
- Chrome (latest version)
- Firefox (latest version)
- Safari (latest version)
- Edge (latest version)
- Mobile Safari (iOS latest)
- Mobile Chrome (Android latest)

Test criteria:
- Consistent rendering across all browsers
- Functional keyboard navigation
- Proper touch interactions on mobile
- Consistent accessibility support
- Performance consistency within 20% variance

- [ ] **Step 2: Write cross-browser test cases**

Create browser compatibility test cases:
- Component rendering tests
- Keyboard navigation tests
- Touch interaction tests
- Accessibility feature tests
- Performance consistency tests

- [ ] **Step 3: Run cross-browser tests**

Run tests across all target browsers and document any compatibility issues or rendering inconsistencies.

- [ ] **Step 4: Fix cross-browser compatibility issues**

Modify components to fix compatibility issues:
- Add browser-specific CSS fixes with vendor prefixes
- Fix JavaScript compatibility issues
- Ensure consistent accessibility support
- Optimize performance for slower browsers
- Test and verify fixes across all browsers

- [ ] **Step 5: Re-run cross-browser tests and confirm compatibility**

Run cross-browser tests and confirm consistent experience across all target browsers within performance variance targets.

- [ ] **Step 6: Commit**

Stage and commit with message: "test(browser): add cross-browser compatibility testing and fixes

Ensure consistent experience across all major browsers:
- Add cross-browser test suite for Chrome, Firefox, Safari, Edge
- Test mobile Safari and Chrome compatibility
- Fix rendering inconsistencies across browsers
- Ensure keyboard and touch compatibility
- Verify accessibility support consistency
- Optimize performance for browser variance

Generated with Devin (https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"

#### Part 5 Completion Verification

- [ ] **Verification Step:** Run full test suite `npm test`, run `npm run build`, run `npm run test:performance`, run cross-browser tests, verify Lighthouse scores 90+, verify WCAG 2.1 AA compliance, verify cross-browser compatibility
- [ ] **Success Criteria:** All tests pass with no accessibility violations, build completes successfully, Lighthouse performance score 90+, cross-browser testing shows consistent experience, WCAG 2.1 AA compliance verified across all components and dashboards

---

## Final System Verification

**Prerequisites:** All Parts 1-5 must be complete

**Verification Step:** Run complete system verification

- [ ] **Step 1: Run complete test suite**

Run `npm test` and verify all tests pass with no failures or accessibility violations.

- [ ] **Step 2: Build production version**

Run `npm run build` and verify build completes successfully with no errors or warnings.

- [ ] **Step 3: Run performance tests**

Run `npm run test:performance` and verify Lighthouse scores meet 90+ targets across all metrics.

- [ ] **Step 4: Manual accessibility verification**

Perform manual accessibility testing:
- Navigate entire application with keyboard only
- Test with screen reader (NVDA or JAWS)
- Verify large text mode enhances readability
- Verify high contrast mode meets 7:1 contrast ratio
- Test touch targets on mobile devices
- Verify ARIA labels provide proper context

- [ ] **Step 5: Visual design verification**

Verify visual design meets requirements:
- Church-focused color palette applied throughout
- Typography system renders with proper hierarchy
- Spacing system provides consistent rhythm
- Signature elements are distinctive and memorable
- Role-specific dashboards have unique visual expression
- Design feels warm, inviting, and church-focused
- No generic admin template appearance

- [ ] **Step 6: Final commit**

Stage and commit with message: "feat(ui): complete world-class UI redesign for KMainCMS

Transform KMainCMS from generic admin to distinctive church-focused UI:
- Implement church-focused design system (colors, typography, spacing)
- Create distinctive component library with signature elements
- Redesign MemberDashboard with accessibility excellence for elderly members
- Redesign role-specific dashboards (Pastor, Treasurer, Department Head, Super Admin)
- Achieve WCAG 2.1 AA compliance throughout system
- Optimize performance to Lighthouse 90+ scores
- Ensure cross-browser compatibility
- Create warm, inviting, ministry-focused user experience

This redesign establishes KMainCMS as a purpose-built church management tool with distinctive visual identity that reflects church ministry, community, and spiritual growth while maintaining accessibility excellence for all users including elderly members like Mama Grace.

Generated with Devin (https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-27-worldclass-ui-redesign.md`. This plan is structured for 5-agent parallel execution with Part-level dependencies. Three execution options:**

**1. Multi-Agent Parallel (recommended for large plans)** - Dispatch 5 agents simultaneously, each takes one Part, coordinated via prerequisite verification

**2. Single-Agent Sequential** - One agent executes Parts 1-5 in order, using executing-plans skill

**3. Subagent-Driven Per-Task** - Dispatch fresh subagent per subsection, review between steps (most granular control)

**Which approach?**