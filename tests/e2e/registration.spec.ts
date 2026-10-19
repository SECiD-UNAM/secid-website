import { test, expect } from '@playwright/test';

/**
 * Entry points into registration from the public site. The hero and CTA
 * buttons go to /es/join (src/pages/es/index.astro), the navbar buttons
 * (src/components/auth/AuthNavButtons.tsx) to /es/signup, and the legacy
 * /registro page redirects to /es/join (src/pages/registro.astro).
 */
test.describe('Member Registration Journey', () => {
  test('should navigate to registration from hero CTA', async ({ page }) => {
    await page.goto('/es/');

    const heroJoinButton = page
      .locator('.secid-hero__actions a')
      .filter({ hasText: 'Únete a SECiD' });
    await expect(heroJoinButton).toBeVisible();
    await heroJoinButton.click();

    await expect(page).toHaveURL(/\/es\/join/);
  });

  test('should navigate to registration from navbar', async ({ page }) => {
    await page.goto('/es/');

    const navRegisterButton = page.locator(
      '.secid-navbar__actions a[href="/es/signup"]'
    );
    await expect(navRegisterButton).toBeVisible();
    await expect(navRegisterButton).toContainText('Registrarse');
    await navRegisterButton.click();

    await expect(page).toHaveURL(/\/es\/signup/);
  });

  test('should navigate to registration from CTA section', async ({ page }) => {
    await page.goto('/es/');

    const ctaSection = page.locator('.secid-cta');
    await ctaSection.scrollIntoViewIfNeeded();

    const ctaRegisterButton = ctaSection.locator('a[href="/es/join"]');
    await expect(ctaRegisterButton).toBeVisible();
    await ctaRegisterButton.click();

    await expect(page).toHaveURL(/\/es\/join/);
  });

  test('should navigate to login from navbar', async ({ page }) => {
    await page.goto('/es/');

    const navLoginButton = page.locator(
      '.secid-navbar__actions a[href="/es/login"]'
    );
    await expect(navLoginButton).toBeVisible();
    await expect(navLoginButton).toContainText('Iniciar Sesión');
    await navLoginButton.click();

    await expect(page).toHaveURL(/\/es\/login/);
  });

  test('should access registration from jobs page member CTA', async ({
    page,
  }) => {
    await page.goto('/es/jobs');

    const memberCta = page.locator('.secid-member-cta');
    await memberCta.scrollIntoViewIfNeeded();

    const registerButton = memberCta.locator('a', { hasText: 'Registrarse' });
    await expect(registerButton).toBeVisible();
    await registerButton.click();

    await expect(page).toHaveURL(/\/es\/join/);
  });

  test('should handle registro page redirect', async ({ page }) => {
    await page.goto('/registro');

    // Legacy URL: meta refresh + script redirect to the native join page.
    await expect(page).toHaveURL(/\/es\/join/);
  });

  test('should show registration options in multiple languages', async ({
    page,
  }) => {
    await page.goto('/es/');
    await expect(
      page.locator('.secid-navbar__actions a[href="/es/signup"]')
    ).toContainText('Registrarse');

    await page.locator('.secid-navbar__lang-btn').click();
    await page.locator('.secid-navbar__lang-dropdown a[hreflang="en"]').click();

    await expect(page).toHaveURL(/\/en\//);
    await expect(
      page.locator('.secid-navbar__actions a[href="/en/signup"]')
    ).toContainText('Register');
  });

  test('should maintain registration intent across navigation', async ({
    page,
  }) => {
    await page.goto('/es/');

    await page
      .locator('.secid-hero__actions a')
      .filter({ hasText: 'Únete a SECiD' })
      .click();
    await expect(page).toHaveURL(/\/es\/join/);

    await page.goBack();
    await expect(page).toHaveURL(/\/es\/$/);

    await expect(
      page.locator('.secid-navbar__actions a[href="/es/signup"]')
    ).toBeVisible();
  });
});
