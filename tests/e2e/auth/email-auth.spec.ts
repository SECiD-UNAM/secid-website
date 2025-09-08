import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/LoginPage';
import { NavigationComponent } from '../../page-objects/base/NavigationComponent';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestDataGenerator } from '../../utils/test-data-generator';
import validUsers from '../../data/users/valid-users.json';
import invalidUsers from '../../data/users/invalid-users.json';

test.describe('Email Authentication', () => {
  let loginPage: LoginPage;
  let navigation: NavigationComponent;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    navigation = new NavigationComponent(page);
    await loginPage.goto();
  });

  test.describe('Successful Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      // Arrange
      const user = validUsers.regularUser;
      
      // Act
      await loginPage.login(user.email, user.password);
      
      // Assert
      await expect(page).toHaveURL(/\/(dashboard|home)/);
      expect(await navigation.isUserLoggedIn()).toBe(true);
      
      // Verify user info in navigation
      const userInfo = await navigation.getUserInfo();
      expect(userInfo?.email).toBe(user.email);
    });

    test('should login and remember user', async ({ page, context }) => {
      // Arrange
      const user = validUsers.regularUser;
      
      // Act
      await loginPage.login(user.email, user.password, true);
      
      // Assert
      await expect(page).toHaveURL(/\/(dashboard|home)/);
      
      // Check cookies persist
      const cookies = await context.cookies();
      const authCookie = cookies.find(c => c.name.includes('auth') || c.name.includes('session'));
      expect(authCookie).toBeDefined();
      expect(authCookie?.expires).toBeGreaterThan(Date.now() / 1000 + 86400); // More than 1 day
    });

    test('should login with Enter key', async ({ page }) => {
      // Arrange
      const user = validUsers.regularUser;
      
      // Act
      await loginPage.fillLoginForm(user.email, user.password);
      await loginPage.submitWithEnter();
      
      // Assert
      await expect(page).toHaveURL(/\/(dashboard|home)/);
      expect(await navigation.isUserLoggedIn()).toBe(true);
    });

    test('should redirect to original page after login', async ({ page }) => {
      // Navigate to protected page
      await page.goto('/dashboard/profile');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
      
      // Login
      const user = validUsers.regularUser;
      await loginPage.login(user.email, user.password);
      
      // Should redirect back to profile
      await expect(page).toHaveURL(/\/dashboard\/profile/);
    });
  });

  test.describe('Failed Login', () => {
    test('should show error for invalid email', async () => {
      // Arrange
      const user = invalidUsers.invalidEmail;
      
      // Act
      await loginPage.login(user.email, user.password);
      
      // Assert
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('correo electrónico válido');
    });

    test('should show error for wrong password', async () => {
      // Arrange
      const email = validUsers.regularUser.email;
      const wrongPassword = 'WrongPassword123!';
      
      // Act
      await loginPage.login(email, wrongPassword);
      
      // Assert
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toMatch(/contraseña incorrecta|credenciales inválidas/i);
    });

    test('should show error for non-existent user', async () => {
      // Arrange
      const nonExistentUser = TestDataGenerator.generateUser();
      
      // Act
      await loginPage.login(nonExistentUser.email, nonExistentUser.password);
      
      // Assert
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toMatch(/no existe|usuario no encontrado/i);
    });

    test('should handle SQL injection attempts', async ({ page }) => {
      // Arrange
      const maliciousUser = invalidUsers.sqlInjection;
      
      // Act
      await loginPage.login(maliciousUser.email, maliciousUser.password);
      
      // Assert
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
      
      // Verify no redirect occurred
      await expect(page).toHaveURL(/\/login/);
    });

    test('should handle XSS attempts', async ({ page }) => {
      // Arrange
      const xssUser = invalidUsers.xssAttempt;
      
      // Act
      await loginPage.fillLoginForm(xssUser.email, xssUser.password);
      await loginPage.submitLogin();
      
      // Assert
      // Check that no script was executed
      const alertTriggered = await page.evaluate(() => {
        return window.alertTriggered || false;
      });
      expect(alertTriggered).toBe(false);
    });
  });

  test.describe('Form Validation', () => {
    test('should validate required fields', async () => {
      // Act - Submit empty form
      await loginPage.submitLogin();
      
      // Assert
      const errors = await loginPage.validateFormErrors();
      expect(errors.email).toBeTruthy();
      expect(errors.password).toBeTruthy();
    });

    test('should validate email format', async () => {
      // Act
      await loginPage.fillLoginForm('invalid-email', 'Password123!');
      await loginPage.submitLogin();
      
      // Assert
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('correo electrónico válido');
    });

    test('should disable submit button while loading', async () => {
      // Arrange
      const user = validUsers.regularUser;
      
      // Act
      await loginPage.fillLoginForm(user.email, user.password);
      const submitPromise = loginPage.submitLogin();
      
      // Assert - Check button is disabled during submission
      const isDisabled = await loginPage.isLoginButtonEnabled();
      expect(isDisabled).toBe(false);
      
      await submitPromise;
    });

    test('should clear errors on input change', async () => {
      // Submit with invalid data
      await loginPage.login('invalid', 'short');
      expect(await loginPage.hasError()).toBe(true);
      
      // Start typing valid data
      await loginPage.clearForm();
      await loginPage.fillLoginForm('valid@email.com', 'ValidPassword123!');
      
      // Error should clear
      expect(await loginPage.hasError()).toBe(false);
    });
  });

  test.describe('Password Management', () => {
    test('should toggle password visibility', async () => {
      // Arrange
      const password = 'TestPassword123!';
      await loginPage.fillLoginForm('test@example.com', password);
      
      // Assert - Initially password type
      expect(await loginPage.getPasswordFieldType()).toBe('password');
      
      // Act - Toggle visibility
      await loginPage.togglePasswordVisibility();
      
      // Assert - Should be text type
      expect(await loginPage.getPasswordFieldType()).toBe('text');
      
      // Act - Toggle back
      await loginPage.togglePasswordVisibility();
      
      // Assert - Should be password type again
      expect(await loginPage.getPasswordFieldType()).toBe('password');
    });

    test('should navigate to forgot password', async ({ page }) => {
      // Act
      await loginPage.clickForgotPassword();
      
      // Assert
      await expect(page).toHaveURL(/\/forgot-password/);
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to signup page', async ({ page }) => {
      // Act
      await loginPage.clickSignUp();
      
      // Assert
      await expect(page).toHaveURL(/\/signup/);
    });

    test('should redirect logged-in users away from login', async ({ page }) => {
      // Login first
      const user = validUsers.regularUser;
      await loginPage.login(user.email, user.password);
      await expect(page).toHaveURL(/\/(dashboard|home)/);
      
      // Try to access login page again
      await page.goto('/login');
      
      // Should redirect to dashboard/home
      await expect(page).toHaveURL(/\/(dashboard|home)/);
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      // Login
      const user = validUsers.regularUser;
      await loginPage.login(user.email, user.password);
      
      // Refresh page
      await page.reload();
      
      // Should still be logged in
      expect(await navigation.isUserLoggedIn()).toBe(true);
    });

    test('should logout successfully', async ({ page }) => {
      // Login
      const user = validUsers.regularUser;
      await loginPage.login(user.email, user.password);
      expect(await navigation.isUserLoggedIn()).toBe(true);
      
      // Logout
      await navigation.logout();
      
      // Verify logged out
      expect(await navigation.isUserLoggedIn()).toBe(false);
      await expect(page).toHaveURL(/\/(home|login)/);
    });

    test('should handle concurrent login attempts', async ({ page, context }) => {
      // Open second tab
      const page2 = await context.newPage();
      const loginPage2 = new LoginPage(page2);
      await loginPage2.goto();
      
      // Login in first tab
      const user = validUsers.regularUser;
      await loginPage.login(user.email, user.password);
      
      // Second tab should also reflect logged-in state when refreshed
      await page2.reload();
      const navigation2 = new NavigationComponent(page2);
      expect(await navigation2.isUserLoggedIn()).toBe(true);
      
      await page2.close();
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle rate limiting after multiple failed attempts', async () => {
      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await loginPage.login('test@example.com', `WrongPassword${i}`);
        await loginPage.clearForm();
      }
      
      // Next attempt should show rate limit error
      await loginPage.login('test@example.com', 'AnotherWrongPassword');
      const errorMessage = await loginPage.getErrorMessage();
      
      expect(errorMessage).toMatch(/demasiados intentos|intenta más tarde|rate limit/i);
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tab through form elements
      await page.keyboard.press('Tab'); // Focus email
      await page.keyboard.type('test@example.com');
      
      await page.keyboard.press('Tab'); // Focus password
      await page.keyboard.type('Password123!');
      
      await page.keyboard.press('Tab'); // Focus remember me
      await page.keyboard.press('Space'); // Check it
      
      await page.keyboard.press('Tab'); // Focus submit button
      await page.keyboard.press('Enter'); // Submit
      
      // Should attempt login
      expect(await loginPage.hasError() || await page.url().includes('dashboard')).toBe(true);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      // Check form accessibility
      const formAccessibility = await page.accessibility.snapshot();
      
      // Email input should have label
      const emailLabel = await page.$eval('[data-testid="login-email"]', el => 
        el.getAttribute('aria-label') || el.getAttribute('placeholder')
      );
      expect(emailLabel).toBeTruthy();
      
      // Password input should have label
      const passwordLabel = await page.$eval('[data-testid="login-password"]', el => 
        el.getAttribute('aria-label') || el.getAttribute('placeholder')
      );
      expect(passwordLabel).toBeTruthy();
    });
  });
});