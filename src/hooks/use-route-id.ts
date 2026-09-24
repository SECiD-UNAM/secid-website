import { useMemo } from 'react';

/**
 * Known non-ID path segments that should be skipped when looking
 * for an entity identifier after a resource key.
 */
const SKIP_SEGMENTS = new Set(['edit', 'new', 'detail', 'profile']);

/**
 * Extract the last meaningful path segment from a pathname.
 * Useful when the route structure guarantees the ID is the final segment.
 *
 * @example extractRouteId('/es/dashboard/admin/groups/abc123') => 'abc123'
 */
export function extractRouteId(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  const last = segments[segments.length - 1];
  return last ?? null;
}

/**
 * Extract the entity ID that appears after a known resource key in the path.
 * Skips known non-ID segments like "edit" and "new".
 *
 * @example extractRouteIdBySegment('/es/dashboard/admin/groups/edit/abc123', 'groups') => 'abc123'
 * @example extractRouteIdBySegment('/es/dashboard/events/evt-1', 'events') => 'evt-1'
 */
export function extractRouteIdBySegment(
  pathname: string,
  segmentKey: string
): string | null {
  const segments = pathname.split('/').filter(Boolean);
  const keyIndex = segments.indexOf(segmentKey);
  if (keyIndex < 0) return null;

  for (let i = keyIndex + 1; i < segments.length; i++) {
    const segment = segments[i];
    if (segment && !SKIP_SEGMENTS.has(segment)) {
      return segment;
    }
  }
  return null;
}

/**
 * React hook that extracts the last path segment as an entity ID.
 * Use this in components rendered on static catchall pages served
 * via Firebase Hosting rewrites.
 *
 * @returns The extracted ID, or null if not in a browser or path is empty.
 */
export function useRouteId(): string | null {
  return useMemo(() => {
    if (typeof window === 'undefined') return null;
    return extractRouteId(window.location.pathname);
  }, []);
}

/**
 * React hook that extracts an entity ID after a known segment key in the URL.
 * Preferred when the ID is NOT the last segment or when you need more precision.
 *
 * @param segmentKey - The URL segment preceding the ID (e.g., 'groups', 'events')
 * @returns The extracted ID, or null if not found.
 */
export function useRouteIdBySegment(segmentKey: string): string | null {
  return useMemo(() => {
    if (typeof window === 'undefined') return null;
    return extractRouteIdBySegment(window.location.pathname, segmentKey);
  }, [segmentKey]);
}
