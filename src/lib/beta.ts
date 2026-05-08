/**
 * Beta environment detection and feature flagging.
 *
 * Both secid.mx and beta.secid.mx serve the same static build.
 * Beta detection happens client-side by checking window.location.hostname,
 * or server-side by checking the Host request header.
 */

/**
 * Registry of beta features. Set a feature to `true` to restrict it to beta only.
 * Set to `false` (or remove) to graduate it to production.
 */
export const BETA_FEATURES = {
  hub: false,
  gamification: true,
  messaging: true,
  learningPaths: true,
} as const;

export type BetaFeatureId = keyof typeof BETA_FEATURES;

export const BETA_HOSTNAMES = ['beta.secid.mx', 'beta.localhost'];

/**
 * Routes that are restricted to beta environments.
 * Update this map whenever a new beta-only page is added.
 * Keys are pathname substrings; values are the corresponding feature flag.
 */
export const BETA_ROUTES: Record<string, BetaFeatureId> = {
  '/dashboard/messages': 'messaging',
  '/dashboard/progress': 'gamification',
  '/dashboard/learning': 'learningPaths',
};

/**
 * Returns true if the current hostname is a beta environment.
 * Returns false during SSR/build (no `window`).
 */
export function isBetaEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return BETA_HOSTNAMES.includes(window.location.hostname);
}

/**
 * Server-side beta detection using the Host request header.
 * Use this in Astro middleware instead of isBetaEnvironment().
 */
export function isHostBeta(host: string): boolean {
  const hostname = host.split(':')[0] ?? host;
  return BETA_HOSTNAMES.includes(hostname);
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
