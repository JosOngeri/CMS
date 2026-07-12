# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: comprehensive-website-test.spec.js >> KMainCMS Comprehensive Website Tests >> Treasury Module >> Can add new payment
- Location: e2e\comprehensive-website-test.spec.js:335:5

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
  221 |       await page.waitForLoadState('networkidle');
  222 |       
  223 |       await page.click('button:has-text("Edit")').first();
  224 |       
  225 |       await page.fill('input[name="firstName"]', 'Updated');
  226 |       await page.click('button:has-text("Save")');
  227 |       
  228 |       await expect(page.locator('text=Member updated successfully')).toBeVisible();
  229 |       
  230 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/members-edit.png` });
  231 |     });
  232 | 
  233 |     test('Can delete member', async ({ page }) => {
  234 |       await page.click('nav >> text=Members');
  235 |       await page.waitForLoadState('networkidle');
  236 |       
  237 |       await page.click('button:has-text("Delete")').first();
  238 |       await page.click('button:has-text("Confirm")');
  239 |       
  240 |       await expect(page.locator('text=Member deleted successfully')).toBeVisible();
  241 |       
  242 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/members-delete.png` });
  243 |     });
  244 | 
  245 |     test('Member directory pagination works', async ({ page }) => {
  246 |       await page.click('nav >> text=Members');
  247 |       await page.waitForLoadState('networkidle');
  248 |       
  249 |       const pagination = page.locator('[class*="pagination"]');
  250 |       if (await pagination.count() > 0) {
  251 |         await page.click('button:has-text("Next")');
  252 |         await page.waitForLoadState('networkidle');
  253 |       }
  254 |       
  255 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/members-pagination.png` });
  256 |     });
  257 |   });
  258 | 
  259 |   test.describe('Departments Module', () => {
  260 |     test.beforeEach(async ({ page }) => {
  261 |       await page.goto(`${BASE_URL}/auth/login`);
  262 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
  263 |       await page.fill('input[name="password"]', USERS.superAdmin.password);
  264 |       await page.click('button[type="submit"]');
  265 |       await page.waitForLoadState('networkidle');
  266 |     });
  267 | 
  268 |     test('Departments list loads correctly', async ({ page }) => {
  269 |       await page.click('nav >> text=Departments');
  270 |       await expect(page).toHaveURL(/.*departments/);
  271 |       await expect(page.locator('text=Departments')).toBeVisible();
  272 |       
  273 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/departments-list.png` });
  274 |     });
  275 | 
  276 |     test('Can create new department', async ({ page }) => {
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
> 321 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
      |                  ^ Error: page.fill: Test timeout of 30000ms exceeded.
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
```