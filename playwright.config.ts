import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Performance budgets for Core Web Vitals
export const PERFORMANCE_BUDGETS = {
  FCP: 2000,  // First Contentful Paint
  LCP: 4000,  // Largest Contentful Paint
  CLS: 0.1,   // Cumulative Layout Shift
  FID: 100,   // First Input Delay
};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/report.json' }],
  ] : 'html',
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Test timeout
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // Viewport for desktop tests
    viewport: { width: 1280, height: 720 },
    
    // Browser context options
    contextOptions: {
      ignoreHTTPSErrors: true,
      locale: 'es-MX',
      timezoneId: 'America/Mexico_City',
    },
    
    // Custom test attributes
    testIdAttribute: 'data-testid',
  },

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
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // Tablet devices
    {
      name: 'tablet-landscape',
      use: { ...devices['iPad Pro'], viewport: { width: 1024, height: 768 } },
    },
    
    // Accessibility testing
    {
      name: 'chromium-accessibility',
      use: { 
        ...devices['Desktop Chrome'],
        // Force high contrast mode
        colorScheme: 'dark',
      },
    },
    
    // Performance testing
    {
      name: 'chromium-performance',
      use: { 
        ...devices['Desktop Chrome'],
        // CPU throttling
        launchOptions: {
          args: ['--enable-precise-memory-info'],
        },
      },
    },
  ],

  // Test output directory
  outputDir: 'test-results',

  // Global setup/teardown
  globalSetup: path.join(__dirname, 'tests/global-setup.ts'),
  globalTeardown: path.join(__dirname, 'tests/global-teardown.ts'),

  // Web server configuration
  webServer: {
    command: process.env.CI ? 'npm run preview' : 'npm run dev',
    url: process.env.BASE_URL || 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Test matching patterns
  testMatch: [
    '**/critical-flows/**/*.spec.ts',
    '**/auth/**/*.spec.ts',
    '**/jobs/**/*.spec.ts',
    '**/payments/**/*.spec.ts',
    '**/admin/**/*.spec.ts',
    '**/features/**/*.spec.ts',
    '**/mobile/**/*.spec.ts',
    '**/accessibility/**/*.spec.ts',
    '**/performance/**/*.spec.ts',
    '**/i18n/**/*.spec.ts',
  ],

  // Timeout configurations
  timeout: 60 * 1000, // 60 seconds per test
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },
});