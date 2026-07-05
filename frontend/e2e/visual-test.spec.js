import { test, expect } from '@playwright/test';

test.describe('Visual E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5180');
  });

  test('Authentication Flow - Visual Test', async ({ page }) => {
    // Visual check of login page
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Login with visual feedback
    await page.fill('input[name="email"]', 'admin@sda.org');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'screenshots/dashboard-after-login.png' });
  });

  test('Department Tabs - Visual Test', async ({ page }) => {
    // Login first
    await page.fill('input[name="email"]', 'admin@sda.org');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navigate to departments
    await page.click('text=Departments');
    await page.waitForURL('**/departments');

    // Test "All Departments" tab
    await expect(page.locator('text=All Departments')).toBeVisible();
    await page.screenshot({ path: 'screenshots/departments-all-tab.png' });

    // Test "My Departments" tab
    await page.click('text=My Departments');
    await page.screenshot({ path: 'screenshots/departments-my-tab.png' });
  });

  test('Gallery Upload Workflow - Visual Test', async ({ page }) => {
    // Login first
    await page.fill('input[name="email"]', 'admin@sda.org');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navigate to gallery
    await page.click('text=Gallery');
    await page.waitForURL('**/gallery');

    // Check upload button text based on permissions
    await page.screenshot({ path: 'screenshots/gallery-upload-button.png' });
  });

  test('Role-Based Dashboard - Visual Test', async ({ page }) => {
    // Login as admin
    await page.fill('input[name="email"]', 'admin@sda.org');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navigate to departments
    await page.click('text=Departments');
    await page.waitForURL('**/departments');

    // Click on first department to see dashboard
    const firstDepartment = page.locator('[data-testid="department-card"]').first();
    if (await firstDepartment.isVisible()) {
      await firstDepartment.click();
      await page.screenshot({ path: 'screenshots/department-dashboard-admin.png' });
    }
  });

  test('Navigation Sidebar - Visual Test', async ({ page }) => {
    // Login first
    await page.fill('input[name="email"]', 'admin@sda.org');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Take screenshot of sidebar
    await page.screenshot({ path: 'screenshots/sidebar-navigation.png' });

    // Check that all expected menu items are visible
    const expectedItems = ['Dashboard', 'Members', 'Gallery', 'Departments', 'Documents', 'Payments', 'SMS', 'Announcements', 'Approvals', 'Settings'];
    
    for (const item of expectedItems) {
      const element = page.locator(`text=${item}`);
      await expect(element).toBeVisible();
    }
  });

  test('Responsive Design - Visual Test', async ({ page }) => {
    // Login first
    await page.fill('input[name="email"]', 'admin@sda.org');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Test different viewport sizes
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: 'screenshots/responsive-1920x1080.png' });

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({ path: 'screenshots/responsive-1366x768.png' });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: 'screenshots/responsive-768x1024.png' });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: 'screenshots/responsive-375x667.png' });
  });
});