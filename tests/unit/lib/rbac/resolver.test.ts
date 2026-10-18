import { describe, it, expect } from 'vitest';
import { resolvePermissions } from '@/lib/rbac/resolver';
import type { RBACGroup } from '@/lib/rbac/types';

const makeGroup = (
  id: string,
  permissions: RBACGroup['permissions']
): RBACGroup => ({
  id,
  name: id,
  description: '',
  permissions,
  isSystem: false,
  createdBy: 'test',
  createdAt: null as unknown,
  updatedAt: null as unknown,
});

describe('Permission Resolver', () => {
  describe('resolvePermissions', () => {
    it('TC-rbac-resolver-001: returns empty array for no groups', () => {
      /** Verifies: AC-resolve-empty */
      expect(resolvePermissions([])).toEqual([]);
    });

    it('TC-rbac-resolver-002: merges permissions from multiple groups', () => {
      /** Verifies: AC-resolve-merge */
      const groups = [
        makeGroup('g1', [
          {
            resource: 'events',
            operation: 'view',
            scope: 'all',
            effect: 'allow',
          },
        ]),
        makeGroup('g2', [
          {
            resource: 'events',
            operation: 'create',
            scope: 'own',
            effect: 'allow',
          },
        ]),
      ];
      const result = resolvePermissions(groups);
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            resource: 'events',
            operation: 'view',
            scope: 'all',
            effect: 'allow',
          }),
          expect.objectContaining({
            resource: 'events',
            operation: 'create',
            scope: 'own',
            effect: 'allow',
          }),
        ])
      );
    });

    it('TC-rbac-resolver-003: broadens scope — own + all yields all', () => {
      /** Verifies: AC-resolve-scope-broaden */
      const groups = [
        makeGroup('g1', [
          {
            resource: 'events',
            operation: 'edit',
            scope: 'own',
            effect: 'allow',
          },
        ]),
        makeGroup('g2', [
          {
            resource: 'events',
            operation: 'edit',
            scope: 'all',
            effect: 'allow',
          },
        ]),
      ];
      const result = resolvePermissions(groups);
      const editGrant = result.find(
        (g) => g.resource === 'events' && g.operation === 'edit'
      );
      expect(editGrant?.scope).toBe('all');
      expect(editGrant?.effect).toBe('allow');
    });

    it('TC-rbac-resolver-004: deny beats allow on same resource+operation', () => {
      /** Verifies: AC-resolve-deny-wins */
      const groups = [
        makeGroup('g1', [
          {
            resource: 'forums',
            operation: 'delete',
            scope: 'all',
            effect: 'allow',
          },
        ]),
        makeGroup('g2', [
          {
            resource: 'forums',
            operation: 'delete',
            scope: 'all',
            effect: 'deny',
          },
        ]),
      ];
      const result = resolvePermissions(groups);
      const deleteGrant = result.find(
        (g) => g.resource === 'forums' && g.operation === 'delete'
      );
      expect(deleteGrant?.effect).toBe('deny');
    });

    it('TC-rbac-resolver-005: deduplicates identical grants from multiple groups', () => {
      /** Verifies: AC-resolve-deduplicate */
      const groups = [
        makeGroup('g1', [
          {
            resource: 'events',
            operation: 'view',
            scope: 'all',
            effect: 'allow',
          },
        ]),
        makeGroup('g2', [
          {
            resource: 'events',
            operation: 'view',
            scope: 'all',
            effect: 'allow',
          },
        ]),
      ];
      const result = resolvePermissions(groups);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          resource: 'events',
          operation: 'view',
          scope: 'all',
          effect: 'allow',
        })
      );
    });

    it('TC-rbac-resolver-006: deny broadens scope — deny own + deny all yields deny all', () => {
      /** Verifies: AC-resolve-deny-scope-broaden */
      const groups = [
        makeGroup('g1', [
          {
            resource: 'forums',
            operation: 'delete',
            scope: 'own',
            effect: 'deny',
          },
        ]),
        makeGroup('g2', [
          {
            resource: 'forums',
            operation: 'delete',
            scope: 'all',
            effect: 'deny',
          },
        ]),
      ];
      const result = resolvePermissions(groups);
      const deleteGrant = result.find(
        (g) => g.resource === 'forums' && g.operation === 'delete'
      );
      expect(deleteGrant?.effect).toBe('deny');
      expect(deleteGrant?.scope).toBe('all');
    });

    it('TC-rbac-resolver-007: deny with own scope still beats allow with all scope', () => {
      /** Verifies: AC-resolve-deny-any-scope-beats-allow */
      const groups = [
        makeGroup('g1', [
          {
            resource: 'forums',
            operation: 'moderate',
            scope: 'all',
            effect: 'allow',
          },
        ]),
        makeGroup('g2', [
          {
            resource: 'forums',
            operation: 'moderate',
            scope: 'own',
            effect: 'deny',
          },
        ]),
      ];
      const result = resolvePermissions(groups);
      const modGrant = result.find(
        (g) => g.resource === 'forums' && g.operation === 'moderate'
      );
      expect(modGrant?.effect).toBe('deny');
    });

    it('TC-rbac-resolver-008: single group passes through unchanged', () => {
      /** Verifies: AC-resolve-single-passthrough */
      const permissions = [
        {
          resource: 'events' as const,
          operation: 'view' as const,
          scope: 'all' as const,
          effect: 'allow' as const,
        },
        {
          resource: 'events' as const,
          operation: 'create' as const,
          scope: 'own' as const,
          effect: 'allow' as const,
        },
        {
          resource: 'forums' as const,
          operation: 'delete' as const,
          scope: 'all' as const,
          effect: 'deny' as const,
        },
      ];
      const groups = [makeGroup('g1', permissions)];
      const result = resolvePermissions(groups);
      expect(result).toHaveLength(3);
      for (const perm of permissions) {
        expect(result).toEqual(
          expect.arrayContaining([expect.objectContaining(perm)])
        );
      }
    });

    it('TC-rbac-resolver-009: mixed effects across many groups with scope broadening', () => {
      /** Verifies: AC-resolve-complex-merge */
      const groups = [
        makeGroup('g1', [
          {
            resource: 'events',
            operation: 'view',
            scope: 'own',
            effect: 'allow',
          },
          {
            resource: 'jobs',
            operation: 'create',
            scope: 'own',
            effect: 'allow',
          },
        ]),
        makeGroup('g2', [
          {
            resource: 'events',
            operation: 'view',
            scope: 'all',
            effect: 'allow',
          },
          {
            resource: 'jobs',
            operation: 'create',
            scope: 'all',
            effect: 'deny',
          },
        ]),
        makeGroup('g3', [
          {
            resource: 'blog',
            operation: 'edit',
            scope: 'own',
            effect: 'allow',
          },
        ]),
      ];
      const result = resolvePermissions(groups);

      // events.view: allow own + allow all -> allow all
      const eventsView = result.find(
        (g) => g.resource === 'events' && g.operation === 'view'
      );
      expect(eventsView).toEqual(
        expect.objectContaining({ scope: 'all', effect: 'allow' })
      );

      // jobs.create: allow own + deny all -> deny (deny wins regardless of scope)
      const jobsCreate = result.find(
        (g) => g.resource === 'jobs' && g.operation === 'create'
      );
      expect(jobsCreate?.effect).toBe('deny');

      // blog.edit: single grant passes through
      const blogEdit = result.find(
        (g) => g.resource === 'blog' && g.operation === 'edit'
      );
      expect(blogEdit).toEqual(
        expect.objectContaining({ scope: 'own', effect: 'allow' })
      );

      expect(result).toHaveLength(3);
    });

    it('TC-rbac-resolver-010: groups with empty permissions array are harmless', () => {
      /** Verifies: AC-resolve-empty-group */
      const groups = [
        makeGroup('g1', []),
        makeGroup('g2', [
          {
            resource: 'events',
            operation: 'view',
            scope: 'all',
            effect: 'allow',
          },
        ]),
        makeGroup('g3', []),
      ];
      const result = resolvePermissions(groups);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          resource: 'events',
          operation: 'view',
          scope: 'all',
          effect: 'allow',
        })
      );
    });

    it('TC-rbac-resolver-011: deny broadens from own to all across groups', () => {
      /** Verifies: AC-resolve-deny-scope-own-then-all */
      const groups = [
        makeGroup('g1', [
          {
            resource: 'users',
            operation: 'delete',
            scope: 'own',
            effect: 'deny',
          },
        ]),
        makeGroup('g2', [
          {
            resource: 'users',
            operation: 'delete',
            scope: 'all',
            effect: 'deny',
          },
        ]),
      ];
      const result = resolvePermissions(groups);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          resource: 'users',
          operation: 'delete',
          scope: 'all',
          effect: 'deny',
        })
      );
    });

    it('TC-rbac-resolver-012: allow broadens from own to all across groups', () => {
      /** Verifies: AC-resolve-allow-scope-own-then-all */
      const groups = [
        makeGroup('g1', [
          {
            resource: 'blog',
            operation: 'publish',
            scope: 'own',
            effect: 'allow',
          },
        ]),
        makeGroup('g2', [
          {
            resource: 'blog',
            operation: 'publish',
            scope: 'all',
            effect: 'allow',
          },
        ]),
      ];
      const result = resolvePermissions(groups);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          resource: 'blog',
          operation: 'publish',
          scope: 'all',
          effect: 'allow',
        })
      );
    });

    it('TC-rbac-resolver-013: deny with broadest scope is emitted when deny exists', () => {
      /** Verifies: AC-resolve-deny-broadest-scope-emitted */
      const groups = [
        makeGroup('g1', [
          {
            resource: 'settings',
            operation: 'edit',
            scope: 'own',
            effect: 'deny',
          },
          {
            resource: 'settings',
            operation: 'edit',
            scope: 'all',
            effect: 'allow',
          },
        ]),
      ];
      const result = resolvePermissions(groups);
      const settingsEdit = result.find(
        (g) => g.resource === 'settings' && g.operation === 'edit'
      );
      expect(settingsEdit?.effect).toBe('deny');
      expect(settingsEdit?.scope).toBe('own');
    });
  });
});
