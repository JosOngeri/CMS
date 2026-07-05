# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: comprehensive-website-test.spec.js >> KMainCMS Comprehensive Website Tests >> Gallery Module >> Can upload photo
- Location: e2e\comprehensive-website-test.spec.js:549:5

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
  534 |       await page.goto(`${BASE_URL}/auth/login`);
> 535 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
      |                  ^ Error: page.fill: Test timeout of 30000ms exceeded.
  536 |       await page.fill('input[name="password"]', USERS.superAdmin.password);
  537 |       await page.click('button[type="submit"]');
  538 |       await page.waitForLoadState('networkidle');
  539 |     });
  540 | 
  541 |     test('Gallery loads correctly', async ({ page }) => {
  542 |       await page.click('nav >> text=Gallery');
  543 |       await expect(page).toHaveURL(/.*gallery/);
  544 |       await expect(page.locator('text=Gallery')).toBeVisible();
  545 |       
  546 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/gallery-list.png` });
  547 |     });
  548 | 
  549 |     test('Can upload photo', async ({ page }) => {
  550 |       await page.click('nav >> text=Gallery');
  551 |       await page.waitForLoadState('networkidle');
  552 |       
  553 |       await page.click('button:has-text("Upload Photo")');
  554 |       
  555 |       // Note: File upload would need actual file path
  556 |       // await page.setInputFiles('input[type="file"]', 'test.jpg');
  557 |       
  558 |       await page.fill('input[name="title"]', 'Test Photo');
  559 |       await page.fill('input[name="description"]', 'Test photo description');
  560 |       
  561 |       await page.click('button:has-text("Upload")');
  562 |       
  563 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/gallery-upload.png` });
  564 |     });
  565 | 
  566 |     test('Can create album', async ({ page }) => {
  567 |       await page.click('nav >> text=Gallery');
  568 |       await page.waitForLoadState('networkidle');
  569 |       
  570 |       await page.click('text=Albums');
  571 |       await page.click('button:has-text("Create Album")');
  572 |       
  573 |       await page.fill('input[name="name"]', 'Test Album');
  574 |       await page.fill('textarea[name="description"]', 'Test album description');
  575 |       
  576 |       await page.click('button:has-text("Create")');
  577 |       
  578 |       await expect(page.locator('text=Album created successfully')).toBeVisible();
  579 |       
  580 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/gallery-create-album.png` });
  581 |     });
  582 |   });
  583 | 
  584 |   test.describe('Approvals Module', () => {
  585 |     test.beforeEach(async ({ page }) => {
  586 |       await page.goto(`${BASE_URL}/auth/login`);
  587 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
  588 |       await page.fill('input[name="password"]', USERS.superAdmin.password);
  589 |       await page.click('button[type="submit"]');
  590 |       await page.waitForLoadState('networkidle');
  591 |     });
  592 | 
  593 |     test('Approvals inbox loads correctly', async ({ page }) => {
  594 |       await page.click('nav >> text=Approvals');
  595 |       await expect(page).toHaveURL(/.*approvals/);
  596 |       await expect(page.locator('text=Approvals')).toBeVisible();
  597 |       
  598 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/approvals-inbox.png` });
  599 |     });
  600 | 
  601 |     test('Can approve request', async ({ page }) => {
  602 |       await page.click('nav >> text=Approvals');
  603 |       await page.waitForLoadState('networkidle');
  604 |       
  605 |       await page.click('button:has-text("Approve")').first();
  606 |       
  607 |       await expect(page.locator('text=Request approved successfully')).toBeVisible();
  608 |       
  609 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/approvals-approve.png` });
  610 |     });
  611 | 
  612 |     test('Can reject request', async ({ page }) => {
  613 |       await page.click('nav >> text=Approvals');
  614 |       await page.waitForLoadState('networkidle');
  615 |       
  616 |       await page.click('button:has-text("Reject")').first();
  617 |       await page.fill('textarea[name="reason"]', 'Test rejection reason');
  618 |       await page.click('button:has-text("Confirm")');
  619 |       
  620 |       await expect(page.locator('text=Request rejected successfully')).toBeVisible();
  621 |       
  622 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/approvals-reject.png` });
  623 |     });
  624 |   });
  625 | 
  626 |   test.describe('Settings Module', () => {
  627 |     test.beforeEach(async ({ page }) => {
  628 |       await page.goto(`${BASE_URL}/auth/login`);
  629 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
  630 |       await page.fill('input[name="password"]', USERS.superAdmin.password);
  631 |       await page.click('button[type="submit"]');
  632 |       await page.waitForLoadState('networkidle');
  633 |     });
  634 | 
  635 |     test('Settings page loads correctly', async ({ page }) => {
```