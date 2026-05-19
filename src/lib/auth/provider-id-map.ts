import type { SupportedProvider } from '@/types/user';

/**
 * Mapping between short provider names ('google') and Firebase provider IDs ('google.com').
 * Firebase's `unlink()` and related APIs require the full domain-style ID.
 */
export const PROVIDER_ID_MAP: Record<SupportedProvider, string> = {
  google: 'google.com',
  github: 'github.com',
  linkedin: 'linkedin.com',
} as const;

const REVERSE_MAP: Record<string, SupportedProvider> = Object.fromEntries(
  Object.entries(PROVIDER_ID_MAP).map(([k, v]) => [v, k as SupportedProvider])
);

/**
 * Convert a short provider name to the Firebase provider ID format.
 *
 * @example toFirebaseProviderId('google') === 'google.com'
 */
export function toFirebaseProviderId(provider: SupportedProvider): string {
  return PROVIDER_ID_MAP[provider];
}

/**
 * Convert a Firebase provider ID back to the short provider name.
 * Returns `undefined` for unrecognised Firebase provider IDs.
 *
 * @example fromFirebaseProviderId('linkedin.com') === 'linkedin'
 */
export function fromFirebaseProviderId(
  firebaseId: string
): SupportedProvider | undefined {
  return REVERSE_MAP[firebaseId];
}
