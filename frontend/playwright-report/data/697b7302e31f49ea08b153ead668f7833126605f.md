# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: basic-visual-test.spec.js >> KMainCMS Basic Visual Tests >> Register page loads
- Location: e2e\basic-visual-test.spec.js:35:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5180/auth/register
Call log:
  - navigating to "http://localhost:5180/auth/register", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "This site can’t be reached" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - strong [ref=e9]: localhost
      - text: refused to connect.
    - generic [ref=e10]:
      - paragraph [ref=e11]: "Try:"
      - list [ref=e12]:
        - listitem [ref=e13]: Checking the connection
        - listitem [ref=e14]:
          - link "Checking the proxy and the firewall" [ref=e15] [cursor=pointer]:
            - /url: "#buttons"
    - generic [ref=e16]: ERR_CONNECTION_REFUSED
  - generic [ref=e17]:
    - button "Reload" [ref=e19] [cursor=pointer]
    - button "Details" [ref=e20] [cursor=pointer]
```

# Test source

```ts
  1  | /**
  2  |  * Basic Visual Test for KMainCMS
  3  |  * Takes screenshots of key pages
  4  |  */
  5  | 
  6  | import { test, expect } from '@playwright/test';
  7  | import path from 'path';
  8  | import fs from 'fs';
  9  | import { fileURLToPath } from 'url';
  10 | 
  11 | const __filename = fileURLToPath(import.meta.url);
  12 | const __dirname = path.dirname(__filename);
  13 | 
  14 | const BASE_URL = 'http://localhost:5180';
  15 | const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/basic');
  16 | 
  17 | // Ensure screenshot directory exists
  18 | if (!fs.existsSync(SCREENSHOT_DIR)) {
  19 |   fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  20 | }
  21 | 
  22 | test.describe('KMainCMS Basic Visual Tests', () => {
  23 |   test('Homepage loads', async ({ page }) => {
  24 |     await page.goto(BASE_URL);
  25 |     await page.waitForLoadState('networkidle');
  26 |     await page.screenshot({ path: `${SCREENSHOT_DIR}/homepage.png`, fullPage: true });
  27 |   });
  28 | 
  29 |   test('Login page loads', async ({ page }) => {
  30 |     await page.goto(`${BASE_URL}/auth/login`);
  31 |     await page.waitForLoadState('networkidle');
  32 |     await page.screenshot({ path: `${SCREENSHOT_DIR}/login-page.png`, fullPage: true });
  33 |   });
  34 | 
  35 |   test('Register page loads', async ({ page }) => {
> 36 |     await page.goto(`${BASE_URL}/auth/register`);
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5180/auth/register
  37 |     await page.waitForLoadState('networkidle');
  38 |     await page.screenshot({ path: `${SCREENSHOT_DIR}/register-page.png`, fullPage: true });
  39 |   });
  40 | 
  41 |   test('Login form elements are visible', async ({ page }) => {
  42 |     await page.goto(`${BASE_URL}/auth/login`);
  43 |     await page.waitForLoadState('networkidle');
  44 |     
  45 |     // Check for email input
  46 |     const emailInput = page.locator('#email');
  47 |     await expect(emailInput).toBeVisible();
  48 |     
  49 |     // Check for password input
  50 |     const passwordInput = page.locator('#password');
  51 |     await expect(passwordInput).toBeVisible();
  52 |     
  53 |     // Check for submit button
  54 |     const submitButton = page.locator('button[type="submit"]');
  55 |     await expect(submitButton).toBeVisible();
  56 |     
  57 |     await page.screenshot({ path: `${SCREENSHOT_DIR}/login-form-elements.png` });
  58 |   });
  59 | 
  60 |   test('Can fill login form', async ({ page }) => {
  61 |     await page.goto(`${BASE_URL}/auth/login`);
  62 |     await page.waitForLoadState('networkidle');
  63 |     
  64 |     // Fill email
  65 |     await page.fill('#email', 'admin@sda.org');
  66 |     
  67 |     // Fill password
  68 |     await page.fill('#password', 'admin123');
  69 |     
  70 |     await page.screenshot({ path: `${SCREENSHOT_DIR}/login-form-filled.png` });
  71 |   });
  72 | });
  73 | 
```