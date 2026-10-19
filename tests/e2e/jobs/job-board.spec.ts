import { test, expect, type Page } from '@playwright/test';
import { SEEDED, login } from '../../utils/session';

/**
 * Member job board: /es/dashboard/jobs mounts
 * src/components/jobs/JobSearchDemo.tsx (JobFilters sidebar + JobBoard over
 * useUniversalListing / JobFirestoreAdapter). scripts/seed-emulator.js
 * publishes three active jobs. The public /es/jobs page (hero, CTAs,
 * search) is covered by tests/e2e/job-search.spec.ts.
 *
 * The "Ubicación" select offers fixed city slugs (cdmx, guadalajara, …)
 * while jobs store free text ("Guadalajara, Jalisco"); the adapter matches
 * them client-side via src/lib/jobs/location.ts.
 */
const SENIOR = 'Senior Data Scientist';
const JUNIOR = 'Data Analyst Junior';
const ML = 'Machine Learning Engineer';

function jobTitles(page: Page) {
  return page.locator('h3 a[href*="/es/dashboard/jobs/"]');
}

function job(page: Page, title: string) {
  return jobTitles(page).filter({ hasText: title });
}

async function expectJobs(page: Page, titles: string[]) {
  await expect(jobTitles(page)).toHaveCount(titles.length, { timeout: 15000 });
  for (const title of titles) {
    await expect(job(page, title)).toBeVisible();
  }
}

test.describe('Job board (member)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, SEEDED.member);
    await page.goto('/es/dashboard/jobs');
    await expect(jobTitles(page).first()).toBeVisible({ timeout: 20000 });
  });

  test('lists the seeded jobs with company, modality and salary', async ({
    page,
  }) => {
    await expectJobs(page, [SENIOR, ML, JUNIOR]);
    await expect(page.getByText('Mostrando 1–3 de 3')).toBeVisible();

    const senior = page.getByRole('listitem').filter({ hasText: SENIOR });
    await expect(senior).toContainText('TechCorp México');
    await expect(senior).toContainText('Híbrido');
    await expect(senior).toContainText('MXN 60,000-90,000/mes');
    await expect(senior.getByText('Destacado')).toBeVisible();

    const junior = page.getByRole('listitem').filter({ hasText: JUNIOR });
    await expect(junior).toContainText('Presencial');
    await expect(junior.getByText('Destacado')).toHaveCount(0);
  });

  test('search narrows the listing and clears back', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Buscar...' });
    await search.fill('Analyst');
    await expectJobs(page, [JUNIOR]);

    await page.getByRole('button', { name: 'Limpiar búsqueda' }).click();
    await expect(search).toHaveValue('');
    await expectJobs(page, [SENIOR, ML, JUNIOR]);
  });

  test('a search with no match shows the empty state', async ({ page }) => {
    await page
      .getByRole('searchbox', { name: 'Buscar...' })
      .fill('zzz-no-such-job');
    await expect(
      page.getByRole('heading', { name: 'No se encontraron empleos' })
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText('Intenta ajustar tus filtros o términos de búsqueda')
    ).toBeVisible();
    await expect(jobTitles(page)).toHaveCount(0);
  });

  test('work-mode filter keeps only matching jobs', async ({ page }) => {
    const remote = page.getByRole('checkbox', { name: 'Remoto', exact: true });
    await remote.check();
    await expectJobs(page, [ML]);

    await page.getByRole('checkbox', { name: 'Híbrido' }).check();
    await expectJobs(page, [SENIOR, ML]);

    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(remote).not.toBeChecked();
    await expectJobs(page, [SENIOR, ML, JUNIOR]);
  });

  test('location filter matches the seeded free-text locations', async ({
    page,
  }) => {
    const location = page.locator('select:has(option[value="guadalajara"])');
    await location.selectOption('guadalajara');
    await expectJobs(page, [JUNIOR]);

    await location.selectOption('cdmx');
    await expectJobs(page, [SENIOR]);

    await location.selectOption('remote');
    await expectJobs(page, [ML]);

    await location.selectOption('');
    await expectJobs(page, [SENIOR, ML, JUNIOR]);
  });

  test('employment-type filter with no seeded match shows the empty state', async ({
    page,
  }) => {
    await page.getByRole('checkbox', { name: 'Medio tiempo' }).check();
    await expect(
      page.getByRole('heading', { name: 'No se encontraron empleos' })
    ).toBeVisible({ timeout: 15000 });
    await page.getByRole('checkbox', { name: 'Medio tiempo' }).uncheck();
    await expectJobs(page, [SENIOR, ML, JUNIOR]);
  });

  test('sorting by salary puts the best paid job first', async ({ page }) => {
    await page
      .getByRole('combobox', { name: 'Ordenar por' })
      .selectOption('salaryRange.max');
    await expect(jobTitles(page).first()).toHaveText(SENIOR, {
      timeout: 15000,
    });
    await expect(jobTitles(page).last()).toHaveText(JUNIOR);
  });

  test('switches between list and grid views', async ({ page }) => {
    const grid = page.getByRole('radio', { name: 'Cuadrícula' });
    await grid.click();
    await expect(grid).toBeChecked();
    await expectJobs(page, [SENIOR, ML, JUNIOR]);

    const list = page.getByRole('radio', { name: 'Lista' });
    await list.click();
    await expect(list).toBeChecked();
  });

  test('"Ver detalles" opens the job detail page', async ({ page }) => {
    await page
      .getByRole('listitem')
      .filter({ hasText: ML })
      .getByRole('link', { name: 'Ver detalles' })
      .click();
    await expect(page).toHaveURL(/\/es\/dashboard\/jobs\/seed-job-ml-engineer/);
    await expect(page.getByRole('heading', { level: 1, name: ML })).toBeVisible(
      { timeout: 20000 }
    );
  });
});
