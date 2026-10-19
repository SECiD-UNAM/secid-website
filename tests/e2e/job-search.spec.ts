import { test, expect } from '@playwright/test';
import { waitForIsland } from '../utils/session';

/**
 * Public job board (/es/jobs, src/pages/es/jobs.astro). The static parts
 * (hero, company CTA, member CTA) need no data. The interactive board
 * (src/components/jobs/JobBoard.tsx) reads the `jobs` collection, which
 * firestore.rules only exposes to signed-in, email-verified users; the
 * listing tests therefore sign in with a seeded member (npm run seed).
 */
const MEMBER_EMAIL = process.env.E2E_QA_EMAIL || 'member1@alumno.unam.mx';
const MEMBER_PASSWORD = process.env.E2E_QA_PASSWORD || 'member123456';

test.describe('Job Search User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/es/jobs');
  });

  test('should display job listings page correctly', async ({ page }) => {
    const heroSection = page.locator('.secid-hero--jobs');
    await expect(heroSection).toBeVisible();
    await expect(page.locator('.secid-hero__title')).toContainText(
      'Bolsa de Trabajo'
    );

    const companyCta = page.locator('.secid-cta-box');
    await expect(companyCta).toBeVisible();
    await expect(companyCta).toContainText(
      '¿Buscas talento en ciencia de datos?'
    );

    const publishButton = companyCta.locator('a', {
      hasText: 'Publicar Empleo',
    });
    await expect(publishButton).toBeVisible();
    await expect(publishButton).toHaveAttribute('href', '/es/post-job');
  });

  test('should navigate to job submission page', async ({ page }) => {
    await page
      .locator('.secid-cta-box a', { hasText: 'Publicar Empleo' })
      .click();

    await expect(page).toHaveURL(/\/es\/post-job/);
    await expect(page.locator('.secid-hero__title')).toContainText(
      'Encuentra Talento SECiD'
    );
  });

  test('should display member CTA section', async ({ page }) => {
    const memberCta = page.locator('.secid-member-cta');
    await memberCta.scrollIntoViewIfNeeded();
    await expect(memberCta).toBeVisible();

    await expect(memberCta).toContainText('¿Eres miembro de SECiD?');
    await expect(memberCta).toContainText(
      'Inicia sesión para acceder a más oportunidades exclusivas'
    );

    const loginButton = memberCta.locator('a[href="/es/login"]');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toContainText('Iniciar Sesión');

    const registerButton = memberCta.locator('a[href="/es/join"]');
    await expect(registerButton).toBeVisible();
    await expect(registerButton).toContainText('Registrarse');
  });

  test.describe('with a signed-in member (seeded)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/es/login');
      await waitForIsland(page, 'LoginForm');
      await page.fill('#email', MEMBER_EMAIL);
      await page.fill('#password', MEMBER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
      await page.goto('/es/jobs');
    });

    test('should display job search controls', async ({ page }) => {
      const searchBox = page.locator('input[type="search"]').first();
      await expect(searchBox).toBeVisible();
    });

    test('should display seeded job cards', async ({ page }) => {
      const jobLinks = page.locator('h3 a[href*="/es/dashboard/jobs/"]');
      await expect(jobLinks.first()).toBeVisible({ timeout: 15000 });
      await expect(
        jobLinks.filter({ hasText: 'Senior Data Scientist' })
      ).toBeVisible();
    });

    test('should search for jobs', async ({ page }) => {
      // Wait for the listing to load first: the board re-renders once the
      // auth state resolves, which resets a query typed too early.
      const jobLinks = page.locator('h3 a[href*="/es/dashboard/jobs/"]');
      await expect(jobLinks.first()).toBeVisible({ timeout: 15000 });

      const searchInput = page.locator('input[type="search"]').first();
      await searchInput.fill('Machine Learning');
      await expect(searchInput).toHaveValue('Machine Learning');

      await expect(
        jobLinks.filter({ hasText: 'Machine Learning Engineer' })
      ).toBeVisible({ timeout: 15000 });
      await expect(
        jobLinks.filter({ hasText: 'Data Analyst Junior' })
      ).toHaveCount(0);
    });
  });
});
