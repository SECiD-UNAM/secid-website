import { test, expect, type Page } from '@playwright/test';
import { SEEDED, login } from '../utils/session';

/**
 * Event detail + registration form for the seeded events:
 * /es/dashboard/events/{id} is served by the Firebase Hosting rewrite to
 * events/detail (firebase.json) and mounts
 * src/components/events/EventDetail.tsx with the four-step
 * EventRegistrationForm modal.
 *
 * The last test submits a real registration (events/{id}/registrations/{uid}
 * + the Cloud Function that maintains `currentAttendees`) and cancels it;
 * "saves and unsaves" exercises users/{uid}/savedEvents.
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

/** The bookmark icon button; its title is the only accessible name. */
function saveButton(page: Page, title: 'Guardar' | 'Guardado') {
  return page.getByRole('button', { name: title, exact: true });
}

async function openEvent(page: Page, id: string, title: string) {
  await page.goto(`/es/dashboard/events/${id}`);
  await expect(
    page.getByRole('heading', { level: 1, name: title })
  ).toBeVisible({ timeout: 20000 });
}

test.describe('Event detail and registration', () => {
  // Serial: the full registration (last test) changes the state the earlier
  // tests assert on the single upcoming seeded event.
  test.describe.configure({ mode: 'serial' });

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

  // "Guardar" bookmarks the event under users/{uid}/savedEvents/{eventId}
  // (owner-only rule, G27b); the state must survive a reload, and the
  // round trip leaves the seed as found.
  test('saves and unsaves the webinar', async ({ page }) => {
    await openEvent(page, UPCOMING_ID, UPCOMING);
    await saveButton(page, 'Guardar').click({ timeout: 20000 });
    await expect(saveButton(page, 'Guardado')).toBeVisible();
    await page.reload();
    await expect(saveButton(page, 'Guardado')).toBeVisible({ timeout: 20000 });

    await saveButton(page, 'Guardado').click();
    await expect(saveButton(page, 'Guardar')).toBeVisible();
    await page.reload();
    await expect(saveButton(page, 'Guardar')).toBeVisible({ timeout: 20000 });
  });

  // Last on purpose (serial mode): it registers for the only upcoming event
  // and the tests above expect its "Registrarse" button and seeded count.
  // The attendee counter is maintained by the Cloud Function triggers on
  // registrations create/delete, so both directions are asserted with a
  // reload-and-check loop; cancelling at the end leaves the seed as found.
  test('registers for the webinar, bumps the attendee count and cancels', async ({
    page,
  }) => {
    await openEvent(page, UPCOMING_ID, UPCOMING);
    const seeded = await attendeeCount(page);

    await registerButton(page).click({ timeout: 20000 });
    await expect(formHeading(page)).toBeVisible();
    const next = page.getByRole('button', { name: 'Siguiente' });
    await page.locator('input[type="tel"]').fill('+52 55 1234 5678');
    await next.click(); // -> requirements (optional)
    await next.click(); // -> organiser questions (none seeded)
    await expect(
      page.getByText('No hay preguntas adicionales para este evento.')
    ).toBeVisible();
    await next.click(); // -> review & terms
    await expect(
      page.getByRole('heading', { name: 'Resumen del registro' })
    ).toBeVisible();
    await page.locator('#acceptTerms').check();
    await page.locator('#acceptPrivacy').check();
    await page.getByRole('button', { name: 'Confirmar registro' }).click();
    await expect(
      page.getByRole('heading', { name: '¡Registro completado exitosamente!' })
    ).toBeVisible({ timeout: 15000 });

    // The form reloads the page, which now shows the registered state.
    await expect(
      page.getByText('Estás registrado para este evento')
    ).toBeVisible({ timeout: 20000 });
    await expectAttendeeCount(page, seeded + 1);

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Cancelar registro' }).click();
    await expect(registerButton(page)).toBeVisible({ timeout: 20000 });
    await expectAttendeeCount(page, seeded);
  });
});

/** "12/100" on the detail page -> 12. */
async function attendeeCount(page: Page): Promise<number> {
  const text = await page.getByText(/^\d+\/100$/).textContent();
  return Number(text?.split('/')[0]);
}

/** The counter is written by a trigger; poll by reloading. */
async function expectAttendeeCount(page: Page, expected: number) {
  await expect(async () => {
    await page.reload();
    await expect(page.getByText(`${expected}/100`)).toBeVisible({
      timeout: 5000,
    });
  }).toPass({ timeout: 30000 });
}
