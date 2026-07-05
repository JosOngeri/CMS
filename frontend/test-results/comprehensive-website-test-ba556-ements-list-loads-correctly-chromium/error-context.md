# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: comprehensive-website-test.spec.js >> KMainCMS Comprehensive Website Tests >> Announcements Module >> Announcements list loads correctly
- Location: e2e\comprehensive-website-test.spec.js:439:5

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="email"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]: Too many authentication attempts, please try again later.
```

# Test source

```ts
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
  377 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
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
> 433 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
      |                  ^ Error: page.fill: Test timeout of 30000ms exceeded.
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
  478 |     });
  479 |   });
  480 | 
  481 |   test.describe('Events Module', () => {
  482 |     test.beforeEach(async ({ page }) => {
  483 |       await page.goto(`${BASE_URL}/auth/login`);
  484 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
  485 |       await page.fill('input[name="password"]', USERS.superAdmin.password);
  486 |       await page.click('button[type="submit"]');
  487 |       await page.waitForLoadState('networkidle');
  488 |     });
  489 | 
  490 |     test('Events list loads correctly', async ({ page }) => {
  491 |       await page.click('nav >> text=Events');
  492 |       await expect(page).toHaveURL(/.*events/);
  493 |       await expect(page.locator('text=Events')).toBeVisible();
  494 |       
  495 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/events-list.png` });
  496 |     });
  497 | 
  498 |     test('Can create new event', async ({ page }) => {
  499 |       await page.click('nav >> text=Events');
  500 |       await page.waitForLoadState('networkidle');
  501 |       
  502 |       await page.click('button:has-text("Add Event")');
  503 |       
  504 |       await page.fill('input[name="title"]', 'Test Event');
  505 |       await page.fill('input[name="date"]', '2026-12-31');
  506 |       await page.fill('input[name="location"]', 'Church Hall');
  507 |       
  508 |       await page.click('button:has-text("Save")');
  509 |       
  510 |       await expect(page.locator('text=Event created successfully')).toBeVisible();
  511 |       
  512 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/events-add.png` });
  513 |     });
  514 | 
  515 |     test('Can register for event', async ({ page }) => {
  516 |       await page.click('nav >> text=Events');
  517 |       await page.waitForLoadState('networkidle');
  518 |       
  519 |       await page.click('button:has-text("Register")').first();
  520 |       
  521 |       await page.fill('input[name="name"]', 'Test User');
  522 |       await page.fill('input[name="email"]', 'test@kmaincms.org');
  523 |       
  524 |       await page.click('button:has-text("Register")');
  525 |       
  526 |       await expect(page.locator('text=Registration successful')).toBeVisible();
  527 |       
  528 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/events-register.png` });
  529 |     });
  530 |   });
  531 | 
  532 |   test.describe('Gallery Module', () => {
  533 |     test.beforeEach(async ({ page }) => {
```