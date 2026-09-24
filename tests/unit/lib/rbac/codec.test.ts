import { describe, it, expect } from 'vitest';
import { encodePermissions, decodePermissions } from '@/lib/rbac/codec';
import type { PermissionGrant } from '@/lib/rbac/types';
import { RESOURCES, OPERATIONS } from '@/lib/rbac/types';

describe('Permission Codec', () => {
  describe('encodePermissions', () => {
    it('TC-rbac-codec-001: encodes a single allow grant', () => {
      /** Verifies: AC-encode-single */
      const grants: PermissionGrant[] = [
        {
          resource: 'events',
          operation: 'create',
          scope: 'all',
          effect: 'allow',
        },
      ];
      expect(encodePermissions(grants)).toBe('ev:c.a');
    });

    it('TC-rbac-codec-002: encodes multiple grants comma-separated', () => {
      /** Verifies: AC-encode-multiple */
      const grants: PermissionGrant[] = [
        {
          resource: 'events',
          operation: 'view',
          scope: 'all',
          effect: 'allow',
        },
        {
          resource: 'jobs',
          operation: 'create',
          scope: 'own',
          effect: 'allow',
        },
      ];
      const encoded = encodePermissions(grants);
      expect(encoded).toBe('ev:v.a,jo:c.o');
    });

    it('TC-rbac-codec-003: encodes a deny grant with ! prefix', () => {
      /** Verifies: AC-encode-deny */
      const grants: PermissionGrant[] = [
        {
          resource: 'forums',
          operation: 'delete',
          scope: 'all',
          effect: 'deny',
        },
      ];
      expect(encodePermissions(grants)).toBe('!fo:d.a');
    });

    it('TC-rbac-codec-004: compresses resource wildcard when all 8 ops on one resource', () => {
      /** Verifies: AC-encode-resource-wildcard */
      const grants: PermissionGrant[] = OPERATIONS.map((op) => ({
        resource: 'events' as const,
        operation: op,
        scope: 'all' as const,
        effect: 'allow' as const,
      }));
      expect(encodePermissions(grants)).toBe('ev:*.a');
    });

    it('TC-rbac-codec-005: compresses full wildcard for super-admin (all resources x all ops)', () => {
      /** Verifies: AC-encode-full-wildcard */
      const grants: PermissionGrant[] = [];
      for (const resource of RESOURCES) {
        for (const op of OPERATIONS) {
          grants.push({
            resource,
            operation: op,
            scope: 'all',
            effect: 'allow',
          });
        }
      }
      expect(encodePermissions(grants)).toBe('*:*.a');
    });

    it('TC-rbac-codec-006: compresses operation wildcard when all resources have same op+scope', () => {
      /** Verifies: AC-encode-op-wildcard */
      const grants: PermissionGrant[] = RESOURCES.map((resource) => ({
        resource,
        operation: 'view' as const,
        scope: 'all' as const,
        effect: 'allow' as const,
      }));
      expect(encodePermissions(grants)).toBe('*:v.a');
    });

    it('TC-rbac-codec-007: returns empty string for empty array', () => {
      /** Verifies: AC-encode-empty */
      expect(encodePermissions([])).toBe('');
    });

    it('TC-rbac-codec-008: mixes compressed and individual grants', () => {
      /** Verifies: AC-encode-mixed */
      const grants: PermissionGrant[] = [
        // All ops on events (should compress to ev:*.a)
        ...OPERATIONS.map((op) => ({
          resource: 'events' as const,
          operation: op,
          scope: 'all' as const,
          effect: 'allow' as const,
        })),
        // Single grant on jobs
        { resource: 'jobs', operation: 'view', scope: 'own', effect: 'allow' },
      ];
      const encoded = encodePermissions(grants);
      expect(encoded).toContain('ev:*.a');
      expect(encoded).toContain('jo:v.o');
    });

    it('TC-rbac-codec-009: is deterministic (same input produces same output)', () => {
      /** Verifies: AC-encode-deterministic */
      const grants: PermissionGrant[] = [
        {
          resource: 'events',
          operation: 'create',
          scope: 'all',
          effect: 'allow',
        },
        { resource: 'jobs', operation: 'view', scope: 'own', effect: 'allow' },
        {
          resource: 'forums',
          operation: 'delete',
          scope: 'all',
          effect: 'deny',
        },
      ];
      const result1 = encodePermissions(grants);
      const result2 = encodePermissions(grants);
      expect(result1).toBe(result2);
    });

    it('TC-rbac-codec-010: separates allow and deny grants correctly', () => {
      /** Verifies: AC-encode-mixed-effects */
      const grants: PermissionGrant[] = [
        {
          resource: 'events',
          operation: 'view',
          scope: 'all',
          effect: 'allow',
        },
        {
          resource: 'events',
          operation: 'delete',
          scope: 'all',
          effect: 'deny',
        },
      ];
      const encoded = encodePermissions(grants);
      expect(encoded).toContain('ev:v.a');
      expect(encoded).toContain('!ev:d.a');
    });

    it('TC-rbac-codec-011: does not compress across different scopes', () => {
      /** Verifies: AC-encode-no-cross-scope-compression */
      const grants: PermissionGrant[] = [
        {
          resource: 'events',
          operation: 'view',
          scope: 'all',
          effect: 'allow',
        },
        {
          resource: 'events',
          operation: 'create',
          scope: 'own',
          effect: 'allow',
        },
      ];
      const encoded = encodePermissions(grants);
      // Should NOT compress to ev:*.a or ev:*.o because scopes differ
      expect(encoded).not.toContain('ev:*');
      expect(encoded).toContain('ev:v.a');
      expect(encoded).toContain('ev:c.o');
    });

    it('TC-rbac-codec-012: does not compress across different effects', () => {
      /** Verifies: AC-encode-no-cross-effect-compression */
      const grants: PermissionGrant[] = OPERATIONS.map((op, i) => ({
        resource: 'events' as const,
        operation: op,
        scope: 'all' as const,
        effect: (i === 0 ? 'deny' : 'allow') as PermissionGrant['effect'],
      }));
      const encoded = encodePermissions(grants);
      // Should NOT compress because effects differ
      expect(encoded).not.toBe('ev:*.a');
    });
  });

  describe('decodePermissions', () => {
    it('TC-rbac-codec-020: decodes a single allow grant', () => {
      /** Verifies: AC-decode-single */
      const result = decodePermissions('ev:c.a');
      expect(result.allows).toHaveLength(1);
      expect(result.allows[0]).toEqual({
        resource: 'events',
        operation: 'create',
        scope: 'all',
      });
      expect(result.denies).toHaveLength(0);
      expect(result.wildcards).toHaveLength(0);
    });

    it('TC-rbac-codec-021: decodes a deny grant', () => {
      /** Verifies: AC-decode-deny */
      const result = decodePermissions('!fo:d.a');
      expect(result.denies).toHaveLength(1);
      expect(result.denies[0]).toEqual({
        resource: 'forums',
        operation: 'delete',
        scope: 'all',
      });
      expect(result.allows).toHaveLength(0);
    });

    it('TC-rbac-codec-022: decodes multiple grants', () => {
      /** Verifies: AC-decode-multiple */
      const result = decodePermissions('ev:v.a,jo:c.o');
      expect(result.allows).toHaveLength(2);
      expect(result.allows[0]).toEqual({
        resource: 'events',
        operation: 'view',
        scope: 'all',
      });
      expect(result.allows[1]).toEqual({
        resource: 'jobs',
        operation: 'create',
        scope: 'own',
      });
    });

    it('TC-rbac-codec-023: decodes full wildcard into wildcards array', () => {
      /** Verifies: AC-decode-full-wildcard */
      const result = decodePermissions('*:*.a');
      expect(result.wildcards).toHaveLength(1);
      expect(result.wildcards[0]).toEqual({
        resource: '*',
        operation: '*',
        scope: 'all',
        effect: 'allow',
      });
      expect(result.allows).toHaveLength(0);
      expect(result.denies).toHaveLength(0);
    });

    it('TC-rbac-codec-024: decodes resource wildcard into wildcards array', () => {
      /** Verifies: AC-decode-resource-wildcard */
      const result = decodePermissions('ev:*.a');
      expect(result.wildcards).toHaveLength(1);
      expect(result.wildcards[0]).toEqual({
        resource: 'events',
        operation: '*',
        scope: 'all',
        effect: 'allow',
      });
    });

    it('TC-rbac-codec-025: decodes operation wildcard into wildcards array', () => {
      /** Verifies: AC-decode-op-wildcard */
      const result = decodePermissions('*:v.a');
      expect(result.wildcards).toHaveLength(1);
      expect(result.wildcards[0]).toEqual({
        resource: '*',
        operation: 'view',
        scope: 'all',
        effect: 'allow',
      });
    });

    it('TC-rbac-codec-026: returns empty arrays for empty string', () => {
      /** Verifies: AC-decode-empty */
      const result = decodePermissions('');
      expect(result.allows).toHaveLength(0);
      expect(result.denies).toHaveLength(0);
      expect(result.wildcards).toHaveLength(0);
    });

    it('TC-rbac-codec-027: decodes mixed allows, denies, and wildcards', () => {
      /** Verifies: AC-decode-mixed */
      const result = decodePermissions('ev:v.a,!fo:d.a,*:*.o');
      expect(result.allows).toHaveLength(1);
      expect(result.denies).toHaveLength(1);
      expect(result.wildcards).toHaveLength(1);
      expect(result.allows[0].resource).toBe('events');
      expect(result.denies[0].resource).toBe('forums');
      expect(result.wildcards[0].resource).toBe('*');
    });

    it('TC-rbac-codec-028: decodes deny wildcard', () => {
      /** Verifies: AC-decode-deny-wildcard */
      const result = decodePermissions('!ev:*.a');
      expect(result.wildcards).toHaveLength(1);
      expect(result.wildcards[0]).toEqual({
        resource: 'events',
        operation: '*',
        scope: 'all',
        effect: 'deny',
      });
    });
  });

  describe('round-trip consistency', () => {
    it('TC-rbac-codec-030: encode then decode single grant', () => {
      /** Verifies: AC-roundtrip-single */
      const grants: PermissionGrant[] = [
        {
          resource: 'events',
          operation: 'create',
          scope: 'all',
          effect: 'allow',
        },
      ];
      const encoded = encodePermissions(grants);
      const decoded = decodePermissions(encoded);
      expect(decoded.allows).toHaveLength(1);
      expect(decoded.allows[0]).toEqual({
        resource: 'events',
        operation: 'create',
        scope: 'all',
      });
    });

    it('TC-rbac-codec-031: encode then decode multiple grants', () => {
      /** Verifies: AC-roundtrip-multiple */
      const grants: PermissionGrant[] = [
        {
          resource: 'events',
          operation: 'view',
          scope: 'all',
          effect: 'allow',
        },
        {
          resource: 'jobs',
          operation: 'create',
          scope: 'own',
          effect: 'allow',
        },
        {
          resource: 'forums',
          operation: 'delete',
          scope: 'all',
          effect: 'deny',
        },
      ];
      const encoded = encodePermissions(grants);
      const decoded = decodePermissions(encoded);
      expect(decoded.allows).toHaveLength(2);
      expect(decoded.denies).toHaveLength(1);
    });

    it('TC-rbac-codec-032: encode then decode super-admin', () => {
      /** Verifies: AC-roundtrip-superadmin */
      const grants: PermissionGrant[] = [];
      for (const resource of RESOURCES) {
        for (const op of OPERATIONS) {
          grants.push({
            resource,
            operation: op,
            scope: 'all',
            effect: 'allow',
          });
        }
      }
      const encoded = encodePermissions(grants);
      expect(encoded).toBe('*:*.a');
      const decoded = decodePermissions(encoded);
      expect(decoded.wildcards).toHaveLength(1);
      expect(decoded.wildcards[0]).toEqual({
        resource: '*',
        operation: '*',
        scope: 'all',
        effect: 'allow',
      });
    });

    it('TC-rbac-codec-033: encode then decode resource wildcard', () => {
      /** Verifies: AC-roundtrip-resource-wildcard */
      const grants: PermissionGrant[] = OPERATIONS.map((op) => ({
        resource: 'events' as const,
        operation: op,
        scope: 'all' as const,
        effect: 'allow' as const,
      }));
      const encoded = encodePermissions(grants);
      expect(encoded).toBe('ev:*.a');
      const decoded = decodePermissions(encoded);
      expect(decoded.wildcards).toHaveLength(1);
      expect(decoded.wildcards[0].resource).toBe('events');
      expect(decoded.wildcards[0].operation).toBe('*');
    });

    it('TC-rbac-codec-034: encoded super-admin fits in 1KB', () => {
      /** Verifies: AC-size-constraint */
      const grants: PermissionGrant[] = [];
      for (const resource of RESOURCES) {
        for (const op of OPERATIONS) {
          grants.push({
            resource,
            operation: op,
            scope: 'all',
            effect: 'allow',
          });
        }
      }
      const encoded = encodePermissions(grants);
      const bytes = new TextEncoder().encode(encoded).length;
      expect(bytes).toBeLessThanOrEqual(1024);
    });
  });
});
