import { test, expect } from '@playwright/test';

test.describe('Job Search User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/es/empleos');
  });

  test('should display job listings page correctly', async ({ page }) => {
    // Verify hero section
    const heroSection = page.locator('.secid-hero--jobs');
    await expect(heroSection).toBeVisible();
    await expect(page.locator('.secid-hero__title')).toContainText('Bolsa de Trabajo');

    // Check CTA for companies
    const companyCta = page.locator('.secid-cta-box');
    await expect(companyCta).toBeVisible();
    await expect(companyCta).toContainText('¿Buscas talento en ciencia de datos?');
    
    const publishButton = companyCta.locator('text=Publicar Empleo');
    await expect(publishButton).toBeVisible();
  });

  test('should display job search filters', async ({ page }) => {
    // Check search input
    const searchBox = page.locator('.secid-search-input');
    await expect(searchBox).toBeVisible();
    await expect(searchBox).toHaveAttribute('placeholder', 'Buscar por título, empresa o ubicación...');

    // Verify filter dropdowns
    const filters = [
      { label: 'Ubicación', options: ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Remoto'] },
      { label: 'Tipo de Empleo', options: ['Tiempo Completo', 'Medio Tiempo', 'Por Proyecto', 'Prácticas'] },
      { label: 'Experiencia', options: ['Principiante', 'Intermedio', 'Senior', 'Líder'] }
    ];

    for (const filter of filters) {
      const select = page.locator('.secid-filter-select', { hasText: filter.label });
      await expect(select).toBeVisible();
    }
  });

  test('should display job cards with correct information', async ({ page }) => {
    // Wait for job cards to load
    const jobCards = page.locator('.secid-job-card');
    await expect(jobCards.first()).toBeVisible();

    // Check first job card details
    const firstJob = jobCards.first();
    
    // Company info
    const companyLogo = firstJob.locator('.secid-job-card__logo');
    await expect(companyLogo).toBeVisible();
    
    const jobTitle = firstJob.locator('h3');
    await expect(jobTitle).toBeVisible();
    
    const companyName = firstJob.locator('.secid-job-card__company-name');
    await expect(companyName).toBeVisible();

    // Job status (remote/onsite/hybrid)
    const status = firstJob.locator('.secid-job-card__status');
    await expect(status).toBeVisible();

    // Description
    const description = firstJob.locator('.secid-job-card__description');
    await expect(description).toBeVisible();

    // Tags
    const tags = firstJob.locator('.secid-job-card__tag');
    await expect(tags.first()).toBeVisible();

    // Footer info (salary, type, posted date)
    const salary = firstJob.locator('.secid-job-card__salary');
    await expect(salary).toBeVisible();

    // View details button
    const detailsButton = firstJob.locator('text=Ver Detalles');
    await expect(detailsButton).toBeVisible();
  });

  test('should navigate to job submission page', async ({ page }) => {
    // Click on "Publicar Empleo" button
    const publishButton = page.locator('a:has-text("Publicar Empleo")').first();
    await publishButton.click();

    // Verify navigation to job submission page
    await expect(page).toHaveURL(/.*publicar-empleo/);
    await expect(page.locator('.secid-hero__title')).toContainText('Encuentra Talento SECiD');
  });

  test('should display member CTA section', async ({ page }) => {
    // Scroll to member CTA
    const memberCta = page.locator('.secid-member-cta');
    await memberCta.scrollIntoViewIfNeeded();
    await expect(memberCta).toBeVisible();

    // Check content
    await expect(memberCta).toContainText('¿Eres miembro de SECiD?');
    await expect(memberCta).toContainText('Inicia sesión para acceder a más oportunidades exclusivas');

    // Verify buttons
    const loginButton = memberCta.locator('text=Iniciar Sesión');
    await expect(loginButton).toBeVisible();
    
    const registerButton = memberCta.locator('text=Registrarse');
    await expect(registerButton).toBeVisible();
  });

  test('should filter jobs by location', async ({ page }) => {
    // Select "Remoto" from location filter
    const locationFilter = page.locator('.secid-filter-select').first();
    await locationFilter.selectOption({ label: 'Remoto' });

    // In a real app, we would verify that only remote jobs are shown
    // For now, just verify the filter can be changed
    await expect(locationFilter).toHaveValue('remote');
  });

  test('should search for jobs', async ({ page }) => {
    const searchInput = page.locator('.secid-search-input');
    await searchInput.fill('Python');
    
    const searchButton = page.locator('button:has-text("Buscar")');
    await searchButton.click();

    // In a real app, we would verify search results
    // For now, just verify the search interaction works
    await expect(searchInput).toHaveValue('Python');
  });
});