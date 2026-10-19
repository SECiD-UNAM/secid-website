import { test, expect } from '@playwright/test';
import { SEEDED, login } from '../utils/session';

/**
 * Community: forums (src/components/forums/ForumHome.tsx on
 * /es/dashboard/forums and /es/forum, ForumPost on /es/forum/new-topic,
 * ForumSearch on /es/forum/search) and the mentorship dashboard
 * (src/components/mentorship/MentorshipDashboard.tsx on
 * /es/dashboard/mentorship).
 *
 * src/lib/forum.ts reads `forum_categories` / `forum_topics`, which have no
 * rule in firestore.rules, so ForumHome falls back to its six built-in
 * categories and shows no topics; creating a topic is therefore not
 * exercised here. The seeded member has no mentor/mentee profile, which is
 * the state the mentorship tests assert.
 */
const CATEGORIES = [
  ['Consejos de Carrera', 'career-advice'],
  ['Discusión Técnica', 'technical-discussion'],
  ['Noticias de la Industria', 'industry-news'],
  ['Oportunidades Laborales', 'job-opportunities'],
  ['Networking', 'networking'],
  ['Discusión General', 'general-discussion'],
] as const;

test.describe('Forums', () => {
  test('dashboard forum home lists the built-in categories', async ({
    page,
  }) => {
    await login(page, SEEDED.member);
    await page.goto('/es/dashboard/forums');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Foros' })
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByRole('heading', { level: 2, name: 'Categorías' })
    ).toBeVisible({ timeout: 20000 });

    for (const [name, slug] of CATEGORIES) {
      await expect(
        page.getByRole('heading', { level: 3, name, exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: new RegExp(`^\\S* ${name} `) })
      ).toHaveAttribute('href', `/es/forum/category/${slug}`);
    }
  });

  test('forum search submits to the search page', async ({ page }) => {
    await login(page, SEEDED.member);
    await page.goto('/es/dashboard/forums');
    const search = page.getByPlaceholder('Buscar en el foro...');
    await expect(search).toBeVisible({ timeout: 20000 });
    await search.fill('python');
    await search.press('Enter');

    await expect(page).toHaveURL(/\/es\/forum\/search\/?\?q=python/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Buscar' })
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByPlaceholder('Buscar en el foro...')).toBeVisible();
  });

  test('new topic form renders its required fields', async ({ page }) => {
    await login(page, SEEDED.member);
    await page.goto('/es/forum/new-topic');
    await expect(page.getByRole('heading', { name: 'Crear Tema' })).toBeVisible(
      { timeout: 20000 }
    );
    await expect(page.getByRole('textbox', { name: 'Título *' })).toBeVisible();
    await expect(
      page.getByRole('combobox', { name: 'Categoría *' })
    ).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'Contenido *' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publicar' })).toBeVisible();
  });

  test('public forum home is readable without signing in', async ({ page }) => {
    await page.goto('/es/forum');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Categorías' })
    ).toBeVisible({ timeout: 20000 });
    for (const [name] of CATEGORIES) {
      await expect(
        page.getByRole('heading', { level: 3, name, exact: true })
      ).toBeVisible();
    }
  });
});

test.describe('Mentorship dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, SEEDED.member);
    await page.goto('/es/dashboard/mentorship');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Mentorias' })
    ).toBeVisible({ timeout: 20000 });
  });

  test('renders its tabs and the empty overview', async ({ page }) => {
    const tabs = page.getByRole('navigation', { name: 'Mentorship tabs' });
    await expect(tabs).toBeVisible({ timeout: 20000 });
    for (const name of [
      'Resumen',
      'Tus Conexiones',
      'Sesiones',
      'Perfil',
      'Buscar Mentor',
    ]) {
      await expect(tabs.getByRole('button', { name })).toBeVisible();
    }
    await expect(page.getByText('No upcoming sessions')).toBeVisible();
    await expect(page.getByText('No active matches yet')).toBeVisible();
  });

  test('profile tab offers both roles and opens the mentee form', async ({
    page,
  }) => {
    const tabs = page.getByRole('navigation', { name: 'Mentorship tabs' });
    await tabs
      .getByRole('button', { name: 'Perfil' })
      .click({ timeout: 20000 });
    await expect(
      page.getByRole('heading', { name: 'Welcome to Mentorship' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Become a Mentor/ })
    ).toBeVisible();

    await page.getByRole('button', { name: /Find a Mentor/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Create Mentee Profile' })
    ).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'Display Name *' })
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Goals *' })).toBeVisible();
  });

  test('browsing mentors is gated until a mentee profile exists', async ({
    page,
  }) => {
    const tabs = page.getByRole('navigation', { name: 'Mentorship tabs' });
    await tabs
      .getByRole('button', { name: 'Buscar Mentor' })
      .click({ timeout: 20000 });
    await expect(
      page.getByRole('heading', { name: 'Crea tu Perfil' })
    ).toBeVisible();
    await expect(
      page.getByText(
        'Necesitas crear un perfil de mentee para buscar mentores.'
      )
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Crear Perfil de Mentee' })
    ).toBeVisible();
  });
});
