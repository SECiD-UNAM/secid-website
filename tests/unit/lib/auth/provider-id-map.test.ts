import { describe, it, expect } from 'vitest';
import {
  PROVIDER_ID_MAP,
  toFirebaseProviderId,
  fromFirebaseProviderId,
} from '@/lib/auth/provider-id-map';

/**
 * TC-PROVIDER-001: Provider ID mapping utilities
 * Verifies: AC-PROVIDER-001 — toFirebaseProviderId returns the correct Firebase provider ID
 * Verifies: AC-PROVIDER-002 — fromFirebaseProviderId returns the correct short name
 * Verifies: AC-PROVIDER-003 — unknown Firebase provider IDs return undefined
 */

describe('PROVIDER_ID_MAP', () => {
  it('maps all supported providers to their Firebase IDs', () => {
    expect(PROVIDER_ID_MAP.google).toBe('google.com');
    expect(PROVIDER_ID_MAP.github).toBe('github.com');
    expect(PROVIDER_ID_MAP.linkedin).toBe('linkedin.com');
  });

  it('covers all three supported providers', () => {
    expect(Object.keys(PROVIDER_ID_MAP)).toHaveLength(3);
  });
});

describe('toFirebaseProviderId', () => {
  /**
   * TC-PROVIDER-002: google short name maps to google.com
   * Verifies: AC-PROVIDER-001
   */
  it('returns google.com for google', () => {
    expect(toFirebaseProviderId('google')).toBe('google.com');
  });

  /**
   * TC-PROVIDER-003: github short name maps to github.com
   * Verifies: AC-PROVIDER-001
   */
  it('returns github.com for github', () => {
    expect(toFirebaseProviderId('github')).toBe('github.com');
  });

  /**
   * TC-PROVIDER-004: linkedin short name maps to linkedin.com
   * Verifies: AC-PROVIDER-001
   */
  it('returns linkedin.com for linkedin', () => {
    expect(toFirebaseProviderId('linkedin')).toBe('linkedin.com');
  });
});

describe('fromFirebaseProviderId', () => {
  /**
   * TC-PROVIDER-005: google.com reverse maps to google
   * Verifies: AC-PROVIDER-002
   */
  it('returns google for google.com', () => {
    expect(fromFirebaseProviderId('google.com')).toBe('google');
  });

  /**
   * TC-PROVIDER-006: github.com reverse maps to github
   * Verifies: AC-PROVIDER-002
   */
  it('returns github for github.com', () => {
    expect(fromFirebaseProviderId('github.com')).toBe('github');
  });

  /**
   * TC-PROVIDER-007: linkedin.com reverse maps to linkedin
   * Verifies: AC-PROVIDER-002
   */
  it('returns linkedin for linkedin.com', () => {
    expect(fromFirebaseProviderId('linkedin.com')).toBe('linkedin');
  });

  /**
   * TC-PROVIDER-008: unknown Firebase provider ID returns undefined
   * Verifies: AC-PROVIDER-003
   */
  it('returns undefined for an unknown Firebase provider ID', () => {
    expect(fromFirebaseProviderId('facebook.com')).toBeUndefined();
    expect(fromFirebaseProviderId('twitter.com')).toBeUndefined();
    expect(fromFirebaseProviderId('')).toBeUndefined();
  });

  /**
   * TC-PROVIDER-009: short name alone does not reverse map
   * Verifies: AC-PROVIDER-003 — only Firebase IDs (with .com) are valid reverse keys
   */
  it('returns undefined for a short name passed as Firebase provider ID', () => {
    expect(fromFirebaseProviderId('google')).toBeUndefined();
    expect(fromFirebaseProviderId('github')).toBeUndefined();
    expect(fromFirebaseProviderId('linkedin')).toBeUndefined();
  });
});
