import { test, expect, type Page } from '@playwright/test';
import { SEEDED, login } from '../../utils/session';

/**
 * Member events listing: /es/dashboard/events mounts
 * src/components/events/EventList.tsx (useUniversalListing over a
 * client-side adapter of `events` with status == 'published'). The seed
 * has two past events (2024) and one upcoming webinar whose dates are
 * relative to the seed run, so the default "Próximos" tab shows exactly
 * one card. The public /es/events page mounts the same component.
 */
const UPCOMING = 'Webinar: Carreras en Ciencia de Datos';
const CAREER_FAIR = 'Data Science Career Fair 2024';
const WORKSHOP = 'Introduction to MLOps Workshop';
const ALL = [UPCOMING, CAREER_FAIR, WORKSHOP];

function eventCard(page: Page, title: string) {
  return page.getByRole('heading', { level: 3, name: title });
}

async function expectEvents(page: Page, titles: string[]) {
  await expect(
    page.getByText(new RegExp(`^${titles.length} eventos`))
  ).toBeVisible({ timeout: 15000 });
  for (const title of ALL) {
    await expect(eventCard(page, title)).toHaveCount(
      titles.includes(title) ? 1 : 0
    );
  }
}

function typeFilter(page: Page) {
  return page.getByRole('combobox').filter({ hasText: 'Todos los tipos' });
}

test.describe('Events listing (member)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, SEEDED.member);
    await page.goto('/es/dashboard/events');
    await expect(eventCard(page, UPCOMING)).toBeVisible({ timeout: 20000 });
  });

  test('shows only the upcoming seeded event by default', async ({ page }) => {
    await expectEvents(page, [UPCOMING]);
    const card = page
      .locator('article, div', { has: eventCard(page, UPCOMING) })
      .last();
    await expect(card).toContainText('Virtual');
    await expect(card).toContainText('12/100 asistentes');
    await expect(card).toContainText('Registro abierto');
    await expect(
      page.getByRole('link', { name: 'Ver detalles' })
    ).toHaveAttribute(
      'href',
      '/es/dashboard/events/seed-event-upcoming-webinar'
    );
  });

  test('"Todos" and "Pasados" reveal the past events', async ({ page }) => {
    await page.getByRole('button', { name: 'Todos', exact: true }).click();
    await expectEvents(page, ALL);

    await page.getByRole('button', { name: 'Pasados' }).click();
    await expectEvents(page, [CAREER_FAIR, WORKSHOP]);
    await expect(page.getByText('Registro cerrado')).toHaveCount(2);

    await page.getByRole('button', { name: 'Próximos' }).click();
    await expectEvents(page, [UPCOMING]);
  });

  test('search narrows the listing', async ({ page }) => {
    await page.getByRole('button', { name: 'Todos', exact: true }).click();
    await expectEvents(page, ALL);

    const search = page.getByRole('searchbox', { name: 'Buscar...' });
    await search.fill('MLOps');
    await expect(page.getByText(/^1 eventos para/)).toBeVisible({
      timeout: 15000,
    });
    await expect(eventCard(page, WORKSHOP)).toBeVisible();
    await expect(eventCard(page, CAREER_FAIR)).toHaveCount(0);

    await page.getByRole('button', { name: 'Limpiar búsqueda' }).click();
    await expectEvents(page, ALL);
  });

  test('a search with no match shows the empty state', async ({ page }) => {
    await page
      .getByRole('searchbox', { name: 'Buscar...' })
      .fill('zzz-no-such-event');
    await expect(
      page.getByRole('heading', { name: 'No se encontraron eventos' })
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText('Intenta ajustar tus filtros o términos de búsqueda')
    ).toBeVisible();
  });

  test('type filter keeps only matching events', async ({ page }) => {
    await page.getByRole('button', { name: 'Todos', exact: true }).click();
    await expectEvents(page, ALL);

    await typeFilter(page).selectOption({ label: 'Ferias de empleo' });
    await expectEvents(page, [CAREER_FAIR]);

    await typeFilter(page).selectOption({ label: 'Webinars' });
    await expectEvents(page, [UPCOMING]);

    await typeFilter(page).selectOption({ label: 'Todos los tipos' });
    await expectEvents(page, ALL);
  });

  test('calendar tab shows the placeholder and list view toggles', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Calendario' }).click();
    await expect(
      page.getByText('Vista de calendario próximamente')
    ).toBeVisible();
    await expect(eventCard(page, UPCOMING)).toHaveCount(0);

    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await expect(eventCard(page, UPCOMING)).toBeVisible();

    const list = page.getByRole('radio', { name: 'Lista' });
    await list.click();
    await expect(list).toBeChecked();
    await expect(eventCard(page, UPCOMING)).toBeVisible();
  });

  test('"Ver detalles" opens the event detail page', async ({ page }) => {
    await page.getByRole('link', { name: 'Ver detalles' }).click();
    await expect(page).toHaveURL(
      /\/es\/dashboard\/events\/seed-event-upcoming-webinar/
    );
    await expect(
      page.getByRole('heading', { level: 1, name: UPCOMING })
    ).toBeVisible({ timeout: 20000 });
  });
});

test.describe('Events listing (public)', () => {
  test('renders the hero and the proposal CTA for visitors', async ({
    page,
  }) => {
    await page.goto('/es/events');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Eventos SECiD' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '¿Quieres proponer un evento?' })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Proponer Evento' })
    ).toHaveAttribute('href', '/es/dashboard/events/new');
    // The listing needs a signed-in member (firestore.rules): visitors get
    // the empty state, not an error.
    await expect(
      page.getByRole('heading', { name: 'No se encontraron eventos' })
    ).toBeVisible({ timeout: 20000 });
  });
});
