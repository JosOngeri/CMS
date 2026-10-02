const { chromium } = require('playwright');

const ROUTES = [
  'overview', 'members', 'users', 'profile', 'profile-management',
  'treasury', 'payments/my', 'payments/new', 'obligations', 'payments/history',
  'payments/management', 'collections',
  'treasury/accounts', 'treasury/journal-entries', 'treasury/budgets',
  'treasury/expenses', 'treasury/reports', 'treasury/funds',
  'treasury/reconciliations', 'treasury/contributions', 'treasury/vendors',
  'treasury/projects', 'treasury/assets', 'treasury/pledges',
  'treasury/recurring', 'treasury/receipts', 'treasury/analytics',
  'departments', 'departments/overview', 'departments/head-allocation',
  'departments/handovers', 'departments/settings', 'departments/categories',
  'my-departments',
  'admin', 'admin/database', 'admin/settings', 'admin/documents',
  'security', 'monitoring', 'analytics',
  'sms', 'sms/dashboard', 'sms/contacts', 'sms/groups',
  'announcements', 'documents', 'notifications',
  'telegram', 'telegram/auth', 'telegram/church',
  'gallery', 'events', 'approvals', 'reports', 'content', 'mobile', 'seo',
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = new Map(); // route -> [pageerror messages]
  let failedReqs = [];

  page.on('pageerror', e => {
    const route = page.url().split('/dashboard/')[1] || page.url();
    if (!errors.has(route)) errors.set(route, []);
    errors.get(route).push((e.message || '').split('\n')[0].slice(0, 160));
  });
  page.on('response', res => {
    if (res.status() >= 500 && res.url().includes('/api/')) {
      const route = res.url().replace(/^.*\/api\//, '/api/');
      failedReqs.push(`${res.status()} ${route}`);
    }
  });

  await page.goto('https://cms.josongeri.co.ke/auth/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[placeholder*="email" i]', { timeout: 30000 });
  await page.fill('input[placeholder*="email" i]', 'admin@kiseriansda.org');
  await page.fill('input[type="password"]', 'right123');
  await page.click('button[type="submit"], button:has-text("Sign"), button:has-text("Login")');
  await page.waitForTimeout(5000);
  console.log('after login URL:', page.url());

  const crashes = [];
  for (const route of ROUTES) {
    try {
      await page.goto(`https://cms.josongeri.co.ke/dashboard/${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2800);
      const failed = await page.locator('text=Failed to load this page').count();
      const accessDenied = await page.locator('text=/access denied|not authorized|permission/i').count();
      const marker = failed > 0 ? 'CRASH' : accessDenied > 0 ? 'DENIED' : 'ok';
      if (failed > 0) crashes.push(route);
      console.log(`${marker.padEnd(6)} ${route}`);
    } catch (e) {
      console.log(`NAV-FAIL ${route}: ${e.message.split('\n')[0]}`);
    }
  }

  console.log('\n=== PAGEERRORS ===');
  for (const [route, msgs] of errors) console.log(`${route}: ${[...new Set(msgs)].join(' || ')}`);
  console.log('\n=== 5xx API CALLS ===');
  [...new Set(failedReqs)].forEach(f => console.log(f));
  console.log(`\nCRASHED ROUTES: ${crashes.length ? crashes.join(', ') : 'none'}`);
  await browser.close();
})();
