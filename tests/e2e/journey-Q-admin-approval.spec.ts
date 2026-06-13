/**
 * Journey Q — Admin approval flow (Phase 0 #2 badge + member upgrade).
 *
 * Cubre §6.Q del plan QA v3 — el admin dashboard, el pending badge nuevo,
 * filtro a usuarios pendientes, aprobar, ver al user con MEMBER tier
 * después.
 *
 * Variant del journey B, pero ejecuta SOLO la mitad admin asumiendo que
 * existe un user en lifecycle.status='pending' ya.
 *
 * Run con:
 *
 *   E2E_QA_ADMIN_EMAIL=<admin> \
 *   E2E_QA_ADMIN_PASSWORD=<pw> \
 *   E2E_QA_TARGET_EMAIL=<user a aprobar — debe estar pending> \
 *   BASE_URL=https://beta.secid.mx \
 *     npx playwright test journey-Q-admin
 */
import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_QA_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_QA_ADMIN_PASSWORD;
const TARGET_EMAIL = process.env.E2E_QA_TARGET_EMAIL;

test.describe('Journey Q — Admin', () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set E2E_QA_ADMIN_EMAIL + E2E_QA_ADMIN_PASSWORD'
  );

  test('Q1 admin landing carga + pending badge visible', async ({ page }) => {
    await page.goto('/es/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL!);
    await page.fill('input[type="password"]', ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    await page.goto('/es/dashboard/admin');

    // Pending badge nuevo (Phase 0 #2)
    const pendingTile = page
      .locator(
        'a[href*="status=pending"], a:has-text("Solicitudes pendientes")'
      )
      .first();
    await expect(pendingTile).toBeVisible({ timeout: 10000 });

    // Tile cuenta debe ser >= 0 y el href correcto
    const href = await pendingTile.getAttribute('href');
    expect(href).toMatch(/status=pending/);
  });

  test('Q2 click pending badge → lista filtrada', async ({ page }) => {
    await page.goto('/es/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL!);
    await page.fill('input[type="password"]', ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    await page.goto('/es/dashboard/admin');

    await page.click('a[href*="status=pending"]');
    await page.waitForURL(/users/);
    await expect(page).toHaveURL(/users/);
  });

  test('Q3 approve target user', async ({ page }) => {
    test.skip(!TARGET_EMAIL, 'Set E2E_QA_TARGET_EMAIL to a pending user');

    await page.goto('/es/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL!);
    await page.fill('input[type="password"]', ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    await page.goto('/es/dashboard/admin?tab=users&status=pending');
    const row = page.locator(`text=${TARGET_EMAIL!}`).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.click();

    await page.click('button:has-text("Aprobar"), button:has-text("Approve")');
    // Confirmation modal
    const confirmBtn = page.locator(
      'button:has-text("Confirmar"), button:has-text("Confirm")'
    );
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Should toast or status flip
    await expect(
      page.locator('text=/aprobad|approved|miembro|member/i').first()
    ).toBeVisible({ timeout: 10000 });

    test.info().annotations.push({
      type: 'TODO-manual-validation',
      description: `Verificar (1) ${TARGET_EMAIL} recibió email "Tu solicitud fue aprobada"; (2) Google Group sync corrió — added a miembros@, removed de colaboradores@`,
    });
  });
});
