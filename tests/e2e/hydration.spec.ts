import { test, expect } from '@playwright/test';

/**
 * Issue #82: React islands must hydrate without mismatches on the
 * production build. Astro's HTML compression stripped the `<!-- -->`
 * text separators React emits, so the client saw different text nodes
 * (Minified React errors #425 / #418 / #423) on /es/signup.
 *
 * Runs against the same server as the rest of the suite; in CI that is
 * `astro preview` of the production build, which is where the bug lives.
 */
const HYDRATION_ERROR =
  /Minified React error #(418|423|425)|Hydration failed|did not match|hydrat/i;

for (const path of ['/es/signup', '/es/login', '/es/', '/en/signup']) {
  test(`no React hydration errors on ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && HYDRATION_ERROR.test(msg.text())) {
        errors.push(msg.text().slice(0, 160));
      }
    });
    page.on('pageerror', (err) => {
      if (HYDRATION_ERROR.test(err.message))
        errors.push(err.message.slice(0, 160));
    });

    await page.goto(path, { waitUntil: 'networkidle' });
    // Give islands time to hydrate after network idle.
    await page.waitForTimeout(1500);

    expect(errors, `hydration errors on ${path}`).toEqual([]);
  });
}
