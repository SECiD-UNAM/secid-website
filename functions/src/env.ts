// Shared environment helpers for Cloud Functions.
// Keep production failures loud — silently falling back to a beta or default
// URL leaks links pointing at the wrong environment.

function isEmulator(): boolean {
  return (
    process.env.FUNCTIONS_EMULATOR === 'true' ||
    !!process.env.FIREBASE_EMULATOR_HUB
  );
}

/**
 * Absolute base URL for user-visible links sent from Cloud Functions
 * (verification emails, OAuth callbacks, deep links). Required in prod.
 *
 * `fallback` is only used in the local emulator. In a deployed environment
 * (no FUNCTIONS_EMULATOR), missing APP_URL throws — silently pointing
 * verification emails at the wrong domain is worse than failing the call.
 */
export function getAppUrl(fallback = 'https://beta.secid.mx'): string {
  const fromEnv = process.env.APP_URL;
  if (fromEnv) return fromEnv;
  if (isEmulator()) return fallback;
  throw new Error(
    'APP_URL env var is required for this function in production. Set it via firebase functions:config or process env.'
  );
}
