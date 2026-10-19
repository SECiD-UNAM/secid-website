import { test, expect } from '@playwright/test';

/**
 * OAuth popups cannot be driven against the Auth emulator, so this only
 * checks that the provider buttons render enabled. The login page uses
 * src/components/auth/SocialLoginButtons.tsx (LinkedIn is behind
 * PUBLIC_LINKEDIN_AUTH_ENABLED and is not asserted); the signup wizard has
 * its own Google button in src/components/auth/SignUpForm.tsx.
 */
test.describe('Social authentication buttons', () => {
  test('login page offers Google and GitHub sign-in', async ({ page }) => {
    await page.goto('/es/login');

    for (const provider of ['Google', 'GitHub']) {
      const button = page.getByRole('button', {
        name: `Continuar con ${provider}`,
      });
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
      await expect(button.locator('svg')).toBeVisible();
    }
  });

  test('signup wizard offers Google sign-up on the account step', async ({
    page,
  }) => {
    await page.goto('/es/signup');

    const button = page.getByRole('button', { name: 'Registrarse con Google' });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });
});
