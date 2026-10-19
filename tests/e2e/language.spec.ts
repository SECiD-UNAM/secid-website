import { test, expect } from '@playwright/test';

/**
 * Route-based i18n (/es/ vs /en/) on public pages. Selectors follow
 * src/components/Navigation.astro; the language dropdown is toggled by
 * src/layouts/ModernLayout.astro.
 */
test.describe('Multi-language Journey', () => {
  test('should switch from Spanish to English', async ({ page }) => {
    await page.goto('/es/');

    await expect(page.locator('.secid-hero__title')).toContainText(
      'Bienvenidos a SECiD'
    );
    await expect(
      page.locator('.secid-hero__actions a', { hasText: 'Únete a SECiD' })
    ).toBeVisible();

    const langButton = page.locator('.secid-navbar__lang-btn');
    await expect(langButton).toContainText('ES');
    await langButton.click();

    await page.locator('.secid-navbar__lang-dropdown a[hreflang="en"]').click();

    await expect(page).toHaveURL(/\/en\//);
    await expect(page.locator('.secid-hero__title')).toContainText(
      'Welcome to SECiD'
    );
    await expect(
      page.locator('.secid-hero__actions a', { hasText: 'Join SECiD' })
    ).toBeVisible();
    await expect(langButton).toContainText('EN');
  });

  test('should switch from English to Spanish', async ({ page }) => {
    await page.goto('/en/');

    await expect(page.locator('.secid-hero__title')).toContainText(
      'Welcome to SECiD'
    );

    const langButton = page.locator('.secid-navbar__lang-btn');
    await expect(langButton).toContainText('EN');
    await langButton.click();

    await page.locator('.secid-navbar__lang-dropdown a[hreflang="es"]').click();

    await expect(page).toHaveURL(/\/es\//);
    await expect(page.locator('.secid-hero__title')).toContainText(
      'Bienvenidos a SECiD'
    );
  });

  test('should maintain language preference during navigation', async ({
    page,
  }) => {
    await page.goto('/en/');

    const desktopNav = page.locator('.secid-navbar__nav');
    await desktopNav.locator('a[href="/en/jobs"]').click();

    await expect(page).toHaveURL(/\/en\/jobs/);
    await expect(page.locator('.secid-hero__title')).toContainText('Job Board');

    await desktopNav.locator('a[href="/en/about-us"]').click();
    await expect(page).toHaveURL(/\/en\/about-us/);
  });

  test('should translate all UI elements', async ({ page }) => {
    await page.goto('/es/');

    const desktopNav = page.locator('.secid-navbar__nav');
    for (const label of ['Inicio', 'Empleos', 'Comunidad', 'Nosotros']) {
      await expect(desktopNav.getByText(label, { exact: true })).toBeVisible();
    }
    for (const title of [
      'Networking Profesional',
      'Oportunidades Laborales',
      'Crecimiento Profesional',
      'Comunidad Sólida',
    ]) {
      await expect(
        page.locator('.secid-feature-card__title', { hasText: title })
      ).toBeVisible();
    }

    await page.locator('.secid-navbar__lang-btn').click();
    await page.locator('.secid-navbar__lang-dropdown a[hreflang="en"]').click();
    await expect(page).toHaveURL(/\/en\//);

    for (const label of ['Home', 'Jobs', 'Community', 'About Us']) {
      await expect(desktopNav.getByText(label, { exact: true })).toBeVisible();
    }
    for (const title of [
      'Professional Networking',
      'Job Opportunities',
      'Professional Growth',
      'Strong Community',
    ]) {
      await expect(
        page.locator('.secid-feature-card__title', { hasText: title })
      ).toBeVisible();
    }
  });

  test('should handle language switch on mobile', async ({ page }) => {
    // 481-768px: the only range where the hamburger menu opens today
    // (see tests/e2e/mobile.spec.ts for the <= 480px gap).
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto('/es/');

    await page.locator('.secid-navbar__mobile-toggle').click();

    const mobileLangControls = page.locator('.secid-navbar__mobile-controls');
    await expect(mobileLangControls).toBeVisible();

    // The open menu is position:absolute and not scrollable, so the
    // language controls at its bottom sit outside a tablet viewport;
    // activate the link directly instead of a pointer click.
    const enLink = mobileLangControls.locator('a[hreflang="en"]');
    await expect(enLink).toHaveAttribute('href', '/en/');
    await enLink.dispatchEvent('click');

    await expect(page).toHaveURL(/\/en\//);
    await expect(page.locator('.secid-hero__title')).toContainText(
      'Welcome to SECiD'
    );
  });

  test('should show correct language in page metadata', async ({ page }) => {
    await page.goto('/es/');
    expect(await page.locator('html').getAttribute('lang')).toBe('es');

    await page.goto('/en/');
    expect(await page.locator('html').getAttribute('lang')).toBe('en');
  });

  test('should handle direct URL navigation in different languages', async ({
    page,
  }) => {
    const spanishPages = [
      { url: '/es/', title: 'Bienvenidos a SECiD' },
      { url: '/es/jobs', title: 'Bolsa de Trabajo' },
      { url: '/es/about-us', title: 'Nosotros' },
    ];

    for (const pageInfo of spanishPages) {
      await page.goto(pageInfo.url);
      await expect(page.locator('.secid-hero__title').first()).toContainText(
        pageInfo.title
      );
    }

    const englishPages = [
      { url: '/en/', title: 'Welcome to SECiD' },
      { url: '/en/jobs', title: 'Job Board' },
      { url: '/en/about-us', title: 'About Us' },
    ];

    for (const pageInfo of englishPages) {
      await page.goto(pageInfo.url);
      await expect(page.locator('.secid-hero__title').first()).toContainText(
        pageInfo.title
      );
    }
  });
});
