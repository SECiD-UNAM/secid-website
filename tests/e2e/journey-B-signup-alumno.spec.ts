/**
 * Journey B — Signup nuevo alumno UNAM end-to-end (plan QA v3 §6.B).
 *
 * Runs against the emulators in CI: the signup wizard in
 * src/components/auth/SignUpForm.tsx (account → tipo de registro →
 * verificación UNAM → encuesta → listo), the `completeRegistration`
 * callable (functions/src/complete-registration.ts, needs the functions
 * emulator), the admin approval through the "Estado" select in
 * src/components/dashboard/admin/AdminMembersTable.tsx and the member-tier
 * unlock the user sees afterwards.
 *
 * Each run signs up a fresh email with the número de cuenta that
 * scripts/seed-emulator.js reserves (300000001, never indexed). The three
 * tests are serial and share that account. Gated on the admin credentials
 * so a remote `BASE_URL` run never creates accounts by accident:
 *
 *   E2E_QA_ADMIN_EMAIL=admin@secid.mx E2E_QA_ADMIN_PASSWORD=admin123456 \
 *     npx playwright test journey-B-signup-alumno
 *
 * Email delivery (B4/B5/B24) is not observable from Playwright; those
 * steps stay as manual-validation annotations.
 */
import { test, expect } from '@playwright/test';
import {
  login,
  expectMemberDashboard,
  sidebar,
  memberRow,
  statusSelect,
  waitForIsland,
} from '../utils/session';

const ADMIN_EMAIL = process.env.E2E_QA_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_QA_ADMIN_PASSWORD;
const NUMERO_CUENTA = process.env.E2E_QA_NUMERO_CUENTA || '300000001';

const RUN_ID = Date.now();
const SIGNUP = {
  email: process.env.E2E_QA_SIGNUP_EMAIL || `qa-b-${RUN_ID}@example.com`,
  password: process.env.E2E_QA_SIGNUP_PASSWORD || `QaSecid${RUN_ID}`,
  firstName: 'QA',
  lastName: 'Alumno',
  displayName: 'QA Alumno',
};

test.describe('Journey B — Signup nuevo alumno end-to-end', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set E2E_QA_ADMIN_EMAIL + E2E_QA_ADMIN_PASSWORD (the seeded admin) to run'
  );

  test('B1-B6 signup wizard → solicitud pendiente → dashboard básico', async ({
    page,
  }) => {
    // B1: account step
    await page.goto('/es/signup');
    await waitForIsland(page, 'SignUpForm');
    await expect(
      page.getByRole('heading', { name: 'Crear Cuenta' })
    ).toBeVisible();
    await page.fill('#firstName', SIGNUP.firstName);
    await page.fill('#lastName', SIGNUP.lastName);
    await page.fill('#email', SIGNUP.email);
    await page.fill('#password', SIGNUP.password);
    await page.fill('#confirmPassword', SIGNUP.password);
    await page.check('#acceptTerms');
    await page.click('button[type="submit"]');

    // B2/B3: the blocking onUserCreate trigger writes users/{uid}; the
    // wizard waits for that document before showing the type step.
    await expect(
      page.getByRole('heading', { name: 'Tipo de registro' })
    ).toBeVisible({ timeout: 30000 });
    await page
      .getByRole('button', {
        name: /Soy egresado\/estudiante de Ciencia de Datos UNAM/,
      })
      .click();

    // B12: datos UNAM → completeRegistration callable
    await expect(
      page.getByRole('heading', { name: 'Verificación UNAM' })
    ).toBeVisible();
    await page.fill('#numeroCuenta', NUMERO_CUENTA);
    await page.selectOption('#academicLevel', 'licenciatura');
    await page.selectOption('#campus', 'Ciudad Universitaria (CU)');
    await page
      .getByRole('button', { name: 'Enviar solicitud de membresía' })
      .click();

    // Encuesta (optional) → done
    await expect(
      page.getByRole('heading', { name: 'Cuéntanos un poco más' })
    ).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Saltar por ahora' }).click();
    await expect(
      page.getByRole('heading', { name: '¡Solicitud enviada!' })
    ).toBeVisible();
    await expect(
      page.getByText('Un administrador la revisará pronto', { exact: false })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Ir al panel' }).click();

    // B6: dashboard in the basic tier — the shell opens the onboarding
    // modal (?onboarding=true) and the sidebar keeps member-only items locked.
    await page.waitForURL(/\/es\/dashboard/, { timeout: 20000 });
    await expectMemberDashboard(page);
    await expect(
      page.getByRole('heading', { name: '¡Completa tu perfil!' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Más tarde' }).click();
    await expect(
      page.getByRole('heading', { name: '¡Completa tu perfil!' })
    ).toHaveCount(0);
    await expect(
      sidebar(page).getByRole('link', {
        name: /Mentoría.*\(Membresía requerida\)/,
      })
    ).toBeVisible();
    await expect(
      page.getByText('Verifica tu correo electrónico')
    ).toBeVisible();

    test.info().annotations.push({
      type: 'TODO-manual-validation',
      description:
        'Verificar manualmente que llegan a la inbox: (1) Firebase verify email, (2) SECiD welcome email (Phase 0)',
    });
  });

  test('B19-B23 admin ve la solicitud pendiente y la aprueba', async ({
    page,
  }) => {
    await login(page, {
      email: ADMIN_EMAIL ?? '',
      password: ADMIN_PASSWORD ?? '',
    });
    await expectMemberDashboard(page);

    // B20: pending badge counts the new request and deep-links to the filter.
    await page.goto('/es/dashboard/admin');
    const pendingTile = page.locator('a[href*="status=pending"]');
    await expect(pendingTile).toBeVisible({ timeout: 20000 });
    await expect(pendingTile.getByText('requiere acción')).toBeVisible();
    await pendingTile.click();
    await expect(page).toHaveURL(
      /\/es\/dashboard\/admin\/members\?status=pending/
    );

    // B21: the applicant is listed as pending with its UNAM data submitted.
    const row = memberRow(page, SIGNUP.email);
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row).toContainText('Pendiente');
    await expect(statusSelect(page, SIGNUP.email)).toHaveValue('pending');

    // B22: approve → updateMemberStatus('active') also sets role=member,
    // isVerified=true. Verify through a fresh query, not the optimistic row.
    await statusSelect(page, SIGNUP.email).selectOption('active');
    // Once saved the row no longer matches the ?status=pending filter.
    await expect(memberRow(page, SIGNUP.email)).toHaveCount(0, {
      timeout: 20000,
    });
    await expect
      .poll(
        async () => {
          await page.goto('/es/dashboard/admin/members');
          await page.getByRole('searchbox').fill(SIGNUP.email);
          await expect(memberRow(page, SIGNUP.email)).toBeVisible({
            timeout: 20000,
          });
          return statusSelect(page, SIGNUP.email).inputValue();
        },
        { timeout: 30000, intervals: [1000, 2000, 3000] }
      )
      .toBe('active');
    await expect(memberRow(page, SIGNUP.email)).toContainText('Aprobado');
    await expect(
      memberRow(page, SIGNUP.email).locator('select').first()
    ).toHaveValue('member');

    test.info().annotations.push({
      type: 'TODO-manual-validation',
      description: `Verificar (1) ${SIGNUP.email} recibió email "Tu solicitud fue aprobada"; (2) Google Group sync corrió — added a miembros@, removed de colaboradores@`,
    });
  });

  test('B25 el alumno aprobado tiene acceso de miembro', async ({ page }) => {
    await login(page, SIGNUP);
    await expectMemberDashboard(page);

    // Member-tier items are unlocked now (email is still unverified, which
    // only gates the basic tier through the banner).
    const mentorship = sidebar(page).getByRole('link', {
      name: 'Mentoría',
      exact: true,
    });
    await expect(mentorship).toHaveAttribute(
      'href',
      '/es/dashboard/mentorship'
    );
    await expect(sidebar(page).getByText('(Membresía requerida)')).toHaveCount(
      0
    );

    // Settings → Cuentas: the alternate-email section is members-only.
    await page.goto('/es/dashboard/settings');
    await page.getByRole('button', { name: 'Cuentas' }).click();
    await expect(
      page.getByRole('heading', { name: 'Correo alterno' })
    ).toBeVisible({
      timeout: 20000,
    });
  });
});
