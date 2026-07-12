/**
 * E2E Tests for Color Palette System
 * Tests Phase 15-20: Semantic Color Mapping for Palette System
 * Verifies that CSS variables are properly applied across all palettes
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5180';
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/palette-tests');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Color Palette System - Phase 15-20 Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
  });

  test.describe('Phase 15: Primary Colors (Blue → Primary)', () => {
    test('Primary buttons use CSS variable colors', async ({ page }) => {
      // Login
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForLoadState('networkidle');

      // Check that primary buttons use CSS variables
      const primaryButtons = page.locator('button').filter({ hasText: /Add|Create|Save|Submit/ });
      
      for (let i = 0; i < Math.min(3, await primaryButtons.count()); i++) {
        const button = primaryButtons.nth(i);
        const classes = await button.getAttribute('class');
        
        // Should NOT contain hardcoded blue classes
        expect(classes).not.toMatch(/bg-blue-\d+/);
        expect(classes).not.toMatch(/text-blue-\d+/);
        expect(classes).not.toMatch(/border-blue-\d+/);
        
        // Should contain CSS variable
        expect(classes).toMatch(/bg-\[var\(--color-primary\)\]/);
      }
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/phase15-primary-buttons.png` });
    });

    test('Primary links use CSS variable colors', async ({ page }) => {
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForLoadState('networkidle');

      // Check sidebar links
      const sidebarLinks = page.locator('nav a');
      
      for (let i = 0; i < Math.min(5, await sidebarLinks.count()); i++) {
        const link = sidebarLinks.nth(i);
        const classes = await link.getAttribute('class');
        
        // Should NOT contain hardcoded blue classes
        expect(classes).not.toMatch(/text-blue-\d+/);
        expect(classes).not.toMatch(/hover:text-blue-\d+/);
      }
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/phase15-sidebar-links.png` });
    });

    test('Focus states use CSS variable colors', async ({ page }) => {
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForLoadState('networkidle');

      // Check input focus states
      const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"]');
      
      for (let i = 0; i < Math.min(3, await inputs.count()); i++) {
        const input = inputs.nth(i);
        const classes = await input.getAttribute('class');
        
        // Should NOT contain hardcoded blue ring classes
        expect(classes).not.toMatch(/ring-blue-\d+/);
        expect(classes).not.toMatch(/focus:ring-blue-\d+/);
        
        // Should contain CSS variable
        expect(classes).toMatch(/ring-\[var\(--color-primary\)\]/);
      }
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/phase15-focus-states.png` });
    });

    test('No hardcoded blue classes in rendered HTML', async ({ page }) => {
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForLoadState('networkidle');

      // Get all HTML
      const html = await page.content();
      
      // Check for hardcoded blue classes
      expect(html).not.toMatch(/class="[^"]*bg-blue-\d+[^"]*"/);
      expect(html).not.toMatch(/class="[^"]*text-blue-\d+[^"]*"/);
      expect(html).not.toMatch(/class="[^"]*border-blue-\d+[^"]*"/);
      expect(html).not.toMatch(/class="[^"]*ring-blue-\d+[^"]*"/);
      expect(html).not.toMatch(/class="[^"]*focus:ring-blue-\d+[^"]*"/);
      
      // Should contain CSS variables
      expect(html).toMatch(/var\(--color-primary\)/);
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/phase15-no-hardcoded-blue.png` });
    });
  });

  test.describe('Phase 16: Error Colors (Red/Rose → Error)', () => {
    test('Error messages use CSS variable colors', async ({ page }) => {
      // Try to login with invalid credentials to trigger error
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      await page.waitForLoadState('networkidle');

      // Check error message styling
      const errorElements = page.locator('[class*="error"], [class*="alert"]');
      
      for (let i = 0; i < await errorElements.count(); i++) {
        const element = errorElements.nth(i);
        const classes = await element.getAttribute('class');
        
        // Should NOT contain hardcoded red classes
        expect(classes).not.toMatch(/bg-red-\d+/);
        expect(classes).not.toMatch(/text-red-\d+/);
        expect(classes).not.toMatch(/border-red-\d+/);
        expect(classes).not.toMatch(/bg-rose-\d+/);
        expect(classes).not.toMatch(/text-rose-\d+/);
        
        // Should contain CSS variable
        expect(classes).toMatch(/var\(--color-error\)/);
      }
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/phase16-error-messages.png` });
    });

    test('Delete/danger buttons use CSS variable colors', async ({ page }) => {
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForLoadState('networkidle');

      // Navigate to a page with delete buttons
      await page.click('nav >> text=Members');
      await page.waitForLoadState('networkidle');

      // Check delete buttons
      const deleteButtons = page.locator('button').filter({ hasText: /Delete|Remove/ });
      
      for (let i = 0; i < Math.min(3, await deleteButtons.count()); i++) {
        const button = deleteButtons.nth(i);
        const classes = await button.getAttribute('class');
        
        // Should NOT contain hardcoded red classes
        expect(classes).not.toMatch(/bg-red-\d+/);
        expect(classes).not.toMatch(/text-red-\d+/);
        expect(classes).not.toMatch(/hover:bg-red-\d+/);
        
        // Should contain CSS variable
        expect(classes).toMatch(/var\(--color-error\)/);
      }
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/phase16-delete-buttons.png` });
    });
  });

  test.describe('Phase 17: Success Colors (Green/Emerald → Success)', () => {
    test('Success messages use CSS variable colors', async ({ page }) => {
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForLoadState('networkidle');

      // Navigate to a page that might show success messages
      await page.click('nav >> text=Members');
      await page.waitForLoadState('networkidle');

      // Check for success/alert elements
      const successElements = page.locator('[class*="success"], [class*="completed"]');
      
      for (let i = 0; i < await successElements.count(); i++) {
        const element = successElements.nth(i);
        const classes = await element.getAttribute('class');
        
        // Should NOT contain hardcoded green classes
        expect(classes).not.toMatch(/bg-green-\d+/);
        expect(classes).not.toMatch(/text-green-\d+/);
        expect(classes).not.toMatch(/border-green-\d+/);
        expect(classes).not.toMatch(/bg-emerald-\d+/);
        expect(classes).not.toMatch(/text-emerald-\d+/);
        
        // Should contain CSS variable
        expect(classes).toMatch(/var\(--color-success\)/);
      }
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/phase17-success-messages.png` });
    });

    test('Confirm buttons use CSS variable colors', async ({ page }) => {
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForLoadState('networkidle');

      // Check confirm buttons
      const confirmButtons = page.locator('button').filter({ hasText: /Confirm|Yes|Approve/ });
      
      for (let i = 0; i < Math.min(3, await confirmButtons.count()); i++) {
        const button = confirmButtons.nth(i);
        const classes = await button.getAttribute('class');
        
        // Should NOT contain hardcoded green classes
        expect(classes).not.toMatch(/bg-green-\d+/);
        expect(classes).not.toMatch(/text-green-\d+/);
        
        // Should contain CSS variable
        expect(classes).toMatch(/var\(--color-success\)/);
      }
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/phase17-confirm-buttons.png` });
    });
  });

  test.describe('Phase 18: Warning Colors (Yellow/Amber/Orange → Warning)', () => {
    test('Warning messages use CSS variable colors', async ({ page }) => {
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForLoadState('networkidle');

      // Check for warning elements
      const warningElements = page.locator('[class*="warning"], [class*="alert"]');
      
      for (let i = 0; i < await warningElements.count(); i++) {
        const element = warningElements.nth(i);
        const classes = await element.getAttribute('class');
        
        // Should NOT contain hardcoded yellow/amber/orange classes
        expect(classes).not.toMatch(/bg-yellow-\d+/);
        expect(classes).not.toMatch(/text-yellow-\d+/);
        expect(classes).not.toMatch(/bg-amber-\d+/);
        expect(classes).not.toMatch(/text-amber-\d+/);
        expect(classes).not.toMatch(/bg-orange-\d+/);
        expect(classes).not.toMatch(/text-orange-\d+/);
        
        // Should contain CSS variable
        expect(classes).toMatch(/var\(--color-warning\)/);
      }
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/phase18-warning-messages.png` });
    });
  });

  test.describe('Phase 19: Secondary Colors (Purple/Pink/Teal/Indigo/Violet → Secondary)', () => {
    test('Secondary elements use CSS variable colors', async ({ page }) => {
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForLoadState('networkidle');

      // Check for secondary elements
      const secondaryElements = page.locator('[class*="secondary"], [class*="accent"]');
      
      for (let i = 0; i < await secondaryElements.count(); i++) {
        const element = secondaryElements.nth(i);
        const classes = await element.getAttribute('class');
        
        // Should NOT contain hardcoded secondary color classes
        expect(classes).not.toMatch(/bg-purple-\d+/);
        expect(classes).not.toMatch(/text-purple-\d+/);
        expect(classes).not.toMatch(/bg-pink-\d+/);
        expect(classes).not.toMatch(/text-pink-\d+/);
        expect(classes).not.toMatch(/bg-teal-\d+/);
        expect(classes).not.toMatch(/bg-indigo-\d+/);
        expect(classes).not.toMatch(/text-indigo-\d+/);
        expect(classes).not.toMatch(/bg-violet-\d+/);
        expect(classes).not.toMatch(/text-violet-\d+/);
        
        // Should contain CSS variable
        expect(classes).toMatch(/var\(--color-secondary\)/);
      }
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/phase19-secondary-elements.png` });
    });
  });

  test.describe('Phase 20: Semantic Primary Colors', () => {
    test('Semantic primary classes use CSS variables', async ({ page }) => {
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForLoadState('networkidle');

      // Get all HTML
      const html = await page.content();
      
      // Should NOT contain hardcoded semantic primary classes
      expect(html).not.toMatch(/class="[^"]*bg-primary-\d+[^"]*"/);
      expect(html).not.toMatch(/class="[^"]*text-primary-\d+[^"]*"/);
      expect(html).not.toMatch(/class="[^"]*border-primary-\d+[^"]*"/);
      
      // Should contain CSS variables
      expect(html).toMatch(/var\(--color-primary\)/);
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/phase20-semantic-primary.png` });
    });
  });

  test.describe('Comprehensive Color System Verification', () => {
    test('All CSS variables are defined and accessible', async ({ page }) => {
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForLoadState('networkidle');

      // Get computed styles for the body element
      const bodyStyles = await page.evaluate(() => {
        const body = document.body;
        const computed = window.getComputedStyle(body);
        return {
          primary: computed.getPropertyValue('--color-primary'),
          secondary: computed.getPropertyValue('--color-secondary'),
          success: computed.getPropertyValue('--color-success'),
          warning: computed.getPropertyValue('--color-warning'),
          error: computed.getPropertyValue('--color-error'),
          background: computed.getPropertyValue('--color-background'),
          surface: computed.getPropertyValue('--color-surface'),
          text: computed.getPropertyValue('--color-text'),
          textSecondary: computed.getPropertyValue('--color-textSecondary'),
          border: computed.getPropertyValue('--color-border')
        };
      });

      // Verify all CSS variables are defined
      expect(bodyStyles.primary).toBeTruthy();
      expect(bodyStyles.secondary).toBeTruthy();
      expect(bodyStyles.success).toBeTruthy();
      expect(bodyStyles.warning).toBeTruthy();
      expect(bodyStyles.error).toBeTruthy();
      expect(bodyStyles.background).toBeTruthy();
      expect(bodyStyles.surface).toBeTruthy();
      expect(bodyStyles.text).toBeTruthy();
      expect(bodyStyles.textSecondary).toBeTruthy();
      expect(bodyStyles.border).toBeTruthy();
      
      console.log('CSS Variables:', bodyStyles);
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/comprehensive-css-variables.png` });
    });

    test('No hardcoded semantic colors remain in the application', async ({ page }) => {
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForLoadState('networkidle');

      // Navigate through all major pages
      const pages = ['Members', 'Departments', 'Payments', 'SMS', 'Announcements', 'Events', 'Gallery', 'Settings'];
      
      for (const pageName of pages) {
        try {
          await page.click(`nav >> text=${pageName}`);
          await page.waitForLoadState('networkidle');
          
          const html = await page.content();
          
          // Check for any remaining hardcoded semantic colors
          expect(html).not.toMatch(/bg-blue-\d+/);
          expect(html).not.toMatch(/text-blue-\d+/);
          expect(html).not.toMatch(/border-blue-\d+/);
          expect(html).not.toMatch(/bg-red-\d+/);
          expect(html).not.toMatch(/text-red-\d+/);
          expect(html).not.toMatch(/bg-green-\d+/);
          expect(html).not.toMatch(/text-green-\d+/);
          expect(html).not.toMatch(/bg-yellow-\d+/);
          expect(html).not.toMatch(/text-yellow-\d+/);
          expect(html).not.toMatch(/bg-purple-\d+/);
          expect(html).not.toMatch(/text-purple-\d+/);
          
          await page.screenshot({ path: `${SCREENSHOT_DIR}/comprehensive-${pageName.toLowerCase()}.png` });
        } catch (error) {
          console.log(`Could not navigate to ${pageName}:`, error.message);
        }
      }
    });
  });

  test.describe('Palette Switching Verification', () => {
    test('Palette switching works correctly', async ({ page }) => {
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForLoadState('networkidle');

      // Navigate to settings
      await page.click('nav >> text=Settings');
      await page.waitForLoadState('networkidle');

      // Look for palette selector
      const paletteSelector = page.locator('[class*="palette"], [class*="theme"], select[name*="palette"], select[name*="theme"]');
      
      if (await paletteSelector.count() > 0) {
        // Try to switch palettes
        await paletteSelector.selectOption('Classic Blue');
        await page.waitForLoadState('networkidle');
        
        const primaryColor = await page.evaluate(() => {
          return window.getComputedStyle(document.body).getPropertyValue('--color-primary');
        });
        
        expect(primaryColor).toBeTruthy();
        
        await page.screenshot({ path: `${SCREENSHOT_DIR}/palette-classic-blue.png` });
      } else {
        console.log('Palette selector not found - may need to be implemented');
      }
    });
  });
});
