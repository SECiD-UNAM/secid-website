import type { Page } from '@playwright/test';

/**
 * Clear cookies and web storage for the page's context.
 *
 * `localStorage` is only readable once the page has an http(s) origin:
 * `page.evaluate(() => localStorage.clear())` on `about:blank` throws
 * "SecurityError: Failed to read the 'localStorage' property from 'Window'"
 * (141 failures in the 2026-10 CI run, all from `beforeEach` hooks that ran
 * before the first `page.goto`). Cookies are cleared through the context,
 * which needs no origin; web storage only after a real navigation.
 */
export async function clearBrowserStorage(page: Page): Promise<void> {
  await page.context().clearCookies();
  if (!/^https?:/.test(page.url())) return;
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
