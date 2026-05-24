// Shared environment helpers for Cloud Functions.
//
// Why this exists: silently falling back to a hardcoded beta or default URL
// is bug B1 from the SECiD codebase health audit — if prod deploys ever
// forget APP_URL, users would receive verification emails pointing at
// beta.secid.mx. The original code did `process.env.APP_URL || 'https://...'`,
// so the bug never surfaced.

function isEmulator(): boolean {
  return (
    process.env.FUNCTIONS_EMULATOR === 'true' ||
    !!process.env.FIREBASE_EMULATOR_HUB
  );
}

let warned = false;

/**
 * Absolute base URL for user-visible links sent from Cloud Functions
 * (verification emails, OAuth callbacks, deep links).
 *
 * Behavior:
 *   - APP_URL set            → use it.
 *   - APP_URL missing + emu  → fallback silently (dev ergonomics).
 *   - APP_URL missing + prod → fallback BUT log a loud warning every cold
 *     start. We do NOT throw — throwing would brick callable endpoints on
 *     any environment that hasn't been migrated to set APP_URL yet. The
 *     warning is the operational signal.
 */
export function getAppUrl(fallback = 'https://beta.secid.mx'): string {
  const fromEnv = process.env.APP_URL;
  if (fromEnv) return fromEnv;
  if (!isEmulator() && !warned) {
    warned = true;
    console.warn(
      `[env] APP_URL not set in production env; falling back to ${fallback}. ` +
        `User-visible links will point at the fallback domain — set APP_URL in the function runtime config.`
    );
  }
  return fallback;
}
