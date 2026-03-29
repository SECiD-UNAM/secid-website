/**
 * Tests for RBAC Cloud Functions — Permission Resolution Logic.
 *
 * TC-rbac-cf-001 through TC-rbac-cf-010
 * Verifies: AC-6.1 (permission resolution), AC-6.2 (deny-wins),
 * AC-6.3 (scope broadening), AC-6.4 (encoded claims), AC-6.5 (empty groups),
 * AC-6.6 (default groups data), AC-6.7 (role-to-group mapping)
 *
 * These tests extract the pure business logic (resolution algorithm, encoding,
 * role mapping) from the Cloud Function wrappers, following the same pattern
 * as linkedin-auth.test.ts. Firebase-admin is not imported; only pure functions.
 */
import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// We import the pure logic directly from functions/src/rbac/ modules.
// These have NO firebase-admin dependency — they are pure functions.
// ---------------------------------------------------------------------------
import {
  resolveGroupPermissions,
  encodeClaimsPermissions,
  buildClaimsPayload,
} from "../../../../functions/src/rbac/resolution-logic";

import {
  DEFAULT_GROUPS,
  CONTENT_RESOURCES,
} from "../../../../functions/src/rbac/defaultGroups";

import { mapRoleToGroups } from "../../../../functions/src/rbac/role-mapping";

// ---------------------------------------------------------------------------
// Type shorthand (mirroring functions/src/rbac/types)
// ---------------------------------------------------------------------------
interface PermissionGrant {
  resource: string;
  operation: string;
  scope: "own" | "all";
  effect: "allow" | "deny";
}

interface GroupDoc {
  id: string;
  name: string;
  permissions: PermissionGrant[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGrant(
  resource: string,
  operation: string,
  scope: "own" | "all" = "all",
  effect: "allow" | "deny" = "allow",
): PermissionGrant {
  return { resource, operation, scope, effect };
}

function makeGroup(
  id: string,
  name: string,
  permissions: PermissionGrant[],
): GroupDoc {
  return { id, name, permissions };
}

// ===========================================================================
// Resolution Algorithm
// ===========================================================================

describe("resolveGroupPermissions", () => {
  /**
   * TC-rbac-cf-001: Single group produces its own grants unchanged.
   * Verifies: AC-6.1
   */
  it("returns grants from a single group unchanged", () => {
    const groups: GroupDoc[] = [
      makeGroup("editor", "Editor", [
        makeGrant("blog", "create", "all"),
        makeGrant("blog", "edit", "all"),
      ]),
    ];

    const result = resolveGroupPermissions(groups);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(makeGrant("blog", "create", "all"));
    expect(result).toContainEqual(makeGrant("blog", "edit", "all"));
  });

  /**
   * TC-rbac-cf-002: Merging grants from multiple groups on the same (resource, op).
   * Scope "all" should win over "own".
   * Verifies: AC-6.3
   */
  it("broadens scope when merging same resource+operation from multiple groups", () => {
    const groups: GroupDoc[] = [
      makeGroup("member", "Member", [
        makeGrant("forums", "create", "own"),
      ]),
      makeGroup("moderator", "Moderator", [
        makeGrant("forums", "create", "all"),
      ]),
    ];

    const result = resolveGroupPermissions(groups);

    const forumsCreate = result.find(
      (g) => g.resource === "forums" && g.operation === "create",
    );
    expect(forumsCreate).toBeDefined();
    expect(forumsCreate!.scope).toBe("all");
    expect(forumsCreate!.effect).toBe("allow");
  });

  /**
   * TC-rbac-cf-003: Deny wins over allow for same (resource, operation).
   * Verifies: AC-6.2
   */
  it("deny wins over allow for the same resource and operation", () => {
    const groups: GroupDoc[] = [
      makeGroup("member", "Member", [
        makeGrant("settings", "edit", "all", "allow"),
      ]),
      makeGroup("restricted", "Restricted", [
        makeGrant("settings", "edit", "own", "deny"),
      ]),
    ];

    const result = resolveGroupPermissions(groups);

    const settingsEdit = result.find(
      (g) => g.resource === "settings" && g.operation === "edit",
    );
    expect(settingsEdit).toBeDefined();
    expect(settingsEdit!.effect).toBe("deny");
  });

  /**
   * TC-rbac-cf-004: Deny broadens scope when multiple deny entries exist.
   * Verifies: AC-6.2, AC-6.3
   */
  it("deny scope broadens when multiple denies for same resource+op", () => {
    const groups: GroupDoc[] = [
      makeGroup("a", "A", [
        makeGrant("users", "delete", "own", "deny"),
      ]),
      makeGroup("b", "B", [
        makeGrant("users", "delete", "all", "deny"),
      ]),
    ];

    const result = resolveGroupPermissions(groups);

    const usersDelete = result.find(
      (g) => g.resource === "users" && g.operation === "delete",
    );
    expect(usersDelete).toBeDefined();
    expect(usersDelete!.effect).toBe("deny");
    expect(usersDelete!.scope).toBe("all");
  });

  /**
   * TC-rbac-cf-005: Empty groups array produces empty result.
   * Verifies: AC-6.5
   */
  it("returns empty array for empty groups", () => {
    const result = resolveGroupPermissions([]);
    expect(result).toEqual([]);
  });

  /**
   * TC-rbac-cf-006: Group with no permissions produces empty result.
   * Verifies: AC-6.5
   */
  it("returns empty array for groups with no permissions", () => {
    const groups: GroupDoc[] = [makeGroup("empty", "Empty", [])];
    const result = resolveGroupPermissions(groups);
    expect(result).toEqual([]);
  });

  /**
   * TC-rbac-cf-007: Non-overlapping grants from multiple groups are all included.
   * Verifies: AC-6.1
   */
  it("includes all non-overlapping grants from multiple groups", () => {
    const groups: GroupDoc[] = [
      makeGroup("a", "A", [makeGrant("blog", "view", "all")]),
      makeGroup("b", "B", [makeGrant("events", "create", "own")]),
    ];

    const result = resolveGroupPermissions(groups);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(makeGrant("blog", "view", "all"));
    expect(result).toContainEqual(makeGrant("events", "create", "own"));
  });
});

// ===========================================================================
// Encoding
// ===========================================================================

describe("encodeClaimsPermissions", () => {
  /**
   * TC-rbac-cf-008: Encodes allow grants into abbreviated tokens.
   * Verifies: AC-6.4
   */
  it("encodes allow grants into abbreviated comma-separated tokens", () => {
    const grants: PermissionGrant[] = [
      makeGrant("blog", "view", "all"),
      makeGrant("forums", "create", "own"),
    ];

    const encoded = encodeClaimsPermissions(grants);

    // blog=bl, view=v, all=a -> bl:v.a
    // forums=fo, create=c, own=o -> fo:c.o
    expect(encoded).toContain("bl:v.a");
    expect(encoded).toContain("fo:c.o");
  });

  /**
   * TC-rbac-cf-009: Encodes deny grants with ! prefix.
   * Verifies: AC-6.4
   */
  it("encodes deny grants with ! prefix", () => {
    const grants: PermissionGrant[] = [
      makeGrant("settings", "edit", "all", "deny"),
    ];

    const encoded = encodeClaimsPermissions(grants);

    expect(encoded).toContain("!st:e.a");
  });

  /**
   * TC-rbac-cf-010: Empty grants produce empty string.
   * Verifies: AC-6.4, AC-6.5
   */
  it("returns empty string for empty grants", () => {
    const encoded = encodeClaimsPermissions([]);
    expect(encoded).toBe("");
  });
});

// ===========================================================================
// Claims Payload
// ===========================================================================

describe("buildClaimsPayload", () => {
  it("builds claims payload with group IDs and encoded permissions", () => {
    const groupIds = ["member", "moderator"];
    const encodedPermissions = "bl:v.a,fo:c.o";
    const existingRole = "admin";

    const payload = buildClaimsPayload(
      groupIds,
      encodedPermissions,
      existingRole,
    );

    expect(payload).toEqual({
      rbac: {
        g: ["member", "moderator"],
        p: "bl:v.a,fo:c.o",
      },
      role: "admin",
    });
  });

  it("preserves existing role in claims", () => {
    const payload = buildClaimsPayload(["member"], "bl:v.a", "collaborator");
    expect(payload.role).toBe("collaborator");
  });

  it("handles undefined role", () => {
    const payload = buildClaimsPayload(["member"], "bl:v.a", undefined);
    expect(payload.role).toBeUndefined();
  });
});

// ===========================================================================
// Default Groups Data
// ===========================================================================

describe("DEFAULT_GROUPS", () => {
  /**
   * TC-rbac-cf-011: All 9 system groups are defined.
   * Verifies: AC-6.6
   */
  it("contains exactly 9 default groups", () => {
    expect(DEFAULT_GROUPS).toHaveLength(9);
  });

  it("all groups have isSystem: true", () => {
    for (const group of DEFAULT_GROUPS) {
      expect(group.isSystem).toBe(true);
    }
  });

  it("all groups have non-empty permissions", () => {
    for (const group of DEFAULT_GROUPS) {
      // Every group should have at least one permission
      expect(group.permissions.length).toBeGreaterThan(0);
    }
  });

  it("super-admin has all resources x all operations with scope all", () => {
    const superAdmin = DEFAULT_GROUPS.find((g) => g.id === "super-admin");
    expect(superAdmin).toBeDefined();

    // 19 resources x 8 operations = 152 grants
    expect(superAdmin!.permissions).toHaveLength(19 * 8);

    // All should be allow + scope all
    for (const perm of superAdmin!.permissions) {
      expect(perm.effect).toBe("allow");
      expect(perm.scope).toBe("all");
    }
  });

  it("member group has view.all on content resources", () => {
    const member = DEFAULT_GROUPS.find((g) => g.id === "member");
    expect(member).toBeDefined();

    for (const contentResource of CONTENT_RESOURCES) {
      const viewGrant = member!.permissions.find(
        (p) => p.resource === contentResource && p.operation === "view",
      );
      expect(viewGrant).toBeDefined();
      expect(viewGrant!.scope).toBe("all");
      expect(viewGrant!.effect).toBe("allow");
    }
  });

  it("company group has job CRUD permissions", () => {
    const company = DEFAULT_GROUPS.find((g) => g.id === "company");
    expect(company).toBeDefined();

    const jobPerms = company!.permissions.filter((p) => p.resource === "jobs");
    expect(jobPerms.length).toBeGreaterThanOrEqual(4); // create, edit, delete, view at minimum

    const jobCreate = jobPerms.find((p) => p.operation === "create");
    expect(jobCreate).toBeDefined();
    expect(jobCreate!.scope).toBe("own");
  });

  it("content-editor group has create.all and edit.all on content resources", () => {
    const editor = DEFAULT_GROUPS.find((g) => g.id === "content-editor");
    expect(editor).toBeDefined();

    for (const contentResource of CONTENT_RESOURCES) {
      const createGrant = editor!.permissions.find(
        (p) => p.resource === contentResource && p.operation === "create",
      );
      expect(createGrant).toBeDefined();
      expect(createGrant!.scope).toBe("all");

      const editGrant = editor!.permissions.find(
        (p) => p.resource === contentResource && p.operation === "edit",
      );
      expect(editGrant).toBeDefined();
      expect(editGrant!.scope).toBe("all");
    }
  });

  it("each group has expected ID", () => {
    const expectedIds = [
      "super-admin",
      "moderator",
      "content-editor",
      "event-manager",
      "newsletter-editor",
      "jc-coordinator",
      "mentor",
      "member",
      "company",
    ];

    const actualIds = DEFAULT_GROUPS.map((g) => g.id);
    for (const id of expectedIds) {
      expect(actualIds).toContain(id);
    }
  });
});

// ===========================================================================
// Role-to-Group Mapping
// ===========================================================================

describe("mapRoleToGroups", () => {
  /**
   * TC-rbac-cf-012: Correct role-to-group mappings.
   * Verifies: AC-6.7
   */
  it("maps admin to super-admin and member groups", () => {
    expect(mapRoleToGroups("admin")).toEqual(["super-admin", "member"]);
  });

  it("maps moderator to moderator and member groups", () => {
    expect(mapRoleToGroups("moderator")).toEqual(["moderator", "member"]);
  });

  it("maps member to member group", () => {
    expect(mapRoleToGroups("member")).toEqual(["member"]);
  });

  it("maps collaborator to member group", () => {
    expect(mapRoleToGroups("collaborator")).toEqual(["member"]);
  });

  it("maps company to company group", () => {
    expect(mapRoleToGroups("company")).toEqual(["company"]);
  });

  it("returns member group for unknown roles", () => {
    expect(mapRoleToGroups("unknown-role")).toEqual(["member"]);
  });

  it("returns member group for undefined", () => {
    expect(mapRoleToGroups(undefined)).toEqual(["member"]);
  });
});

// ===========================================================================
// Integration: full pipeline resolution -> encoding
// ===========================================================================

describe("resolution pipeline integration", () => {
  it("resolves and encodes a member + moderator combo correctly", () => {
    const memberGroup = DEFAULT_GROUPS.find((g) => g.id === "member")!;
    const moderatorGroup = DEFAULT_GROUPS.find((g) => g.id === "moderator")!;

    const resolved = resolveGroupPermissions([memberGroup, moderatorGroup]);
    const encoded = encodeClaimsPermissions(resolved);

    // Should produce a non-empty string
    expect(encoded.length).toBeGreaterThan(0);

    // Moderator has view.all on all resources, so the result should be
    // at least as broad as what moderator provides
    const payload = buildClaimsPayload(
      ["member", "moderator"],
      encoded,
      "moderator",
    );
    expect(payload.rbac.g).toEqual(["member", "moderator"]);
    expect(payload.role).toBe("moderator");
  });

  it("super-admin encodes to full wildcard *:*.a", () => {
    const superAdmin = DEFAULT_GROUPS.find((g) => g.id === "super-admin")!;

    const resolved = resolveGroupPermissions([superAdmin]);
    const encoded = encodeClaimsPermissions(resolved);

    // All 19 resources x 8 ops, all allow, all scope all -> should compress to *:*.a
    expect(encoded).toBe("*:*.a");
  });
});
