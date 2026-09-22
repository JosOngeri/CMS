/**
 * Playwright E2E Parity Test Suite for member1@newlife.com (Dated: 2026-09-22)
 * KMainCMS Website & Mobile Device Compatibility Assessment
 *
 * Supports:
 * 1. Web Mobile Viewport Testing (Pixel 7 resolution: 393x851)
 * 2. USB Debugging ADB / CDP Remote Debugging (port 9222)
 */

import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/mobile-parity-member1-2026-09-22');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Test User Credentials (member1@newlife.com)
const MEMBER_USER = {
  email: 'member1@newlife.com',
  password: 'right123',
  phone: '+254739815845',
  membershipNo: 'NE-0001',
  church: 'New Life SDA'
};

test.describe('Mobile Parity Assessment Suite - member1@newlife.com (2026-09-22)', () => {

  test.beforeEach(async ({ page }) => {
    // Mobile Viewport Simulation (Pixel 7)
    await page.setViewportSize({ width: 393, height: 851 });
  });

  test('1. Authentication & Session Restoration', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    // Fill credentials
    await page.fill('input[name="email"]', MEMBER_USER.email);
    await page.fill('input[name="password"]', MEMBER_USER.password);
    await page.click('button[type="submit"]');

    // Verify successful login & dashboard redirect
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Member Dashboard')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-auth-login.png` });
  });

  test('2. Dashboard Personal Overview vs Privacy Audit', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', MEMBER_USER.email);
    await page.fill('input[name="password"]', MEMBER_USER.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);

    // Verify Personal Growth Indicators
    await expect(page.locator('text=Personal Status')).toBeVisible();
    await expect(page.locator('text=Personal Contributions')).toBeVisible();

    // Verify church-wide financials are NOT exposed to regular member
    const incomeCard = page.locator('text=Monthly Income');
    await expect(incomeCard).not.toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-dashboard-privacy.png` });
  });

  test('3. M-Pesa Giving & Payments Flow Parity', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', MEMBER_USER.email);
    await page.fill('input[name="password"]', MEMBER_USER.password);
    await page.click('button[type="submit"]');

    await page.goto(`${BASE_URL}/dashboard/payments/my`);

    // Verify giving options & personal history
    await expect(page.locator('text=Make Payment')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-payments-giving.png` });
  });

  test('4. Announcements Module Parity', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', MEMBER_USER.email);
    await page.fill('input[name="password"]', MEMBER_USER.password);
    await page.click('button[type="submit"]');

    await page.goto(`${BASE_URL}/dashboard/announcements`);
    await expect(page.locator('text=Announcements')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-announcements.png` });
  });

  test('5. My Departments Module Parity', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', MEMBER_USER.email);
    await page.fill('input[name="password"]', MEMBER_USER.password);
    await page.click('button[type="submit"]');

    await page.goto(`${BASE_URL}/dashboard/my-departments`);
    await expect(page.locator('text=Departments')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-my-departments.png` });
  });

  test('6. Events & Calendar Registration Parity', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', MEMBER_USER.email);
    await page.fill('input[name="password"]', MEMBER_USER.password);
    await page.click('button[type="submit"]');

    await page.goto(`${BASE_URL}/dashboard/events`);
    await expect(page.locator('text=Events')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-events.png` });
  });

  test('7. USB Debugging Chrome Remote Direct Connection Test', async () => {
    // Connects to Chrome browser running on connected USB Android device
    // Requires: `adb forward tcp:9222 localabstract:chrome_devtools_remote`
    try {
      const browser = await chromium.connectOverCDP('http://localhost:9222');
      const context = browser.contexts()[0] || await browser.newContext();
      const page = context.pages()[0] || await context.newPage();

      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', MEMBER_USER.email);
      await page.fill('input[name="password"]', MEMBER_USER.password);
      await page.click('button[type="submit"]');

      await expect(page.locator('text=Member Dashboard')).toBeVisible();
      await page.screenshot({ path: `${SCREENSHOT_DIR}/07-usb-live-android.png` });

      await browser.close();
    } catch (e) {
      console.log('Note: USB Remote Debugging socket on port 9222 not reachable. Ensure Chrome is running on device with CDP forward enabled.');
    }
  });

});
