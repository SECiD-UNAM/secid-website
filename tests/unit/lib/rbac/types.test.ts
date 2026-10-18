import { describe, it, expect } from 'vitest';
import {
  RESOURCES,
  OPERATIONS,
  RESOURCE_ABBREV,
  OP_ABBREV,
  RESOURCE_FROM_ABBREV,
  OP_FROM_ABBREV,
} from '@/lib/rbac/types';
import type {
  Resource,
  Operation,
  Scope,
  Effect,
  PermissionGrant,
  RBACGroup,
  UserGroupAssignment,
  RBACAuditEntry,
} from '@/lib/rbac/types';

describe('RBAC Types', () => {
  it('TC-rbac-types-001: defines 19 resources', () => {
    expect(RESOURCES).toHaveLength(19);
    expect(RESOURCES).toContain('events');
    expect(RESOURCES).toContain('journal-club');
    expect(RESOURCES).toContain('groups');
  });

  it('TC-rbac-types-002: defines 8 operations', () => {
    expect(OPERATIONS).toHaveLength(8);
    expect(OPERATIONS).toContain('view');
    expect(OPERATIONS).toContain('publish');
  });

  it('TC-rbac-types-003: has 2-char abbreviations for all resources', () => {
    for (const r of RESOURCES) {
      expect(RESOURCE_ABBREV[r]).toBeDefined();
      expect(RESOURCE_ABBREV[r]).toHaveLength(2);
    }
  });

  it('TC-rbac-types-004: has 1-char abbreviations for all operations', () => {
    for (const op of OPERATIONS) {
      expect(OP_ABBREV[op]).toBeDefined();
      expect(OP_ABBREV[op]).toHaveLength(1);
    }
  });

  it('TC-rbac-types-005: has no duplicate abbreviations', () => {
    const rAbbrevs = Object.values(RESOURCE_ABBREV);
    expect(new Set(rAbbrevs).size).toBe(rAbbrevs.length);
    const opAbbrevs = Object.values(OP_ABBREV);
    expect(new Set(opAbbrevs).size).toBe(opAbbrevs.length);
  });

  it('TC-rbac-types-006: reverse maps are consistent with forward maps', () => {
    for (const r of RESOURCES) {
      const abbrev = RESOURCE_ABBREV[r];
      expect(RESOURCE_FROM_ABBREV[abbrev]).toBe(r);
    }
    for (const op of OPERATIONS) {
      const abbrev = OP_ABBREV[op];
      expect(OP_FROM_ABBREV[abbrev]).toBe(op);
    }
  });

  it('TC-rbac-types-007: reverse maps have same number of entries as forward maps', () => {
    expect(Object.keys(RESOURCE_FROM_ABBREV)).toHaveLength(RESOURCES.length);
    expect(Object.keys(OP_FROM_ABBREV)).toHaveLength(OPERATIONS.length);
  });

  it('TC-rbac-types-008: RESOURCES array matches RESOURCE_ABBREV keys', () => {
    const abbrevKeys = Object.keys(RESOURCE_ABBREV);
    expect(abbrevKeys).toHaveLength(RESOURCES.length);
    for (const r of RESOURCES) {
      expect(abbrevKeys).toContain(r);
    }
  });

  it('TC-rbac-types-009: OPERATIONS array matches OP_ABBREV keys', () => {
    const abbrevKeys = Object.keys(OP_ABBREV);
    expect(abbrevKeys).toHaveLength(OPERATIONS.length);
    for (const op of OPERATIONS) {
      expect(abbrevKeys).toContain(op);
    }
  });

  it('TC-rbac-types-010: PermissionGrant interface is structurally valid', () => {
    const grant: PermissionGrant = {
      resource: 'events',
      operation: 'view',
      scope: 'all',
      effect: 'allow',
    };
    expect(grant.resource).toBe('events');
    expect(grant.operation).toBe('view');
    expect(grant.scope).toBe('all');
    expect(grant.effect).toBe('allow');
  });

  it('TC-rbac-types-011: RBACGroup interface is structurally valid', () => {
    const group: RBACGroup = {
      id: 'test-group',
      name: 'Test Group',
      description: 'A test group',
      permissions: [],
      isSystem: false,
      createdBy: 'user-1',
      createdAt: null,
      updatedAt: null,
    };
    expect(group.id).toBe('test-group');
    expect(group.isSystem).toBe(false);
    expect(group.permissions).toHaveLength(0);
  });

  it('TC-rbac-types-012: UserGroupAssignment interface is structurally valid', () => {
    const assignment: UserGroupAssignment = {
      userId: 'user-1',
      groups: ['admin', 'editor'],
      assignedBy: 'user-0',
      updatedAt: null,
    };
    expect(assignment.userId).toBe('user-1');
    expect(assignment.groups).toHaveLength(2);
  });

  it('TC-rbac-types-013: RBACAuditEntry interface is structurally valid', () => {
    const entry: RBACAuditEntry = {
      action: 'group_created',
      actorId: 'user-0',
      targetId: 'group-1',
      changes: { name: 'New Group' },
      timestamp: null,
    };
    expect(entry.action).toBe('group_created');
    expect(entry.changes).toHaveProperty('name');
  });

  it('TC-rbac-types-014: Scope type accepts valid values', () => {
    const own: Scope = 'own';
    const all: Scope = 'all';
    expect(own).toBe('own');
    expect(all).toBe('all');
  });

  it('TC-rbac-types-015: Effect type accepts valid values', () => {
    const allow: Effect = 'allow';
    const deny: Effect = 'deny';
    expect(allow).toBe('allow');
    expect(deny).toBe('deny');
  });
});
