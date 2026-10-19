import { test, expect, type Page } from '@playwright/test';
import {
  SEEDED,
  login,
  expectMemberDashboard,
  sidebar,
  memberRow,
  statusSelect,
} from '../../utils/session';

/**
 * Admin area against the emulators: the role guard
 * (src/components/auth/ProtectedRoute.tsx via DashboardLayout
 * requireRole), the admin landing (src/components/admin/AdminDashboard.tsx)
 * and the members table (src/components/dashboard/admin/AdminMembersTable.tsx:
 * search, status pills, inline "Estado" change through updateMemberStatus).
 * The pending-approval tile is covered by journey-Q; the full
 * signup → approve path by journey-B.
 */

/** The number rendered right under a stats-card label in AdminDashboard. */
function statValue(page: Page, label: string) {
  return page
    .getByText(label, { exact: true })
    .locator('xpath=following-sibling::p[1] | following-sibling::div[1]/p[1]')
    .first();
}

async function expectMembersLoaded(page: Page) {
  await expect(page.getByText(/^Mostrando \d+ de \d+ miembros$/)).toBeVisible({
    timeout: 20000,
  });
}

/**
 * updateMemberStatus writes through the Firestore SDK with no UI
 * confirmation beyond a short row highlight, so persistence is checked by
 * reloading until the fresh query reflects the new value.
 */
async function expectPersistedStatus(
  page: Page,
  email: string,
  status: string
) {
  await expect
    .poll(
      async () => {
        await page.reload();
        await expectMembersLoaded(page);
        return statusSelect(page, email).inputValue();
      },
      { timeout: 30000, intervals: [1000, 2000, 3000] }
    )
    .toBe(status);
}

test.describe('Admin — access control', () => {
  test('logged-out visitors are asked to sign in', async ({ page }) => {
    await page.goto('/es/dashboard/admin');

    await expect(
      page.getByRole('heading', { name: 'Autenticación requerida' })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Iniciar sesión', exact: true })
    ).toHaveAttribute('href', '/es/login');
  });

  test('a member is denied the admin landing and the members table', async ({
    page,
  }) => {
    await login(page, SEEDED.member);
    await expectMemberDashboard(page);

    for (const path of ['/es/dashboard/admin', '/es/dashboard/admin/members']) {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { name: 'Acceso denegado' })
      ).toBeVisible({ timeout: 20000 });
      await expect(
        page.getByRole('link', { name: 'Ir al panel' })
      ).toHaveAttribute('href', '/es/dashboard');
      await expect(page.getByText('Panel de Administración')).toHaveCount(0);
    }
  });

  test('the sidebar admin section is only rendered for admins', async ({
    page,
  }) => {
    // DashboardSidebar hides the section behind a display-only toggle
    // (sessionStorage "secid-admin-mode"); the role check is what matters.
    await page.addInitScript(() =>
      sessionStorage.setItem('secid-admin-mode', 'true')
    );

    await login(page, SEEDED.member);
    await expectMemberDashboard(page);
    await expect(sidebar(page).getByText('Administración')).toHaveCount(0);
    await expect(
      sidebar(page).getByRole('link', { name: 'Gestión Miembros' })
    ).toHaveCount(0);

    await sidebar(page).getByRole('button', { name: 'Cerrar Sesión' }).click();
    await expect(page).toHaveURL(/\/es\/?$/);

    await login(page, SEEDED.admin);
    await expectMemberDashboard(page);
    await expect(sidebar(page).getByText('Administración')).toBeVisible();
    for (const name of [
      'Panel Admin',
      'Gestión Miembros',
      'Empresas',
      'Grupos',
    ]) {
      await expect(
        sidebar(page).getByRole('link', { name, exact: true })
      ).toBeVisible();
    }
  });
});

test.describe('Admin — dashboard and members', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, SEEDED.admin);
  });

  test('admin landing shows the platform stats', async ({ page }) => {
    await page.goto('/es/dashboard/admin');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Panel de Administración' })
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Bienvenido de vuelta, Admin')).toBeVisible();
    await expect(
      page.getByText(/Estado del Sistema: (Bueno|Advertencia|Crítico)/)
    ).toBeVisible();

    // The seed creates four accounts; journey-B may add more.
    await expect(statValue(page, 'Usuarios Totales')).toHaveText(/^\d+$/);
    const totalUsers = Number(
      await statValue(page, 'Usuarios Totales').textContent()
    );
    expect(totalUsers).toBeGreaterThanOrEqual(4);
    // Three seeded jobs, all active.
    await expect(statValue(page, 'Empleos Activos')).toHaveText('3');
  });

  test('admin pages render behind the guard', async ({ page }) => {
    const pages: [string, string][] = [
      ['/es/dashboard/admin/companies', 'Gestion de Empresas'],
      ['/es/dashboard/admin/groups', 'Grupos de Permisos'],
      ['/es/dashboard/admin/salary', 'Datos Salariales'],
    ];
    for (const [path, heading] of pages) {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { level: 1, name: heading })
      ).toBeVisible({ timeout: 20000 });
      await expect(page.getByText('Acceso denegado')).toHaveCount(0);
    }
  });

  test('members table lists the seeded accounts with their status', async ({
    page,
  }) => {
    await page.goto('/es/dashboard/admin/members');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Gestión de Miembros' })
    ).toBeVisible();
    await expectMembersLoaded(page);

    for (const account of [SEEDED.member, SEEDED.member2, SEEDED.admin]) {
      const row = memberRow(page, account.email);
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(account.displayName);
      await expect(statusSelect(page, account.email)).toHaveValue('active');
    }
    await expect(
      memberRow(page, SEEDED.admin.email).locator('select').first()
    ).toHaveValue('admin');
  });

  test('search narrows the table by email', async ({ page }) => {
    await page.goto('/es/dashboard/admin/members');
    await expectMembersLoaded(page);

    await page.getByRole('searchbox').fill('member2');

    await expect(memberRow(page, SEEDED.member2.email)).toHaveCount(1);
    await expect(memberRow(page, SEEDED.member.email)).toHaveCount(0);
    await expect(memberRow(page, SEEDED.admin.email)).toHaveCount(0);
  });

  test('status pills filter the table', async ({ page }) => {
    await page.goto('/es/dashboard/admin/members');
    await expectMembersLoaded(page);

    // Nobody is suspended in the seed (and no test suspends anyone).
    await page.getByRole('button', { name: 'Suspendido', exact: true }).click();
    await expect(page.getByText('No se encontraron miembros')).toBeVisible();

    // Pills are OR-ed: adding "Activo" brings the seeded members back.
    await page.getByRole('button', { name: 'Activo', exact: true }).click();
    await expect(memberRow(page, SEEDED.member.email)).toHaveCount(1);
    await expect(memberRow(page, SEEDED.admin.email)).toHaveCount(1);
  });

  test('changing a member status persists', async ({ page }) => {
    const { email } = SEEDED.member2;
    await page.goto('/es/dashboard/admin/members');
    await expectMembersLoaded(page);
    await expect(statusSelect(page, email)).toHaveValue('active');

    await statusSelect(page, email).selectOption('inactive');
    await expect(statusSelect(page, email)).toHaveValue('inactive');
    await expectPersistedStatus(page, email, 'inactive');

    // Restore the seed state ("active" also re-asserts isVerified/role).
    await statusSelect(page, email).selectOption('active');
    await expect(statusSelect(page, email)).toHaveValue('active');
    await expectPersistedStatus(page, email, 'active');
  });
});
