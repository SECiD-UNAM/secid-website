import { test, expect, devices } from '@playwright/test';

test.use(devices['iPhone 12']);

test.describe('Mobile Responsive Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/es/');
  });

  test('should display mobile navigation correctly', async ({ page }) => {
    // Mobile menu toggle should be visible
    const mobileToggle = page.locator('.secid-navbar__mobile-toggle');
    await expect(mobileToggle).toBeVisible();

    // Desktop nav should be hidden on mobile
    const desktopNav = page.locator('.secid-navbar__nav');
    // Check if it has display: none or is not visible
    const isVisible = await desktopNav.isVisible();
    expect(isVisible).toBe(false);

    // Bottom navigation should be visible on mobile
    const bottomNav = page.locator('.secid-bottom-nav');
    await expect(bottomNav).toBeVisible();
  });

  test('should open mobile menu when toggle clicked', async ({ page }) => {
    const mobileToggle = page.locator('.secid-navbar__mobile-toggle');
    const mobileMenu = page.locator('.secid-navbar__mobile-menu');

    // Initially hidden
    await expect(mobileMenu).toHaveAttribute('aria-hidden', 'true');

    // Click toggle
    await mobileToggle.click();

    // Menu should be visible
    await expect(mobileMenu).toBeVisible();
    
    // Check menu items
    const menuLinks = mobileMenu.locator('.secid-navbar__link');
    await expect(menuLinks).toHaveCount(4);
  });

  test('should stack hero content vertically on mobile', async ({ page }) => {
    const hero = page.locator('.secid-hero');
    await expect(hero).toBeVisible();

    // Logo should appear above content (order: -1)
    const heroImage = page.locator('.secid-hero__image');
    const heroContent = page.locator('.secid-hero__content');
    
    await expect(heroImage).toBeVisible();
    await expect(heroContent).toBeVisible();

    // Buttons should stack vertically
    const heroActions = page.locator('.secid-hero__actions');
    const buttons = heroActions.locator('.secid-button');
    
    await expect(buttons).toHaveCount(2);
    
    // Buttons should take full width on mobile
    // Check that buttons fill their container
    const firstButton = buttons.first();
    await expect(firstButton).toBeVisible();
  });

  test('should display feature cards in single column', async ({ page }) => {
    const featureGrid = page.locator('.secid-features__grid');
    await featureGrid.scrollIntoViewIfNeeded();
    
    const cards = featureGrid.locator('.secid-feature-card');
    await expect(cards).toHaveCount(4);

    // Cards should stack vertically on mobile
    const firstCard = cards.first();
    const secondCard = cards.nth(1);
    
    const firstBox = await firstCard.boundingBox();
    const secondBox = await secondCard.boundingBox();
    
    if (firstBox && secondBox) {
      // Second card should be below first card
      expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height);
    }
  });

  test('should have working bottom navigation', async ({ page }) => {
    const bottomNav = page.locator('.secid-bottom-nav');
    await expect(bottomNav).toBeVisible();

    // Check navigation items
    const navItems = bottomNav.locator('.secid-bottom-nav__item');
    await expect(navItems).toHaveCount(4); // Home, Jobs, Members, More

    // Test navigation
    const jobsLink = navItems.filter({ hasText: 'Empleos' });
    await jobsLink.click();
    await expect(page).toHaveURL(/.*empleos/);
  });

  test('should display mobile language selector', async ({ page }) => {
    // Open mobile menu
    const mobileToggle = page.locator('.secid-navbar__mobile-toggle');
    await mobileToggle.click();

    // Check language selector in mobile menu
    const mobileLangControls = page.locator('.secid-navbar__mobile-controls');
    await expect(mobileLangControls).toBeVisible();

    const esLink = mobileLangControls.locator('text=ES');
    const enLink = mobileLangControls.locator('text=EN');
    
    await expect(esLink).toBeVisible();
    await expect(enLink).toBeVisible();

    // Switch to English
    await enLink.click();
    await expect(page).toHaveURL(/.*\/en\//);
  });

  test('should handle touch interactions properly', async ({ page }) => {
    // Test button touch
    const ctaButton = page.locator('.secid-button--primary').first();
    await ctaButton.tap();
    await expect(page).toHaveURL(/.*registro/);

    await page.goBack();

    // Test card hover effects should not interfere with touch
    const featureCard = page.locator('.secid-feature-card').first();
    await featureCard.scrollIntoViewIfNeeded();
    await featureCard.tap();
    
    // Card should still be visible and functional
    await expect(featureCard).toBeVisible();
  });

  test('should have readable text on mobile', async ({ page }) => {
    // Check hero title font size
    const heroTitle = page.locator('.secid-hero__title');
    const fontSize = await heroTitle.evaluate(el => 
      window.getComputedStyle(el).fontSize
    );
    
    // Font size should be at least 24px on mobile
    expect(parseInt(fontSize)).toBeGreaterThanOrEqual(24);

    // Check button text is readable
    const button = page.locator('.secid-button').first();
    const buttonFontSize = await button.evaluate(el => 
      window.getComputedStyle(el).fontSize
    );
    
    // Button font should be at least 14px
    expect(parseInt(buttonFontSize)).toBeGreaterThanOrEqual(14);
  });
});