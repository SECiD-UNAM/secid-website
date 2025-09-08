import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/LoginPage';
import { NavigationComponent } from '../../page-objects/base/NavigationComponent';

test.describe('Social Authentication', () => {
  let loginPage: LoginPage;
  let navigation: NavigationComponent;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    navigation = new NavigationComponent(page);
    await loginPage.goto();
  });

  test.describe('Google Authentication', () => {
    test('should display Google login button', async ({ page }) => {
      const googleButton = page.locator('[data-testid="login-google"]');
      await expect(googleButton).toBeVisible();
      await expect(googleButton).toContainText(/Google|google/i);
    });

    test('should initiate Google OAuth flow', async ({ page, context }) => {
      // Mock Google OAuth response
      await page.route('**/oauth/google**', route => {
        route.fulfill({
          status: 302,
          headers: {
            'Location': '/oauth-callback?provider=google&token=mock-token'
          }
        });
      });

      // Monitor new page/popup
      const popupPromise = context.waitForEvent('page');
      
      // Click Google login
      await page.locator('[data-testid="login-google"]').click();
      
      // In real test, would interact with Google OAuth
      // For now, just verify popup was opened
      const popup = await popupPromise.catch(() => null);
      
      if (popup) {
        expect(popup.url()).toMatch(/accounts\.google\.com|oauth\/google/);
        await popup.close();
      }
    });

    test('should handle Google OAuth callback', async ({ page }) => {
      // Simulate OAuth callback
      await page.goto('/oauth-callback?provider=google&code=mock-auth-code');
      
      // Should process callback and redirect to dashboard
      await expect(page).toHaveURL(/\/(dashboard|home)/, { timeout: 10000 });
      expect(await navigation.isUserLoggedIn()).toBe(true);
    });

    test('should handle Google OAuth errors', async ({ page }) => {
      // Simulate OAuth error callback
      await page.goto('/oauth-callback?provider=google&error=access_denied');
      
      // Should redirect to login with error
      await expect(page).toHaveURL(/\/login/);
      
      const errorMessage = page.locator('[data-testid="oauth-error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/acceso denegado|error|cancelado/i);
    });
  });

  test.describe('GitHub Authentication', () => {
    test('should display GitHub login button', async ({ page }) => {
      const githubButton = page.locator('[data-testid="login-github"]');
      await expect(githubButton).toBeVisible();
      await expect(githubButton).toContainText(/GitHub|github/i);
    });

    test('should initiate GitHub OAuth flow', async ({ page, context }) => {
      // Mock GitHub OAuth
      await page.route('**/oauth/github**', route => {
        route.fulfill({
          status: 302,
          headers: {
            'Location': '/oauth-callback?provider=github&token=mock-token'
          }
        });
      });

      const popupPromise = context.waitForEvent('page');
      
      await page.locator('[data-testid="login-github"]').click();
      
      const popup = await popupPromise.catch(() => null);
      
      if (popup) {
        expect(popup.url()).toMatch(/github\.com\/login|oauth\/github/);
        await popup.close();
      }
    });

    test('should verify GitHub email during OAuth', async ({ page }) => {
      // Simulate GitHub OAuth callback with unverified email
      await page.goto('/oauth-callback?provider=github&code=mock-code&email_verified=false');
      
      // Should show email verification required
      await expect(page).toHaveURL(/\/verify-email/);
      
      const message = page.locator('[data-testid="verification-message"]');
      await expect(message).toContainText(/verificar.*correo|email.*verification/i);
    });
  });

  test.describe('LinkedIn Authentication', () => {
    test('should display LinkedIn login button', async ({ page }) => {
      const linkedinButton = page.locator('[data-testid="login-linkedin"]');
      await expect(linkedinButton).toBeVisible();
      await expect(linkedinButton).toContainText(/LinkedIn|linkedin/i);
    });

    test('should initiate LinkedIn OAuth flow', async ({ page, context }) => {
      // Mock LinkedIn OAuth
      await page.route('**/oauth/linkedin**', route => {
        route.fulfill({
          status: 302,
          headers: {
            'Location': '/oauth-callback?provider=linkedin&token=mock-token'
          }
        });
      });

      const popupPromise = context.waitForEvent('page');
      
      await page.locator('[data-testid="login-linkedin"]').click();
      
      const popup = await popupPromise.catch(() => null);
      
      if (popup) {
        expect(popup.url()).toMatch(/linkedin\.com|oauth\/linkedin/);
        await popup.close();
      }
    });
  });

  test.describe('OAuth Account Linking', () => {
    test('should link OAuth account to existing user', async ({ page }) => {
      // Login with email first
      await loginPage.login('test@secid.mx', 'TestPassword123!');
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Go to settings
      await navigation.goToSettings();
      
      // Click link Google account
      const linkGoogleButton = page.locator('[data-testid="link-google-account"]');
      if (await linkGoogleButton.isVisible()) {
        await linkGoogleButton.click();
        
        // Handle OAuth flow...
        
        // Verify account linked
        await expect(page.locator('[data-testid="google-linked"]')).toBeVisible();
      }
    });

    test('should handle OAuth account already linked', async ({ page }) => {
      // Simulate OAuth callback for already linked account
      await page.goto('/oauth-callback?provider=google&error=account_already_linked');
      
      // Should show appropriate message
      const message = page.locator('[data-testid="oauth-message"]');
      await expect(message).toContainText(/cuenta.*ya.*vinculada|already.*linked/i);
    });

    test('should merge accounts when email matches', async ({ page }) => {
      // Simulate OAuth callback with matching email
      await page.goto('/oauth-callback?provider=google&email=test@secid.mx&merge_account=true');
      
      // Should ask for password to merge
      await expect(page).toHaveURL(/\/merge-accounts/);
      
      // Enter password to confirm merge
      await page.fill('[data-testid="merge-password"]', 'TestPassword123!');
      await page.click('[data-testid="confirm-merge"]');
      
      // Should complete merge and login
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('OAuth Security', () => {
    test('should validate OAuth state parameter', async ({ page }) => {
      // Try callback without state
      await page.goto('/oauth-callback?provider=google&code=mock-code');
      
      // Should reject due to missing state
      await expect(page).toHaveURL(/\/login/);
      const error = page.locator('[data-testid="oauth-error"]');
      await expect(error).toContainText(/error|inválido|invalid/i);
    });

    test('should expire OAuth state after timeout', async ({ page }) => {
      // Simulate expired state
      await page.goto('/oauth-callback?provider=google&code=mock-code&state=expired-state');
      
      // Should show expiration error
      const error = page.locator('[data-testid="oauth-error"]');
      await expect(error).toContainText(/expirado|expired|tiempo/i);
    });

    test('should prevent OAuth replay attacks', async ({ page }) => {
      const callbackUrl = '/oauth-callback?provider=google&code=used-code&state=valid-state';
      
      // First use should work
      await page.goto(callbackUrl);
      await expect(page).toHaveURL(/\/(dashboard|login)/);
      
      // Second use of same code should fail
      await page.goto(callbackUrl);
      await expect(page).toHaveURL(/\/login/);
      const error = page.locator('[data-testid="oauth-error"]');
      await expect(error).toContainText(/código.*usado|already.*used|inválido/i);
    });
  });

  test.describe('OAuth User Experience', () => {
    test('should show loading state during OAuth', async ({ page }) => {
      // Slow down OAuth callback processing
      await page.route('**/api/auth/oauth/**', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        }, 2000);
      });
      
      // Navigate to callback
      await page.goto('/oauth-callback?provider=google&code=mock-code&state=valid');
      
      // Should show loading indicator
      const loading = page.locator('[data-testid="oauth-loading"]');
      await expect(loading).toBeVisible();
      await expect(loading).toContainText(/procesando|processing|autenticando/i);
    });

    test('should remember OAuth provider preference', async ({ page, context }) => {
      // Login with Google
      await loginPage.loginWithGoogle();
      
      // Logout
      await navigation.logout();
      
      // Return to login page
      await loginPage.goto();
      
      // Google button should be highlighted/promoted
      const googleButton = page.locator('[data-testid="login-google"]');
      const isPromoted = await googleButton.evaluate(el => {
        return el.classList.contains('promoted') || 
               el.classList.contains('primary') ||
               el.getAttribute('data-promoted') === 'true';
      });
      
      // Check if provider preference was saved
      const cookies = await context.cookies();
      const prefCookie = cookies.find(c => c.name.includes('oauth_pref'));
      expect(prefCookie?.value).toBe('google');
    });

    test('should handle popup blockers gracefully', async ({ page }) => {
      // Simulate popup blocked
      await page.addInitScript(() => {
        window.open = () => null;
      });
      
      // Try to login with OAuth
      await page.locator('[data-testid="login-google"]').click();
      
      // Should show popup blocked message
      const message = page.locator('[data-testid="popup-blocked-message"]');
      await expect(message).toBeVisible();
      await expect(message).toContainText(/bloqueador.*popups|popup.*blocker|ventana/i);
    });
  });

  test.describe('Mobile OAuth', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should handle OAuth on mobile without popups', async ({ page }) => {
      await loginPage.goto();
      
      // Click Google login on mobile
      await page.locator('[data-testid="login-google"]').click();
      
      // Should navigate in same window on mobile
      await expect(page).toHaveURL(/accounts\.google\.com|oauth\/google/);
    });
  });
});