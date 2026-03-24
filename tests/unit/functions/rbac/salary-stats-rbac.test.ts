/**
 * Tests for RBAC dual-mode permission checks in getSalaryStats Cloud Function.
 *
 * TC-salary-rbac-001 through TC-salary-rbac-006
 * Verifies: AC-14.B1 (RBAC claims check for salary-insights),
 *           AC-14.B1-fallback (legacy role fallback)
 *
 * These tests validate the decode + check logic used in get-salary-stats.ts.
 * The actual Cloud Function is not invoked — only the pure permission check
 * that determines isAdmin and isVerified is tested.
 */
import { describe, it, expect } from "vitest";

import {
  decodeClaimsPermissions,
  checkPermission,
  encodeClaimsPermissions,
} from "../../../../functions/src/rbac/resolution-logic";
import type { PermissionGrant } from "../../../../functions/src/rbac/defaultGroups";

// ---------------------------------------------------------------------------
// Helpers — replicate the dual-mode logic from get-salary-stats.ts
// ---------------------------------------------------------------------------

function makeGrant(
  resource: string,
  operation: string,
  scope: "own" | "all" = "all",
  effect: "allow" | "deny" = "allow",
): PermissionGrant {
  return { resource, operation, scope, effect } as PermissionGrant;
}

interface DualModeResult {
  isAdmin: boolean;
  isVerified: boolean;
}

function resolveAccess(
  rbacPermissionString: string | undefined,
  legacyRole: string,
  isVerifiedFlag: boolean,
): DualModeResult {
  if (rbacPermissionString) {
    const tokens = decodeClaimsPermissions(rbacPermissionString);
    const exportCheck = checkPermission(tokens, "salary-insights", "export");
    const isAdmin = exportCheck.allowed && exportCheck.scope === "all";
    const viewCheck = checkPermission(tokens, "salary-insights", "view");
    const isVerified = viewCheck.allowed;
    return { isAdmin, isVerified };
  }

  // Legacy fallback
  const isAdmin = legacyRole === "admin";
  const isVerified = isVerifiedFlag || isAdmin || legacyRole === "moderator";
  return { isAdmin, isVerified };
}

// ===========================================================================
// RBAC mode tests
// ===========================================================================

describe("getSalaryStats — RBAC dual-mode access control", () => {
  /**
   * TC-salary-rbac-001: Admin with export:all on salary-insights gets isAdmin=true.
   * Verifies: AC-14.B1
   */
  it("grants admin access when RBAC claims include salary-insights:export:all", () => {
    const grants = [
      makeGrant("salary-insights", "view", "all"),
      makeGrant("salary-insights", "export", "all"),
    ];
    const encoded = encodeClaimsPermissions(grants);
    const result = resolveAccess(encoded, "member", false);

    expect(result.isAdmin).toBe(true);
    expect(result.isVerified).toBe(true);
  });

  /**
   * TC-salary-rbac-002: Member with view only gets verified but not admin.
   * Verifies: AC-14.B1
   */
  it("grants verified but not admin when RBAC claims include salary-insights:view only", () => {
    const grants = [makeGrant("salary-insights", "view", "all")];
    const encoded = encodeClaimsPermissions(grants);
    const result = resolveAccess(encoded, "member", false);

    expect(result.isAdmin).toBe(false);
    expect(result.isVerified).toBe(true);
  });

  /**
   * TC-salary-rbac-003: User with no salary-insights permission gets neither.
   * Verifies: AC-14.B1
   */
  it("denies access when RBAC claims have no salary-insights permissions", () => {
    const grants = [makeGrant("events", "view", "all")];
    const encoded = encodeClaimsPermissions(grants);
    const result = resolveAccess(encoded, "member", false);

    expect(result.isAdmin).toBe(false);
    expect(result.isVerified).toBe(false);
  });

  /**
   * TC-salary-rbac-004: Export with own scope does not grant admin.
   * Verifies: AC-14.B1
   */
  it("does not grant admin when export scope is own, not all", () => {
    const grants = [
      makeGrant("salary-insights", "view", "all"),
      makeGrant("salary-insights", "export", "own"),
    ];
    const encoded = encodeClaimsPermissions(grants);
    const result = resolveAccess(encoded, "member", false);

    expect(result.isAdmin).toBe(false);
    expect(result.isVerified).toBe(true);
  });

  // ===========================================================================
  // Legacy fallback tests
  // ===========================================================================

  /**
   * TC-salary-rbac-005: Falls back to legacy role check when no RBAC claims.
   * Verifies: AC-14.B1-fallback
   */
  it("falls back to legacy role check when no RBAC claims present", () => {
    const adminResult = resolveAccess(undefined, "admin", false);
    expect(adminResult.isAdmin).toBe(true);
    expect(adminResult.isVerified).toBe(true);

    const modResult = resolveAccess(undefined, "moderator", false);
    expect(modResult.isAdmin).toBe(false);
    expect(modResult.isVerified).toBe(true);

    const memberResult = resolveAccess(undefined, "member", true);
    expect(memberResult.isAdmin).toBe(false);
    expect(memberResult.isVerified).toBe(true);

    const unverifiedResult = resolveAccess(undefined, "member", false);
    expect(unverifiedResult.isAdmin).toBe(false);
    expect(unverifiedResult.isVerified).toBe(false);
  });

  /**
   * TC-salary-rbac-006: Wildcard admin permissions grant full access.
   * Verifies: AC-14.B1
   */
  it("grants full access with wildcard admin permissions", () => {
    const result = resolveAccess("*:*.a", "member", false);

    expect(result.isAdmin).toBe(true);
    expect(result.isVerified).toBe(true);
  });
});
