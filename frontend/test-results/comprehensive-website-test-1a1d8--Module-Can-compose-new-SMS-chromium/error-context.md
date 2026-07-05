# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: comprehensive-website-test.spec.js >> KMainCMS Comprehensive Website Tests >> SMS Module >> Can compose new SMS
- Location: e2e\comprehensive-website-test.spec.js:391:5

# Error details

```
Error: page.fill: Target page, context or browser has been closed
Call log:
  - waiting for locator('input[name="email"]')

```

# Test source

```ts
  277 |       await page.click('nav >> text=Departments');
  278 |       await page.waitForLoadState('networkidle');
  279 |       
  280 |       await page.click('button:has-text("Add Department")');
  281 |       
  282 |       await page.fill('input[name="name"]', 'Test Department');
  283 |       await page.fill('textarea[name="description"]', 'Test department description');
  284 |       
  285 |       await page.click('button:has-text("Save")');
  286 |       
  287 |       await expect(page.locator('text=Department created successfully')).toBeVisible();
  288 |       
  289 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/departments-add.png` });
  290 |     });
  291 | 
  292 |     test('Can assign members to department', async ({ page }) => {
  293 |       await page.click('nav >> text=Departments');
  294 |       await page.waitForLoadState('networkidle');
  295 |       
  296 |       await page.click('button:has-text("Manage Members")').first();
  297 |       
  298 |       await page.click('input[type="checkbox"]').first();
  299 |       await page.click('button:has-text("Save")');
  300 |       
  301 |       await expect(page.locator('text=Members assigned successfully')).toBeVisible();
  302 |       
  303 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/departments-assign-members.png` });
  304 |     });
  305 | 
  306 |     test('Department settings page loads', async ({ page }) => {
  307 |       await page.click('nav >> text=Departments');
  308 |       await page.waitForLoadState('networkidle');
  309 |       
  310 |       await page.click('button:has-text("Settings")').first();
  311 |       
  312 |       await expect(page.locator('text=Department Settings')).toBeVisible();
  313 |       
  314 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/departments-settings.png` });
  315 |     });
  316 |   });
  317 | 
  318 |   test.describe('Treasury Module', () => {
  319 |     test.beforeEach(async ({ page }) => {
  320 |       await page.goto(`${BASE_URL}/auth/login`);
  321 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
  322 |       await page.fill('input[name="password"]', USERS.superAdmin.password);
  323 |       await page.click('button[type="submit"]');
  324 |       await page.waitForLoadState('networkidle');
  325 |     });
  326 | 
  327 |     test('Treasury dashboard loads correctly', async ({ page }) => {
  328 |       await page.click('nav >> text=Payments');
  329 |       await expect(page).toHaveURL(/.*payments/);
  330 |       await expect(page.locator('text=Treasury')).toBeVisible();
  331 |       
  332 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/treasury-dashboard.png` });
  333 |     });
  334 | 
  335 |     test('Can add new payment', async ({ page }) => {
  336 |       await page.click('nav >> text=Payments');
  337 |       await page.waitForLoadState('networkidle');
  338 |       
  339 |       await page.click('button:has-text("Add Payment")');
  340 |       
  341 |       await page.fill('input[name="amount"]', '1000');
  342 |       await page.fill('input[name="description"]', 'Test payment');
  343 |       
  344 |       await page.click('button:has-text("Save")');
  345 |       
  346 |       await expect(page.locator('text=Payment added successfully')).toBeVisible();
  347 |       
  348 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/treasury-add-payment.png` });
  349 |     });
  350 | 
  351 |     test('Can view financial reports', async ({ page }) => {
  352 |       await page.click('nav >> text=Payments');
  353 |       await page.waitForLoadState('networkidle');
  354 |       
  355 |       await page.click('text=Reports');
  356 |       
  357 |       await expect(page.locator('text=Financial Reports')).toBeVisible();
  358 |       
  359 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/treasury-reports.png` });
  360 |     });
  361 | 
  362 |     test('Can manage budget', async ({ page }) => {
  363 |       await page.click('nav >> text=Payments');
  364 |       await page.waitForLoadState('networkidle');
  365 |       
  366 |       await page.click('text=Budget');
  367 |       
  368 |       await expect(page.locator('text=Budget Management')).toBeVisible();
  369 |       
  370 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/treasury-budget.png` });
  371 |     });
  372 |   });
  373 | 
  374 |   test.describe('SMS Module', () => {
  375 |     test.beforeEach(async ({ page }) => {
  376 |       await page.goto(`${BASE_URL}/auth/login`);
> 377 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
      |                  ^ Error: page.fill: Target page, context or browser has been closed
  378 |       await page.fill('input[name="password"]', USERS.superAdmin.password);
  379 |       await page.click('button[type="submit"]');
  380 |       await page.waitForLoadState('networkidle');
  381 |     });
  382 | 
  383 |     test('SMS dashboard loads correctly', async ({ page }) => {
  384 |       await page.click('nav >> text=SMS');
  385 |       await expect(page).toHaveURL(/.*sms/);
  386 |       await expect(page.locator('text=SMS')).toBeVisible();
  387 |       
  388 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/sms-dashboard.png` });
  389 |     });
  390 | 
  391 |     test('Can compose new SMS', async ({ page }) => {
  392 |       await page.click('nav >> text=SMS');
  393 |       await page.waitForLoadState('networkidle');
  394 |       
  395 |       await page.click('button:has-text("Compose")');
  396 |       
  397 |       await page.fill('input[name="recipients"]', '+254700000000');
  398 |       await page.fill('textarea[name="message"]', 'Test SMS message');
  399 |       
  400 |       await page.click('button:has-text("Send")');
  401 |       
  402 |       await expect(page.locator('text=SMS sent successfully')).toBeVisible();
  403 |       
  404 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/sms-compose.png` });
  405 |     });
  406 | 
  407 |     test('Can view SMS history', async ({ page }) => {
  408 |       await page.click('nav >> text=SMS');
  409 |       await page.waitForLoadState('networkidle');
  410 |       
  411 |       await page.click('text=History');
  412 |       
  413 |       await expect(page.locator('text=SMS History')).toBeVisible();
  414 |       
  415 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/sms-history.png` });
  416 |     });
  417 | 
  418 |     test('Can view SMS analytics', async ({ page }) => {
  419 |       await page.click('nav >> text=SMS');
  420 |       await page.waitForLoadState('networkidle');
  421 |       
  422 |       await page.click('text=Analytics');
  423 |       
  424 |       await expect(page.locator('text=SMS Analytics')).toBeVisible();
  425 |       
  426 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/sms-analytics.png` });
  427 |     });
  428 |   });
  429 | 
  430 |   test.describe('Announcements Module', () => {
  431 |     test.beforeEach(async ({ page }) => {
  432 |       await page.goto(`${BASE_URL}/auth/login`);
  433 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
  434 |       await page.fill('input[name="password"]', USERS.superAdmin.password);
  435 |       await page.click('button[type="submit"]');
  436 |       await page.waitForLoadState('networkidle');
  437 |     });
  438 | 
  439 |     test('Announcements list loads correctly', async ({ page }) => {
  440 |       await page.click('nav >> text=Announcements');
  441 |       await expect(page).toHaveURL(/.*announcements/);
  442 |       await expect(page.locator('text=Announcements')).toBeVisible();
  443 |       
  444 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/announcements-list.png` });
  445 |     });
  446 | 
  447 |     test('Can create new announcement', async ({ page }) => {
  448 |       await page.click('nav >> text=Announcements');
  449 |       await page.waitForLoadState('networkidle');
  450 |       
  451 |       await page.click('button:has-text("Add Announcement")');
  452 |       
  453 |       await page.fill('input[name="title"]', 'Test Announcement');
  454 |       await page.fill('textarea[name="content"]', 'Test announcement content');
  455 |       
  456 |       await page.click('button:has-text("Publish")');
  457 |       
  458 |       await expect(page.locator('text=Announcement published successfully')).toBeVisible();
  459 |       
  460 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/announcements-add.png` });
  461 |     });
  462 | 
  463 |     test('Can schedule announcement', async ({ page }) => {
  464 |       await page.click('nav >> text=Announcements');
  465 |       await page.waitForLoadState('networkidle');
  466 |       
  467 |       await page.click('button:has-text("Add Announcement")');
  468 |       
  469 |       await page.fill('input[name="title"]', 'Scheduled Announcement');
  470 |       await page.fill('textarea[name="content"]', 'Scheduled content');
  471 |       await page.fill('input[name="scheduledDate"]', '2026-12-31');
  472 |       
  473 |       await page.click('button:has-text("Schedule")');
  474 |       
  475 |       await expect(page.locator('text=Announcement scheduled successfully')).toBeVisible();
  476 |       
  477 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/announcements-schedule.png` });
```