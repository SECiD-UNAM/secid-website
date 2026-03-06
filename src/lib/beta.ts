/**
 * Beta environment detection and feature flagging.
 *
 * Both secid.mx and beta.secid.mx serve the same static build.
 * Beta detection happens client-side by checking window.location.hostname.
 */

/**
 * Registry of beta features. Set a feature to `true` to restrict it to beta only.
 * Set to `false` (or remove) to graduate it to production.
 */
export const BETA_FEATURES = {
  hub: true,
  gamification: true,
  messaging: true,
  learningPaths: true,
} as const;

export type BetaFeatureId = keyof typeof BETA_FEATURES;

const BETA_HOSTNAMES = ['beta.secid.mx', 'beta.localhost'];

/**
 * Returns true if the current hostname is a beta environment.
 * Returns false during SSR/build (no `window`).
 */
export function isBetaEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return BETA_HOSTNAMES.includes(window.location.hostname);
}

/**
 * Check whether a specific feature should be visible.
 * On beta: all features visible. On production: only non-beta features.
 */
export function isFeatureEnabled(featureId: BetaFeatureId): boolean {
  const isBeta = isBetaEnvironment();
  const requiresBeta = BETA_FEATURES[featureId];
  return isBeta || !requiresBeta;
}
