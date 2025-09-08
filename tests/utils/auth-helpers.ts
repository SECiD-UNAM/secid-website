import { Page, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

export interface TestUser {
  email: string;
  password: string;
  name?: string;
  role?: 'user' | 'admin' | 'premium' | 'company';
}

export class AuthHelpers {
  private static readonly AUTH_STATE_DIR = path.join(__dirname, '../../test-results/.auth');
  
  /**
   * Login as a test user and save authentication state
   */
  static async loginAndSaveState(
    page: Page,
    user: TestUser,
    stateName: string = 'user'
  ): Promise<void> {
    // Navigate to login page
    await page.goto('/login');
    
    // Fill login form
    await page.fill('[data-testid="login-email"]', user.email);
    await page.fill('[data-testid="login-password"]', user.password);
    
    // Submit form
    await page.click('[data-testid="login-submit"]');
    
    // Wait for successful login
    await page.waitForURL(/\/(dashboard|home)/);
    
    // Save authentication state
    await this.saveAuthState(page.context(), stateName);
  }

  /**
   * Save authentication state to file
   */
  static async saveAuthState(
    context: BrowserContext,
    stateName: string
  ): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(this.AUTH_STATE_DIR, { recursive: true });
    
    // Save state
    const statePath = path.join(this.AUTH_STATE_DIR, `${stateName}.json`);
    await context.storageState({ path: statePath });
  }

  /**
   * Load authentication state from file
   */
  static async loadAuthState(
    context: BrowserContext,
    stateName: string
  ): Promise<boolean> {
    const statePath = path.join(this.AUTH_STATE_DIR, `${stateName}.json`);
    
    try {
      // Check if state file exists
      await fs.access(statePath);
      
      // Load state into context
      const state = JSON.parse(await fs.readFile(statePath, 'utf-8'));
      await context.addCookies(state.cookies);
      
      // Set local storage
      if (state.origins && state.origins.length > 0) {
        for (const origin of state.origins) {
          if (origin.localStorage && origin.localStorage.length > 0) {
            await context.addInitScript((items) => {
              for (const item of items) {
                localStorage.setItem(item.name, item.value);
              }
            }, origin.localStorage);
          }
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Login as regular user
   */
  static async loginAsUser(page: Page): Promise<void> {
    const user: TestUser = {
      email: process.env.TEST_USER_EMAIL || 'test@secid.mx',
      password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
      name: process.env.TEST_USER_NAME || 'Test User',
      role: 'user'
    };
    
    await this.loginAndSaveState(page, user, 'user');
  }

  /**
   * Login as admin
   */
  static async loginAsAdmin(page: Page): Promise<void> {
    const admin: TestUser = {
      email: process.env.ADMIN_EMAIL || 'admin@secid.mx',
      password: process.env.ADMIN_PASSWORD || 'AdminPassword123!',
      name: process.env.ADMIN_NAME || 'Admin User',
      role: 'admin'
    };
    
    await this.loginAndSaveState(page, admin, 'admin');
  }

  /**
   * Login as premium user
   */
  static async loginAsPremium(page: Page): Promise<void> {
    const premium: TestUser = {
      email: process.env.PREMIUM_USER_EMAIL || 'premium@secid.mx',
      password: process.env.PREMIUM_USER_PASSWORD || 'PremiumPassword123!',
      role: 'premium'
    };
    
    await this.loginAndSaveState(page, premium, 'premium');
  }

  /**
   * Login as company user
   */
  static async loginAsCompany(page: Page): Promise<void> {
    const company: TestUser = {
      email: process.env.COMPANY_EMAIL || 'company@techcorp.mx',
      password: process.env.COMPANY_PASSWORD || 'CompanyPassword123!',
      name: process.env.COMPANY_NAME || 'TechCorp',
      role: 'company'
    };
    
    await this.loginAndSaveState(page, company, 'company');
  }

  /**
   * Register a new user
   */
  static async registerNewUser(
    page: Page,
    userData?: Partial<TestUser>
  ): Promise<TestUser> {
    const timestamp = Date.now();
    const user: TestUser = {
      email: userData?.email || `test-${timestamp}@secid.mx`,
      password: userData?.password || 'TestPassword123!',
      name: userData?.name || `Test User ${timestamp}`,
      ...userData
    };
    
    // Navigate to signup page
    await page.goto('/signup');
    
    // Fill registration form
    if (user.name) {
      const [firstName, ...lastNameParts] = user.name.split(' ');
      await page.fill('[data-testid="signup-firstname"]', firstName);
      await page.fill('[data-testid="signup-lastname"]', lastNameParts.join(' ') || 'User');
    }
    
    await page.fill('[data-testid="signup-email"]', user.email);
    await page.fill('[data-testid="signup-password"]', user.password);
    await page.fill('[data-testid="signup-password-confirm"]', user.password);
    
    // Accept terms
    await page.check('[data-testid="signup-terms"]');
    
    // Submit form
    await page.click('[data-testid="signup-submit"]');
    
    // Wait for successful registration
    await page.waitForURL(/\/(onboarding|dashboard|verify-email)/);
    
    return user;
  }

  /**
   * Logout current user
   */
  static async logout(page: Page): Promise<void> {
    // Click user menu
    await page.click('[data-testid="user-menu"]');
    
    // Click logout
    await page.click('[data-testid="nav-logout"]');
    
    // Wait for redirect
    await page.waitForURL(/\/(home|login|\/$)/);
    
    // Clear storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Check if user is logged in
   */
  static async isLoggedIn(page: Page): Promise<boolean> {
    // Check for user menu presence
    const userMenu = page.locator('[data-testid="user-menu"]');
    return await userMenu.isVisible({ timeout: 1000 }).catch(() => false);
  }

  /**
   * Get current user info
   */
  static async getCurrentUser(page: Page): Promise<any | null> {
    if (!await this.isLoggedIn(page)) {
      return null;
    }
    
    // Get user data from local storage or API
    const userData = await page.evaluate(() => {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    });
    
    return userData;
  }

  /**
   * Setup two-factor authentication
   */
  static async setupTwoFactor(page: Page): Promise<string> {
    // Navigate to security settings
    await page.goto('/settings/security');
    
    // Enable 2FA
    await page.click('[data-testid="enable-2fa"]');
    
    // Get QR code or secret
    const secret = await page.textContent('[data-testid="2fa-secret"]');
    
    // Confirm setup with test code
    const testCode = this.generateTOTP(secret || '');
    await page.fill('[data-testid="2fa-code"]', testCode);
    await page.click('[data-testid="2fa-confirm"]');
    
    // Wait for success
    await page.waitForSelector('[data-testid="2fa-success"]');
    
    return secret || '';
  }

  /**
   * Generate TOTP code for 2FA (mock implementation)
   */
  static generateTOTP(secret: string): string {
    // In real implementation, use a TOTP library
    // For testing, return a mock code
    return '123456';
  }

  /**
   * Login with 2FA
   */
  static async loginWith2FA(
    page: Page,
    user: TestUser,
    totpCode: string
  ): Promise<void> {
    // Regular login
    await page.goto('/login');
    await page.fill('[data-testid="login-email"]', user.email);
    await page.fill('[data-testid="login-password"]', user.password);
    await page.click('[data-testid="login-submit"]');
    
    // Wait for 2FA prompt
    await page.waitForURL(/\/auth\/2fa/);
    
    // Enter 2FA code
    await page.fill('[data-testid="2fa-code"]', totpCode);
    await page.click('[data-testid="2fa-submit"]');
    
    // Wait for successful login
    await page.waitForURL(/\/(dashboard|home)/);
  }

  /**
   * Reset password
   */
  static async resetPassword(
    page: Page,
    email: string
  ): Promise<void> {
    // Navigate to forgot password
    await page.goto('/forgot-password');
    
    // Enter email
    await page.fill('[data-testid="reset-email"]', email);
    await page.click('[data-testid="reset-submit"]');
    
    // Wait for success message
    await page.waitForSelector('[data-testid="reset-success"]');
  }

  /**
   * Complete password reset
   */
  static async completePasswordReset(
    page: Page,
    token: string,
    newPassword: string
  ): Promise<void> {
    // Navigate to reset page with token
    await page.goto(`/reset-password?token=${token}`);
    
    // Enter new password
    await page.fill('[data-testid="new-password"]', newPassword);
    await page.fill('[data-testid="confirm-password"]', newPassword);
    await page.click('[data-testid="reset-password-submit"]');
    
    // Wait for success
    await page.waitForURL(/\/login/);
  }

  /**
   * Clear all auth states
   */
  static async clearAuthStates(): Promise<void> {
    try {
      await fs.rmdir(this.AUTH_STATE_DIR, { recursive: true });
    } catch (error) {
      // Directory might not exist
    }
  }
}