import { test, expect, Page } from '@playwright/test';
import { mockUsers } from '../../fixtures';

// Test URLs
const BASE_URL = process.env.BASE_URL || 'http://localhost:4321';
const LOGIN_URL = `${BASE_URL}/en/login`;
const SIGNUP_URL = `${BASE_URL}/en/signup`;
const DASHBOARD_URL = `${BASE_URL}/en/dashboard`;

// Helper functions
async function navigateToLogin(page: Page) {
  await page.goto(LOGIN_URL);
  await expect(page).toHaveTitle(/sign in/i);
}

async function navigateToSignup(page: Page) {
  await page.goto(SIGNUP_URL);
  await expect(page).toHaveTitle(/sign up/i);
}

async function fillLoginForm(page: Page, email: string, password: string) {
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
}

async function fillSignupForm(page: Page, userData: any) {
  await page.fill('[data-testid="email-input"]', userData.email);
  await page.fill('[data-testid="password-input"]', userData.password);
  await page.fill('[data-testid="confirm-password-input"]', userData.password);
  await page.fill('[data-testid="first-name-input"]', userData.firstName);
  await page.fill('[data-testid="last-name-input"]', userData.lastName);
  await page.selectOption('[data-testid="university-select"]', userData.university);
  await page.fill('[data-testid="graduation-year-input"]', userData.graduationYear.toString());
  await page.selectOption('[data-testid="major-select"]', userData.major);
}

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
  });

  test.describe('Sign In', () => {
    test('should display login form correctly', async ({ page }) => {
      await navigateToLogin(page);
      
      // Check form elements
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="forgot-password-link"]')).toBeVisible();
      await expect(page.locator('[data-testid="signup-link"]')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await navigateToLogin(page);
      
      await fillLoginForm(page, 'invalid-email', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-error"]')).toContainText(/invalid email/i);
    });

    test('should validate required fields', async ({ page }) => {
      await navigateToLogin(page);
      
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await navigateToLogin(page);
      
      await fillLoginForm(page, 'nonexistent@example.com', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="auth-error"]')).toContainText(/invalid credentials/i);
    });

    test('should successfully login with valid credentials', async ({ page }) => {
      await navigateToLogin(page);
      
      await fillLoginForm(page, 'test@example.com', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(DASHBOARD_URL);
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should remember user session on page refresh', async ({ page }) => {
      await navigateToLogin(page);
      
      await fillLoginForm(page, 'test@example.com', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await expect(page).toHaveURL(DASHBOARD_URL);
      
      // Refresh page
      await page.reload();
      
      // Should still be logged in
      await expect(page).toHaveURL(DASHBOARD_URL);
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should handle forgot password flow', async ({ page }) => {
      await navigateToLogin(page);
      
      await page.click('[data-testid="forgot-password-link"]');
      
      // Should show forgot password modal
      await expect(page.locator('[data-testid="forgot-password-modal"]')).toBeVisible();
      
      await page.fill('[data-testid="reset-email-input"]', 'test@example.com');
      await page.click('[data-testid="send-reset-button"]');
      
      await expect(page.locator('[data-testid="reset-success-message"]')).toBeVisible();
    });
  });

  test.describe('Sign Up', () => {
    test('should display signup form correctly', async ({ page }) => {
      await navigateToSignup(page);
      
      // Check form elements
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="confirm-password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="first-name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="last-name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="university-select"]')).toBeVisible();
      await expect(page.locator('[data-testid="signup-button"]')).toBeVisible();
    });

    test('should validate password confirmation', async ({ page }) => {
      await navigateToSignup(page);
      
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.fill('[data-testid="confirm-password-input"]', 'different123');
      await page.click('[data-testid="signup-button"]');
      
      await expect(page.locator('[data-testid="confirm-password-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText(/passwords do not match/i);
    });

    test('should validate password strength', async ({ page }) => {
      await navigateToSignup(page);
      
      await page.fill('[data-testid="password-input"]', '123');
      await page.click('[data-testid="signup-button"]');
      
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toContainText(/password must be at least/i);
    });

    test('should validate required fields', async ({ page }) => {
      await navigateToSignup(page);
      
      await page.click('[data-testid="signup-button"]');
      
      // Check for required field errors
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="first-name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="last-name-error"]')).toBeVisible();
    });

    test('should show error for existing email', async ({ page }) => {
      await navigateToSignup(page);
      
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        university: 'UNAM',
        graduationYear: 2023,
        major: 'Data Science',
      };
      
      await fillSignupForm(page, userData);
      await page.click('[data-testid="signup-button"]');
      
      await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="auth-error"]')).toContainText(/email already in use/i);
    });

    test('should successfully create account with valid data', async ({ page }) => {
      await navigateToSignup(page);
      
      const userData = {
        email: `test+${Date.now()}@example.com`,
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        university: 'UNAM',
        graduationYear: 2023,
        major: 'Data Science',
      };
      
      await fillSignupForm(page, userData);
      await page.click('[data-testid="signup-button"]');
      
      // Should show email verification message
      await expect(page.locator('[data-testid="verification-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="verification-message"]')).toContainText(/check your email/i);
    });

    test('should handle terms and conditions checkbox', async ({ page }) => {
      await navigateToSignup(page);
      
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        university: 'UNAM',
        graduationYear: 2023,
        major: 'Data Science',
      };
      
      await fillSignupForm(page, userData);
      
      // Try to submit without accepting terms
      await page.click('[data-testid="signup-button"]');
      
      await expect(page.locator('[data-testid="terms-error"]')).toBeVisible();
      
      // Accept terms and submit
      await page.check('[data-testid="terms-checkbox"]');
      await page.click('[data-testid="signup-button"]');
      
      await expect(page.locator('[data-testid="verification-message"]')).toBeVisible();
    });
  });

  test.describe('Social Authentication', () => {
    test('should display social login options', async ({ page }) => {
      await navigateToLogin(page);
      
      await expect(page.locator('[data-testid="google-login-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="github-login-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="linkedin-login-button"]')).toBeVisible();
    });

    test('should handle Google OAuth flow', async ({ page }) => {
      await navigateToLogin(page);
      
      // Mock Google OAuth popup
      await page.route('**/auth/google', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, user: mockUsers.regularUser }),
        });
      });
      
      await page.click('[data-testid="google-login-button"]');
      
      // Should redirect to dashboard after successful OAuth
      await expect(page).toHaveURL(DASHBOARD_URL);
    });
  });

  test.describe('Two-Factor Authentication', () => {
    test('should prompt for 2FA when enabled', async ({ page }) => {
      await navigateToLogin(page);
      
      // Mock user with 2FA enabled
      await fillLoginForm(page, '2fa-user@example.com', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Should show 2FA verification form
      await expect(page.locator('[data-testid="2fa-verification-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="2fa-code-input"]')).toBeVisible();
    });

    test('should validate 2FA code', async ({ page }) => {
      await navigateToLogin(page);
      
      await fillLoginForm(page, '2fa-user@example.com', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="2fa-verification-form"]')).toBeVisible();
      
      // Enter invalid code
      await page.fill('[data-testid="2fa-code-input"]', '000000');
      await page.click('[data-testid="verify-2fa-button"]');
      
      await expect(page.locator('[data-testid="2fa-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="2fa-error"]')).toContainText(/invalid code/i);
    });

    test('should complete login with valid 2FA code', async ({ page }) => {
      await navigateToLogin(page);
      
      await fillLoginForm(page, '2fa-user@example.com', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="2fa-verification-form"]')).toBeVisible();
      
      // Enter valid code
      await page.fill('[data-testid="2fa-code-input"]', '123456');
      await page.click('[data-testid="verify-2fa-button"]');
      
      await expect(page).toHaveURL(DASHBOARD_URL);
    });
  });

  test.describe('Logout', () => {
    test('should successfully logout user', async ({ page }) => {
      // First login
      await navigateToLogin(page);
      await fillLoginForm(page, 'test@example.com', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await expect(page).toHaveURL(DASHBOARD_URL);
      
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Should redirect to home page and clear session
      await expect(page).toHaveURL(BASE_URL);
      await expect(page.locator('[data-testid="login-link"]')).toBeVisible();
    });

    test('should clear session data on logout', async ({ page }) => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, 'test@example.com', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Try to access protected page
      await page.goto(DASHBOARD_URL);
      
      // Should redirect to login
      await expect(page).toHaveURL(LOGIN_URL);
    });
  });

  test.describe('Session Management', () => {
    test('should handle session expiration', async ({ page }) => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, 'test@example.com', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Mock session expiration
      await page.evaluate(() => {
        localStorage.setItem('session_expired', 'true');
      });
      
      await page.reload();
      
      // Should show session expired message and redirect to login
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
      await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should handle concurrent sessions', async ({ page, context }) => {
      // Login in first tab
      await navigateToLogin(page);
      await fillLoginForm(page, 'test@example.com', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Open second tab and login with different account
      const newPage = await context.newPage();
      await newPage.goto(LOGIN_URL);
      await fillLoginForm(newPage, 'other@example.com', 'password123');
      await newPage.click('[data-testid="login-button"]');
      
      // First tab should detect session change
      await page.reload();
      await expect(page.locator('[data-testid="session-changed-message"]')).toBeVisible();
    });
  });
});