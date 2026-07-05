/**
 * Basic Visual Test for KMainCMS
 * Takes screenshots of key pages
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5180';
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/basic');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('KMainCMS Basic Visual Tests', () => {
  test('Homepage loads', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/homepage.png`, fullPage: true });
  });

  test('Login page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/login-page.png`, fullPage: true });
  });

  test('Register page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/register`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/register-page.png`, fullPage: true });
  });

  test('Login form elements are visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.waitForLoadState('networkidle');
    
    // Check for email input
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible();
    
    // Check for password input
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible();
    
    // Check for submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/login-form-elements.png` });
  });

  test('Can fill login form', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.waitForLoadState('networkidle');
    
    // Fill email
    await page.fill('#email', 'admin@sda.org');
    
    // Fill password
    await page.fill('#password', 'admin123');
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/login-form-filled.png` });
  });
});
