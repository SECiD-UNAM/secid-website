import { test, expect, type Page } from '@playwright/test';
import { SEEDED, login } from '../utils/session';

/**
 * Member dashboard on a phone-sized viewport (390px). The public homepage
 * and hamburger menu are covered by mobile.spec.ts; the dashboard drawer
 * and the bottom-nav "Empleos" tab by dashboard-navigation.spec.ts. This
 * file covers the dashboard pages' own mobile layouts: the job filters
 * drawer (src/components/jobs/JobFilters.tsx), the events toolbar, the
 * members table and the bottom-nav "Más opciones" sheet
 * (src/components/nav/DashboardBottomNav.tsx).
 */
const PAGES: [string, string][] = [
  ['/es/dashboard', 'Bienvenido al Panel de Miembros'],
  ['/es/dashboard/jobs', 'Bolsa de Trabajo'],
  ['/es/dashboard/events', 'Eventos'],
  ['/es/dashboard/members', 'Directorio de Miembros'],
  ['/es/dashboard/mentorship', 'Mentorias'],
];

function jobTitles(page: Page) {
  return page.locator('h3 a[href*="/es/dashboard/jobs/"]');
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
}

test.describe('Member dashboard on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await login(page, SEEDED.member);
  });

  test('dashboard pages fit the viewport without horizontal scroll', async ({
    page,
  }) => {
    for (const [path, heading] of PAGES) {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { level: 1, name: heading })
      ).toBeVisible({ timeout: 20000 });
      expect(await horizontalOverflow(page), path).toBeLessThanOrEqual(0);
    }
  });

  test('job filters collapse into a drawer', async ({ page }) => {
    await page.goto('/es/dashboard/jobs');
    await expect(jobTitles(page)).toHaveCount(3, { timeout: 20000 });

    // The desktop sidebar is display:none below lg.
    await expect(page.getByRole('heading', { name: 'Modalidad' })).toBeHidden();

    await page.getByRole('button', { name: 'Filtros' }).click();
    await expect(
      page.getByRole('heading', { name: 'Modalidad' })
    ).toBeVisible();
    await page.getByRole('checkbox', { name: 'Remoto', exact: true }).check();
    await page.getByRole('button', { name: 'Cerrar filtros' }).click();
    await expect(page.getByRole('heading', { name: 'Modalidad' })).toBeHidden();

    await expect(jobTitles(page)).toHaveCount(1, { timeout: 15000 });
    await expect(jobTitles(page)).toHaveText('Machine Learning Engineer');
  });

  test('events time filters work from the stacked toolbar', async ({
    page,
  }) => {
    await page.goto('/es/dashboard/events');
    await expect(
      page.getByRole('heading', {
        level: 3,
        name: 'Webinar: Carreras en Ciencia de Datos',
      })
    ).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: 'Pasados' }).tap();
    await expect(page.getByText(/^2 eventos/)).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('heading', {
        level: 3,
        name: 'Introduction to MLOps Workshop',
      })
    ).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('members table scrolls inside its container, not the page', async ({
    page,
  }) => {
    await page.goto('/es/dashboard/members');
    await page
      .getByRole('button', { name: 'Miembros', exact: true })
      .click({ timeout: 20000 });
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 20000 });

    const wrapper = page.locator('div.overflow-x-auto', { has: table });
    const overflows = await wrapper.evaluate(
      (el) => el.scrollWidth > el.clientWidth
    );
    expect(overflows).toBe(true);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('"Más opciones" opens the remaining sections', async ({ page }) => {
    await page.goto('/es/dashboard/events');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Eventos' })
    ).toBeVisible({ timeout: 20000 });

    const more = page.getByRole('button', { name: 'Más opciones' });
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await more.tap();
    await expect(more).toHaveAttribute('aria-expanded', 'true');

    await page.getByRole('link', { name: 'Foros' }).click();
    await expect(page).toHaveURL(/\/es\/dashboard\/forums/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Foros' })
    ).toBeVisible({ timeout: 20000 });
  });
});
