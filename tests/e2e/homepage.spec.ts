import { test, expect } from '@playwright/test';

test.describe('Homepage User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/es/');
  });

  test('should display hero section correctly', async ({ page }) => {
    // Verify hero section is visible
    const heroSection = page.locator('.secid-hero');
    await expect(heroSection).toBeVisible();

    // Check hero title
    const heroTitle = page.locator('.secid-hero__title');
    await expect(heroTitle).toBeVisible();
    await expect(heroTitle).toContainText('Conectando el futuro de los datos');

    // Check hero subtitle
    const heroSubtitle = page.locator('.secid-hero__subtitle');
    await expect(heroSubtitle).toBeVisible();
    await expect(heroSubtitle).toContainText('Sociedad de Egresados en Ciencia de Datos UNAM');

    // Verify logo is visible
    const logo = page.locator('.secid-hero__image img');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('alt', 'SECiD Logo');
  });

  test('should have working CTA buttons', async ({ page }) => {
    // Test "Únete a SECiD" button
    const joinButton = page.locator('text=Únete a SECiD').first();
    await expect(joinButton).toBeVisible();
    await expect(joinButton).toHaveClass(/secid-button--primary/);
    
    // Click and verify navigation
    await joinButton.click();
    await expect(page).toHaveURL(/.*signup/);
    
    // Go back to test second button
    await page.goBack();
    
    // Test "Ver Empleos" button
    const jobsButton = page.locator('text=Ver Empleos').first();
    await expect(jobsButton).toBeVisible();
    await expect(jobsButton).toHaveClass(/secid-button--secondary/);
    
    await jobsButton.click();
    await expect(page).toHaveURL(/.*empleos/);
  });

  test('should display all feature cards', async ({ page }) => {
    const featureSection = page.locator('.secid-features');
    await expect(featureSection).toBeVisible();

    // Check features title
    const featuresTitle = page.locator('.secid-features__title');
    await expect(featuresTitle).toContainText('¿Por qué unirse a SECiD?');

    // Verify all 4 feature cards are present
    const featureCards = page.locator('.secid-feature-card');
    await expect(featureCards).toHaveCount(4);

    // Check specific feature cards
    const features = [
      { icon: 'fa-gem', title: 'Networking Profesional' },
      { icon: 'fa-paper-plane', title: 'Oportunidades Laborales' },
      { icon: 'fa-rocket', title: 'Crecimiento Profesional' },
      { icon: 'fa-signal', title: 'Comunidad Sólida' }
    ];

    for (const feature of features) {
      const card = page.locator(`.secid-feature-card:has(.${feature.icon})`);
      await expect(card).toBeVisible();
      await expect(card.locator('.secid-feature-card__title')).toContainText(feature.title);
    }
  });

  test('should have working navigation menu', async ({ page }) => {
    const navbar = page.locator('.secid-navbar');
    await expect(navbar).toBeVisible();

    // Check logo link
    const logoLink = navbar.locator('.secid-navbar__logo');
    await expect(logoLink).toBeVisible();

    // Check navigation links
    const navLinks = [
      { text: 'Inicio', href: '/es/' },
      { text: 'Empleos', href: '/es/empleos' },
      { text: 'Miembros', href: '/es/miembros' },
      { text: 'Nosotros', href: '/es/sobre-nosotros' }
    ];

    for (const link of navLinks) {
      const navLink = navbar.locator(`a:has-text("${link.text}")`).first();
      await expect(navLink).toBeVisible();
      await expect(navLink).toHaveAttribute('href', link.href);
    }
  });

  test('should have working language switcher', async ({ page }) => {
    const langButton = page.locator('.secid-navbar__lang-btn');
    await expect(langButton).toBeVisible();
    await expect(langButton).toContainText('ES');

    // Click to open dropdown
    await langButton.click();
    
    const langDropdown = page.locator('.secid-navbar__lang-dropdown');
    await expect(langDropdown).toBeVisible();

    // Click English option
    const enOption = langDropdown.locator('a:has-text("EN - English")');
    await enOption.click();

    // Verify URL changed to English
    await expect(page).toHaveURL(/.*\/en\//);
    
    // Verify content is in English
    await expect(page.locator('.secid-hero__title')).toContainText('Connecting the future of data');
  });

  test('should display CTA section', async ({ page }) => {
    const ctaSection = page.locator('.secid-cta');
    await expect(ctaSection).toBeVisible();

    // Check CTA title
    const ctaTitle = page.locator('.secid-cta__title');
    await expect(ctaTitle).toContainText('Comienza tu journey');

    // Verify both CTA cards
    const ctaCards = page.locator('.secid-cta-card');
    await expect(ctaCards).toHaveCount(2);

    // Check job CTA
    const jobCta = ctaCards.nth(0);
    await expect(jobCta).toContainText('Encuentra tu próximo empleo');
    
    // Check register CTA
    const registerCta = ctaCards.nth(1);
    await expect(registerCta).toContainText('Únete a nuestra comunidad');
  });

  test('should have footer with correct information', async ({ page }) => {
    const footer = page.locator('.secid-footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();

    // Check footer brand
    const footerBrand = footer.locator('.secid-footer__brand');
    await expect(footerBrand).toBeVisible();
    await expect(footerBrand).toContainText('SECiD');
    
    // Check social links
    const linkedinLink = footer.locator('a[href*="linkedin.com"]');
    await expect(linkedinLink).toBeVisible();
    
    // Check footer navigation
    const footerNav = footer.locator('.secid-footer__nav');
    await expect(footerNav).toBeVisible();
    
    // Verify copyright - check entire footer for copyright text
    await expect(footer).toContainText('© 2024 SECiD');
  });
});