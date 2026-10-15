import type { RBACGroup, PermissionGrant, Scope } from '@/lib/rbac/types';

interface ScopeAccumulator {
  allows: Set<Scope>;
  denies: Set<Scope>;
}

/**
 * Resolves permissions from multiple RBAC groups into a single
 * effective permission set.
 *
 * Algorithm:
 * 1. Collect all grants from all groups.
 * 2. Build a map keyed by "resource:operation" tracking allow and deny scopes.
 * 3. For each key:
 *    - If any deny exists, emit a deny grant with the broadest deny scope.
 *    - Otherwise, emit an allow grant with the broadest allow scope.
 * 4. Return the resolved array.
 *
 * Key rules:
 * - Deny on the same (resource, operation) beats allow regardless of scope.
 * - Broader scope wins within the same effect ("all" > "own").
 */
export function resolvePermissions(groups: RBACGroup[]): PermissionGrant[] {
  if (groups.length === 0) {
    return [];
  }

  const map = buildScopeMap(groups);

  return resolveFromMap(map);
}

function buildScopeMap(groups: RBACGroup[]): Map<string, ScopeAccumulator> {
  const map = new Map<string, ScopeAccumulator>();

  for (const group of groups) {
    for (const grant of group.permissions) {
      const key = `${grant.resource}:${grant.operation}`;
      const entry = getOrCreateEntry(map, key);

      if (grant.effect === 'deny') {
        entry.denies.add(grant.scope);
      } else {
        entry.allows.add(grant.scope);
      }
    }
  }

  return map;
}

function getOrCreateEntry(
  map: Map<string, ScopeAccumulator>,
  key: string
): ScopeAccumulator {
  const existing = map.get(key);
  if (existing) {
    return existing;
  }

  const entry: ScopeAccumulator = {
    allows: new Set<Scope>(),
    denies: new Set<Scope>(),
  };
  map.set(key, entry);

  return entry;
}

function resolveFromMap(map: Map<string, ScopeAccumulator>): PermissionGrant[] {
  const results: PermissionGrant[] = [];

  for (const [key, entry] of map.entries()) {
    const [resource, operation] = parseKey(key);

    if (entry.denies.size > 0) {
      results.push({
        resource,
        operation,
        scope: broadestScope(entry.denies),
        effect: 'deny',
      });
    } else if (entry.allows.size > 0) {
      results.push({
        resource,
        operation,
        scope: broadestScope(entry.allows),
        effect: 'allow',
      });
    }
  }

  return results;
}

function parseKey(
  key: string
): [PermissionGrant['resource'], PermissionGrant['operation']] {
  const colonIndex = key.indexOf(':');
  const resource = key.slice(0, colonIndex) as PermissionGrant['resource'];
  const operation = key.slice(colonIndex + 1) as PermissionGrant['operation'];

  return [resource, operation];
}

function broadestScope(scopes: Set<Scope>): Scope {
  if (scopes.has('all')) {
    return 'all';
  }

  return 'own';
}
