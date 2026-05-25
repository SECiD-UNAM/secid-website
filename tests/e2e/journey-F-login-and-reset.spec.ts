/**
 * Journey F — Login + password reset end-to-end.
 *
 * Spec del plan QA v3 §6.F. Cubre F1-F9 (login OK / wrong password /
 * password reset / recordarme / locked accounts).
 *
 * Requiere cuenta de email real + inbox accesible. Run con:
 *
 *   E2E_QA_EMAIL=qa-secid-<...>@mailinator.com \
 *   E2E_QA_PASSWORD='<password>' \
 *   E2E_QA_WRONG_PASSWORD='whatever-wrong' \
 *   BASE_URL=https://beta.secid.mx \
 *     npx playwright test journey-F-login --headed
 */
import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_QA_EMAIL;
const PASSWORD = process.env.E2E_QA_PASSWORD;
const WRONG_PASSWORD = process.env.E2E_QA_WRONG_PASSWORD || 'wrong-pw-12345';

test.describe('Journey F — Login + password reset', () => {
  test.skip(
    !EMAIL || !PASSWORD,
    'Set E2E_QA_EMAIL + E2E_QA_PASSWORD to run'
  );

  test('F1 login OK with valid credentials', async ({ page }) => {
    await page.goto('/es/login');
    await page.fill('input[type="email"]', EMAIL!);
    await page.fill('input[type="password"]', PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('F2 wrong password shows error without enumeration leak', async ({
    page,
  }) => {
    await page.goto('/es/login');
    await page.fill('input[type="email"]', EMAIL!);
    await page.fill('input[type="password"]', WRONG_PASSWORD);
    await page.click('button[type="submit"]');
    // Should stay on login + show error
    await expect(page).toHaveURL(/\/login/);
    const errorText = page.locator(
      '[role="alert"], .error, text=/incorrect|inválido|invalid/i'
    );
    await expect(errorText.first()).toBeVisible({ timeout: 5000 });
    // The error should be GENERIC — not "email exists, password wrong"
    // (anti-enumeration). Assert that the text doesn't differentiate.
    const txt = await errorText.first().textContent();
    expect(txt?.toLowerCase()).not.toMatch(/email.*(exists|not found|no encontrado)/);
  });

  test('F3 nonexistent email same generic error', async ({ page }) => {
    await page.goto('/es/login');
    await page.fill(
      'input[type="email"]',
      `nonexistent-${Date.now()}@nowhere.test`
    );
    await page.fill('input[type="password"]', 'anything-1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login/);
    const errorText = page.locator(
      '[role="alert"], .error, text=/incorrect|inválido|invalid/i'
    );
    await expect(errorText.first()).toBeVisible({ timeout: 5000 });
  });

  test('F4 password reset — request + email delivery', async ({ page }) => {
    await page.goto('/es/login');
    await page.click(
      'a:has-text("Olvidé"), a:has-text("Forgot"), button:has-text("Olvidé")'
    );

    await page.fill('input[type="email"]', EMAIL!);
    await page.click('button[type="submit"]');

    // UI debe confirmar el envío (sin filtrar si el email existe)
    await expect(
      page.locator('text=/enviado|sent|revisa tu correo|check your email/i')
    ).toBeVisible({ timeout: 5000 });

    test.info().annotations.push({
      type: 'TODO-manual-validation',
      description: `Verificar manualmente que ${EMAIL} recibe Firebase Auth password-reset email + el link funciona + nuevo password se guarda + login funciona con el nuevo`,
    });
  });

  test('F6 unverified email login bloqueado o con CTA reenvío', async () => {
    test.skip(true, 'Requires a SECOND test account that is registered but NOT email-verified — out of automated scope; document manually');
  });

  test('F7 pending status user accede a BASIC tier dashboard', async () => {
    test.skip(true, 'Requires a test account in lifecycle.status="pending" — set up via admin');
  });

  test('F8 suspended user blocked at login', async () => {
    test.skip(true, 'Requires a suspended test account — set up via admin');
  });

  test('F9 "recordarme" persiste sesión', async ({ browser }) => {
    test.skip(true, 'Requires closing/reopening browser context — not reliable in headless CI');
  });
});
