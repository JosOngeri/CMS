/**
 * Comprehensive E2E Tests for KMainCMS Website
 * Complete website testing including all modules, color system, and user workflows
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5180';
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/comprehensive');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Test users
const USERS = {
  superAdmin: {
    email: 'admin@kmaincms.org',
    password: 'password123',
    role: 'Super Admin'
  },
  admin: {
    email: 'admin@kmaincms.org',
    password: 'password123',
    role: 'Admin'
  },
  member: {
    email: 'member@kmaincms.org',
    password: 'password123',
    role: 'Member'
  },
  treasurer: {
    email: 'treasurer@kmaincms.org',
    password: 'password123',
    role: 'Treasurer'
  },
  departmentHead: {
    email: 'dept@kmaincms.org',
    password: 'password123',
    role: 'Department Head'
  }
};

test.describe('KMainCMS Comprehensive Website Tests', () => {
  test.describe('Authentication System', () => {
    test('Super Admin login with valid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page.locator('text=Dashboard')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/auth-super-admin-login.png` });
    });

    test('Member login with valid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      
      await page.fill('input[name="email"]', USERS.member.email);
      await page.fill('input[name="password"]', USERS.member.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page.locator('text=Dashboard')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/auth-member-login.png` });
    });

    test('Invalid credentials show error message', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      
      await page.fill('input[name="email"]', 'invalid@kmaincms.org');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Invalid credentials')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/auth-invalid-credentials.png` });
    });

    test('Logout functionality', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Click logout
      await page.click('button:has-text("Logout")');
      
      await expect(page).toHaveURL(/.*login/);
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/auth-logout.png` });
    });

    test('Password reset flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      
      await page.click('text=Forgot Password');
      
      await expect(page).toHaveURL(/.*reset-password/);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Password reset email sent')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/auth-password-reset.png` });
    });
  });

  test.describe('Dashboard Module', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    });

    test('Dashboard loads with all widgets', async ({ page }) => {
      await expect(page.locator('text=Dashboard')).toBeVisible();
      
      // Check for common dashboard widgets
      const widgets = [
        'Members',
        'Departments',
        'Treasury',
        'SMS',
        'Announcements'
      ];
      
      for (const widget of widgets) {
        await expect(page.locator(`text=${widget}`).first()).toBeVisible();
      }
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard-widgets.png` });
    });

    test('Dashboard statistics are displayed', async ({ page }) => {
      await expect(page.locator('text=Dashboard')).toBeVisible();
      
      // Check for statistics cards
      const stats = page.locator('[class*="stat"], [class*="card"]');
      await expect(stats.first()).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard-statistics.png` });
    });

    test('Quick actions are available', async ({ page }) => {
      await expect(page.locator('text=Dashboard')).toBeVisible();
      
      // Check for quick action buttons
      const quickActions = page.locator('button').filter({ hasText: /Add|Create|New/ });
      await expect(quickActions.first()).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard-quick-actions.png` });
    });
  });

  test.describe('Members Module', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    });

    test('Members directory loads correctly', async ({ page }) => {
      await page.click('nav >> text=Members');
      await expect(page).toHaveURL(/.*members/);
      await expect(page.locator('text=Members')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/members-directory.png` });
    });

    test('Can search for members', async ({ page }) => {
      await page.click('nav >> text=Members');
      await page.waitForLoadState('networkidle');
      
      await page.fill('input[placeholder*="search" i]', 'John');
      await page.press('input[placeholder*="search" i]', 'Enter');
      
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/members-search.png` });
    });

    test('Can add new member', async ({ page }) => {
      await page.click('nav >> text=Members');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Add Member")');
      
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'Member');
      await page.fill('input[name="email"]', 'testmember@kmaincms.org');
      await page.fill('input[name="phone"]', '+254700000000');
      
      await page.click('button:has-text("Save")');
      
      await expect(page.locator('text=Member added successfully')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/members-add.png` });
    });

    test('Can edit existing member', async ({ page }) => {
      await page.click('nav >> text=Members');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Edit")').first();
      
      await page.fill('input[name="firstName"]', 'Updated');
      await page.click('button:has-text("Save")');
      
      await expect(page.locator('text=Member updated successfully')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/members-edit.png` });
    });

    test('Can delete member', async ({ page }) => {
      await page.click('nav >> text=Members');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Delete")').first();
      await page.click('button:has-text("Confirm")');
      
      await expect(page.locator('text=Member deleted successfully')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/members-delete.png` });
    });

    test('Member directory pagination works', async ({ page }) => {
      await page.click('nav >> text=Members');
      await page.waitForLoadState('networkidle');
      
      const pagination = page.locator('[class*="pagination"]');
      if (await pagination.count() > 0) {
        await page.click('button:has-text("Next")');
        await page.waitForLoadState('networkidle');
      }
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/members-pagination.png` });
    });
  });

  test.describe('Departments Module', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    });

    test('Departments list loads correctly', async ({ page }) => {
      await page.click('nav >> text=Departments');
      await expect(page).toHaveURL(/.*departments/);
      await expect(page.locator('text=Departments')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/departments-list.png` });
    });

    test('Can create new department', async ({ page }) => {
      await page.click('nav >> text=Departments');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Add Department")');
      
      await page.fill('input[name="name"]', 'Test Department');
      await page.fill('textarea[name="description"]', 'Test department description');
      
      await page.click('button:has-text("Save")');
      
      await expect(page.locator('text=Department created successfully')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/departments-add.png` });
    });

    test('Can assign members to department', async ({ page }) => {
      await page.click('nav >> text=Departments');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Manage Members")').first();
      
      await page.click('input[type="checkbox"]').first();
      await page.click('button:has-text("Save")');
      
      await expect(page.locator('text=Members assigned successfully')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/departments-assign-members.png` });
    });

    test('Department settings page loads', async ({ page }) => {
      await page.click('nav >> text=Departments');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Settings")').first();
      
      await expect(page.locator('text=Department Settings')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/departments-settings.png` });
    });
  });

  test.describe('Treasury Module', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    });

    test('Treasury dashboard loads correctly', async ({ page }) => {
      await page.click('nav >> text=Payments');
      await expect(page).toHaveURL(/.*payments/);
      await expect(page.locator('text=Treasury')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/treasury-dashboard.png` });
    });

    test('Can add new payment', async ({ page }) => {
      await page.click('nav >> text=Payments');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Add Payment")');
      
      await page.fill('input[name="amount"]', '1000');
      await page.fill('input[name="description"]', 'Test payment');
      
      await page.click('button:has-text("Save")');
      
      await expect(page.locator('text=Payment added successfully')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/treasury-add-payment.png` });
    });

    test('Can view financial reports', async ({ page }) => {
      await page.click('nav >> text=Payments');
      await page.waitForLoadState('networkidle');
      
      await page.click('text=Reports');
      
      await expect(page.locator('text=Financial Reports')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/treasury-reports.png` });
    });

    test('Can manage budget', async ({ page }) => {
      await page.click('nav >> text=Payments');
      await page.waitForLoadState('networkidle');
      
      await page.click('text=Budget');
      
      await expect(page.locator('text=Budget Management')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/treasury-budget.png` });
    });
  });

  test.describe('SMS Module', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    });

    test('SMS dashboard loads correctly', async ({ page }) => {
      await page.click('nav >> text=SMS');
      await expect(page).toHaveURL(/.*sms/);
      await expect(page.locator('text=SMS')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/sms-dashboard.png` });
    });

    test('Can compose new SMS', async ({ page }) => {
      await page.click('nav >> text=SMS');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Compose")');
      
      await page.fill('input[name="recipients"]', '+254700000000');
      await page.fill('textarea[name="message"]', 'Test SMS message');
      
      await page.click('button:has-text("Send")');
      
      await expect(page.locator('text=SMS sent successfully')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/sms-compose.png` });
    });

    test('Can view SMS history', async ({ page }) => {
      await page.click('nav >> text=SMS');
      await page.waitForLoadState('networkidle');
      
      await page.click('text=History');
      
      await expect(page.locator('text=SMS History')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/sms-history.png` });
    });

    test('Can view SMS analytics', async ({ page }) => {
      await page.click('nav >> text=SMS');
      await page.waitForLoadState('networkidle');
      
      await page.click('text=Analytics');
      
      await expect(page.locator('text=SMS Analytics')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/sms-analytics.png` });
    });
  });

  test.describe('Announcements Module', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    });

    test('Announcements list loads correctly', async ({ page }) => {
      await page.click('nav >> text=Announcements');
      await expect(page).toHaveURL(/.*announcements/);
      await expect(page.locator('text=Announcements')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/announcements-list.png` });
    });

    test('Can create new announcement', async ({ page }) => {
      await page.click('nav >> text=Announcements');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Add Announcement")');
      
      await page.fill('input[name="title"]', 'Test Announcement');
      await page.fill('textarea[name="content"]', 'Test announcement content');
      
      await page.click('button:has-text("Publish")');
      
      await expect(page.locator('text=Announcement published successfully')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/announcements-add.png` });
    });

    test('Can schedule announcement', async ({ page }) => {
      await page.click('nav >> text=Announcements');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Add Announcement")');
      
      await page.fill('input[name="title"]', 'Scheduled Announcement');
      await page.fill('textarea[name="content"]', 'Scheduled content');
      await page.fill('input[name="scheduledDate"]', '2026-12-31');
      
      await page.click('button:has-text("Schedule")');
      
      await expect(page.locator('text=Announcement scheduled successfully')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/announcements-schedule.png` });
    });
  });

  test.describe('Events Module', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    });

    test('Events list loads correctly', async ({ page }) => {
      await page.click('nav >> text=Events');
      await expect(page).toHaveURL(/.*events/);
      await expect(page.locator('text=Events')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/events-list.png` });
    });

    test('Can create new event', async ({ page }) => {
      await page.click('nav >> text=Events');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Add Event")');
      
      await page.fill('input[name="title"]', 'Test Event');
      await page.fill('input[name="date"]', '2026-12-31');
      await page.fill('input[name="location"]', 'Church Hall');
      
      await page.click('button:has-text("Save")');
      
      await expect(page.locator('text=Event created successfully')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/events-add.png` });
    });

    test('Can register for event', async ({ page }) => {
      await page.click('nav >> text=Events');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Register")').first();
      
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', 'test@kmaincms.org');
      
      await page.click('button:has-text("Register")');
      
      await expect(page.locator('text=Registration successful')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/events-register.png` });
    });
  });

  test.describe('Gallery Module', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    });

    test('Gallery loads correctly', async ({ page }) => {
      await page.click('nav >> text=Gallery');
      await expect(page).toHaveURL(/.*gallery/);
      await expect(page.locator('text=Gallery')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/gallery-list.png` });
    });

    test('Can upload photo', async ({ page }) => {
      await page.click('nav >> text=Gallery');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Upload Photo")');
      
      // Note: File upload would need actual file path
      // await page.setInputFiles('input[type="file"]', 'test.jpg');
      
      await page.fill('input[name="title"]', 'Test Photo');
      await page.fill('input[name="description"]', 'Test photo description');
      
      await page.click('button:has-text("Upload")');
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/gallery-upload.png` });
    });

    test('Can create album', async ({ page }) => {
      await page.click('nav >> text=Gallery');
      await page.waitForLoadState('networkidle');
      
      await page.click('text=Albums');
      await page.click('button:has-text("Create Album")');
      
      await page.fill('input[name="name"]', 'Test Album');
      await page.fill('textarea[name="description"]', 'Test album description');
      
      await page.click('button:has-text("Create")');
      
      await expect(page.locator('text=Album created successfully')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/gallery-create-album.png` });
    });
  });

  test.describe('Approvals Module', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    });

    test('Approvals inbox loads correctly', async ({ page }) => {
      await page.click('nav >> text=Approvals');
      await expect(page).toHaveURL(/.*approvals/);
      await expect(page.locator('text=Approvals')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/approvals-inbox.png` });
    });

    test('Can approve request', async ({ page }) => {
      await page.click('nav >> text=Approvals');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Approve")').first();
      
      await expect(page.locator('text=Request approved successfully')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/approvals-approve.png` });
    });

    test('Can reject request', async ({ page }) => {
      await page.click('nav >> text=Approvals');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Reject")').first();
      await page.fill('textarea[name="reason"]', 'Test rejection reason');
      await page.click('button:has-text("Confirm")');
      
      await expect(page.locator('text=Request rejected successfully')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/approvals-reject.png` });
    });
  });

  test.describe('Settings Module', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    });

    test('Settings page loads correctly', async ({ page }) => {
      await page.click('nav >> text=Settings');
      await expect(page).toHaveURL(/.*settings/);
      await expect(page.locator('text=Settings')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-page.png` });
    });

    test('Can change color palette', async ({ page }) => {
      await page.click('nav >> text=Settings');
      await page.waitForLoadState('networkidle');
      
      await page.click('text=Appearance');
      
      const paletteSelector = page.locator('select[name="palette"]');
      if (await paletteSelector.count() > 0) {
        await paletteSelector.selectOption('Emerald Green');
        await page.click('button:has-text("Save")');
        
        await expect(page.locator('text=Settings saved successfully')).toBeVisible();
      }
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-color-palette.png` });
    });

    test('Can update profile settings', async ({ page }) => {
      await page.click('nav >> text=Settings');
      await page.waitForLoadState('networkidle');
      
      await page.click('text=Profile');
      
      await page.fill('input[name="firstName"]', 'Updated');
      await page.click('button:has-text("Save")');
      
      await expect(page.locator('text=Profile updated successfully')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-profile.png` });
    });

    test('Can manage notification preferences', async ({ page }) => {
      await page.click('nav >> text=Settings');
      await page.waitForLoadState('networkidle');
      
      await page.click('text=Notifications');
      
      await page.click('input[type="checkbox"]').first();
      await page.click('button:has-text("Save")');
      
      await expect(page.locator('text=Preferences saved successfully')).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-notifications.png` });
    });
  });

  test.describe('Color Palette System Verification', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    });

    test('No hardcoded blue classes in rendered HTML', async ({ page }) => {
      const html = await page.content();
      
      expect(html).not.toMatch(/class="[^"]*bg-blue-\d+[^"]*"/);
      expect(html).not.toMatch(/class="[^"]*text-blue-\d+[^"]*"/);
      expect(html).not.toMatch(/class="[^"]*border-blue-\d+[^"]*"/);
      expect(html).not.toMatch(/class="[^"]*ring-blue-\d+[^"]*"/);
      expect(html).not.toMatch(/class="[^"]*focus:ring-blue-\d+[^"]*"/);
      
      expect(html).toMatch(/var\(--color-primary\)/);
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/color-no-hardcoded-blue.png` });
    });

    test('No hardcoded red classes in rendered HTML', async ({ page }) => {
      const html = await page.content();
      
      expect(html).not.toMatch(/class="[^"]*bg-red-\d+[^"]*"/);
      expect(html).not.toMatch(/class="[^"]*text-red-\d+[^"]*"/);
      expect(html).not.toMatch(/class="[^"]*bg-rose-\d+[^"]*"/);
      expect(html).not.toMatch(/class="[^"]*text-rose-\d+[^"]*"/);
      
      expect(html).toMatch(/var\(--color-error\)/);
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/color-no-hardcoded-red.png` });
    });

    test('No hardcoded green classes in rendered HTML', async ({ page }) => {
      const html = await page.content();
      
      expect(html).not.toMatch(/class="[^"]*bg-green-\d+[^"]*"/);
      expect(html).not.toMatch(/class="[^"]*text-green-\d+[^"]*"/);
      expect(html).not.toMatch(/class="[^"]*bg-emerald-\d+[^"]*"/);
      expect(html).not.toMatch(/class="[^"]*text-emerald-\d+[^"]*"/);
      
      expect(html).toMatch(/var\(--color-success\)/);
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/color-no-hardcoded-green.png` });
    });

    test('All CSS variables are defined', async ({ page }) => {
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
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/color-css-variables.png` });
    });

    test('Color palette switching works', async ({ page }) => {
      await page.click('nav >> text=Settings');
      await page.waitForLoadState('networkidle');
      
      await page.click('text=Appearance');
      
      const paletteSelector = page.locator('select[name="palette"]');
      if (await paletteSelector.count() > 0) {
        const palettes = ['Classic Blue', 'Emerald Green', 'Royal Purple'];
        
        for (const palette of palettes) {
          await paletteSelector.selectOption(palette);
          await page.waitForLoadState('networkidle');
          
          const primaryColor = await page.evaluate(() => {
            return window.getComputedStyle(document.body).getPropertyValue('--color-primary');
          });
          
          expect(primaryColor).toBeTruthy();
          
          await page.screenshot({ path: `${SCREENSHOT_DIR}/color-palette-${palette.toLowerCase().replace(' ', '-')}.png` });
        }
      }
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('Super Admin sees all menu items', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      
      const expectedItems = [
        'Dashboard',
        'Members',
        'Departments',
        'Payments',
        'SMS',
        'Announcements',
        'Events',
        'Gallery',
        'Approvals',
        'Settings'
      ];
      
      for (const item of expectedItems) {
        await expect(page.locator(`text=${item}`).first()).toBeVisible();
      }
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/rbac-super-admin.png` });
    });

    test('Member sees limited menu items', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.member.email);
      await page.fill('input[name="password"]', USERS.member.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      
      const sidebar = page.locator('nav');
      await expect(sidebar.locator('text=Settings')).not.toBeVisible();
      await expect(sidebar.locator('text=Approvals')).not.toBeVisible();
      await expect(sidebar.locator('text=SMS')).not.toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/rbac-member.png` });
    });
  });

  test.describe('Responsive Design', () => {
    test('Website loads correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/responsive-mobile.png` });
    });

    test('Website loads correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/responsive-tablet.png` });
    });

    test('Website loads correctly on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/responsive-desktop.png` });
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    });

    test('All images have alt text', async ({ page }) => {
      const images = page.locator('img');
      const count = await images.count();
      
      for (let i = 0; i < count; i++) {
        const alt = await images.nth(i).getAttribute('alt');
        expect(alt).toBeTruthy();
      }
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/a11y-images.png` });
    });

    test('All form inputs have labels', async ({ page }) => {
      const inputs = page.locator('input, select, textarea');
      const count = await inputs.count();
      
      for (let i = 0; i < Math.min(10, count); i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        
        expect(id || ariaLabel).toBeTruthy();
      }
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/a11y-forms.png` });
    });

    test('Skip navigation link exists', async ({ page }) => {
      const skipLink = page.locator('a[href="#main"], a[href="#content"]');
      
      await expect(skipLink.first()).toBeVisible();
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/a11y-skip-link.png` });
    });
  });

  test.describe('Performance', () => {
    test('Page load time is acceptable', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/auth/login`);
      
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // 3 seconds
      
      console.log(`Page load time: ${loadTime}ms`);
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/performance-load-time.png` });
    });

    test('Dashboard loads within acceptable time', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      
      const startTime = Date.now();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000); // 5 seconds
      
      console.log(`Dashboard load time: ${loadTime}ms`);
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/performance-dashboard.png` });
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('Works in Chrome', async ({ page, browserName }) => {
      if (browserName !== 'chromium') return;
      
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/browser-chrome.png` });
    });

    test('Works in Firefox', async ({ page, browserName }) => {
      if (browserName !== 'firefox') return;
      
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/browser-firefox.png` });
    });

    test('Works in Safari', async ({ page, browserName }) => {
      if (browserName !== 'webkit') return;
      
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', USERS.superAdmin.email);
      await page.fill('input[name="password"]', USERS.superAdmin.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      
      await page.screenshot({ path: `${SCREENSHOT_DIR}/browser-safari.png` });
    });
  });
});
