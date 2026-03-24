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
