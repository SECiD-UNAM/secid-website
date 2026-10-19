import { test, expect, type Page } from '@playwright/test';
import { SEEDED, login } from '../utils/session';

/**
 * Event detail + registration form for the seeded events:
 * /es/dashboard/events/{id} is served by the Firebase Hosting rewrite to
 * events/detail (firebase.json) and mounts
 * src/components/events/EventDetail.tsx with the four-step
 * EventRegistrationForm modal.
 *
 * Submitting a registration is NOT exercised: EventRegistrationForm writes
 * `events/{id}/registrations` without the `eventId` field that
 * firestore.rules require and then increments `events/{id}.currentAttendees`,
 * which only RBAC event editors may update, so the submit is denied by the
 * rules the emulator enforces.
 */
const UPCOMING_ID = 'seed-event-upcoming-webinar';
const UPCOMING = 'Webinar: Carreras en Ciencia de Datos';
const PAST_ID = 'seed-event-career-fair';
const PAST = 'Data Science Career Fair 2024';

function registerButton(page: Page) {
  return page.getByRole('button', { name: 'Registrarse para el evento' });
}

function formHeading(page: Page) {
  return page.getByRole('heading', { name: 'Registro al evento' });
}

async function openEvent(page: Page, id: string, title: string) {
  await page.goto(`/es/dashboard/events/${id}`);
  await expect(
    page.getByRole('heading', { level: 1, name: title })
  ).toBeVisible({ timeout: 20000 });
}

test.describe('Event detail and registration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, SEEDED.member);
  });

  test('upcoming event shows its details and the registration button', async ({
    page,
  }) => {
    await openEvent(page, UPCOMING_ID, UPCOMING);
    await expect(page.getByText('Organizado por SECiD')).toBeVisible();
    await expect(page.getByText('Evento Virtual').first()).toBeVisible();
    await expect(page.getByText('12/100')).toBeVisible();
    await expect(
      page.getByText('Los detalles de acceso se mostrarán después del registro')
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Volver a eventos' })
    ).toHaveAttribute('href', '/es/dashboard/events');
    await expect(registerButton(page)).toBeVisible();
  });

  test('registration form is prefilled from the profile and validates the phone', async ({
    page,
  }) => {
    await openEvent(page, UPCOMING_ID, UPCOMING);
    await registerButton(page).click({ timeout: 20000 });
    await expect(formHeading(page)).toBeVisible();
    await expect(
      page.getByText(UPCOMING, { exact: true }).last()
    ).toBeVisible();

    // Personal step: name and email come from the seeded profile.
    await expect(page.locator('input[type="text"]').nth(0)).toHaveValue(
      'María'
    );
    await expect(page.locator('input[type="text"]').nth(1)).toHaveValue(
      'García'
    );
    await expect(page.locator('input[type="email"]')).toHaveValue(
      SEEDED.member.email
    );
    const phone = page.locator('input[type="tel"]');
    await expect(phone).toHaveValue('');

    const next = page.getByRole('button', { name: 'Siguiente' });
    await next.click();
    await expect(page.getByText('El teléfono es requerido')).toBeVisible();

    await phone.fill('+52 55 1234 5678');
    await next.click();
    await expect(page.getByText('El teléfono es requerido')).toHaveCount(0);
    await expect(phone).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Anterior' })).toBeEnabled();

    await page.getByRole('button', { name: 'Anterior' }).click();
    await expect(page.locator('input[type="tel"]')).toHaveValue(
      '+52 55 1234 5678'
    );
  });

  test('Cancelar closes the registration form', async ({ page }) => {
    await openEvent(page, UPCOMING_ID, UPCOMING);
    await registerButton(page).click({ timeout: 20000 });
    await expect(formHeading(page)).toBeVisible();

    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(formHeading(page)).toHaveCount(0);
    await expect(registerButton(page)).toBeVisible();
  });

  test('a past event no longer offers registration', async ({ page }) => {
    await openEvent(page, PAST_ID, PAST);
    await expect(page.getByText('Este evento ya ha finalizado')).toBeVisible();
    await expect(registerButton(page)).toHaveCount(0);
    await expect(page.getByText('45/200')).toBeVisible();
  });

  test('an unknown event shows the not-found state', async ({ page }) => {
    await page.goto('/es/dashboard/events/no-such-event');
    await expect(
      page.getByRole('heading', { name: 'Evento no encontrado' })
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByRole('link', { name: 'Volver a eventos' })
    ).toHaveAttribute('href', '/es/dashboard/events');
  });
});
