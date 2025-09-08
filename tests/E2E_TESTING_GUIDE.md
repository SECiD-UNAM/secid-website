# SECiD E2E Testing Framework Guide

## Overview

This document provides a comprehensive guide to the End-to-End (E2E) testing framework implemented for the SECiD platform. The framework is built on **Playwright** and follows industry best practices for maintainable, reliable, and scalable automated testing.

### Key Features

- **Multi-browser Support**: Tests run across Chromium, Firefox, and WebKit engines
- **Mobile Testing**: Comprehensive mobile and tablet device testing
- **Page Object Model**: Structured, maintainable test architecture
- **Performance Testing**: Core Web Vitals monitoring and performance budgets
- **Accessibility Testing**: WCAG 2.1 AA compliance validation
- **CI/CD Integration**: Automated test execution in GitHub Actions
- **Visual Regression**: Screenshot-based UI validation
- **API Mocking**: Controlled backend responses for consistent testing

## Test Structure and Organization

### Directory Structure

```
tests/
├── e2e/                           # End-to-end test specifications
│   ├── auth/                      # Authentication-related tests
│   │   ├── authentication.spec.ts # Core auth flows
│   │   ├── email-auth.spec.ts     # Email/password authentication
│   │   └── social-auth.spec.ts    # OAuth social login tests
│   ├── admin/                     # Administrative functionality tests
│   ├── critical-flows/            # High-priority user journeys
│   ├── jobs/                      # Job board and application tests
│   ├── payments/                  # Payment and subscription tests
│   ├── events/                    # Event management tests
│   ├── homepage.spec.ts           # Landing page tests
│   ├── language.spec.ts           # Internationalization tests
│   ├── mobile.spec.ts             # Mobile-specific tests
│   └── registration.spec.ts       # User registration tests
├── page-objects/                  # Page Object Model implementations
│   ├── base/                      # Base classes and components
│   ├── auth/                      # Authentication pages
│   ├── jobs/                      # Job-related pages
│   ├── payments/                  # Payment flow pages
│   ├── admin/                     # Admin dashboard pages
│   └── shared/                    # Shared components
├── fixtures/                      # Test data and mock objects
├── data/                          # Static test data files
├── utils/                         # Helper functions and utilities
├── integration/                   # API integration tests
├── unit/                          # Component unit tests
└── mobile/                        # Mobile-specific test utilities
```

## Implemented Tests

### 1. Authentication & Authorization Tests (`auth/`)

#### **authentication.spec.ts**

- **Login Form Validation**: Email format, required fields, error handling
- **User Login Flow**: Valid credentials, session persistence, redirects
- **Signup Process**: Form validation, password strength, terms acceptance
- **Password Recovery**: Forgot password flow, email validation
- **2FA Integration**: Two-factor authentication setup and verification
- **Session Management**: Auto-logout, concurrent sessions, session expiration
- **Social Authentication**: Google OAuth integration, profile data sync

#### **email-auth.spec.ts**

- **Email Verification**: Verification email sending, link validation
- **Account Activation**: New user activation process
- **Email Change**: Profile email update with verification

#### **social-auth.spec.ts**

- **Google OAuth**: Login flow, profile synchronization, error handling
- **Social Profile Sync**: Avatar, name, and email data integration

### 2. Critical User Journeys (`critical-flows/`)

#### **registration-to-job-application.spec.ts**

- **End-to-End Flow**: From user registration to job application submission
- **Profile Completion**: Required profile fields for job applications
- **Application Process**: Resume upload, cover letter, application submission

### 3. Job Board & Applications (`jobs/`)

#### **job-board.spec.ts**

- **Job Listings**: Display, pagination, filtering, sorting
- **Search Functionality**: Keyword search, advanced filters, location-based search
- **Job Details**: Complete job information display, company details
- **Application Process**: Apply button, requirements validation, submission

#### **job-application.spec.ts**

- **Application Form**: Resume upload, cover letter input, validation
- **Application Status**: Tracking, notifications, status updates
- **Company Dashboard**: Application management for employers

### 4. Payment & Subscription System (`payments/`)

#### **subscription-flow.spec.ts**

- **Pricing Plans**: Plan selection, feature comparison, billing cycles
- **Payment Processing**: Credit card forms, validation, error handling
- **Subscription Management**: Upgrades, downgrades, cancellations
- **Billing History**: Invoice generation, payment history, receipts

#### **mobile-accessibility.spec.ts**

- **Mobile Payment Flow**: Touch-friendly payment forms
- **Accessibility Compliance**: Screen reader support, keyboard navigation

### 5. Administrative Functions (`admin/`)

#### **admin-functionality.spec.ts**

- **User Management**: User roles, permissions, account management
- **Content Moderation**: Job posting approval, user content review
- **Analytics Dashboard**: Platform metrics, user engagement data
- **System Settings**: Platform configuration, feature toggles

### 6. Core Platform Features

#### **homepage.spec.ts**

- **Hero Section**: Main messaging, call-to-action buttons
- **Feature Cards**: Platform benefits presentation
- **Navigation**: Menu functionality, language switcher
- **Footer**: Links, social media, contact information

#### **language.spec.ts**

- **Internationalization**: Spanish/English language switching
- **Content Translation**: All UI elements, dynamic content
- **URL Structure**: Language-specific routing (`/es/`, `/en/`)

#### **mobile.spec.ts**

- **Responsive Design**: Layout adaptation across viewport sizes
- **Touch Interactions**: Mobile-specific user interactions
- **Performance**: Mobile performance optimization validation

#### **registration.spec.ts**

- **User Registration**: Account creation, profile setup
- **Email Verification**: Verification process, resend functionality
- **Profile Completion**: Required vs optional fields, validation

## Page Object Model Architecture

### Base Classes

#### **BasePage.ts**

The foundation class providing common functionality for all page objects:

```typescript
class BasePage {
  // Navigation and page loading
  async navigate(path: string);
  async waitForPageLoad();

  // Element interactions
  async clickElement(selector: string);
  async fillField(selector: string, value: string);
  async waitForElement(selector: string);

  // Performance and accessibility
  async measurePerformance();
  async checkAccessibility();

  // API interactions
  async waitForAPIResponse(urlPattern: string | RegExp);
  async mockAPIResponse(url: string | RegExp, response: any);
}
```

#### **Key Features:**

- **Performance Monitoring**: Core Web Vitals measurement with budget validation
- **Accessibility Testing**: Automated WCAG compliance checking
- **API Mocking**: Controlled backend responses for predictable testing
- **Error Handling**: Console error detection and reporting
- **Network Monitoring**: Request/response logging and analysis

### Specialized Page Objects

#### **LoginPage.ts**

```typescript
class LoginPage extends BasePage {
  async fillLoginForm(email: string, password: string);
  async submitLogin();
  async clickForgotPassword();
  async validateErrorMessage(message: string);
}
```

#### **JobBoardPage.ts**

```typescript
class JobBoardPage extends BasePage {
  async searchJobs(keyword: string);
  async applyFilters(filters: JobFilters);
  async selectJob(jobTitle: string);
  async applyToJob(applicationData: JobApplication);
}
```

## Test Data Management

### Fixtures System

Test data is organized in the `fixtures/` directory with typed interfaces:

#### **users.ts**

```typescript
export const mockUsers = {
  adminUser: {
    uid: 'admin-test-uid',
    email: 'admin@secid.mx',
    displayName: 'Admin Test User',
    customClaims: { role: 'admin' },
    profile: {
      /* detailed profile data */
    },
  },
  regularUser: {
    /* regular user data */
  },
  companyUser: {
    /* company user data */
  },
};
```

#### **jobs.ts**

```typescript
export const mockJobs = {
  dataScienceJob: {
    title: 'Senior Data Scientist',
    company: 'Tech Corp',
    location: 'Mexico City',
    requirements: ['Python', 'Machine Learning', 'SQL'],
  },
};
```

### Dynamic Test Data

Test data is generated dynamically for scenarios requiring unique data:

```typescript
// utils/test-data-generator.ts
export function generateUniqueUser(): UserData {
  return {
    email: `test-${Date.now()}@example.com`,
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    // ... additional fields
  };
}
```

## Configuration and Setup

### Playwright Configuration (`playwright.config.ts`)

#### **Browser Projects**

```typescript
projects: [
  // Desktop browsers
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },

  // Mobile devices
  { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },

  // Specialized testing
  { name: 'chromium-accessibility', use: { colorScheme: 'dark' } },
  {
    name: 'chromium-performance',
    use: {
      /* performance settings */
    },
  },
];
```

#### **Performance Budgets**

```typescript
export const PERFORMANCE_BUDGETS = {
  FCP: 2000, // First Contentful Paint (ms)
  LCP: 4000, // Largest Contentful Paint (ms)
  CLS: 0.1, // Cumulative Layout Shift
  FID: 100, // First Input Delay (ms)
};
```

### Global Setup and Teardown

#### **Global Setup (`global-setup.ts`)**

- Environment variable configuration
- Test database initialization
- Authentication state preparation
- Test data cleanup from previous runs

#### **Global Teardown (`global-teardown.ts`)**

- Test data cleanup
- Database connection closure
- Resource deallocation

## Running Tests

### Local Development

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode for debugging
npm run test:e2e:ui

# Run specific test suite
npx playwright test auth/

# Run on specific browser
npx playwright test --project=chromium

# Run in headed mode (visible browser)
npx playwright test --headed

# Run specific test file
npx playwright test homepage.spec.ts
```

### Mobile Testing

```bash
# Mobile test suite
npm run test:mobile

# Specific mobile tests
npm run test:mobile:suite      # Core mobile tests
npm run test:mobile:viewport   # Viewport tests
npm run test:mobile:touch      # Touch interaction tests
npm run test:mobile:performance # Mobile performance
npm run test:mobile:accessibility # Mobile accessibility

# Mobile debugging
npm run test:mobile:headed     # Visual debugging
npm run test:mobile:debug      # Debug mode
```

### Test Filtering and Targeting

```bash
# Run tests by tag
npx playwright test --grep "@critical"
npx playwright test --grep "@smoke"

# Run tests by file pattern
npx playwright test "**/auth/**"
npx playwright test "**/critical-flows/**"

# Skip specific tests
npx playwright test --grep-invert "@slow"
```

## CI/CD Integration

### GitHub Actions Workflow

The E2E tests are integrated into the CI/CD pipeline with environment-specific configurations:

#### **Test Execution Strategy**

- **Pull Requests**: Run critical and smoke tests only
- **Main Branch**: Full test suite execution
- **Nightly Builds**: Comprehensive testing including performance and accessibility

#### **Test Matrix**

```yaml
strategy:
  matrix:
    browser: [chromium, firefox, webkit]
    device: [desktop, mobile, tablet]
    environment: [staging, production]
```

#### **Parallel Execution**

- Tests run in parallel across multiple workers
- Automatic load balancing and retry logic
- Flaky test detection and quarantine

### Environment Configuration

#### **Development**

```bash
BASE_URL=http://localhost:4321
USE_MOCK_API=true
TIMEOUT_OVERRIDE=30000
```

#### **Staging**

```bash
BASE_URL=https://staging-secid.github.io
USE_MOCK_API=false
TIMEOUT_OVERRIDE=60000
```

#### **Production**

```bash
BASE_URL=https://secid.mx
USE_MOCK_API=false
TIMEOUT_OVERRIDE=90000
HEADLESS=true
```

## Performance and Accessibility Testing

### Performance Testing

#### **Core Web Vitals Monitoring**

Every test automatically measures and validates:

- **First Contentful Paint (FCP)**: ≤ 2000ms
- **Largest Contentful Paint (LCP)**: ≤ 4000ms
- **Cumulative Layout Shift (CLS)**: ≤ 0.1
- **First Input Delay (FID)**: ≤ 100ms

#### **Performance Test Example**

```typescript
test('homepage should meet performance budgets', async ({ page }) => {
  await page.goto('/');
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    return {
      fcp: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime,
      lcp: // ... LCP calculation
    };
  });

  expect(metrics.fcp).toBeLessThan(PERFORMANCE_BUDGETS.FCP);
});
```

### Accessibility Testing

#### **WCAG 2.1 AA Compliance**

Automated accessibility testing covers:

- **Keyboard Navigation**: Tab order, focus management
- **Screen Reader Support**: ARIA labels, semantic HTML
- **Color Contrast**: Text contrast ratios
- **Alternative Text**: Image descriptions
- **Form Labels**: Proper form field labeling

#### **Accessibility Test Example**

```typescript
test('login page should be accessible', async ({ page }) => {
  await page.goto('/login');

  // Check keyboard navigation
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).toBe('INPUT');

  // Validate ARIA attributes
  const emailInput = page.locator('[data-testid="email-input"]');
  await expect(emailInput).toHaveAttribute('aria-label');
});
```

## Best Practices for Writing Tests

### 1. Test Structure and Organization

#### **Use Descriptive Test Names**

```typescript
// ✅ Good
test('should display validation error for invalid email format', async ({ page }) => {

// ❌ Bad
test('email test', async ({ page }) => {
```

#### **Group Related Tests**

```typescript
test.describe('User Authentication', () => {
  test.describe('Login Flow', () => {
    test('should validate required fields', async ({ page }) => {
    test('should accept valid credentials', async ({ page }) => {
  });

  test.describe('Registration Flow', () => {
    // Registration-specific tests
  });
});
```

### 2. Data Management

#### **Use Test-Specific Data**

```typescript
test('should create new user account', async ({ page }) => {
  const userData = generateUniqueUser();
  await signupPage.fillRegistrationForm(userData);
  // ... test implementation
});
```

#### **Clean Up Test Data**

```typescript
test.afterEach(async () => {
  // Clean up test data created during the test
  await cleanupTestData();
});
```

### 3. Element Selection

#### **Use Data Test IDs**

```typescript
// ✅ Preferred - stable and semantic
await page.click('[data-testid="submit-button"]');

// ⚠️ Acceptable - but can break with UI changes
await page.click('button:has-text("Submit")');

// ❌ Avoid - fragile and implementation-dependent
await page.click('#form > div:nth-child(3) > button');
```

### 4. Wait Strategies

#### **Explicit Waits**

```typescript
// ✅ Wait for specific conditions
await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

// ✅ Wait for API responses
await page.waitForResponse(
  (response) =>
    response.url().includes('/api/users') && response.status() === 200
);

// ❌ Avoid arbitrary timeouts
await page.waitForTimeout(5000);
```

### 5. Error Handling and Debugging

#### **Add Context to Assertions**

```typescript
await expect(page.locator('[data-testid="error-message"]')).toHaveText(
  'Email is required',
  { message: 'Validation error should be displayed for empty email field' }
);
```

#### **Take Screenshots on Failure**

```typescript
test('should handle payment processing', async ({ page }) => {
  try {
    // Test implementation
  } catch (error) {
    await page.screenshot({ path: `debug-payment-${Date.now()}.png` });
    throw error;
  }
});
```

### 6. Page Object Model Guidelines

#### **Keep Page Objects Focused**

```typescript
// ✅ Single responsibility
class LoginPage extends BasePage {
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submitForm();
  }
}

// ❌ Too many responsibilities
class UserPage extends BasePage {
  async login() {
    /* ... */
  }
  async editProfile() {
    /* ... */
  }
  async viewJobs() {
    /* ... */
  }
  async makePayment() {
    /* ... */
  }
}
```

#### **Return Page Objects for Chaining**

```typescript
class LoginPage extends BasePage {
  async login(email: string, password: string): Promise<DashboardPage> {
    await this.fillLoginForm(email, password);
    await this.submitForm();
    return new DashboardPage(this.page);
  }
}

// Usage
const dashboardPage = await loginPage.login('user@example.com', 'password');
await dashboardPage.verifyWelcomeMessage();
```

## Troubleshooting Common Issues

### 1. Flaky Tests

#### **Problem**: Tests pass sometimes, fail other times

#### **Solutions**:

```typescript
// Add proper waits
await expect(page.locator('[data-testid="loading"]')).toBeHidden();
await expect(page.locator('[data-testid="content"]')).toBeVisible();

// Use retry assertions
await expect(async () => {
  const count = await page.locator('.item').count();
  expect(count).toBeGreaterThan(0);
}).toPass({ timeout: 10000 });

// Stabilize animations
await page.addStyleTag({
  content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
    }
  `,
});
```

### 2. Slow Tests

#### **Problem**: Tests taking too long to execute

#### **Solutions**:

```typescript
// Optimize page loading
test.use({
  navigationTimeout: 10000,
  actionTimeout: 5000,
});

// Block unnecessary resources
await page.route('**/*.{png,jpg,jpeg,gif,svg,css,woff,woff2}', (route) =>
  route.abort()
);

// Use parallel execution
test.describe.configure({ mode: 'parallel' });
```

### 3. Authentication Issues

#### **Problem**: Login state not persisting between tests

#### **Solutions**:

```typescript
// Store authentication state
await context.storageState({ path: 'auth-state.json' });

// Reuse authentication state
test.use({ storageState: 'auth-state.json' });

// Mock authentication for faster tests
await page.addInitScript(() => {
  localStorage.setItem('auth-token', 'mock-token');
});
```

### 4. Mobile Test Issues

#### **Problem**: Mobile tests failing due to viewport or touch issues

#### **Solutions**:

```typescript
// Ensure proper mobile viewport
test.use({
  viewport: { width: 375, height: 667 },
  isMobile: true,
  hasTouch: true,
});

// Use mobile-specific interactions
await page.locator('[data-testid="menu-button"]').tap();

// Check for mobile-specific elements
await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
```

### 5. Network and API Issues

#### **Problem**: Tests failing due to network conditions or API responses

#### **Solutions**:

```typescript
// Mock API responses for consistency
await page.route('**/api/jobs', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockJobsData),
  });
});

// Add network condition simulation
const context = await browser.newContext({
  offline: false,
  // Simulate slow 3G
  httpCredentials: undefined,
});

// Retry on network errors
test.describe(() => {
  test.describe.configure({ retries: 3 });
});
```

## Test Execution Metrics

### Local Development Targets

- **Test Suite Execution Time**: < 15 minutes (full suite)
- **Critical Path Tests**: < 5 minutes
- **Individual Test Time**: < 30 seconds average

### CI/CD Performance Targets

- **PR Validation**: < 10 minutes
- **Full Suite (Nightly)**: < 45 minutes
- **Parallel Workers**: 4-8 depending on environment

### Success Criteria

- **Test Stability**: > 95% pass rate
- **False Positive Rate**: < 2%
- **Coverage**: > 80% of critical user journeys
- **Performance Budget Compliance**: 100%

## Reporting and Analytics

### Test Reports

- **HTML Report**: Interactive test results with screenshots and videos
- **JUnit XML**: For CI/CD integration and historical tracking
- **JSON Report**: For custom analytics and reporting tools

### Metrics Tracking

- **Test Execution Time**: Track performance trends over time
- **Flaky Test Detection**: Identify and quarantine unreliable tests
- **Coverage Metrics**: Ensure comprehensive platform coverage
- **Performance Trends**: Monitor Core Web Vitals across releases

This comprehensive guide provides the foundation for maintaining and extending the SECiD E2E testing framework. For specific implementation details or advanced scenarios, refer to the individual test files and page object implementations in the codebase.
