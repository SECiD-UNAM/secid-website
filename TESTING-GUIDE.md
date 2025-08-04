# Testing Guide - SECiD Platform

This comprehensive guide covers all aspects of testing for the SECiD Platform, including unit tests, integration tests, end-to-end tests, and performance testing.

## Table of Contents

1. [Overview](#overview)
2. [Test Setup](#test-setup)
3. [Running Tests](#running-tests)
4. [Unit Testing](#unit-testing)
5. [Integration Testing](#integration-testing)
6. [End-to-End Testing](#end-to-end-testing)
7. [Performance Testing](#performance-testing)
8. [Coverage Requirements](#coverage-requirements)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Overview

The SECiD Platform uses a comprehensive testing strategy to ensure code quality, reliability, and performance:

- **Unit Tests**: Test individual components and functions in isolation
- **Integration Tests**: Test API endpoints and Firebase integration
- **End-to-End Tests**: Test complete user workflows across the application
- **Performance Tests**: Ensure optimal loading times and resource usage
- **Security Tests**: Validate security measures and vulnerability scanning

### Testing Stack

- **Unit/Integration Testing**: Vitest with React Testing Library
- **End-to-End Testing**: Playwright
- **Mocking**: Vi (Vitest's built-in mocking)
- **Firebase Testing**: Firebase Emulator Suite
- **Coverage**: V8 (built into Vitest)
- **CI/CD**: GitHub Actions

## Test Setup

### Prerequisites

Ensure you have the following installed:

```bash
# Node.js 20.17.0 or higher
node --version

# Install dependencies
npm ci

# Install Playwright browsers (for E2E tests)
npx playwright install
```

### Environment Configuration

Create test environment files:

```bash
# Copy environment template
cp .env.example .env.test

# Set test-specific variables
echo "NODE_ENV=test" >> .env.test
echo "FIREBASE_AUTH_EMULATOR_HOST=localhost:9099" >> .env.test
echo "FIRESTORE_EMULATOR_HOST=localhost:8080" >> .env.test
```

### Firebase Emulator Setup

For integration tests, ensure Firebase emulators are running:

```bash
# Start Firebase emulators
npm run emulator:start

# In another terminal, run integration tests
npm run test:integration
```

## Running Tests

### Quick Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with coverage
npm run coverage

# Run mobile tests
npm run test:mobile
```

### Advanced Test Commands

```bash
# Run tests for specific files
npm test -- auth.test.tsx

# Run tests matching pattern
npm test -- --grep="authentication"

# Run tests in specific browser (E2E)
npx playwright test --project=chromium

# Run tests with debugging
npm run test:e2e -- --debug

# Run tests in headed mode
npm run test:e2e -- --headed
```

## Unit Testing

Unit tests are located in the `tests/unit/` directory and test individual components and functions in isolation.

### File Structure

```
tests/unit/
├── components/
│   ├── auth.test.tsx
│   ├── jobs.test.tsx
│   └── events.test.tsx
├── lib/
│   ├── firebase.test.ts
│   ├── utils.test.ts
│   └── validation.test.ts
└── utils/
    └── test-helpers.ts
```

### Writing Unit Tests

#### Component Testing Example

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';

// Mock dependencies
vi.mock('@/lib/firebase', () => ({
  auth: {
    signInWithEmailAndPassword: vi.fn(),
  },
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const mockSignIn = vi.mocked(auth.signInWithEmailAndPassword);
    mockSignIn.mockResolvedValue({ user: mockUser });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
    });
  });
});
```

#### Service Testing Example

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUser, getUserProfile } from '@/lib/firebase';

// Mock Firebase
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
}));

describe('Firebase User Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates user successfully', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    };

    const mockUserCredential = {
      user: { uid: 'test-uid', email: userData.email },
    };

    vi.mocked(createUserWithEmailAndPassword).mockResolvedValue(
      mockUserCredential
    );

    const result = await createUser(userData);

    expect(result.uid).toBe('test-uid');
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      userData.email,
      userData.password
    );
  });

  it('handles user creation errors', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValue(
      new Error('Email already in use')
    );

    await expect(
      createUser({
        email: 'existing@example.com',
        password: 'password123',
      })
    ).rejects.toThrow('Email already in use');
  });
});
```

### Mocking Strategies

#### Firebase Mocking

```typescript
// Mock Firebase modules
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => mockFirestore),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));
```

#### API Mocking

```typescript
// Mock fetch for API calls
global.fetch = vi.fn();

// Mock specific API responses
vi.mocked(fetch).mockResolvedValue({
  ok: true,
  json: async () => ({ success: true, data: mockData }),
});
```

## Integration Testing

Integration tests verify that different parts of the system work together correctly, particularly API endpoints and Firebase integration.

### File Structure

```
tests/integration/
├── api/
│   ├── auth.test.ts
│   ├── jobs.test.ts
│   └── events.test.ts
├── firebase/
│   ├── firestore.test.ts
│   └── security-rules.test.ts
└── helpers/
    └── firebase-test-helpers.ts
```

### Firebase Emulator Testing

```typescript
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import {
  initializeTestApp,
  initializeAdminApp,
} from '@firebase/rules-unit-testing';

describe('Firestore Security Rules', () => {
  let testApp: any;
  let adminApp: any;

  beforeEach(async () => {
    testApp = initializeTestApp({
      projectId: 'test-project',
      auth: { uid: 'test-user', email: 'test@example.com' },
    });

    adminApp = initializeAdminApp({
      projectId: 'test-project',
    });

    // Connect to emulator
    const firestore = getFirestore(testApp);
    if (!firestore._delegate._databaseId.projectId.includes('test')) {
      connectFirestoreEmulator(firestore, 'localhost', 8080);
    }
  });

  afterEach(async () => {
    await testApp.delete();
    await adminApp.delete();
  });

  it('allows users to read their own profile', async () => {
    const firestore = getFirestore(testApp);
    const userDoc = firestore.collection('users').doc('test-user');

    // This should succeed
    const snapshot = await userDoc.get();
    expect(snapshot.exists()).toBe(true);
  });

  it('prevents users from reading other users private profiles', async () => {
    const firestore = getFirestore(testApp);
    const otherUserDoc = firestore.collection('users').doc('other-user');

    // This should fail
    await expect(otherUserDoc.get()).rejects.toThrow();
  });
});
```

### API Integration Testing

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, stopTestServer } from './helpers/test-server';

describe('Jobs API Integration', () => {
  beforeAll(async () => {
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it('creates job posting with valid data', async () => {
    const jobData = {
      title: 'Senior Data Scientist',
      company: 'Test Company',
      location: 'Mexico City',
      type: 'full-time',
      description: 'Test job description',
    };

    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData),
    });

    expect(response.ok).toBe(true);

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data.id).toBeDefined();
  });

  it('validates required fields', async () => {
    const invalidJobData = {
      title: '', // Required field empty
    };

    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidJobData),
    });

    expect(response.status).toBe(400);

    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Title is required');
  });
});
```

## End-to-End Testing

E2E tests verify complete user workflows across the entire application using Playwright.

### File Structure

```
tests/e2e/
├── auth/
│   └── authentication.spec.ts
├── jobs/
│   └── job-board.spec.ts
├── events/
│   └── events.spec.ts
└── utils/
    └── test-helpers.ts
```

### Writing E2E Tests

```typescript
import { test, expect, Page } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear session before each test
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('user can sign in with valid credentials', async ({ page }) => {
    await page.goto('/en/login');

    // Fill login form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/en/login');

    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-error"]')).toContainText(
      /invalid credentials/i
    );
  });
});
```

### Page Object Pattern

```typescript
// tests/e2e/utils/page-objects/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/en/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
  }

  async expectErrorMessage(message: string) {
    await expect(this.page.locator('[data-testid="auth-error"]')).toContainText(
      message
    );
  }
}

// Usage in tests
test('login with page object', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login('test@example.com', 'password123');

  await expect(page).toHaveURL(/.*dashboard/);
});
```

### Mobile Testing

```typescript
test.describe('Mobile Authentication', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    userAgent: 'Mobile Safari',
  });

  test('mobile login works correctly', async ({ page }) => {
    await page.goto('/en/login');

    // Test mobile-specific interactions
    await page.tap('[data-testid="email-input"]');
    await page.fill('[data-testid="email-input"]', 'mobile@example.com');

    // Test touch gestures
    await page.touchscreen.tap(200, 400);

    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });
});
```

## Performance Testing

### Lighthouse Integration

Performance tests run automatically in CI/CD pipeline using Lighthouse CI:

```yaml
# .github/workflows/ci.yml
- name: Run Lighthouse CI
  run: |
    npm install -g @lhci/cli@0.13.x
    lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### Performance Benchmarks

```typescript
// tests/performance/load-time.bench.ts
import { bench, describe } from 'vitest';

describe('Page Load Performance', () => {
  bench('Home page load time', async () => {
    const startTime = Date.now();

    const response = await fetch('http://localhost:4173/');
    await response.text();

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000); // Should load in under 2 seconds
  });

  bench('API response time', async () => {
    const startTime = Date.now();

    const response = await fetch('http://localhost:4173/api/jobs');
    await response.json();

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(500); // Should respond in under 500ms
  });
});
```

### Lighthouse Configuration

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:4173/', 'http://localhost:4173/en/jobs'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

## Coverage Requirements

### Coverage Thresholds

The project maintains strict coverage requirements:

- **Global Coverage**: 80% minimum
- **Library Functions**: 85% minimum
- **Components**: 75% minimum

### Coverage Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/lib/**': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        'src/components/**': {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
      },
    },
  },
});
```

### Viewing Coverage Reports

```bash
# Generate coverage report
npm run coverage

# Open HTML coverage report
open coverage/index.html

# View coverage summary
npm run coverage -- --reporter=text-summary
```

## Best Practices

### Test Organization

1. **Group Related Tests**: Use `describe` blocks to group related test cases
2. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
3. **Single Responsibility**: Each test should verify one specific behavior
4. **Setup and Teardown**: Use `beforeEach`/`afterEach` for test setup and cleanup

### Mocking Guidelines

1. **Mock External Dependencies**: Always mock Firebase, APIs, and external services
2. **Use Real Data**: Use realistic test data that matches production data structures
3. **Reset Mocks**: Clear mocks between tests to avoid test interference
4. **Mock at the Right Level**: Mock at the boundary of your application, not internal functions

### Accessibility Testing

```typescript
// Test for accessibility
test('component is accessible', async ({ page }) => {
  await page.goto('/en/jobs');

  // Run accessibility scan
  const results = await page.accessibility.snapshot();
  expect(results).toBeDefined();

  // Check for ARIA labels
  await expect(page.locator('[data-testid="job-card"]')).toHaveAttribute(
    'aria-label'
  );

  // Test keyboard navigation
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
});
```

### Error Handling

```typescript
// Test error scenarios
test('handles network errors gracefully', async ({ page }) => {
  // Mock network failure
  await page.route('**/api/jobs', (route) => {
    route.abort('failed');
  });

  await page.goto('/en/jobs');

  // Should show error message
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
});
```

## Troubleshooting

### Common Issues

#### Firebase Emulator Connection Issues

```bash
# Check if emulators are running
curl http://localhost:4400/

# Start emulators with debug logging
firebase emulators:start --debug

# Clear emulator data
firebase emulators:exec --project demo-test "npm test"
```

#### Playwright Browser Issues

```bash
# Install all browsers
npx playwright install

# Install system dependencies
npx playwright install-deps

# Update browsers
npx playwright install --force
```

#### Test Timeouts

```typescript
// Increase timeout for slow operations
test('slow operation', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds

  await page.goto('/en/dashboard');
  await page.waitForSelector('[data-testid="complex-chart"]', {
    timeout: 30000,
  });
});
```

#### Memory Issues

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm test

# Run tests with reduced concurrency
npm test -- --reporter=verbose --pool=forks --poolOptions.forks.singleFork=true
```

### Debugging Tests

#### Unit Test Debugging

```bash
# Debug specific test
npm test -- --reporter=verbose auth.test.tsx

# Run tests in UI mode
npm run test:ui

# Debug with browser devtools
npm test -- --inspect-brk
```

#### E2E Test Debugging

```bash
# Run tests in headed mode
npm run test:e2e -- --headed

# Debug with browser devtools
npm run test:e2e -- --debug

# Generate trace files
npm run test:e2e -- --trace=on
```

#### Playwright Inspector

```typescript
// Add breakpoint in test
test('debug test', async ({ page }) => {
  await page.goto('/en/login');

  // This will pause execution and open inspector
  await page.pause();

  await page.fill('[data-testid="email-input"]', 'test@example.com');
});
```

### Performance Debugging

```bash
# Profile test performance
npm test -- --reporter=verbose --logHeapUsage

# Generate performance profile
node --prof npm test

# Analyze performance profile
node --prof-process isolate-*.log > profile.txt
```

### CI/CD Debugging

Check GitHub Actions logs for detailed error information:

1. Navigate to the Actions tab in your GitHub repository
2. Click on the failing workflow run
3. Expand the failed step to see detailed logs
4. Look for specific error messages and stack traces

## Conclusion

This testing guide provides a comprehensive framework for ensuring the quality and reliability of the SECiD Platform. By following these guidelines and best practices, you can:

- Write effective tests that catch bugs early
- Maintain high code coverage and quality
- Ensure accessibility and performance standards
- Debug and troubleshoot testing issues efficiently

Remember to:

- Write tests before or alongside feature development
- Keep tests simple, focused, and maintainable
- Use appropriate testing strategies for different scenarios
- Regularly review and update test coverage
- Monitor test performance and reliability in CI/CD

For additional help or questions about testing, refer to the project documentation or reach out to the development team.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Firebase Emulator Documentation](https://firebase.google.com/docs/emulator-suite)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
