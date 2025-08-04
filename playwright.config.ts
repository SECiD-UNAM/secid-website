import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.TEST_URL || 'http://localhost:4321',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers and mobile devices */
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'Mobile Chrome Android',
      use: { ...devices['Galaxy S9+'] },
    },
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },

    // Additional mobile viewports for thorough testing
    {
      name: 'iPhone SE',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'iPhone 13 Pro',
      use: { ...devices['iPhone 13 Pro'] },
    },
    {
      name: 'iPad Mini',
      use: { ...devices['iPad Mini'] },
    },
    {
      name: 'Samsung Galaxy Tab',
      use: {
        viewport: { width: 800, height: 1280 },
        userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Safari/537.36',
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },

    // Network conditions testing
    {
      name: 'Mobile Slow 3G',
      use: {
        ...devices['Pixel 5'],
        connectionType: 'slow-3g',
      },
    },
    {
      name: 'Mobile Fast 3G',
      use: {
        ...devices['iPhone 12'],
        connectionType: 'fast-3g',
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Global test timeout */
  timeout: 30 * 1000,
  expect: {
    /* Maximum time expect() should wait for the condition to be met. */
    timeout: 5000,
  },
});