import type { MemberStatus } from '@/types/member';

/**
 * Lifecycle statuses the admin members table can filter by. Mirrors the
 * options offered in the UI; anything else in the URL is ignored.
 */
export const FILTERABLE_MEMBER_STATUSES: readonly MemberStatus[] = [
  'active',
  'inactive',
  'suspended',
  'pending',
  'alumni',
];

/**
 * Parse the `?status=` query parameter into the initial status filter.
 *
 * The admin notification emails link to
 * `/dashboard/admin/members?status=pending`; without this the table
 * ignored the parameter and showed every member. Accepts a comma
 * separated list, trims, lower-cases and drops unknown values.
 */
export function parseStatusParam(search: string): Set<MemberStatus> {
  const raw = new URLSearchParams(search).get('status');
  if (!raw) return new Set();
  const wanted = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is MemberStatus =>
      (FILTERABLE_MEMBER_STATUSES as readonly string[]).includes(s)
    );
  return new Set(wanted);
}
