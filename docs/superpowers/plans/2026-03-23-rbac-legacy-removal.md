# RBAC Legacy Removal Plan (Phase 5)

> **Prerequisites:** The RBAC system must be running in dual-mode (Phase 4) for a period. All users must have RBAC claims verified.

**Goal:** Remove all legacy role-based checks (`canModerate()`, `canAdminister()`, `AdminAuthGuard`) and make RBAC the sole authorization system.

---

## Pre-conditions

Before starting Phase 5:

- [ ] All users have `rbac_user_groups` assignments (verify: query `rbac_user_groups` collection, compare count to total users)
- [ ] All users have `rbac.p` custom claims set (verify: spot-check via Firebase Admin SDK)
- [ ] RBAC system has been running dual-mode for at least 2 weeks with no permission issues reported
- [ ] Audit log shows no resolution failures

---

## Steps

### Step 1: Remove legacy fallbacks from Firestore rules

**File:** `firestore.rules`

Remove `|| canModerate()` and `|| canAdminister()` fallbacks from all collection rules that currently use dual-mode checks:

- `rbac_groups` — remove `|| canModerate()` / `|| canAdminister()`
- `rbac_user_groups` — remove `|| canModerate()` / `|| canAdminister()`
- `rbac_audit_log` — remove `|| canAdminister()`
- `journal_club_sessions` — remove `|| canModerate()`
- `newsletter_archive` — remove legacy checks
- `spotlights` — remove legacy checks
- `events` — replace `allow read: if isAuthenticated()` with `hasRBACAllow('ev', 'v') && !hasRBACDeny('ev', 'v')`; remove all `|| canModerate()` / `|| canAdminister()` / `|| isOwner()` fallbacks

### Step 2: Replace AdminAuthGuard with RequirePermission

**File:** `src/components/admin/AdminAuthGuard.tsx`

Find all usages:

```bash
grep -r "AdminAuthGuard" src/ --include="*.tsx" --include="*.astro" -l
```

Replace each usage with `RequirePermission` using appropriate resource/operation:

- Admin dashboard → `<RequirePermission resource="settings" operation="view">`
- User management → `<RequirePermission resource="users" operation="view">`
- Content moderation → `<RequirePermission resource="forums" operation="moderate">`

Then delete `AdminAuthGuard.tsx`.

### Step 3: Migrate DashboardSidebar from role-based to RBAC

**File:** `src/components/dashboard/DashboardSidebar.tsx`

Replace `userProfile.role` checks with `usePermissions()` hook:

- `requireRole: ['admin']` → `can('settings', 'view')`
- `requireRole: ['admin', 'moderator']` → `can('reports', 'view')`
- `requireRole: ['admin', 'moderator', 'collaborator']` → `can('events', 'view')`

### Step 4: Remove legacy role checks from Cloud Functions

**File:** `functions/src/get-salary-stats.ts`

Remove the legacy fallback branch that checks `callerRole === 'admin'`. Keep only the RBAC claims check.

### Step 5: Update AdminPermission type

**File:** `src/types/admin.ts`

Remove the deprecated `AdminPermission` type. Update any remaining references to use `Resource` + `Operation` from `src/lib/rbac/types.ts`.

### Step 6: Remove canModerate/canAdminister helper functions

**File:** `firestore.rules`

Remove the `canModerate()` and `canAdminister()` helper functions once no rules reference them.

### Step 7: Keep role field for display

The `role` field on user documents (`users/{uid}.role`) stays for display purposes (badges, labels) but is no longer authoritative for access control.

---

## Verification

After completing all steps:

- [ ] `grep -r "canModerate\|canAdminister\|AdminAuthGuard\|callerRole" src/ functions/ firestore.rules` returns zero matches
- [ ] All tests pass: `npm test`
- [ ] Type check passes: `npm run check`
- [ ] Build succeeds: `npm run build`
- [ ] Smoke test: admin can manage groups, member can view content, moderator can edit content
