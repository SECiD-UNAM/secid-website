import type {
  PermissionGrant,
  Resource,
  Operation,
  Scope,
  Effect,
} from '@/lib/rbac/types';
import {
  RESOURCE_ABBREV,
  OP_ABBREV,
  RESOURCE_FROM_ABBREV,
  OP_FROM_ABBREV,
  RESOURCES,
  OPERATIONS,
} from '@/lib/rbac/types';

const SCOPE_ABBREV: Record<Scope, string> = { own: 'o', all: 'a' };
const SCOPE_FROM_ABBREV: Record<string, Scope> = { o: 'own', a: 'all' };

export interface DecodedGrant {
  resource: Resource;
  operation: Operation;
  scope: Scope;
}

export interface DecodedWildcard {
  resource: string;
  operation: string;
  scope: Scope;
  effect: Effect;
}

export interface ResolvedPermissions {
  allows: DecodedGrant[];
  denies: DecodedGrant[];
  wildcards: DecodedWildcard[];
}

/**
 * Encodes an array of permission grants into a compressed string.
 *
 * Format: `{resourceAbbrev}:{opAbbrev}.{scopeAbbrev}` (comma-separated).
 * Deny grants are prefixed with `!`.
 *
 * Wildcard compression:
 * - All resources x all ops with same scope+effect -> `*:*.{scope}`
 * - All ops on one resource with same scope+effect -> `{resource}:*.{scope}`
 * - All resources with same op+scope+effect -> `*:{op}.{scope}`
 */
export function encodePermissions(grants: PermissionGrant[]): string {
  if (grants.length === 0) return '';

  const allowGrants = grants.filter((g) => g.effect === 'allow');
  const denyGrants = grants.filter((g) => g.effect === 'deny');

  const allowTokens = compressGrants(allowGrants, false);
  const denyTokens = compressGrants(denyGrants, true);

  return [...allowTokens, ...denyTokens].join(',');
}

function compressGrants(grants: PermissionGrant[], isDeny: boolean): string[] {
  if (grants.length === 0) return [];

  const prefix = isDeny ? '!' : '';

  const fullWildcard = tryFullWildcard(grants);
  if (fullWildcard) {
    return [`${prefix}*:*.${SCOPE_ABBREV[fullWildcard]}`];
  }

  const tokens: string[] = [];
  const consumed = new Set<number>();

  const opWildcardTokens = tryOperationWildcards(grants, consumed, prefix);
  tokens.push(...opWildcardTokens);

  const resourceWildcardTokens = tryResourceWildcards(grants, consumed, prefix);
  tokens.push(...resourceWildcardTokens);

  for (let i = 0; i < grants.length; i++) {
    if (consumed.has(i)) continue;
    const g = grants[i]!;
    tokens.push(
      `${prefix}${RESOURCE_ABBREV[g.resource]}:${OP_ABBREV[g.operation]}.${SCOPE_ABBREV[g.scope]}`
    );
  }

  return tokens;
}

/**
 * Checks if all grants cover every resource x every operation with the same scope.
 * Returns the shared scope if so, or null.
 */
function tryFullWildcard(grants: PermissionGrant[]): Scope | null {
  const totalExpected = RESOURCES.length * OPERATIONS.length;
  if (grants.length !== totalExpected) return null;

  const firstGrant = grants[0];
  if (!firstGrant) return null;
  const scope = firstGrant.scope;
  if (!grants.every((g) => g.scope === scope)) return null;

  const seen = new Set<string>();
  for (const g of grants) {
    seen.add(`${g.resource}:${g.operation}`);
  }

  if (seen.size !== totalExpected) return null;

  for (const resource of RESOURCES) {
    for (const op of OPERATIONS) {
      if (!seen.has(`${resource}:${op}`)) return null;
    }
  }

  return scope;
}

/**
 * Finds resources where all 8 operations are present with the same scope.
 * Marks consumed indices and returns wildcard tokens.
 */
function tryResourceWildcards(
  grants: PermissionGrant[],
  consumed: Set<number>,
  prefix: string
): string[] {
  const tokens: string[] = [];

  const byResource = groupByResource(grants, consumed);

  for (const [resource, indices] of byResource.entries()) {
    const resourceGrants = indices.map((i) => grants[i]!);

    if (resourceGrants.length !== OPERATIONS.length) continue;

    const first = resourceGrants[0];
    if (!first) continue;
    const scope = first.scope;
    if (!resourceGrants.every((g) => g.scope === scope)) continue;

    const ops = new Set(resourceGrants.map((g) => g.operation));
    if (ops.size !== OPERATIONS.length) continue;

    for (const idx of indices) consumed.add(idx);
    tokens.push(
      `${prefix}${RESOURCE_ABBREV[resource as Resource]}:*.${SCOPE_ABBREV[scope]}`
    );
  }

  return tokens;
}

/**
 * Finds operations where all 19 resources are present with the same scope.
 * Marks consumed indices and returns wildcard tokens.
 */
function tryOperationWildcards(
  grants: PermissionGrant[],
  consumed: Set<number>,
  prefix: string
): string[] {
  const tokens: string[] = [];

  const byOperation = groupByOperation(grants, consumed);

  for (const [operation, indices] of byOperation.entries()) {
    const opGrants = indices.map((i) => grants[i]!);

    if (opGrants.length !== RESOURCES.length) continue;

    const first = opGrants[0];
    if (!first) continue;
    const scope = first.scope;
    if (!opGrants.every((g) => g.scope === scope)) continue;

    const resources = new Set(opGrants.map((g) => g.resource));
    if (resources.size !== RESOURCES.length) continue;

    for (const idx of indices) consumed.add(idx);
    tokens.push(
      `${prefix}*:${OP_ABBREV[operation as Operation]}.${SCOPE_ABBREV[scope]}`
    );
  }

  return tokens;
}

function groupByResource(
  grants: PermissionGrant[],
  consumed: Set<number>
): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (let i = 0; i < grants.length; i++) {
    if (consumed.has(i)) continue;
    const grant = grants[i];
    if (!grant) continue;
    const key = grant.resource;
    const arr = map.get(key) ?? [];
    arr.push(i);
    map.set(key, arr);
  }
  return map;
}

function groupByOperation(
  grants: PermissionGrant[],
  consumed: Set<number>
): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (let i = 0; i < grants.length; i++) {
    if (consumed.has(i)) continue;
    const grant = grants[i];
    if (!grant) continue;
    const key = grant.operation;
    const arr = map.get(key) ?? [];
    arr.push(i);
    map.set(key, arr);
  }
  return map;
}

/**
 * Decodes a compressed permission string back into structured form.
 *
 * Handles regular entries, deny entries (! prefix), and wildcards (* tokens).
 * Entries with `*` in resource or operation position go to `wildcards` array.
 */
export function decodePermissions(encoded: string): ResolvedPermissions {
  const result: ResolvedPermissions = {
    allows: [],
    denies: [],
    wildcards: [],
  };

  if (!encoded) return result;

  const tokens = encoded.split(',');

  for (const token of tokens) {
    const parsed = parseToken(token.trim());
    if (!parsed) continue;

    const { resourcePart, operationPart, scope, effect } = parsed;

    const isWildcard = resourcePart === '*' || operationPart === '*';

    if (isWildcard) {
      const resolvedResource =
        resourcePart === '*'
          ? '*'
          : (RESOURCE_FROM_ABBREV[resourcePart] ?? resourcePart);
      const resolvedOperation =
        operationPart === '*'
          ? '*'
          : (OP_FROM_ABBREV[operationPart] ?? operationPart);

      result.wildcards.push({
        resource: resolvedResource,
        operation: resolvedOperation,
        scope,
        effect,
      });
    } else {
      const resource = RESOURCE_FROM_ABBREV[resourcePart];
      const operation = OP_FROM_ABBREV[operationPart];

      if (!resource || !operation) continue;

      const grant: DecodedGrant = { resource, operation, scope };

      if (effect === 'deny') {
        result.denies.push(grant);
      } else {
        result.allows.push(grant);
      }
    }
  }

  return result;
}

interface ParsedToken {
  resourcePart: string;
  operationPart: string;
  scope: Scope;
  effect: Effect;
}

function parseToken(token: string): ParsedToken | null {
  if (!token) return null;

  let effect: Effect = 'allow';
  let body = token;

  if (body.startsWith('!')) {
    effect = 'deny';
    body = body.slice(1);
  }

  const colonIndex = body.indexOf(':');
  if (colonIndex === -1) return null;

  const resourcePart = body.slice(0, colonIndex);
  const rest = body.slice(colonIndex + 1);

  const dotIndex = rest.indexOf('.');
  if (dotIndex === -1) return null;

  const operationPart = rest.slice(0, dotIndex);
  const scopeAbbrev = rest.slice(dotIndex + 1);

  const scope = SCOPE_FROM_ABBREV[scopeAbbrev];
  if (!scope) return null;

  return { resourcePart, operationPart, scope, effect };
}
