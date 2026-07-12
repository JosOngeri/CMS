# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: comprehensive-website-test.spec.js >> KMainCMS Comprehensive Website Tests >> Dashboard Module >> Quick actions are available
- Location: e2e\comprehensive-website-test.spec.js:161:5

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="email"]')

```

# Test source

```ts
  26  |     password: 'password123',
  27  |     role: 'Super Admin'
  28  |   },
  29  |   admin: {
  30  |     email: 'admin@kmaincms.org',
  31  |     password: 'password123',
  32  |     role: 'Admin'
  33  |   },
  34  |   member: {
  35  |     email: 'member@kmaincms.org',
  36  |     password: 'password123',
  37  |     role: 'Member'
  38  |   },
  39  |   treasurer: {
  40  |     email: 'treasurer@kmaincms.org',
  41  |     password: 'password123',
  42  |     role: 'Treasurer'
  43  |   },
  44  |   departmentHead: {
  45  |     email: 'dept@kmaincms.org',
  46  |     password: 'password123',
  47  |     role: 'Department Head'
  48  |   }
  49  | };
  50  | 
  51  | test.describe('KMainCMS Comprehensive Website Tests', () => {
  52  |   test.describe('Authentication System', () => {
  53  |     test('Super Admin login with valid credentials', async ({ page }) => {
  54  |       await page.goto(`${BASE_URL}/auth/login`);
  55  |       
  56  |       await page.fill('input[name="email"]', USERS.superAdmin.email);
  57  |       await page.fill('input[name="password"]', USERS.superAdmin.password);
  58  |       await page.click('button[type="submit"]');
  59  |       
  60  |       await expect(page).toHaveURL(/.*dashboard/);
  61  |       await expect(page.locator('text=Dashboard')).toBeVisible();
  62  |       
  63  |       await page.screenshot({ path: `${SCREENSHOT_DIR}/auth-super-admin-login.png` });
  64  |     });
  65  | 
  66  |     test('Member login with valid credentials', async ({ page }) => {
  67  |       await page.goto(`${BASE_URL}/auth/login`);
  68  |       
  69  |       await page.fill('input[name="email"]', USERS.member.email);
  70  |       await page.fill('input[name="password"]', USERS.member.password);
  71  |       await page.click('button[type="submit"]');
  72  |       
  73  |       await expect(page).toHaveURL(/.*dashboard/);
  74  |       await expect(page.locator('text=Dashboard')).toBeVisible();
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
> 126 |       await page.fill('input[name="email"]', USERS.superAdmin.email);
      |                  ^ Error: page.fill: Test timeout of 30000ms exceeded.
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
```