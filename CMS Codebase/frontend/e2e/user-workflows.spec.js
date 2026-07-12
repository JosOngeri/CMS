/**
 * E2E User Workflow Tests for Frontend
 * Simulates real user actions using Playwright
 */

import { test, expect } from '@playwright/test';

test.describe('User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5180');
  });

  test.describe('Authentication Workflows', () => {
    test('Super Admin can login successfully', async ({ page }) => {
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page.locator('text=Dashboard')).toBeVisible();
    });

    test('Invalid credentials show error message', async ({ page }) => {
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Should show error
      await expect(page.locator('text=Invalid credentials')).toBeVisible();
    });
  });

  test.describe('Navigation Workflows', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.fill('input[name="email"]', 'admin@kmaincms.org');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
    });

    test('All sidebar items are visible for Super Admin', async ({ page }) => {
      const expectedItems = [
        'Dashboard',
        'Members',
        'Gallery',
        'Departments',
        'Payments',
        'SMS',
        'Announcements',
        'Approvals',
        'Settings'
      ];

      for (const item of expectedItems) {
        await expect(page.locator(`text=${item}`).first()).toBeVisible();
      }
    });

    test('Can navigate to Members page', async ({ page }) => {
      await page.click('text=Members');
      await expect(page).toHaveURL(/.*members/);
      await expect(page.locator('text=Members')).toBeVisible();
    });
  });
});
