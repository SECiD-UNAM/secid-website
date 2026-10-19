import { expect, type Page } from '@playwright/test';

/**
 * Accounts that scripts/seed-emulator.js creates in the Auth/Firestore
 * emulators. The env vars are the ones CI sets (see .github/workflows/ci.yml
 * "e2e"); the defaults mirror the seed so a local
 * `firebase emulators:exec "npm run seed && npx playwright test"` works
 * without exporting anything.
 */
export interface Credentials {
  email: string;
  password: string;
  displayName: string;
}

export const SEEDED = {
  member: {
    email: process.env.E2E_QA_EMAIL || 'member1@alumno.unam.mx',
    password: process.env.E2E_QA_PASSWORD || 'member123456',
    displayName: 'María García',
  },
  // Only the admin status-change test touches this account.
  member2: {
    email: 'member2@alumno.unam.mx',
    password: 'member123456',
    displayName: 'Carlos Rodríguez',
  },
  admin: {
    email: process.env.E2E_QA_ADMIN_EMAIL || 'admin@secid.mx',
    password: process.env.E2E_QA_ADMIN_PASSWORD || 'admin123456',
    displayName: 'Admin User',
  },
} satisfies Record<string, Credentials>;

export const DASHBOARD_WELCOME = 'Bienvenido al Panel de Miembros';

/**
 * Wait until a `client:load` React island has hydrated. Astro renders the
 * form server-side with an `ssr` attribute on its `<astro-island>` and
 * removes it once the component mounts; typing or submitting before that
 * hits the static markup (a native submit reloads `/es/login?email=…` and
 * the test then waits forever for the dashboard).
 */
export async function waitForIsland(
  page: Page,
  componentExport: string
): Promise<void> {
  await page
    .locator(`astro-island[component-export="${componentExport}"]:not([ssr])`)
    .waitFor({ state: 'attached', timeout: 20000 });
}

/**
 * Sign in through src/components/auth/LoginForm.tsx (inputs by id, no
 * data-testid). The form redirects to `/es/dashboard` or to `returnUrl`.
 * The Auth emulator round-trip plus the post-login Firestore reads can
 * take a few seconds, hence the generous timeout.
 */
export async function login(
  page: Page,
  { email, password }: Pick<Credentials, 'email' | 'password'>,
  options: { returnUrl?: string } = {}
): Promise<void> {
  const query = options.returnUrl
    ? `?returnUrl=${encodeURIComponent(options.returnUrl)}`
    : '';
  await page.goto(`/es/login${query}`);
  await waitForIsland(page, 'LoginForm');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/es\/dashboard/, { timeout: 20000 });
}

/** Wait until DashboardShell has resolved the session and rendered. */
export async function expectMemberDashboard(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { level: 1, name: DASHBOARD_WELCOME })
  ).toBeVisible({ timeout: 20000 });
}

/**
 * The desktop sidebar (`<aside>` → role "complementary"); the mobile
 * drawer is only mounted while open, so this resolves to a single element
 * at the default 1280px viewport.
 */
export function sidebar(page: Page) {
  return page.getByRole('complementary');
}

/**
 * Member rows in src/components/dashboard/admin/AdminMembersTable.tsx are
 * plain `<tr>`s; the email cell is the stable handle.
 */
export function memberRow(page: Page, email: string) {
  return page.locator('tbody tr', { hasText: email });
}

/** The lifecycle-status `<select>` (column "Estado") of a member row. */
export function statusSelect(page: Page, email: string) {
  return memberRow(page, email).locator('select:has(option[value="active"])');
}
