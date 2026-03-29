/**
 * Tests for RBAC Cloud Function Middleware — Express-style permission enforcement.
 *
 * TC-rbac-mw-001 through TC-rbac-mw-012
 * Verifies: AC-6b.1 (claim extraction), AC-6b.2 (deny-first enforcement),
 * AC-6b.3 (missing permission rejection), AC-6b.4 (scope propagation),
 * AC-6b.5 (wildcard handling), AC-6b.6 (deny overrides allow)
 *
 * These tests use mock Express req/res/next objects. No Firebase-admin dependency.
 */
import { describe, it, expect, vi } from "vitest";

import { requirePermission } from "../../../../functions/src/rbac/middleware";
import { encodeClaimsPermissions } from "../../../../functions/src/rbac/resolution-logic";
import type { PermissionGrant } from "../../../../functions/src/rbac/defaultGroups";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGrant(
  resource: string,
  operation: string,
  scope: "own" | "all" = "all",
  effect: "allow" | "deny" = "allow",
): PermissionGrant {
  return { resource, operation, scope, effect } as PermissionGrant;
}

function encodeGrants(grants: PermissionGrant[]): string {
  return encodeClaimsPermissions(grants);
}

interface MockRequest {
  auth?: {
    token?: {
      rbac?: {
        g?: string[];
        p?: string;
      };
    };
  };
  rbacScope?: string;
}

interface MockResponse {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
}

function createMockRequest(permissionsString?: string): MockRequest {
  if (permissionsString === undefined) {
    return {};
  }
  return {
    auth: {
      token: {
        rbac: {
          g: ["test-group"],
          p: permissionsString,
        },
      },
    },
  };
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
}

// ===========================================================================
// requirePermission middleware
// ===========================================================================

describe("requirePermission", () => {
  /**
   * TC-rbac-mw-001: Returns 403 when no RBAC claims are present.
   * Verifies: AC-6b.1
   */
  it("returns 403 when no RBAC claims present", async () => {
    const next = vi.fn();
    const middleware = requirePermission("events", "view");
    const req = createMockRequest(); // no auth at all
    const res = createMockResponse();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  /**
   * TC-rbac-mw-002: Returns 403 when permission is explicitly denied.
   * Verifies: AC-6b.2
   */
  it("returns 403 when permission is explicitly denied", async () => {
    const next = vi.fn();
    const grants = [makeGrant("events", "view", "all", "deny")];
    const encoded = encodeGrants(grants);

    const middleware = requirePermission("events", "view");
    const req = createMockRequest(encoded);
    const res = createMockResponse();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  /**
   * TC-rbac-mw-003: Returns 403 when permission is not granted (missing).
   * Verifies: AC-6b.3
   */
  it("returns 403 when permission is not granted", async () => {
    const next = vi.fn();
    // User has blog:view but not events:view
    const grants = [makeGrant("blog", "view", "all")];
    const encoded = encodeGrants(grants);

    const middleware = requirePermission("events", "view");
    const req = createMockRequest(encoded);
    const res = createMockResponse();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  /**
   * TC-rbac-mw-004: Calls next() and sets rbacScope='all' when permission granted with scope all.
   * Verifies: AC-6b.4
   */
  it("calls next() and sets rbacScope='all' when permission granted with scope all", async () => {
    const next = vi.fn();
    const grants = [makeGrant("events", "view", "all")];
    const encoded = encodeGrants(grants);

    const middleware = requirePermission("events", "view");
    const req = createMockRequest(encoded);
    const res = createMockResponse();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.rbacScope).toBe("all");
    expect(res.status).not.toHaveBeenCalled();
  });

  /**
   * TC-rbac-mw-005: Calls next() and sets rbacScope='own' when permission granted with scope own.
   * Verifies: AC-6b.4
   */
  it("calls next() and sets rbacScope='own' when permission granted with scope own", async () => {
    const next = vi.fn();
    const grants = [makeGrant("events", "create", "own")];
    const encoded = encodeGrants(grants);

    const middleware = requirePermission("events", "create");
    const req = createMockRequest(encoded);
    const res = createMockResponse();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.rbacScope).toBe("own");
    expect(res.status).not.toHaveBeenCalled();
  });

  /**
   * TC-rbac-mw-006: Handles wildcard permissions (*:*.a grants everything).
   * Verifies: AC-6b.5
   */
  it("handles wildcard permissions - *:*.a grants everything", async () => {
    const next = vi.fn();
    const middleware = requirePermission("settings", "delete");
    const req = createMockRequest("*:*.a");
    const res = createMockResponse();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.rbacScope).toBe("all");
    expect(res.status).not.toHaveBeenCalled();
  });

  /**
   * TC-rbac-mw-007: Deny overrides allow when both present.
   * Verifies: AC-6b.6
   */
  it("deny overrides allow when both present for same resource:op", async () => {
    const next = vi.fn();
    // Manually construct a string with both allow and deny for the same resource:op
    const encoded = "ev:v.a,!ev:v.a";

    const middleware = requirePermission("events", "view");
    const req = createMockRequest(encoded);
    const res = createMockResponse();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  /**
   * TC-rbac-mw-008: Handles resource wildcard (*:v.a grants view on any resource).
   * Verifies: AC-6b.5
   */
  it("handles resource wildcard - *:v.a grants view on any resource", async () => {
    const next = vi.fn();
    const middleware = requirePermission("analytics", "view");
    const req = createMockRequest("*:v.a");
    const res = createMockResponse();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.rbacScope).toBe("all");
  });

  /**
   * TC-rbac-mw-009: Handles operation wildcard (ev:*.a grants all ops on events).
   * Verifies: AC-6b.5
   */
  it("handles operation wildcard - ev:*.a grants all ops on events", async () => {
    const next = vi.fn();
    const middleware = requirePermission("events", "delete");
    const req = createMockRequest("ev:*.a");
    const res = createMockResponse();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.rbacScope).toBe("all");
  });

  /**
   * TC-rbac-mw-010: Returns 403 when auth exists but rbac claims are missing.
   * Verifies: AC-6b.1
   */
  it("returns 403 when auth token exists but rbac claims are missing", async () => {
    const next = vi.fn();
    const middleware = requirePermission("events", "view");
    const req: MockRequest = {
      auth: {
        token: {},
      },
    };
    const res = createMockResponse();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  /**
   * TC-rbac-mw-011: Returns 403 when permissions string is empty.
   * Verifies: AC-6b.1
   */
  it("returns 403 when permissions string is empty", async () => {
    const next = vi.fn();
    const middleware = requirePermission("events", "view");
    const req = createMockRequest("");
    const res = createMockResponse();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  /**
   * TC-rbac-mw-012: Handles deny wildcard (!*:*.a denies everything).
   * Verifies: AC-6b.5, AC-6b.6
   */
  it("deny wildcard !*:*.a denies everything", async () => {
    const next = vi.fn();
    const middleware = requirePermission("events", "view");
    // Allow events:view + deny all
    const req = createMockRequest("ev:v.a,!*:*.a");
    const res = createMockResponse();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
