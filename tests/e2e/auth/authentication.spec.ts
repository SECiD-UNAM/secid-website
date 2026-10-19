import { test, expect } from '@playwright/test';
import {
  SEEDED,
  login,
  expectMemberDashboard,
  sidebar,
  waitForIsland,
} from '../../utils/session';

/**
 * Session lifecycle with the seeded member against the Auth emulator:
 * login landing, session persistence, both logout paths, returnUrl and the
 * "remember me" prefill. Form validation and the wrong-password message
 * live in tests/e2e/auth.spec.ts and journey-F-login-and-reset.spec.ts.
 *
 * Components: src/components/auth/LoginForm.tsx, ProtectedRoute.tsx,
 * AuthNavButtons.tsx, src/components/dashboard/DashboardSidebar.tsx.
 */
test.describe('Authentication — member session', () => {
  test('login lands on the member dashboard with the user menu', async ({
    page,
  }) => {
    await login(page, SEEDED.member);

    await expect(page).toHaveURL(/\/es\/dashboard\/?$/);
    await expectMemberDashboard(page);
    // Navbar avatar shows the profile initials (AuthNavButtons.getInitials).
    const userMenu = page.getByRole('button', { name: 'Menú de usuario' });
    await expect(userMenu).toBeVisible();
    await expect(userMenu).toHaveText('MG');
  });

  test('session survives a page reload', async ({ page }) => {
    await login(page, SEEDED.member);
    await expectMemberDashboard(page);

    await page.reload();

    await expectMemberDashboard(page);
    await expect(
      page.getByRole('heading', { name: 'Autenticación requerida' })
    ).toHaveCount(0);
  });

  test('login honors a returnUrl query parameter', async ({ page }) => {
    await login(page, SEEDED.member, { returnUrl: '/es/dashboard/profile' });

    await expect(page).toHaveURL(/\/es\/dashboard\/profile/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Mi Perfil' })
    ).toBeVisible();
  });

  test('submitting with Enter signs in', async ({ page }) => {
    await page.goto('/es/login');
    await waitForIsland(page, 'LoginForm');
    await page.fill('#email', SEEDED.member.email);
    await page.fill('#password', SEEDED.member.password);
    await page.press('#password', 'Enter');

    await page.waitForURL(/\/es\/dashboard/, { timeout: 20000 });
    await expectMemberDashboard(page);
  });

  test('logout from the sidebar ends the session', async ({ page }) => {
    await login(page, SEEDED.member);
    await expectMemberDashboard(page);

    await sidebar(page).getByRole('button', { name: 'Cerrar Sesión' }).click();

    await expect(page).toHaveURL(/\/es\/?$/);
    await expect(
      page.locator('.secid-navbar__actions a[href="/es/login"]')
    ).toBeVisible();

    // The dashboard is gated again (ProtectedRoute, no auto-redirect).
    await page.goto('/es/dashboard');
    await expect(
      page.getByRole('heading', { name: 'Autenticación requerida' })
    ).toBeVisible();
  });

  test('logout from the navbar user menu ends the session', async ({
    page,
  }) => {
    await login(page, SEEDED.member);
    await expectMemberDashboard(page);

    await page.getByRole('button', { name: 'Menú de usuario' }).click();
    await page
      .locator('.secid-navbar__actions')
      .getByRole('button', { name: 'Cerrar Sesión' })
      .click();

    await expect(page).toHaveURL(/\/es\/?$/);
    await expect(
      page.locator('.secid-navbar__actions a[href="/es/login"]')
    ).toBeVisible();
  });

  test('protected pages ask for authentication when logged out', async ({
    page,
  }) => {
    await page.goto('/es/dashboard/profile');

    await expect(
      page.getByRole('heading', { name: 'Autenticación requerida' })
    ).toBeVisible();
    const signIn = page.getByRole('link', {
      name: 'Iniciar sesión',
      exact: true,
    });
    await expect(signIn).toHaveAttribute('href', '/es/login');
    await signIn.click();
    await expect(page).toHaveURL(/\/es\/login/);
  });

  test('"Recordarme" prefills the email on the next visit', async ({
    page,
  }) => {
    await page.goto('/es/login');
    await waitForIsland(page, 'LoginForm');
    await page.fill('#email', SEEDED.member.email);
    await page.fill('#password', SEEDED.member.password);
    await page.check('#remember-me');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/es\/dashboard/, { timeout: 20000 });

    await page.goto('/es/login');
    await waitForIsland(page, 'LoginForm');

    await expect(page.locator('#email')).toHaveValue(SEEDED.member.email);
    await expect(page.locator('#remember-me')).toBeChecked();
  });

  test('password visibility toggle switches the input type', async ({
    page,
  }) => {
    await page.goto('/es/login');
    await waitForIsland(page, 'LoginForm');
    await page.fill('#password', 'secreto123');

    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
  });
});
