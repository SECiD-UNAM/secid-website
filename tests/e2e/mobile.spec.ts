import { test, expect, devices } from '@playwright/test';

/**
 * Public homepage on small screens. The iPhone 12 descriptor is used for
 * viewport/touch/user agent only: its `defaultBrowserType` (webkit) is
 * dropped so the file runs in whichever project selected it (CI installs
 * chromium only).
 *
 * The hamburger menu must open at phone widths (<= 480px) as well as at
 * tablet widths; public/assets/css/secid-components.css styles
 * `.secid-navbar__mobile-menu--open` in both breakpoints.
 */
const { defaultBrowserType: _browser, ...iPhone12 } = devices['iPhone 12'];

test.describe('Mobile Responsive Journey (iPhone 12)', () => {
  test.use(iPhone12);

  test.beforeEach(async ({ page }) => {
    await page.goto('/es/');
  });

  test('should display mobile navigation correctly', async ({ page }) => {
    const mobileToggle = page.locator('.secid-navbar__mobile-toggle');
    await expect(mobileToggle).toBeVisible();

    // Desktop nav links are hidden on phones.
    await expect(page.locator('.secid-navbar__nav')).toBeHidden();

    // The mobile menu starts closed.
    const mobileMenu = page.locator('.secid-navbar__mobile-menu');
    await expect(mobileMenu).toHaveAttribute('aria-hidden', 'true');
    await expect(mobileMenu).not.toHaveClass(/secid-navbar__mobile-menu--open/);
  });

  test('should open mobile menu when toggle clicked', async ({ page }) => {
    const mobileToggle = page.locator('.secid-navbar__mobile-toggle');
    const mobileMenu = page.locator('.secid-navbar__mobile-menu');

    await mobileToggle.click();

    await expect(mobileMenu).toHaveClass(/secid-navbar__mobile-menu--open/);
    await expect(mobileMenu).toHaveAttribute('aria-hidden', 'false');
    await expect(
      mobileMenu.locator('.secid-navbar__link').filter({ hasText: 'Inicio' })
    ).toBeVisible();
  });

  test('should stack hero content vertically on mobile', async ({ page }) => {
    const hero = page.locator('.secid-hero');
    await expect(hero).toBeVisible();

    const heroImage = page.locator('.secid-hero__image');
    const heroContent = page.locator('.secid-hero__content');
    await expect(heroImage).toBeVisible();
    await expect(heroContent).toBeVisible();

    const buttons = page.locator('.secid-hero__actions .secid-button');
    await expect(buttons).toHaveCount(2);

    // Buttons stack vertically: the second one starts below the first.
    const firstBox = await buttons.nth(0).boundingBox();
    const secondBox = await buttons.nth(1).boundingBox();
    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();
    expect(secondBox!.y).toBeGreaterThanOrEqual(firstBox!.y + firstBox!.height);
  });

  test('should display feature cards in single column', async ({ page }) => {
    const featureGrid = page.locator('.secid-features__grid');
    await featureGrid.scrollIntoViewIfNeeded();

    const cards = featureGrid.locator('.secid-feature-card');
    await expect(cards).toHaveCount(4);

    const firstBox = await cards.nth(0).boundingBox();
    const secondBox = await cards.nth(1).boundingBox();
    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();
    expect(secondBox!.y).toBeGreaterThanOrEqual(firstBox!.y + firstBox!.height);
  });

  test('should handle touch interactions properly', async ({ page }) => {
    const ctaButton = page.locator(
      '.secid-hero__actions .secid-button--primary'
    );
    await ctaButton.tap();
    await expect(page).toHaveURL(/\/es\/join/);

    await page.goBack();

    const featureCard = page.locator('.secid-feature-card').first();
    await featureCard.scrollIntoViewIfNeeded();
    await featureCard.tap();
    await expect(featureCard).toBeVisible();
  });

  test('should have readable text on mobile', async ({ page }) => {
    const heroTitle = page.locator('.secid-hero__title');
    const fontSize = await heroTitle.evaluate(
      (el) => window.getComputedStyle(el).fontSize
    );
    expect(parseInt(fontSize)).toBeGreaterThanOrEqual(24);

    const button = page.locator('.secid-hero__actions .secid-button').first();
    const buttonFontSize = await button.evaluate(
      (el) => window.getComputedStyle(el).fontSize
    );
    expect(parseInt(buttonFontSize)).toBeGreaterThanOrEqual(14);
  });
});

test.describe('Hamburger menu (small tablet, 481-768px)', () => {
  test.use({ viewport: { width: 600, height: 900 }, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await page.goto('/es/');
  });

  test('should open mobile menu when toggle clicked', async ({ page }) => {
    const mobileToggle = page.locator('.secid-navbar__mobile-toggle');
    const mobileMenu = page.locator('.secid-navbar__mobile-menu');

    await expect(mobileToggle).toBeVisible();
    await expect(page.locator('.secid-navbar__nav')).toBeHidden();
    await expect(mobileMenu).toHaveAttribute('aria-hidden', 'true');

    await mobileToggle.click();

    await expect(mobileMenu).toHaveClass(/secid-navbar__mobile-menu--open/);
    await expect(mobileMenu).toHaveAttribute('aria-hidden', 'false');
    await expect(mobileToggle).toHaveAttribute('aria-expanded', 'true');

    // Public links + community links + about.
    const menuLinks = mobileMenu.locator('.secid-navbar__link');
    expect(await menuLinks.count()).toBeGreaterThanOrEqual(4);
    await expect(menuLinks.filter({ hasText: 'Inicio' })).toBeVisible();
    await expect(menuLinks.filter({ hasText: 'Empleos' })).toBeVisible();
  });

  test('should navigate from the mobile menu', async ({ page }) => {
    await page.locator('.secid-navbar__mobile-toggle').click();

    const jobsLink = page.locator(
      '.secid-navbar__mobile-menu a[href="/es/jobs"]'
    );
    await expect(jobsLink).toBeVisible();
    await jobsLink.click();
    await expect(page).toHaveURL(/\/es\/jobs/);
  });

  test('should display mobile language selector', async ({ page }) => {
    await page.locator('.secid-navbar__mobile-toggle').click();

    const mobileLangControls = page.locator('.secid-navbar__mobile-controls');
    await expect(mobileLangControls).toBeVisible();

    const esLink = mobileLangControls.locator('a[hreflang="es"]');
    const enLink = mobileLangControls.locator('a[hreflang="en"]');
    await expect(esLink).toBeVisible();
    await expect(esLink).toHaveClass(/active/);
    await expect(enLink).toBeVisible();
    await expect(enLink).toHaveAttribute('href', '/en/');

    // The open menu is position:absolute and not scrollable, so these
    // controls sit below the viewport; activate the link directly.
    await enLink.dispatchEvent('click');
    await expect(page).toHaveURL(/\/en\//);
  });
});
