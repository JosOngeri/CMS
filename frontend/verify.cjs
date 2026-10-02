const { chromium } = require('playwright');

const baseUrl = process.env.VERIFY_BASE_URL || 'https://cms.josongeri.co.ke';
const email = process.env.VERIFY_EMAIL;
const password = process.env.VERIFY_PASSWORD;

if (!email || !password) {
  console.error('Set VERIFY_EMAIL and VERIFY_PASSWORD before running this script.');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('  PAGEERROR:', (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[placeholder*="email" i]', { timeout: 30000 });
  await page.fill('input[placeholder*="email" i]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"], button:has-text("Sign"), button:has-text("Login")');
  await page.waitForTimeout(4000);
  console.log('after login URL:', page.url());
  for (const route of ['events', 'my-departments', 'collections', 'gallery', 'documents']) {
    await page.goto(`${baseUrl}/dashboard/${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    const failed = await page.locator('text=Failed to load this page').count();
    const text = (await page.locator('main, body').first().innerText()).slice(0, 150).replace(/\n+/g, ' | ');
    console.log(`\n=== ${route} — crashed: ${failed > 0}\n    content: ${text}`);
  }
  await browser.close();
})();
