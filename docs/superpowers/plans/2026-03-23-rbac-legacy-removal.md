# RBAC Legacy Removal Plan (Phase 5)

> **Prerequisites:** The RBAC system must be running in dual-mode (Phase 4) for a period. All users must have RBAC claims verified.

**Goal:** Remove all legacy role-based checks (`canModerate()`, `canAdminister()`, `AdminAuthGuard`) and make RBAC the sole authorization system.

---

## Pre-conditions

Before starting Phase 5:

- [x] All users have `rbac_user_groups` assignments (verified: 35 users)
- [x] All users have `rbac.p` custom claims set (verified via Firebase Admin SDK)
- [x] RBAC system has been running dual-mode with no permission issues reported
- [x] Audit log shows no resolution failures

---

## Steps

### Step 1: Remove legacy fallbacks from Firestore rules

**Status: COMPLETED (2026-03-26)**

**File:** `firestore.rules`

Removed `|| canModerate()` and `|| canAdminister()` fallbacks from all RBAC-managed collection rules:

- [x] `rbac_groups` — removed `|| canModerate()` / `|| canAdminister()`
- [x] `rbac_user_groups` — removed `|| canModerate()` / `|| canAdminister()`
- [x] `rbac_audit_log` — removed `|| canAdminister()`
- [x] `journal_club_sessions` — removed `|| canModerate()` / `|| canAdminister()`
- [x] `newsletter_archive` — removed `|| canAdminister()`
- [x] `spotlights` — removed `|| canModerate()` / `|| canAdminister()`
- [x] `events` — removed `|| canModerate()` / `|| canAdminister()` / `|| isOwner()` from create/update/delete; kept `allow read: if isAuthenticated()` for all users

Note: `canModerate()` and `canAdminister()` function definitions retained — still used by non-RBAC collections (jobs, forums, users, mentorship, etc.).

### Step 2: Replace AdminAuthGuard with RequirePermission

**Status: DEFERRED** — AdminAuthGuard is not currently in active use; will be addressed in a future cleanup pass.

### Step 3: Migrate DashboardSidebar from role-based to RBAC

**Status: PREVIOUSLY COMPLETED** — DashboardSidebar already uses `usePermissions()` hook.

### Step 4: Remove legacy role checks from Cloud Functions

**Status: COMPLETED (2026-03-26)**

**File:** `functions/src/get-salary-stats.ts`

- [x] Removed the legacy fallback `else` branch that checked `callerRole === 'admin'`
- [x] Removed `callerDoc`, `callerData`, `callerRole` variables (no longer needed)
- [x] RBAC claims are now the sole authorization path; no claims = public tier (unverified)

### Step 5: Update AdminPermission type

**Status: COMPLETED** — `@deprecated` JSDoc annotation already present on `AdminPermission` type in `src/types/admin.ts`. Type retained for backward compatibility until all consumers migrate.

### Step 6: Remove canModerate/canAdminister helper functions

**Status: DEFERRED** — Still referenced by non-RBAC collections (jobs, forums, users, mentorship, companies, reports, etc.). Will be removed when all collections migrate to RBAC.

### Step 7: Keep role field for display

**Status: CONFIRMED** — The `role` field on user documents stays for display purposes (badges, labels) but is no longer authoritative for access control in RBAC-managed collections.

---

## Additional: Remove legacy fallback from DashboardBottomNav

**Status: COMPLETED (2026-03-26)**

**File:** `src/components/nav/DashboardBottomNav.tsx`

- [x] Removed dual-mode ternary fallbacks (`hasRBAC ? can(...) : isAdminRole`)
- [x] Removed `userRole` state, Firestore `getDoc` for role, `isAdminOrMod`/`isAdminRole` variables
- [x] Removed `doc`, `getDoc` imports from `firebase/firestore` and `db` from `@/lib/firebase`
- [x] All permission checks now use `can()` directly from `usePermissions()` hook

---

## Verification

After completing all steps:

- [x] Legacy fallbacks removed from all RBAC-managed Firestore rules
- [x] getSalaryStats Cloud Function uses RBAC-only authorization
- [x] DashboardBottomNav uses RBAC-only permission checks
- [ ] All tests pass: `npm test`
- [ ] Type check passes: `npm run check`
- [ ] Build succeeds: `npm run build`
- [ ] Smoke test: admin can manage groups, member can view content, moderator can edit content
