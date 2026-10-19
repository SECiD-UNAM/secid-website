import { test, expect } from '@playwright/test';
import {
  SEEDED,
  login,
  expectMemberDashboard,
  sidebar,
} from '../utils/session';

/**
 * Member dashboard navigation with the seeded (fully verified) member:
 * src/components/dashboard/DashboardHomePage.tsx sections,
 * DashboardSidebar.tsx items/active state, the navbar user menu
 * (src/components/auth/AuthNavButtons.tsx) and the mobile drawer +
 * bottom nav (src/components/nav/DashboardBottomNav.tsx).
 */

const MAIN_ITEMS: [string, string][] = [
  ['Panel', '/es/dashboard'],
  ['Mi Perfil', '/es/dashboard/profile'],
  ['Empleos', '/es/dashboard/jobs'],
  ['Eventos', '/es/dashboard/events'],
  ['Foros', '/es/dashboard/forums'],
  ['Mentoría', '/es/dashboard/mentorship'],
  ['Recursos', '/es/dashboard/resources'],
  ['Miembros', '/es/dashboard/members'],
  ['Red de Empresas', '/es/dashboard/companies'],
  ['Salarios', '/es/dashboard/salary-insights'],
  ['Configuración', '/es/dashboard/settings'],
];

test.describe('Dashboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, SEEDED.member);
    await expectMemberDashboard(page);
  });

  test('home page renders its sections', async ({ page }) => {
    for (const stat of [
      'Aplicaciones Enviadas',
      'Eventos Registrados',
      'Conexiones',
      'Perfil Completo',
    ]) {
      await expect(page.getByText(stat, { exact: true })).toBeVisible({
        timeout: 15000,
      });
    }
    for (const section of [
      'Actividad Reciente',
      'Trabajos Recomendados',
      'Próximos Eventos',
    ]) {
      await expect(
        page.getByRole('heading', { level: 2, name: section })
      ).toBeVisible();
    }
  });

  test('sidebar lists every main section unlocked for a verified member', async ({
    page,
  }) => {
    const nav = sidebar(page);
    for (const [name, href] of MAIN_ITEMS) {
      const link = nav.getByRole('link', { name, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', href);
    }
    await expect(nav.getByText('(Membresía requerida)')).toHaveCount(0);
    await expect(nav.getByText('(Verifica tu correo)')).toHaveCount(0);
    // Content/admin groups need other roles.
    await expect(nav.getByText('Contenido', { exact: true })).toHaveCount(0);
    await expect(nav.getByText('Administración', { exact: true })).toHaveCount(
      0
    );
  });

  test('sidebar links open the member pages', async ({ page }) => {
    const pages: [string, RegExp, string][] = [
      ['Empleos', /\/es\/dashboard\/jobs/, 'Bolsa de Trabajo'],
      ['Eventos', /\/es\/dashboard\/events/, 'Eventos'],
      ['Miembros', /\/es\/dashboard\/members/, 'Directorio de Miembros'],
      ['Mi Perfil', /\/es\/dashboard\/profile/, 'Mi Perfil'],
      ['Configuración', /\/es\/dashboard\/settings/, 'Configuracion'],
    ];
    for (const [name, url, heading] of pages) {
      await sidebar(page).getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL(url);
      await expect(
        page.getByRole('heading', { level: 1, name: heading, exact: true })
      ).toBeVisible({ timeout: 20000 });
    }
  });

  test('sidebar highlights the current section', async ({ page }) => {
    await page.goto('/es/dashboard/jobs');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Bolsa de Trabajo' })
    ).toBeVisible({ timeout: 20000 });

    const nav = sidebar(page);
    await expect(
      nav.getByRole('link', { name: 'Empleos', exact: true })
    ).toHaveClass(/bg-primary-100/);
    await expect(
      nav.getByRole('link', { name: 'Panel', exact: true })
    ).not.toHaveClass(/bg-primary-100/);
  });

  test('navbar user menu links back to the dashboard', async ({ page }) => {
    await page.goto('/es/dashboard/profile');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Mi Perfil' })
    ).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: 'Menú de usuario' }).click();
    await page
      .locator('.secid-navbar__actions')
      .getByRole('link', { name: 'Dashboard' })
      .click();

    await expect(page).toHaveURL(/\/es\/dashboard\/?$/);
    await expectMemberDashboard(page);
  });
});

test.describe('Dashboard navigation — mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('drawer and bottom nav replace the sidebar', async ({ page }) => {
    await login(page, SEEDED.member);
    await expectMemberDashboard(page);

    // Desktop sidebar is display:none below lg.
    await expect(sidebar(page)).toHaveCount(0);

    await page.getByRole('button', { name: 'Abrir menú lateral' }).click();
    const drawer = sidebar(page);
    await expect(drawer.getByRole('link', { name: 'Mi Perfil' })).toBeVisible();
    await expect(
      drawer.getByRole('button', { name: 'Cerrar Sesión' })
    ).toBeVisible();
    await drawer.getByRole('button', { name: 'Cerrar menú' }).click();
    await expect(sidebar(page)).toHaveCount(0);

    const bottomNav = page.getByRole('navigation', {
      name: 'Navegación móvil',
    });
    await expect(
      bottomNav.getByRole('link', { name: 'Empleos' })
    ).toBeVisible();
    await bottomNav.getByRole('link', { name: 'Empleos' }).click();
    await expect(page).toHaveURL(/\/es\/dashboard\/jobs/);
  });
});
