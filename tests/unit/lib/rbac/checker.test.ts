import { describe, it, expect } from 'vitest';
import {
  checkPermission,
  hasDeny,
  hasAllow,
  getEffectiveScope,
} from '@/lib/rbac/checker';
import { decodePermissions } from '@/lib/rbac/codec';

describe('Permission Checker', () => {
  describe('checkPermission', () => {
    it('TC-rbac-checker-001: returns true for matching allow grant', () => {
      /** Verifies: AC-check-allow */
      const perms = decodePermissions('ev:c.a');
      expect(checkPermission(perms, 'events', 'create')).toBe(true);
    });

    it('TC-rbac-checker-002: returns false for missing grant', () => {
      /** Verifies: AC-check-missing */
      const perms = decodePermissions('ev:c.a');
      expect(checkPermission(perms, 'events', 'delete')).toBe(false);
    });

    it('TC-rbac-checker-003: returns false when denied even if also allowed', () => {
      /** Verifies: AC-check-deny-overrides-allow */
      const perms = decodePermissions('ev:c.a,!ev:c.a');
      expect(checkPermission(perms, 'events', 'create')).toBe(false);
    });

    it('TC-rbac-checker-004: requiredScope all rejects own-scoped grant', () => {
      /** Verifies: AC-check-scope-all-rejects-own */
      const perms = decodePermissions('ev:c.o');
      expect(checkPermission(perms, 'events', 'create', 'all')).toBe(false);
    });

    it('TC-rbac-checker-005: requiredScope own accepts all-scoped grant', () => {
      /** Verifies: AC-check-scope-own-accepts-all */
      const perms = decodePermissions('ev:c.a');
      expect(checkPermission(perms, 'events', 'create', 'own')).toBe(true);
    });

    it('TC-rbac-checker-006: omitted requiredScope accepts all-scoped grant', () => {
      /** Verifies: AC-check-scope-omitted-accepts-all */
      const perms = decodePermissions('ev:c.a');
      expect(checkPermission(perms, 'events', 'create')).toBe(true);
    });

    it('TC-rbac-checker-007: omitted requiredScope accepts own-scoped grant', () => {
      /** Verifies: AC-check-scope-omitted-accepts-own */
      const perms = decodePermissions('ev:c.o');
      expect(checkPermission(perms, 'events', 'create')).toBe(true);
    });

    it('TC-rbac-checker-008: full wildcard grants everything', () => {
      /** Verifies: AC-check-full-wildcard */
      const perms = decodePermissions('*:*.a');
      expect(checkPermission(perms, 'events', 'create')).toBe(true);
      expect(checkPermission(perms, 'jobs', 'delete')).toBe(true);
      expect(checkPermission(perms, 'forums', 'moderate')).toBe(true);
      expect(checkPermission(perms, 'users', 'assign')).toBe(true);
    });

    it('TC-rbac-checker-009: resource wildcard grants all ops on that resource only', () => {
      /** Verifies: AC-check-resource-wildcard */
      const perms = decodePermissions('ev:*.a');
      expect(checkPermission(perms, 'events', 'create')).toBe(true);
      expect(checkPermission(perms, 'events', 'delete')).toBe(true);
      expect(checkPermission(perms, 'events', 'view')).toBe(true);
      expect(checkPermission(perms, 'jobs', 'create')).toBe(false);
    });

    it('TC-rbac-checker-010: operation wildcard grants that op on all resources only', () => {
      /** Verifies: AC-check-op-wildcard */
      const perms = decodePermissions('*:v.a');
      expect(checkPermission(perms, 'events', 'view')).toBe(true);
      expect(checkPermission(perms, 'jobs', 'view')).toBe(true);
      expect(checkPermission(perms, 'forums', 'view')).toBe(true);
      expect(checkPermission(perms, 'events', 'create')).toBe(false);
    });

    it('TC-rbac-checker-011: deny wildcard blocks even when explicit allow exists', () => {
      /** Verifies: AC-check-deny-wildcard-blocks */
      const perms = decodePermissions('ev:c.a,!ev:*.a');
      expect(checkPermission(perms, 'events', 'create')).toBe(false);
    });

    it('TC-rbac-checker-012: full deny wildcard blocks everything', () => {
      /** Verifies: AC-check-full-deny-wildcard */
      const perms = decodePermissions('ev:c.a,!*:*.a');
      expect(checkPermission(perms, 'events', 'create')).toBe(false);
      expect(checkPermission(perms, 'jobs', 'view')).toBe(false);
    });

    it('TC-rbac-checker-013: returns false for empty permissions', () => {
      /** Verifies: AC-check-empty */
      const perms = decodePermissions('');
      expect(checkPermission(perms, 'events', 'create')).toBe(false);
    });

    it('TC-rbac-checker-014: wildcard scope matching respects requiredScope', () => {
      /** Verifies: AC-check-wildcard-scope */
      const perms = decodePermissions('*:*.o');
      expect(checkPermission(perms, 'events', 'create', 'own')).toBe(true);
      expect(checkPermission(perms, 'events', 'create', 'all')).toBe(false);
    });

    it('TC-rbac-checker-015: operation wildcard deny blocks specific operation', () => {
      /** Verifies: AC-check-op-wildcard-deny */
      const perms = decodePermissions('ev:v.a,!*:v.a');
      expect(checkPermission(perms, 'events', 'view')).toBe(false);
    });
  });

  describe('hasDeny', () => {
    it('TC-rbac-checker-020: returns true for exact deny match', () => {
      /** Verifies: AC-hasdeny-exact */
      const perms = decodePermissions('!ev:c.a');
      expect(hasDeny(perms, 'events', 'create')).toBe(true);
    });

    it('TC-rbac-checker-021: returns false when no deny exists', () => {
      /** Verifies: AC-hasdeny-none */
      const perms = decodePermissions('ev:c.a');
      expect(hasDeny(perms, 'events', 'create')).toBe(false);
    });

    it('TC-rbac-checker-022: returns true for deny wildcard match on resource', () => {
      /** Verifies: AC-hasdeny-resource-wildcard */
      const perms = decodePermissions('!ev:*.a');
      expect(hasDeny(perms, 'events', 'create')).toBe(true);
      expect(hasDeny(perms, 'events', 'view')).toBe(true);
    });

    it('TC-rbac-checker-023: returns true for deny wildcard match on operation', () => {
      /** Verifies: AC-hasdeny-op-wildcard */
      const perms = decodePermissions('!*:v.a');
      expect(hasDeny(perms, 'events', 'view')).toBe(true);
      expect(hasDeny(perms, 'jobs', 'view')).toBe(true);
    });

    it('TC-rbac-checker-024: returns true for full deny wildcard', () => {
      /** Verifies: AC-hasdeny-full-wildcard */
      const perms = decodePermissions('!*:*.a');
      expect(hasDeny(perms, 'events', 'create')).toBe(true);
    });

    it('TC-rbac-checker-025: does not match deny for different resource', () => {
      /** Verifies: AC-hasdeny-different-resource */
      const perms = decodePermissions('!ev:c.a');
      expect(hasDeny(perms, 'jobs', 'create')).toBe(false);
    });
  });

  describe('hasAllow', () => {
    it('TC-rbac-checker-030: returns true for exact allow match', () => {
      /** Verifies: AC-hasallow-exact */
      const perms = decodePermissions('ev:c.a');
      expect(hasAllow(perms, 'events', 'create')).toBe(true);
    });

    it('TC-rbac-checker-031: returns false when no allow exists', () => {
      /** Verifies: AC-hasallow-none */
      const perms = decodePermissions('!ev:c.a');
      expect(hasAllow(perms, 'events', 'create')).toBe(false);
    });

    it('TC-rbac-checker-032: returns true for allow wildcard match', () => {
      /** Verifies: AC-hasallow-wildcard */
      const perms = decodePermissions('ev:*.a');
      expect(hasAllow(perms, 'events', 'create')).toBe(true);
    });

    it('TC-rbac-checker-033: respects requiredScope for exact grants', () => {
      /** Verifies: AC-hasallow-scope */
      const perms = decodePermissions('ev:c.o');
      expect(hasAllow(perms, 'events', 'create', 'own')).toBe(true);
      expect(hasAllow(perms, 'events', 'create', 'all')).toBe(false);
    });

    it('TC-rbac-checker-034: all-scoped grant satisfies own requiredScope', () => {
      /** Verifies: AC-hasallow-all-satisfies-own */
      const perms = decodePermissions('ev:c.a');
      expect(hasAllow(perms, 'events', 'create', 'own')).toBe(true);
    });

    it('TC-rbac-checker-035: respects requiredScope for wildcard grants', () => {
      /** Verifies: AC-hasallow-wildcard-scope */
      const perms = decodePermissions('*:*.o');
      expect(hasAllow(perms, 'events', 'create', 'own')).toBe(true);
      expect(hasAllow(perms, 'events', 'create', 'all')).toBe(false);
    });
  });

  describe('getEffectiveScope', () => {
    it('TC-rbac-checker-040: returns all for all-scoped grant', () => {
      /** Verifies: AC-scope-all */
      const perms = decodePermissions('ev:c.a');
      expect(getEffectiveScope(perms, 'events', 'create')).toBe('all');
    });

    it('TC-rbac-checker-041: returns own for own-scoped grant', () => {
      /** Verifies: AC-scope-own */
      const perms = decodePermissions('ev:c.o');
      expect(getEffectiveScope(perms, 'events', 'create')).toBe('own');
    });

    it('TC-rbac-checker-042: returns null for no grant', () => {
      /** Verifies: AC-scope-null */
      const perms = decodePermissions('ev:c.a');
      expect(getEffectiveScope(perms, 'events', 'delete')).toBeNull();
    });

    it('TC-rbac-checker-043: returns null for empty permissions', () => {
      /** Verifies: AC-scope-empty */
      const perms = decodePermissions('');
      expect(getEffectiveScope(perms, 'events', 'create')).toBeNull();
    });

    it('TC-rbac-checker-044: returns all when both own and all grants exist', () => {
      /** Verifies: AC-scope-broadest */
      const perms = decodePermissions('ev:c.o,ev:c.a');
      expect(getEffectiveScope(perms, 'events', 'create')).toBe('all');
    });

    it('TC-rbac-checker-045: uses wildcard scope when no exact grant exists', () => {
      /** Verifies: AC-scope-wildcard */
      const perms = decodePermissions('*:*.a');
      expect(getEffectiveScope(perms, 'events', 'create')).toBe('all');
    });

    it('TC-rbac-checker-046: returns broadest scope across exact and wildcard', () => {
      /** Verifies: AC-scope-broadest-mixed */
      const perms = decodePermissions('ev:c.o,*:*.a');
      expect(getEffectiveScope(perms, 'events', 'create')).toBe('all');
    });

    it('TC-rbac-checker-047: returns null when permission is denied', () => {
      /** Verifies: AC-scope-denied */
      const perms = decodePermissions('ev:c.a,!ev:c.a');
      expect(getEffectiveScope(perms, 'events', 'create')).toBeNull();
    });

    it('TC-rbac-checker-048: resource wildcard provides scope', () => {
      /** Verifies: AC-scope-resource-wildcard */
      const perms = decodePermissions('ev:*.o');
      expect(getEffectiveScope(perms, 'events', 'create')).toBe('own');
    });

    it('TC-rbac-checker-049: operation wildcard provides scope', () => {
      /** Verifies: AC-scope-op-wildcard */
      const perms = decodePermissions('*:v.a');
      expect(getEffectiveScope(perms, 'events', 'view')).toBe('all');
    });

    it('TC-rbac-checker-050: all-scoped exact grant is not downgraded by own-scoped wildcard', () => {
      /** Verifies: AC-scope-no-downgrade */
      const perms = decodePermissions('ev:c.a,*:*.o');
      expect(getEffectiveScope(perms, 'events', 'create')).toBe('all');
    });
  });
});
