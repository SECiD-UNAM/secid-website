import { test, expect, type Page } from '@playwright/test';
import { SEEDED, login } from '../utils/session';

/**
 * Job detail + application modal for a seeded job:
 * /es/dashboard/jobs/{id} is served by the Firebase Hosting rewrite to
 * jobs/detail (firebase.json) and mounts
 * src/components/jobs/JobApplicationPage.tsx (JobDetail + the four-step
 * JobApplicationModal).
 *
 * Submitting the application is NOT exercised: JobApplicationModal writes
 * `jobs/{id}/applications` with `status: 'pending'` and no `jobId`/`createdAt`,
 * while firestore.rules require `status == 'submitted'`, `jobId == jobId` and
 * `createdAt == request.time`, and `users/{uid}/applications` has no rule
 * at all, so the submit is denied by the rules the emulator enforces.
 */
const JOB_ID = 'seed-job-ml-engineer';
const JOB_TITLE = 'Machine Learning Engineer';
const COVER_LETTER =
  'Tengo experiencia desplegando modelos de ML en producción con Docker ' +
  'y MLOps, y me interesa el reto de escalarlos para clientes enterprise.';

function modal(page: Page) {
  return page.getByRole('heading', { name: 'Aplicar al empleo' });
}

async function openJob(page: Page, id = JOB_ID) {
  await page.goto(`/es/dashboard/jobs/${id}`);
}

test.describe('Job detail and application modal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, SEEDED.member);
  });

  test('renders the seeded job', async ({ page }) => {
    await openJob(page);
    await expect(
      page.getByRole('heading', { level: 1, name: JOB_TITLE })
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('AI Solutions México').first()).toBeVisible();
    await expect(page.getByText('MXN 50,000-70,000/mes')).toBeVisible();
    await expect(page.getByText('Tiempo completo')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Descripción del puesto' })
    ).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: /^MLOps$/ })
    ).toBeVisible();
    await expect(page.getByText('Stock options')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Volver a empleos' })
    ).toHaveAttribute('href', '/es/dashboard/jobs');
    await expect(
      page.getByRole('button', { name: 'Aplicar ahora' })
    ).toBeVisible();
  });

  test('cover-letter step validates before moving on', async ({ page }) => {
    await openJob(page);
    await page
      .getByRole('button', { name: 'Aplicar ahora' })
      .click({ timeout: 20000 });
    await expect(modal(page)).toBeVisible();
    await expect(
      page.getByText(`${JOB_TITLE} - AI Solutions México`)
    ).toBeVisible();

    const next = page.getByRole('button', { name: 'Siguiente' });
    await next.click();
    await expect(
      page.getByText('Por favor escribe una carta de presentación')
    ).toBeVisible();

    const letter = page.getByPlaceholder(
      'Explica por qué eres el candidato ideal para este puesto...'
    );
    await letter.fill('Muy corta.');
    await next.click();
    await expect(
      page.getByText(
        'La carta de presentación debe tener al menos 100 caracteres'
      )
    ).toBeVisible();

    await letter.fill(COVER_LETTER);
    await expect(
      page.getByText(`${COVER_LETTER.length}/2000 caracteres`)
    ).toBeVisible();
    await next.click();

    // Step 2 (contact) requires a phone number.
    const phone = page.getByPlaceholder('+52 55 1234 5678');
    await expect(phone).toBeVisible();
    await next.click();
    await expect(
      page.getByText('Por favor proporciona tu número de teléfono')
    ).toBeVisible();

    // Going back keeps what was typed.
    await page.getByRole('button', { name: 'Anterior' }).click();
    await expect(letter).toHaveValue(COVER_LETTER);
  });

  test('Cancelar closes the modal without applying', async ({ page }) => {
    await openJob(page);
    await page
      .getByRole('button', { name: 'Aplicar ahora' })
      .click({ timeout: 20000 });
    await expect(modal(page)).toBeVisible();

    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(modal(page)).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Aplicar ahora' })
    ).toBeVisible();
  });

  // Full submit on a job no other test in this file opens (the tests run in
  // parallel and the ML Engineer ones expect the "Aplicar ahora" button).
  // The emulator data is fresh per `emulators:exec`, but the assertions never
  // depend on this being the only application.
  test('submits an application and lists it under Mis Aplicaciones', async ({
    page,
  }) => {
    const title = 'Senior Data Scientist';
    const coverLetter = `${COVER_LETTER} Ref e2e-${Date.now()}.`;

    await openJob(page, 'seed-job-senior-data-scientist');
    await page
      .getByRole('button', { name: 'Aplicar ahora' })
      .click({ timeout: 20000 });
    await expect(modal(page)).toBeVisible();
    const next = page.getByRole('button', { name: 'Siguiente' });

    await page
      .getByPlaceholder(
        'Explica por qué eres el candidato ideal para este puesto...'
      )
      .fill(coverLetter);
    await next.click();
    await page.getByPlaceholder('+52 55 1234 5678').fill('+52 55 1234 5678');
    await next.click();
    const selects = page.locator('select');
    await selects.nth(0).selectOption('1-3');
    await selects.nth(1).selectOption('master');
    await next.click();
    await expect(
      page.getByRole('heading', { name: 'Resumen de tu aplicación' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Enviar aplicación' }).click();
    await expect(
      page.getByRole('heading', {
        name: '¡Aplicación enviada exitosamente!',
      })
    ).toBeVisible({ timeout: 15000 });

    // The modal reloads the page, which now shows the applied state.
    await expect(page.getByText('Ya aplicaste a este empleo')).toBeVisible({
      timeout: 20000,
    });

    await page.goto('/es/dashboard/applications');
    await expect(
      page.getByRole('heading', { name: 'Mis Aplicaciones' })
    ).toBeVisible({ timeout: 20000 });
    const row = page
      .locator('h3', { hasText: title })
      .locator('xpath=ancestor::div[contains(@class, "shadow")][1]');
    await expect(row.first()).toBeVisible({ timeout: 15000 });
    await expect(row.first()).toContainText('TechCorp México');
    await expect(row.first()).toContainText('Enviada');
  });

  test('an unknown job id shows the not-found state', async ({ page }) => {
    await openJob(page, 'no-such-job');
    await expect(
      page.getByRole('heading', { name: 'Empleo no encontrado' })
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByRole('link', { name: 'Volver a la bolsa de trabajo' })
    ).toHaveAttribute('href', '/es/dashboard/jobs');
  });
});
