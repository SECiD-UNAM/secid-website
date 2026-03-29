import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * TC-route-id-001: useRouteId hook extracts ID from URL pathname
 * Verifies: dynamic route pages can read the entity ID client-side
 */

// We test the pure extraction functions, not the React hook (avoids needing React test renderer for pure logic)
// The hook itself is a thin wrapper around extractRouteId.

describe('extractRouteId', () => {
  let extractRouteId: typeof import('@/hooks/use-route-id').extractRouteId;

  beforeEach(async () => {
    const mod = await import('@/hooks/use-route-id');
    extractRouteId = mod.extractRouteId;
  });

  it('extracts the last path segment as the ID', () => {
    expect(extractRouteId('/es/dashboard/admin/groups/abc123')).toBe('abc123');
  });

  it('handles trailing slashes', () => {
    expect(extractRouteId('/es/dashboard/admin/groups/abc123/')).toBe(
      'abc123'
    );
  });

  it('returns null for empty path', () => {
    expect(extractRouteId('')).toBeNull();
    expect(extractRouteId('/')).toBeNull();
  });

  it('extracts ID from nested edit paths', () => {
    expect(extractRouteId('/es/dashboard/events/edit/evt-999')).toBe(
      'evt-999'
    );
  });

  it('handles paths with only a locale segment', () => {
    expect(extractRouteId('/es')).toBe('es');
    expect(extractRouteId('/es/')).toBe('es');
  });

  it('works with English locale paths', () => {
    expect(extractRouteId('/en/dashboard/journal-club/session-42')).toBe(
      'session-42'
    );
  });
});

describe('extractRouteIdBySegment', () => {
  let extractRouteIdBySegment: typeof import('@/hooks/use-route-id').extractRouteIdBySegment;

  beforeEach(async () => {
    const mod = await import('@/hooks/use-route-id');
    extractRouteIdBySegment = mod.extractRouteIdBySegment;
  });

  it('extracts the segment after the given key', () => {
    expect(
      extractRouteIdBySegment('/es/dashboard/admin/groups/abc123', 'groups')
    ).toBe('abc123');
  });

  it('returns null when the key is not found', () => {
    expect(
      extractRouteIdBySegment('/es/dashboard/events/abc123', 'groups')
    ).toBeNull();
  });

  it('returns null when the key is the last segment', () => {
    expect(
      extractRouteIdBySegment('/es/dashboard/admin/groups', 'groups')
    ).toBeNull();
  });

  it('skips known non-ID segments like "edit"', () => {
    expect(
      extractRouteIdBySegment(
        '/es/dashboard/admin/groups/edit/abc123',
        'groups'
      )
    ).toBe('abc123');
  });

  it('handles trailing slashes', () => {
    expect(
      extractRouteIdBySegment('/es/dashboard/events/evt-1/', 'events')
    ).toBe('evt-1');
  });

  it('works for journal-club paths', () => {
    expect(
      extractRouteIdBySegment(
        '/en/dashboard/journal-club/session-42',
        'journal-club'
      )
    ).toBe('session-42');
  });

  it('works for edit sub-paths', () => {
    expect(
      extractRouteIdBySegment(
        '/en/dashboard/journal-club/edit/session-42',
        'journal-club'
      )
    ).toBe('session-42');
  });
});
