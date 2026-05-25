/**
 * Journey B — Signup nuevo alumno UNAM end-to-end.
 *
 * Spec del plan QA v3 §6.B (docs/qa/2026-05-24-...). Cubre los 27 pasos
 * desde sign-up con email hasta acceso full tras admin approval.
 *
 * GATED behind env vars — el QA pass round 2 NO pudo ejecutar este
 * journey en vivo porque requiere una cuenta de email real con
 * inbox accesible. Para correr:
 *
 *   E2E_QA_EMAIL=qa-secid-<YYYYMMDD>@mailinator.com \
 *   E2E_QA_PASSWORD='<strong-password>' \
 *   E2E_QA_NUMERO_CUENTA='<8 dígitos no-usado>' \
 *   E2E_QA_ADMIN_EMAIL='<admin de prueba>' \
 *   E2E_QA_ADMIN_PASSWORD='<password admin>' \
 *   BASE_URL=https://beta.secid.mx \
 *     npx playwright test journey-B-signup-alumno --headed
 *
 * El test usa skip() si las env vars no están, para no romper CI.
 */
import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_QA_EMAIL;
const PASSWORD = process.env.E2E_QA_PASSWORD;
const NUMERO_CUENTA = process.env.E2E_QA_NUMERO_CUENTA;
const ADMIN_EMAIL = process.env.E2E_QA_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_QA_ADMIN_PASSWORD;

test.describe('Journey B — Signup nuevo alumno end-to-end', () => {
  test.skip(
    !EMAIL || !PASSWORD || !NUMERO_CUENTA,
    'Set E2E_QA_EMAIL + E2E_QA_PASSWORD + E2E_QA_NUMERO_CUENTA to run'
  );

  test('B1-B6 signup + email verify + dashboard BASIC tier', async ({
    page,
  }) => {
    // B1: signup form
    await page.goto('/es/signup');
    await expect(page.locator('h1, h2').first()).toContainText(/Registr|Sign/i);

    await page.fill('input[name="email"], input[type="email"]', EMAIL!);
    await page.fill(
      'input[name="password"], input[type="password"]',
      PASSWORD!
    );

    const nameInput = page
      .locator('input[name="firstName"], input[name="name"]')
      .first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('QA Test');
    }

    const termsCheckbox = page
      .locator('input[type="checkbox"][name*="terms"]')
      .first();
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }

    await page.click('button[type="submit"]');

    // B2: redirect a verify-email o dashboard
    await page.waitForURL(/\/verify-email|\/dashboard|\/onboarding/, {
      timeout: 15000,
    });

    // B3: doc en Firestore creado por trigger — verify via observable UI
    // (no Firestore SDK in test; trust the trigger + check side effects)

    // B4 + B5: emails de verify + welcome — NO podemos validar inbox
    // desde Playwright sin un IMAP/mailinator client. Marcar como TODO.
    test.info().annotations.push({
      type: 'TODO-manual-validation',
      description:
        'Verificar manualmente que llegan a la inbox: (1) Firebase verify email, (2) SECiD welcome email (Phase 0)',
    });
  });

  test('B7-B18 onboarding wizard — alumno path', async ({ page }) => {
    test.skip(
      !EMAIL || !PASSWORD,
      'Requires prior signup; chain with previous test or use seeded account'
    );
    // Asume user ya verificó email + login session activa
    await page.goto('/es/onboarding');

    // B9 WelcomeStep
    await page.click('button:has-text("Continuar"), button:has-text("Next")');

    // B10 ProfileSetup — foto opcional, headline, bio
    await page
      .locator('input[name="headline"], input[name="title"]')
      .first()
      .fill('QA Senior Engineer');
    await page.click('button:has-text("Continuar"), button:has-text("Next")');

    // B11 tipo de cuenta
    await page.click(
      'button:has-text("Alumno"), label:has-text("Alumno"), [data-registration-type="alumno"]'
    );
    await page.click('button:has-text("Continuar"), button:has-text("Next")');

    // B12 datos UNAM
    await page.fill(
      'input[name="numeroCuenta"], input[placeholder*="número"]',
      NUMERO_CUENTA!
    );
    const academicLevel = page
      .locator('select[name="academicLevel"], select[name="nivel"]')
      .first();
    if (await academicLevel.isVisible()) {
      await academicLevel.selectOption({ label: /Licenciatura/i });
    }
    await page.click('button:has-text("Continuar"), button:has-text("Next")');

    // B14-B17 interests / skills / goals / connections — optional, click through
    for (let i = 0; i < 4; i++) {
      const nextBtn = page
        .locator(
          'button:has-text("Continuar"), button:has-text("Next"), button:has-text("Saltar"), button:has-text("Skip")'
        )
        .first();
      if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nextBtn.click();
      }
    }

    // B18 OnboardingComplete + redirect dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.locator('body')).toContainText(
      /pendiente|pending|completaste|completed/i
    );
  });

  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set E2E_QA_ADMIN_EMAIL + E2E_QA_ADMIN_PASSWORD for admin steps'
  );

  test('B19-B25 admin approval + member upgrade', async ({ browser }) => {
    // Nueva sesión limpia para admin
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();

    // Login admin
    await adminPage.goto('/es/login');
    await adminPage.fill('input[type="email"]', ADMIN_EMAIL!);
    await adminPage.fill('input[type="password"]', ADMIN_PASSWORD!);
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForURL(/\/dashboard/);

    // B20 ir al admin panel con filtro pending
    await adminPage.goto('/es/dashboard/admin');

    // Verificar el pending badge nuevo (Phase 0 #2)
    const pendingTile = adminPage.locator(
      'a[href*="status=pending"], [class*="pending"]:has-text("pendiente")'
    );
    await expect(pendingTile.first()).toBeVisible({ timeout: 10000 });

    // B21 click al user pending
    await adminPage.click('a[href*="status=pending"]');
    await adminPage.waitForURL(/users/);

    const userRow = adminPage.locator(`text=${EMAIL!}`).first();
    await expect(userRow).toBeVisible({ timeout: 10000 });
    await userRow.click();

    // B22 aprobar
    await adminPage.click(
      'button:has-text("Aprobar"), button:has-text("Approve")'
    );
    await adminPage.click(
      'button:has-text("Confirmar"), button:has-text("Confirm")'
    );

    await adminCtx.close();

    // B24 — el user debería recibir email "aprobado" (Phase 0 #3).
    // Manual validation required:
    test.info().annotations.push({
      type: 'TODO-manual-validation',
      description: `Verificar manualmente que ${EMAIL} recibe email "Tu solicitud fue aprobada"`,
    });

    // B25 user recarga + ve MEMBER tier
    const userPage = await browser.newContext();
    const page = await userPage.newPage();
    await page.goto('/es/login');
    await page.fill('input[type="email"]', EMAIL!);
    await page.fill('input[type="password"]', PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    // Settings → Cuentas debe mostrar alternate email section (members-only)
    await page.goto('/es/dashboard/settings');
    await page.click('button:has-text("Cuentas"), a:has-text("Cuentas")');
    await expect(page.locator('text=/correo alterno|alternate email/i')).toBeVisible({
      timeout: 5000,
    });

    await userPage.close();
  });
});
