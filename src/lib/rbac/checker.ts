import type { Resource, Operation, Scope } from '@/lib/rbac/types';
import type { ResolvedPermissions, DecodedWildcard } from '@/lib/rbac/codec';

/**
 * Checks whether a specific permission is granted.
 *
 * Evaluation order: deny-first, then allow, then default deny.
 * 1. If any deny (exact or wildcard) matches -> false
 * 2. If any allow (exact or wildcard) matches with sufficient scope -> true
 * 3. Otherwise -> false
 */
export function checkPermission(
  perms: ResolvedPermissions,
  resource: Resource,
  operation: Operation,
  requiredScope?: Scope,
): boolean {
  if (hasDeny(perms, resource, operation)) {
    return false;
  }

  return hasAllow(perms, resource, operation, requiredScope);
}

/**
 * Checks if there is a matching deny entry (exact or wildcard).
 */
export function hasDeny(
  perms: ResolvedPermissions,
  resource: Resource,
  operation: Operation,
): boolean {
  const hasExactDeny = perms.denies.some(
    (d) => d.resource === resource && d.operation === operation,
  );

  if (hasExactDeny) {
    return true;
  }

  return perms.wildcards.some(
    (w) => w.effect === 'deny' && matchesWildcard(w, resource, operation),
  );
}

/**
 * Checks if there is a matching allow entry (exact or wildcard),
 * respecting scope requirements.
 *
 * Scope matching:
 * - requiredScope === 'all' -> only scope: 'all' grants match
 * - requiredScope === 'own' or omitted -> both 'own' and 'all' grants match
 */
export function hasAllow(
  perms: ResolvedPermissions,
  resource: Resource,
  operation: Operation,
  requiredScope?: Scope,
): boolean {
  const hasExactAllow = perms.allows.some(
    (a) =>
      a.resource === resource &&
      a.operation === operation &&
      scopeSatisfies(a.scope, requiredScope),
  );

  if (hasExactAllow) {
    return true;
  }

  return perms.wildcards.some(
    (w) =>
      w.effect === 'allow' &&
      matchesWildcard(w, resource, operation) &&
      scopeSatisfies(w.scope, requiredScope),
  );
}

/**
 * Returns the broadest effective scope for a resource+operation, or null if
 * no grant exists (including when the permission is denied).
 *
 * Considers both exact grants and wildcards. Returns 'all' over 'own'
 * when both exist.
 */
export function getEffectiveScope(
  perms: ResolvedPermissions,
  resource: Resource,
  operation: Operation,
): Scope | null {
  if (hasDeny(perms, resource, operation)) {
    return null;
  }

  let broadest: Scope | null = null;

  for (const allow of perms.allows) {
    if (allow.resource === resource && allow.operation === operation) {
      broadest = broadenScope(broadest, allow.scope);
    }
  }

  for (const wildcard of perms.wildcards) {
    if (
      wildcard.effect === 'allow' &&
      matchesWildcard(wildcard, resource, operation)
    ) {
      broadest = broadenScope(broadest, wildcard.scope);
    }
  }

  return broadest;
}

function matchesWildcard(
  wildcard: DecodedWildcard,
  resource: Resource,
  operation: Operation,
): boolean {
  const resourceMatch =
    wildcard.resource === '*' || wildcard.resource === resource;
  const operationMatch =
    wildcard.operation === '*' || wildcard.operation === operation;

  return resourceMatch && operationMatch;
}

function scopeSatisfies(grantScope: Scope, requiredScope?: Scope): boolean {
  if (!requiredScope || requiredScope === 'own') {
    return true;
  }

  return grantScope === 'all';
}

function broadenScope(current: Scope | null, candidate: Scope): Scope {
  if (current === 'all') {
    return 'all';
  }

  return candidate;
}
