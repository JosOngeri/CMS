import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Config (Phase 15)
 * E2E Visual Verification Suite
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5180',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Boot the Vite dev server on the port the specs expect before running.
  // `reuseExistingServer` lets a developer's already-running instance be used
  // locally; CI always starts a fresh one.
  webServer: {
    command: 'npx vite --port 5180 --strictPort',
    url: 'http://localhost:5180',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
