import { test, expect } from '@playwright/test';

test.describe('Multi-language Journey', () => {
  test('should switch from Spanish to English', async ({ page }) => {
    await page.goto('/es/');
    
    // Verify Spanish content
    await expect(page.locator('.secid-hero__title')).toContainText('Conectando el futuro de los datos');
    await expect(page.locator('text=Únete a SECiD').first()).toBeVisible();
    
    // Open language dropdown
    const langButton = page.locator('.secid-navbar__lang-btn');
    await expect(langButton).toContainText('ES');
    await langButton.click();
    
    // Click English option
    const enOption = page.locator('.secid-navbar__lang-dropdown').locator('text=EN - English');
    await enOption.click();
    
    // Verify URL changed
    await expect(page).toHaveURL(/.*\/en\//);
    
    // Verify English content
    await expect(page.locator('.secid-hero__title')).toContainText('Connecting the future of data');
    await expect(page.locator('text=Join SECiD').first()).toBeVisible();
    await expect(langButton).toContainText('EN');
  });

  test('should switch from English to Spanish', async ({ page }) => {
    await page.goto('/en/');
    
    // Verify English content
    await expect(page.locator('.secid-hero__title')).toContainText('Connecting the future of data');
    
    // Open language dropdown
    const langButton = page.locator('.secid-navbar__lang-btn');
    await expect(langButton).toContainText('EN');
    await langButton.click();
    
    // Click Spanish option
    const esOption = page.locator('.secid-navbar__lang-dropdown').locator('text=ES - Español');
    await esOption.click();
    
    // Verify URL changed
    await expect(page).toHaveURL(/.*\/es\//);
    
    // Verify Spanish content
    await expect(page.locator('.secid-hero__title')).toContainText('Conectando el futuro de los datos');
  });

  test('should maintain language preference during navigation', async ({ page }) => {
    // Start in English
    await page.goto('/en/');
    
    // Navigate to jobs page
    const jobsLink = page.locator('.secid-navbar').locator('text=Jobs');
    await jobsLink.click();
    
    // Should stay in English
    await expect(page).toHaveURL(/.*\/en\/jobs/);
    await expect(page.locator('.secid-hero__title')).toContainText('Job Board');
    
    // Navigate to about page
    const aboutLink = page.locator('.secid-navbar').locator('text=About');
    await aboutLink.click();
    
    // Should still be in English
    await expect(page).toHaveURL(/.*\/en\/about-us/);
  });

  test('should translate all UI elements', async ({ page }) => {
    await page.goto('/es/');
    
    const spanishElements = {
      nav: ['Inicio', 'Empleos', 'Miembros', 'Nosotros'],
      buttons: ['Únete a SECiD', 'Ver Empleos', 'Iniciar Sesión', 'Registrarse'],
      features: ['Networking Profesional', 'Oportunidades Laborales', 'Crecimiento Profesional', 'Comunidad Sólida']
    };
    
    // Check Spanish elements
    for (const element of spanishElements.nav) {
      await expect(page.locator('.secid-navbar').locator(`text=${element}`)).toBeVisible();
    }
    
    // Switch to English
    const langButton = page.locator('.secid-navbar__lang-btn');
    await langButton.click();
    await page.locator('text=EN - English').click();
    
    const englishElements = {
      nav: ['Home', 'Jobs', 'Members', 'About'],
      buttons: ['Join SECiD', 'View Jobs', 'Sign In', 'Sign Up'],
      features: ['Professional Networking', 'Job Opportunities', 'Professional Growth', 'Strong Community']
    };
    
    // Check English elements
    for (const element of englishElements.nav) {
      await expect(page.locator('.secid-navbar').locator(`text=${element}`)).toBeVisible();
    }
  });

  test('should handle language switch on mobile', async ({ page, isMobile }) => {
    // Use mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/es/');
    
    // Open mobile menu
    const mobileToggle = page.locator('.secid-navbar__mobile-toggle');
    await mobileToggle.click();
    
    // Check mobile language selector
    const mobileLangControls = page.locator('.secid-navbar__mobile-controls');
    await expect(mobileLangControls).toBeVisible();
    
    // Click EN option
    const enLink = mobileLangControls.locator('text=EN');
    await enLink.click();
    
    // Verify language changed
    await expect(page).toHaveURL(/.*\/en\//);
    await expect(page.locator('.secid-hero__title')).toContainText('Connecting the future of data');
  });

  test('should show correct language in page metadata', async ({ page }) => {
    // Check Spanish page
    await page.goto('/es/');
    const htmlLangEs = await page.locator('html').getAttribute('lang');
    expect(htmlLangEs).toBe('es');
    
    // Check English page
    await page.goto('/en/');
    const htmlLangEn = await page.locator('html').getAttribute('lang');
    expect(htmlLangEn).toBe('en');
  });

  test('should handle direct URL navigation in different languages', async ({ page }) => {
    // Direct navigation to Spanish pages
    const spanishPages = [
      { url: '/es/', title: 'Conectando el futuro' },
      { url: '/es/empleos', title: 'Bolsa de Trabajo' },
      { url: '/es/sobre-nosotros', title: 'Sobre Nosotros' }
    ];
    
    for (const pageInfo of spanishPages) {
      await page.goto(pageInfo.url);
      await expect(page.locator('h1, .secid-hero__title').first()).toContainText(pageInfo.title);
    }
    
    // Direct navigation to English pages
    const englishPages = [
      { url: '/en/', title: 'Connecting the future' },
      { url: '/en/jobs', title: 'Job Board' },
      { url: '/en/about-us', title: 'About Us' }
    ];
    
    for (const pageInfo of englishPages) {
      await page.goto(pageInfo.url);
      await expect(page.locator('h1, .secid-hero__title').first()).toContainText(pageInfo.title);
    }
  });
});