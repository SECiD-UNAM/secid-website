import { test, expect, type Page } from '@playwright/test';
import { SEEDED, login } from '../utils/session';

/**
 * Member directory: /es/dashboard/members mounts
 * src/components/dashboard/members/MemberDashboard.tsx (Resumen / Miembros /
 * Análisis tabs; MembersTab is a searchable table of the seeded alumni
 * profiles). The public profile /es/members/{slug} is served by the Firebase
 * Hosting rewrite to members/detail (firebase.json).
 *
 * Of the four seeded accounts only the two alumni (member1, member2) are
 * listed; admin and company accounts are not alumni profiles.
 */
const MARIA = 'María García';
const CARLOS = 'Carlos Rodríguez';

function row(page: Page, name: string) {
  return page.getByRole('row', { name: new RegExp(`^${name} `) });
}

function search(page: Page) {
  return page.getByRole('textbox', { name: 'Buscar miembros' });
}

async function openMembersTab(page: Page) {
  await page.goto('/es/dashboard/members');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Directorio de Miembros' })
  ).toBeVisible({ timeout: 20000 });
  await page
    .getByRole('button', { name: 'Miembros', exact: true })
    .click({ timeout: 20000 });
  await expect(search(page)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/^Mostrando \d+ de \d+ miembros/)).toBeVisible({
    timeout: 20000,
  });
}

test.describe('Member directory', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, SEEDED.member);
  });

  test('overview tab shows the member totals', async ({ page }) => {
    await page.goto('/es/dashboard/members');
    await expect(page.getByText('Total de miembros')).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText('Habilidad principal')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Composicion por campus' })
    ).toBeVisible();
  });

  test('lists the seeded alumni', async ({ page }) => {
    await openMembersTab(page);
    await expect(row(page, MARIA)).toBeVisible();
    await expect(row(page, MARIA)).toContainText('Tech Corp');
    await expect(row(page, CARLOS)).toBeVisible();
    await expect(row(page, CARLOS)).toContainText('Data Solutions Inc');
    await expect(page.getByRole('row', { name: /Admin User/ })).toHaveCount(0);
    await expect(page.getByRole('row', { name: /HR TechCorp/ })).toHaveCount(0);
  });

  test('search filters by name or skill and clears back', async ({ page }) => {
    await openMembersTab(page);

    await search(page).fill('Carlos');
    await expect(page.getByText(/^Mostrando 1 de \d+ miembros/)).toBeVisible();
    await expect(row(page, CARLOS)).toBeVisible();
    await expect(row(page, MARIA)).toHaveCount(0);

    await search(page).fill('TensorFlow');
    await expect(row(page, MARIA)).toBeVisible();
    await expect(row(page, CARLOS)).toHaveCount(0);

    await page.getByRole('button', { name: 'Limpiar búsqueda' }).click();
    await expect(search(page)).toHaveValue('');
    await expect(
      page.getByText(/^Mostrando \d+ de \d+ miembros/)
    ).toBeVisible();
  });

  test('a search with no match shows the empty message', async ({ page }) => {
    await openMembersTab(page);
    await search(page).fill('zzz-nobody');
    await expect(
      page.getByText('No hay miembros que coincidan con los filtros actuales')
    ).toBeVisible();
    await expect(page.getByText(/^Mostrando 0 de \d+ miembros/)).toBeVisible();
  });

  test('filters panel opens with its options', async ({ page }) => {
    await openMembersTab(page);
    await page.getByRole('button', { name: 'Filtros' }).click();
    for (const name of [
      'Incluir colaboradores',
      'Solo en línea',
      'Disponible para mentoría',
    ]) {
      await expect(page.getByRole('checkbox', { name })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Empresa' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Habilidades' })
    ).toBeVisible();
  });

  test('expanding a row shows the profile summary and links', async ({
    page,
  }) => {
    await openMembersTab(page);
    await row(page, CARLOS).click();

    const details = page.getByRole('row', {
      name: /^Nombre: Carlos Rodríguez/,
    });
    await expect(details).toBeVisible();
    await expect(details).toContainText('ML Engineer');
    await expect(details).toContainText('Kubernetes');
    await expect(
      details.getByRole('link', { name: 'Ver perfil' })
    ).toHaveAttribute('href', '/es/members/carlos-rodriguez');
    await expect(details.getByRole('link', { name: 'Ver CV' })).toHaveAttribute(
      'href',
      '/es/members/carlos-rodriguez/cv'
    );

    await row(page, CARLOS).click();
    await expect(details).toHaveCount(0);
  });

  test('"Ver perfil" opens the public member profile', async ({ page }) => {
    await openMembersTab(page);
    await row(page, CARLOS).click();
    await page.getByRole('link', { name: 'Ver perfil' }).click();

    await expect(page).toHaveURL(/\/es\/members\/carlos-rodriguez/);
    const profile = page.getByRole('article', { name: `Perfil de ${CARLOS}` });
    await expect(profile).toBeVisible({ timeout: 20000 });
    await expect(
      profile.getByRole('heading', { level: 1, name: CARLOS })
    ).toBeVisible();
    await expect(profile.getByText('ML Engineer').first()).toBeVisible();
    await expect(
      profile.getByRole('list', { name: 'Habilidades' })
    ).toContainText('Spark');
    await expect(profile.getByRole('link', { name: 'Ver CV' })).toHaveAttribute(
      'href',
      '/es/members/carlos-rodriguez/cv'
    );
  });
});
