/**
 * src/lib/admin/members-filter.ts — `?status=` → initial filter of the
 * admin members table (the link in the "new membership request" email).
 */
import { describe, it, expect } from 'vitest';
import { parseStatusParam } from '@/lib/admin/members-filter';

describe('parseStatusParam', () => {
  it('returns an empty filter when the parameter is absent', () => {
    expect(parseStatusParam('')).toEqual(new Set());
    expect(parseStatusParam('?role=admin')).toEqual(new Set());
  });

  it('selects the status from the admin email link', () => {
    expect(parseStatusParam('?status=pending')).toEqual(new Set(['pending']));
  });

  it('accepts several statuses, trims and lower-cases them', () => {
    expect(parseStatusParam('?status=Pending,%20active')).toEqual(
      new Set(['pending', 'active'])
    );
  });

  it('drops values that are not filterable statuses', () => {
    expect(parseStatusParam('?status=pending,bogus,collaborator')).toEqual(
      new Set(['pending'])
    );
    expect(parseStatusParam('?status=bogus')).toEqual(new Set());
  });
});
