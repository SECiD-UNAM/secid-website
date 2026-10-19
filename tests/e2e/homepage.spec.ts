import { test, expect } from '@playwright/test';

/**
 * Public homepage (/es/). Selectors follow src/pages/es/index.astro,
 * src/components/Navigation.astro and src/components/Footer.astro; no
 * seeded data or session is needed.
 */
test.describe('Homepage User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/es/');
  });

  test('should display hero section correctly', async ({ page }) => {
    const heroSection = page.locator('.secid-hero');
    await expect(heroSection).toBeVisible();

    const heroTitle = page.locator('.secid-hero__title');
    await expect(heroTitle).toBeVisible();
    await expect(heroTitle).toContainText('Bienvenidos a SECiD');

    const heroSubtitle = page.locator('.secid-hero__subtitle');
    await expect(heroSubtitle).toBeVisible();
    await expect(heroSubtitle).toContainText(
      'Sociedad de Egresados en Ciencia de Datos'
    );

    const logo = page.locator('.secid-hero__image img');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('alt', 'SECiD Logo');
  });

  test('should have working CTA buttons', async ({ page }) => {
    const heroActions = page.locator('.secid-hero__actions');

    const joinButton = heroActions.locator('a', { hasText: 'Únete a SECiD' });
    await expect(joinButton).toBeVisible();
    await expect(joinButton).toHaveClass(/secid-button--primary/);
    await expect(joinButton).toHaveAttribute('href', '/es/join');

    await joinButton.click();
    await expect(page).toHaveURL(/\/es\/join/);

    await page.goBack();

    const jobsButton = heroActions.locator('a', { hasText: 'Ver Empleos' });
    await expect(jobsButton).toBeVisible();
    await expect(jobsButton).toHaveClass(/secid-button--secondary/);

    await jobsButton.click();
    await expect(page).toHaveURL(/\/es\/jobs/);
  });

  test('should display all feature cards', async ({ page }) => {
    const featureSection = page.locator('.secid-features');
    await expect(featureSection).toBeVisible();

    const featuresTitle = page.locator('.secid-features__title');
    await expect(featuresTitle).toContainText('¿Por qué unirse a SECiD?');

    const featureCards = page.locator('.secid-feature-card');
    await expect(featureCards).toHaveCount(4);

    const features = [
      { icon: 'fa-gem', title: 'Networking Profesional' },
      { icon: 'fa-paper-plane', title: 'Oportunidades Laborales' },
      { icon: 'fa-rocket', title: 'Crecimiento Profesional' },
      { icon: 'fa-signal', title: 'Comunidad Sólida' },
    ];

    for (const feature of features) {
      const card = page.locator(`.secid-feature-card:has(.${feature.icon})`);
      await expect(card).toBeVisible();
      await expect(card.locator('.secid-feature-card__title')).toContainText(
        feature.title
      );
    }
  });

  test('should have working navigation menu', async ({ page }) => {
    const navbar = page.locator('.secid-navbar');
    await expect(navbar).toBeVisible();

    const logoLink = navbar.locator('.secid-navbar__logo');
    await expect(logoLink).toBeVisible();
    await expect(logoLink).toHaveAttribute('href', '/es/');

    // Desktop nav: Inicio, Empleos, Comunidad (dropdown), Nosotros.
    const desktopNav = navbar.locator('.secid-navbar__nav');
    const navLinks = [
      { text: 'Inicio', href: '/es/' },
      { text: 'Empleos', href: '/es/jobs' },
      { text: 'Nosotros', href: '/es/about-us' },
    ];

    for (const link of navLinks) {
      const navLink = desktopNav.locator(`a:has-text("${link.text}")`);
      await expect(navLink).toBeVisible();
      await expect(navLink).toHaveAttribute('href', link.href);
    }

    // Community dropdown holds Miembros, Eventos, ...
    const communityToggle = desktopNav.locator(
      '.secid-navbar__dropdown-toggle'
    );
    await expect(communityToggle).toContainText('Comunidad');
    await communityToggle.click();
    const membersLink = desktopNav.locator(
      '.secid-navbar__dropdown-item[href="/es/members"]'
    );
    await expect(membersLink).toBeVisible();
    await expect(membersLink).toContainText('Miembros');
  });

  test('should have working language switcher', async ({ page }) => {
    const langButton = page.locator('.secid-navbar__lang-btn');
    await expect(langButton).toBeVisible();
    await expect(langButton).toContainText('ES');

    await langButton.click();

    const langDropdown = page.locator('.secid-navbar__lang-dropdown');
    await expect(langDropdown).toHaveClass(/secid-navbar__lang-dropdown--open/);
    await expect(langDropdown).toBeVisible();

    const enOption = langDropdown.locator('a[hreflang="en"]');
    await expect(enOption).toContainText('EN - English');
    await enOption.click();

    await expect(page).toHaveURL(/\/en\//);
    await expect(page.locator('.secid-hero__title')).toContainText(
      'Welcome to SECiD'
    );
  });

  test('should display CTA section', async ({ page }) => {
    const ctaSection = page.locator('.secid-cta');
    await expect(ctaSection).toBeVisible();

    const ctaTitle = page.locator('.secid-cta__title');
    await expect(ctaTitle).toContainText('Comienza tu journey');

    const ctaCards = page.locator('.secid-cta-card');
    await expect(ctaCards).toHaveCount(2);

    const jobCta = ctaCards.nth(0);
    await expect(jobCta).toContainText('Encuentra tu próximo empleo');
    await expect(jobCta.locator('a')).toHaveAttribute('href', '/es/jobs');

    const registerCta = ctaCards.nth(1);
    await expect(registerCta).toContainText('Únete a nuestra comunidad');
    await expect(registerCta.locator('a')).toHaveAttribute('href', '/es/join');
  });

  test('should have footer with correct information', async ({ page }) => {
    const footer = page.locator('.secid-footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();

    const footerBrand = footer.locator('.secid-footer__brand');
    await expect(footerBrand).toBeVisible();
    await expect(footerBrand).toContainText('SECiD');

    const linkedinLink = footer.locator('a[href*="linkedin.com"]');
    await expect(linkedinLink).toBeVisible();

    // Three link columns: Plataforma, Comunidad, Soporte.
    const footerColumns = footer.locator('.secid-footer__column');
    await expect(footerColumns).toHaveCount(3);
    await expect(footerColumns.first()).toContainText('Plataforma');

    const year = new Date().getFullYear();
    await expect(footer.locator('.secid-footer__copyright')).toContainText(
      `© ${year} SECiD`
    );
  });
});
