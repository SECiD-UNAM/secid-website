import { test, expect } from '@playwright/test';

/**
 * Blocking smoke: the public pages of the production build respond and
 * render their main content. No seeded users, emulators or Stripe needed.
 */
const PAGES: Array<{ path: string; title: RegExp; text: RegExp }> = [
  { path: '/es/', title: /SECiD/, text: /Sociedad de Egresados/i },
  { path: '/en/', title: /SECiD/, text: /Data Science/i },
  { path: '/es/login/', title: /Iniciar Sesión/i, text: /Correo electrónico/i },
  { path: '/es/signup/', title: /Crear Cuenta/i, text: /Crear Cuenta/i },
  { path: '/es/auth/action/', title: /SECiD/, text: /./ },
];

for (const { path, title, text } of PAGES) {
  test(`${path} responds 200 and renders`, async ({ page }) => {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), `status of ${path}`).toBe(200);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('body')).toContainText(text);
  });
}

test('unknown route returns the 404 page', async ({ page }) => {
  const response = await page.goto('/es/esta-ruta-no-existe/', {
    waitUntil: 'domcontentloaded',
  });
  expect(response?.status()).toBe(404);
});
