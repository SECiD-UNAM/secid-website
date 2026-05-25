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
 * Trusted Origins allowlist for HTTPS callable CORS.
 *
 * History of this list (each iteration discovered the prior one was too
 * permissive — both surfaced during the user-journey QA pass §10.3):
 *   v1: [/secid\.mx$/, /secid\.org$/, 'localhost']
 *        Un-anchored — matches "https://evil.com/?leak=secid.mx".
 *   v2: [/^https:\/\/(?:[a-z0-9-]+\.)?secid\.mx$/, ...]
 *        Anchored at scheme + host BUT the optional subdomain group
 *        matches ANY first-level subdomain — including "attacker.secid.mx"
 *        if an attacker can stand one up (or convince DNS).
 *   v3 (here): explicit literal allowlist of the known-good origins. No
 *        wildcard subdomains. New env (e.g. "alpha.secid.mx") needs an
 *        explicit add — that's the point.
 */
export const ALLOWED_CALLABLE_ORIGINS: (string | RegExp)[] = [
  'https://secid.mx',
  'https://www.secid.mx',
  'https://beta.secid.mx',
  'https://secid.org',
  'https://www.secid.org',
  /^http:\/\/localhost(?::\d+)?$/,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
];

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
