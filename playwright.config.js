// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for headless-detector e2e tests
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './e2e',
  
  /* Run tests sequentially due to single-worker behavior monitor test */
  fullyParallel: false,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  
  /* Single worker for behavior monitor test */
  workers: 1,
  
  /* Reporter to use */
  reporter: process.env.CI ? 'github' : 'list',
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:8080',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npx http-server . -p 8080 -c-1',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
  
  /* Extended timeout for 5-minute behavior monitoring test */
  timeout: 6 * 60 * 1000, // 6 minutes (5 min session + buffer)
  
  /* Expect timeout */
  expect: {
    timeout: 10000,
  },
});
