/**
 * Comprehensive E2E Testing for KMainCMS
 * This test suite covers all major modules and takes screenshots.
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5180';
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('KMainCMS Comprehensive Functional Test', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto(`${BASE_URL}/auth/login`);
  });

  test('Full System Walkthrough & Screenshots', async ({ page }) => {
    // 1. LOGIN
    await page.fill('input[name="email"]', 'admin@kmaincms.org');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-dashboard.png` });
    console.log('Took screenshot: 01-dashboard.png');

    // 2. MEMBERS DIRECTORY
    await page.click('nav >> text=Members');
    await expect(page).toHaveURL(/.*members/);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-members-directory.png` });
    console.log('Took screenshot: 02-members-directory.png');

    // 3. DEPARTMENTS
    await page.click('nav >> text=Departments');
    await expect(page).toHaveURL(/.*departments/);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-departments-list.png` });
    console.log('Took screenshot: 03-departments-list.png');

    // 4. PAYMENTS / TREASURY
    await page.click('nav >> text=Payments');
    await expect(page).toHaveURL(/.*payments/);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-treasury.png` });
    console.log('Took screenshot: 04-treasury.png');

    // 5. SMS MANAGEMENT
    await page.click('nav >> text=SMS');
    await expect(page).toHaveURL(/.*sms/);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-sms-management.png` });
    console.log('Took screenshot: 05-sms-management.png');

    // 6. ANNOUNCEMENTS
    await page.click('nav >> text=Announcements');
    await expect(page).toHaveURL(/.*announcements/);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-announcements.png` });
    console.log('Took screenshot: 06-announcements.png');

    // 7. EVENTS
    await page.click('nav >> text=Events');
    await expect(page).toHaveURL(/.*events/);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-events.png` });
    console.log('Took screenshot: 07-events.png');

    // 8. APPROVALS
    await page.click('nav >> text=Approvals');
    await expect(page).toHaveURL(/.*approvals/);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-approvals.png` });
    console.log('Took screenshot: 08-approvals.png');

    // 9. GALLERY
    await page.click('nav >> text=Gallery');
    await expect(page).toHaveURL(/.*gallery/);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-gallery.png` });
    console.log('Took screenshot: 09-gallery.png');

    // 10. SYSTEM SETTINGS
    await page.click('nav >> text=Settings');
    await expect(page).toHaveURL(/.*settings/);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-settings.png` });
    console.log('Took screenshot: 10-settings.png');
  });

  test('Role-Based Access Verification', async ({ page }) => {
    // Login as regular member
    await page.fill('input[name="email"]', 'member@kmaincms.org');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);

    // Member should NOT see Admin specific links
    const sidebar = page.locator('nav');
    await expect(sidebar.locator('text=Settings')).not.toBeVisible();
    await expect(sidebar.locator('text=Approvals')).not.toBeVisible();
    await expect(sidebar.locator('text=SMS')).not.toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-member-dashboard.png` });
    console.log('Took screenshot: 11-member-dashboard.png');
  });
});
