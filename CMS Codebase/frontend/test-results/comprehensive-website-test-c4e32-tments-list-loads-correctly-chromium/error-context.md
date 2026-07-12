# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: comprehensive-website-test.spec.js >> KMainCMS Comprehensive Website Tests >> Departments Module >> Departments list loads correctly
- Location: e2e\comprehensive-website-test.spec.js:268:5

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
  162 |       await expect(page.locator('text=Dashboard')).toBeVisible();
  163 |       
  164 |       // Check for quick action buttons
  165 |       const quickActions = page.locator('button').filter({ hasText: /Add|Create|New/ });
  166 |       await expect(quickActions.first()).toBeVisible();
  167 |       
  168 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard-quick-actions.png` });
  169 |     });
  170 |   });
  171 | 
  172 |   test.describe('Members Module', () => {
  173 |     test.beforeEach(async ({ page }) => {
  174 |       await page.goto(`${BASE_URL}/auth/login`);
  175 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
  176 |       await page.fill('input[name="password"]', USERS.superAdmin.password);
  177 |       await page.click('button[type="submit"]');
  178 |       await page.waitForLoadState('networkidle');
  179 |     });
  180 | 
  181 |     test('Members directory loads correctly', async ({ page }) => {
  182 |       await page.click('nav >> text=Members');
  183 |       await expect(page).toHaveURL(/.*members/);
  184 |       await expect(page.locator('text=Members')).toBeVisible();
  185 |       
  186 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/members-directory.png` });
  187 |     });
  188 | 
  189 |     test('Can search for members', async ({ page }) => {
  190 |       await page.click('nav >> text=Members');
  191 |       await page.waitForLoadState('networkidle');
  192 |       
  193 |       await page.fill('input[placeholder*="search" i]', 'John');
  194 |       await page.press('input[placeholder*="search" i]', 'Enter');
  195 |       
  196 |       await page.waitForLoadState('networkidle');
  197 |       
  198 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/members-search.png` });
  199 |     });
  200 | 
  201 |     test('Can add new member', async ({ page }) => {
  202 |       await page.click('nav >> text=Members');
  203 |       await page.waitForLoadState('networkidle');
  204 |       
  205 |       await page.click('button:has-text("Add Member")');
  206 |       
  207 |       await page.fill('input[name="firstName"]', 'Test');
  208 |       await page.fill('input[name="lastName"]', 'Member');
  209 |       await page.fill('input[name="email"]', 'testmember@kmaincms.org');
  210 |       await page.fill('input[name="phone"]', '+254700000000');
  211 |       
  212 |       await page.click('button:has-text("Save")');
  213 |       
  214 |       await expect(page.locator('text=Member added successfully')).toBeVisible();
  215 |       
  216 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/members-add.png` });
  217 |     });
  218 | 
  219 |     test('Can edit existing member', async ({ page }) => {
  220 |       await page.click('nav >> text=Members');
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
> 262 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
      |                  ^ Error: page.fill: Test timeout of 30000ms exceeded.
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
```