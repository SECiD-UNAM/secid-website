/**
 * Pure RBAC resolution and encoding logic.
 *
 * This module has ZERO external dependencies (no firebase-admin, no firebase-functions).
 * It is imported by the Firestore triggers in resolvePermissions.ts and by
 * the test suite directly.
 */
import type { PermissionGrant } from "./defaultGroups";

// ---------------------------------------------------------------------------
// Abbreviation Maps (mirrors src/lib/rbac/types.ts)
// ---------------------------------------------------------------------------

const RESOURCE_ABBREV: Record<string, string> = {
  events: "ev",
  spotlights: "sp",
  newsletter: "nl",
  "journal-club": "jc",
  jobs: "jo",
  blog: "bl",
  forums: "fo",
  resources: "rs",
  users: "us",
  companies: "co",
  commissions: "cm",
  mentorship: "mn",
  settings: "st",
  analytics: "an",
  reports: "rp",
  notifications: "nt",
  assessments: "as",
  "salary-insights": "si",
  groups: "gr",
};

const OP_ABBREV: Record<string, string> = {
  view: "v",
  create: "c",
  edit: "e",
  delete: "d",
  publish: "p",
  moderate: "m",
  export: "x",
  assign: "a",
};

const SCOPE_ABBREV: Record<string, string> = { own: "o", all: "a" };

const TOTAL_RESOURCES = Object.keys(RESOURCE_ABBREV).length;
const TOTAL_OPERATIONS = Object.keys(OP_ABBREV).length;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GroupDoc {
  id: string;
  name: string;
  permissions: PermissionGrant[];
}

interface ScopeAccumulator {
  allows: Set<string>;
  denies: Set<string>;
}

// ---------------------------------------------------------------------------
// Resolution Algorithm
// ---------------------------------------------------------------------------

/**
 * Resolves permissions from multiple groups into a single effective set.
 *
 * Algorithm:
 * 1. Collect all grants from all groups.
 * 2. Build a map keyed by "resource:operation" tracking allow/deny scopes.
 * 3. For each key: deny wins over allow; broader scope wins within same effect.
 */
export function resolveGroupPermissions(groups: GroupDoc[]): PermissionGrant[] {
  if (groups.length === 0) return [];

  const map = new Map<string, ScopeAccumulator>();

  for (const group of groups) {
    for (const g of group.permissions) {
      const key = `${g.resource}:${g.operation}`;
      let entry = map.get(key);
      if (!entry) {
        entry = { allows: new Set(), denies: new Set() };
        map.set(key, entry);
      }

      if (g.effect === "deny") {
        entry.denies.add(g.scope);
      } else {
        entry.allows.add(g.scope);
      }
    }
  }

  const results: PermissionGrant[] = [];

  for (const [key, entry] of map.entries()) {
    const colonIdx = key.indexOf(":");
    const resource = key.slice(0, colonIdx) as PermissionGrant["resource"];
    const operation = key.slice(colonIdx + 1) as PermissionGrant["operation"];

    if (entry.denies.size > 0) {
      results.push({
        resource,
        operation,
        scope: entry.denies.has("all") ? "all" : "own",
        effect: "deny",
      });
    } else if (entry.allows.size > 0) {
      results.push({
        resource,
        operation,
        scope: entry.allows.has("all") ? "all" : "own",
        effect: "allow",
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

/**
 * Encodes resolved permission grants into a compressed claims string.
 *
 * Format: `{resourceAbbrev}:{opAbbrev}.{scopeAbbrev}` (comma-separated).
 * Deny grants are prefixed with `!`.
 *
 * Wildcard compression:
 * - All resources x all ops with same scope+effect -> `*:*.{scope}`
 * - All ops on one resource with same scope+effect -> `{resource}:*.{scope}`
 * - All resources with same op+scope+effect -> `*:{op}.{scope}`
 */
export function encodeClaimsPermissions(grants: PermissionGrant[]): string {
  if (grants.length === 0) return "";

  const allows = grants.filter((g) => g.effect === "allow");
  const denies = grants.filter((g) => g.effect === "deny");

  const allowTokens = compressGrants(allows, false);
  const denyTokens = compressGrants(denies, true);

  return [...allowTokens, ...denyTokens].join(",");
}

function compressGrants(grants: PermissionGrant[], isDeny: boolean): string[] {
  if (grants.length === 0) return [];

  const prefix = isDeny ? "!" : "";

  // Try full wildcard: all resources x all ops, same scope
  const fullWildScope = tryFullWildcard(grants);
  if (fullWildScope) {
    return [`${prefix}*:*.${SCOPE_ABBREV[fullWildScope]}`];
  }

  const tokens: string[] = [];
  const consumed = new Set<number>();

  // Try per-resource wildcards
  const byResource = groupBy(grants, consumed, (g) => g.resource);
  for (const [resource, indices] of byResource.entries()) {
    const rGrants = indices.map((i) => grants[i]!);
    if (rGrants.length !== TOTAL_OPERATIONS) continue;

    const scope = rGrants[0]!.scope;
    if (!rGrants.every((g) => g.scope === scope)) continue;

    const ops = new Set(rGrants.map((g) => g.operation));
    if (ops.size !== TOTAL_OPERATIONS) continue;

    for (const idx of indices) consumed.add(idx);
    tokens.push(
      `${prefix}${RESOURCE_ABBREV[resource]}:*.${SCOPE_ABBREV[scope]}`,
    );
  }

  // Try per-operation wildcards
  const byOperation = groupBy(grants, consumed, (g) => g.operation);
  for (const [operation, indices] of byOperation.entries()) {
    const oGrants = indices.map((i) => grants[i]!);
    if (oGrants.length !== TOTAL_RESOURCES) continue;

    const scope = oGrants[0]!.scope;
    if (!oGrants.every((g) => g.scope === scope)) continue;

    const resources = new Set(oGrants.map((g) => g.resource));
    if (resources.size !== TOTAL_RESOURCES) continue;

    for (const idx of indices) consumed.add(idx);
    tokens.push(
      `${prefix}*:${OP_ABBREV[operation]}.${SCOPE_ABBREV[scope]}`,
    );
  }

  // Remaining individual grants
  for (let i = 0; i < grants.length; i++) {
    if (consumed.has(i)) continue;
    const g = grants[i]!;
    tokens.push(
      `${prefix}${RESOURCE_ABBREV[g.resource]}:${OP_ABBREV[g.operation]}.${SCOPE_ABBREV[g.scope]}`,
    );
  }

  return tokens;
}

function tryFullWildcard(grants: PermissionGrant[]): string | null {
  const expected = TOTAL_RESOURCES * TOTAL_OPERATIONS;
  if (grants.length !== expected) return null;

  const scope = grants[0]?.scope;
  if (!scope || !grants.every((g) => g.scope === scope)) return null;

  const seen = new Set<string>();
  for (const g of grants) {
    seen.add(`${g.resource}:${g.operation}`);
  }

  return seen.size === expected ? scope : null;
}

function groupBy(
  grants: PermissionGrant[],
  consumed: Set<number>,
  keyFn: (g: PermissionGrant) => string,
): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (let i = 0; i < grants.length; i++) {
    if (consumed.has(i)) continue;
    const g = grants[i];
    if (!g) continue;
    const key = keyFn(g);
    const arr = map.get(key) ?? [];
    arr.push(i);
    map.set(key, arr);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Reverse Maps (abbrev -> full name, for decoding)
// ---------------------------------------------------------------------------

const RESOURCE_FROM_ABBREV: Record<string, string> = Object.fromEntries(
  Object.entries(RESOURCE_ABBREV).map(([full, abbrev]) => [abbrev, full]),
);

const OP_FROM_ABBREV: Record<string, string> = Object.fromEntries(
  Object.entries(OP_ABBREV).map(([full, abbrev]) => [abbrev, full]),
);

const SCOPE_FROM_ABBREV: Record<string, string> = Object.fromEntries(
  Object.entries(SCOPE_ABBREV).map(([full, abbrev]) => [abbrev, full]),
);

// ---------------------------------------------------------------------------
// Decoded Permission Token
// ---------------------------------------------------------------------------

export interface DecodedToken {
  resource: string; // full name or "*"
  operation: string; // full name or "*"
  scope: "own" | "all";
  effect: "allow" | "deny";
}

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

/**
 * Decodes a compressed claims permission string back into structured tokens.
 *
 * Each comma-separated token has format: [!]{resource}:{op}.{scope}
 * where resource/op can be abbreviations or "*" for wildcards.
 */
export function decodeClaimsPermissions(encoded: string): DecodedToken[] {
  if (!encoded) return [];

  const tokens = encoded.split(",");
  const results: DecodedToken[] = [];

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    const isDeny = trimmed.startsWith("!");
    const body = isDeny ? trimmed.slice(1) : trimmed;

    // Format: {resource}:{op}.{scope}
    const colonIdx = body.indexOf(":");
    if (colonIdx === -1) continue;

    const resourceAbbrev = body.slice(0, colonIdx);
    const remainder = body.slice(colonIdx + 1);

    const dotIdx = remainder.indexOf(".");
    if (dotIdx === -1) continue;

    const opAbbrev = remainder.slice(0, dotIdx);
    const scopeAbbrev = remainder.slice(dotIdx + 1);

    const resource =
      resourceAbbrev === "*"
        ? "*"
        : RESOURCE_FROM_ABBREV[resourceAbbrev] ?? resourceAbbrev;
    const operation =
      opAbbrev === "*" ? "*" : OP_FROM_ABBREV[opAbbrev] ?? opAbbrev;
    const scope = (SCOPE_FROM_ABBREV[scopeAbbrev] ?? scopeAbbrev) as
      | "own"
      | "all";

    results.push({
      resource,
      operation,
      scope,
      effect: isDeny ? "deny" : "allow",
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Permission Check
// ---------------------------------------------------------------------------

/**
 * Result of checking a specific permission against decoded tokens.
 */
export interface PermissionCheckResult {
  allowed: boolean;
  scope: "own" | "all" | null;
  denied: boolean;
}

/**
 * Checks whether a specific resource:operation is allowed by the decoded tokens.
 *
 * Algorithm (deny-first pattern from OpenMetadata):
 * 1. Scan all tokens for denies matching the resource:operation (including wildcards).
 * 2. If any deny matches, return denied.
 * 3. Scan all tokens for allows matching the resource:operation (including wildcards).
 * 4. If any allow matches, return allowed with the broadest scope.
 * 5. Otherwise, return not allowed.
 */
export function checkPermission(
  tokens: DecodedToken[],
  resource: string,
  operation: string,
): PermissionCheckResult {
  // Phase 1: Check denies
  for (const token of tokens) {
    if (token.effect !== "deny") continue;
    if (tokenMatchesTarget(token, resource, operation)) {
      return { allowed: false, scope: null, denied: true };
    }
  }

  // Phase 2: Check allows, track broadest scope
  let bestScope: "own" | "all" | null = null;

  for (const token of tokens) {
    if (token.effect !== "allow") continue;
    if (tokenMatchesTarget(token, resource, operation)) {
      if (token.scope === "all") {
        bestScope = "all";
      } else if (bestScope === null) {
        bestScope = "own";
      }
    }
  }

  if (bestScope !== null) {
    return { allowed: true, scope: bestScope, denied: false };
  }

  return { allowed: false, scope: null, denied: false };
}

function tokenMatchesTarget(
  token: DecodedToken,
  resource: string,
  operation: string,
): boolean {
  const resourceMatch = token.resource === "*" || token.resource === resource;
  const operationMatch =
    token.operation === "*" || token.operation === operation;
  return resourceMatch && operationMatch;
}

// ---------------------------------------------------------------------------
// Claims Payload Builder
// ---------------------------------------------------------------------------

export function buildClaimsPayload(
  groupIds: string[],
  encodedPermissions: string,
  existingRole: string | undefined,
): Record<string, unknown> {
  const claims: Record<string, unknown> = {
    rbac: {
      g: groupIds,
      p: encodedPermissions,
    },
  };

  if (existingRole !== undefined) {
    claims.role = existingRole;
  }

  return claims;
}
