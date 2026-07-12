# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: comprehensive-website-test.spec.js >> KMainCMS Comprehensive Website Tests >> Members Module >> Members directory loads correctly
- Location: e2e\comprehensive-website-test.spec.js:181:5

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
  75  |       
  76  |       await page.screenshot({ path: `${SCREENSHOT_DIR}/auth-member-login.png` });
  77  |     });
  78  | 
  79  |     test('Invalid credentials show error message', async ({ page }) => {
  80  |       await page.goto(`${BASE_URL}/auth/login`);
  81  |       
  82  |       await page.fill('input[name="email"]', 'invalid@kmaincms.org');
  83  |       await page.fill('input[name="password"]', 'wrongpassword');
  84  |       await page.click('button[type="submit"]');
  85  |       
  86  |       await expect(page.locator('text=Invalid credentials')).toBeVisible();
  87  |       
  88  |       await page.screenshot({ path: `${SCREENSHOT_DIR}/auth-invalid-credentials.png` });
  89  |     });
  90  | 
  91  |     test('Logout functionality', async ({ page }) => {
  92  |       await page.goto(`${BASE_URL}/auth/login`);
  93  |       
  94  |       await page.fill('input[name="email"]', USERS.superAdmin.email);
  95  |       await page.fill('input[name="password"]', USERS.superAdmin.password);
  96  |       await page.click('button[type="submit"]');
  97  |       
  98  |       await expect(page).toHaveURL(/.*dashboard/);
  99  |       
  100 |       // Click logout
  101 |       await page.click('button:has-text("Logout")');
  102 |       
  103 |       await expect(page).toHaveURL(/.*login/);
  104 |       
  105 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/auth-logout.png` });
  106 |     });
  107 | 
  108 |     test('Password reset flow', async ({ page }) => {
  109 |       await page.goto(`${BASE_URL}/auth/login`);
  110 |       
  111 |       await page.click('text=Forgot Password');
  112 |       
  113 |       await expect(page).toHaveURL(/.*reset-password/);
  114 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
  115 |       await page.click('button[type="submit"]');
  116 |       
  117 |       await expect(page.locator('text=Password reset email sent')).toBeVisible();
  118 |       
  119 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/auth-password-reset.png` });
  120 |     });
  121 |   });
  122 | 
  123 |   test.describe('Dashboard Module', () => {
  124 |     test.beforeEach(async ({ page }) => {
  125 |       await page.goto(`${BASE_URL}/auth/login`);
  126 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
  127 |       await page.fill('input[name="password"]', USERS.superAdmin.password);
  128 |       await page.click('button[type="submit"]');
  129 |       await page.waitForLoadState('networkidle');
  130 |     });
  131 | 
  132 |     test('Dashboard loads with all widgets', async ({ page }) => {
  133 |       await expect(page.locator('text=Dashboard')).toBeVisible();
  134 |       
  135 |       // Check for common dashboard widgets
  136 |       const widgets = [
  137 |         'Members',
  138 |         'Departments',
  139 |         'Treasury',
  140 |         'SMS',
  141 |         'Announcements'
  142 |       ];
  143 |       
  144 |       for (const widget of widgets) {
  145 |         await expect(page.locator(`text=${widget}`).first()).toBeVisible();
  146 |       }
  147 |       
  148 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard-widgets.png` });
  149 |     });
  150 | 
  151 |     test('Dashboard statistics are displayed', async ({ page }) => {
  152 |       await expect(page.locator('text=Dashboard')).toBeVisible();
  153 |       
  154 |       // Check for statistics cards
  155 |       const stats = page.locator('[class*="stat"], [class*="card"]');
  156 |       await expect(stats.first()).toBeVisible();
  157 |       
  158 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard-statistics.png` });
  159 |     });
  160 | 
  161 |     test('Quick actions are available', async ({ page }) => {
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
> 175 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
      |                  ^ Error: page.fill: Test timeout of 30000ms exceeded.
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
```