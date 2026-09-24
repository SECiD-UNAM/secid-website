# RBAC System & Content CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a structured RBAC system with dynamic groups, resource-scoped permissions, and full CRUD dashboard pages for journal-club, newsletter, spotlights, and events.

**Architecture:** Firestore-backed RBAC with groups and permission grants resolved into Firebase Auth custom claims. Three-layer enforcement: client-side React hook for UI gating, Cloud Function middleware for API guarding, and Firestore rules as last line of defense. Five-phase migration from existing role-based checks.

**Tech Stack:** TypeScript, React 18, Astro 4.x, Firebase (Auth custom claims, Firestore, Cloud Functions), Zod, React Hook Form, Vitest

**Spec:** `docs/superpowers/specs/2026-03-23-rbac-and-content-crud-design.md`

---

## File Structure

### RBAC Core (`src/lib/rbac/`)

| File          | Responsibility                                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`    | Resource, Operation, PermissionGrant, RBACGroup, UserGroupAssignment, RBACAuditEntry type definitions                                  |
| `codec.ts`    | Encode permissions → compressed claims string. Decode claims string → structured permissions. Abbreviation maps. Wildcard compression. |
| `resolver.ts` | Merge multiple groups' grants into effective permissions. Deny-wins logic. Scope broadening. Shared between client and Cloud Function. |
| `checker.ts`  | `checkPermission()`, `hasDeny()`, `hasAllow()`, `getEffectiveScope()`. Wildcard-aware matching.                                        |
| `hooks.ts`    | `usePermissions()` React hook. Reads claims from Firebase Auth token.                                                                  |
| `index.ts`    | Re-exports                                                                                                                             |

### RBAC Components (`src/components/rbac/`)

| File                         | Responsibility                                      |
| ---------------------------- | --------------------------------------------------- |
| `RequirePermission.tsx`      | Permission gate wrapper component                   |
| `AccessDenied.tsx`           | Fallback UI when permission denied                  |
| `PermissionMatrixPicker.tsx` | Grid UI for assigning permissions to groups (admin) |

### RBAC Cloud Functions (`functions/src/rbac/`)

| File                    | Responsibility                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `resolvePermissions.ts` | Firestore triggers: resolve user permissions on group/assignment change, set custom claims             |
| `middleware.ts`         | Express-style `requirePermission()` middleware for Cloud Function HTTP endpoints (Layer 2 enforcement) |
| `seedGroups.ts`         | Callable function to seed default system groups                                                        |
| `backfillUsers.ts`      | One-time migration: map existing roles → RBAC groups                                                   |

### Migration Scripts

| File                        | Responsibility                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `scripts/rbac-migration.ts` | One-time data migration: backfill `createdBy`, `status`, timestamps on existing newsletter/spotlight docs |

### Content Services

| File                      | Responsibility                                                             |
| ------------------------- | -------------------------------------------------------------------------- |
| `src/lib/journal-club.ts` | NEW — CRUD operations for `journal_club_sessions` Firestore collection     |
| `src/lib/newsletter.ts`   | RENAMED from `newsletter-archive.ts` — add create/update/delete operations |
| `src/lib/spotlights.ts`   | MODIFIED — add `deleteSpotlight()`                                         |

### Content Components

| File                                                    | Responsibility                                     |
| ------------------------------------------------------- | -------------------------------------------------- |
| `src/components/journal-club/JournalClubForm.tsx`       | NEW — React Hook Form + Zod form for create/edit   |
| `src/components/journal-club/JournalClubManageList.tsx` | NEW — List with search, filters, actions           |
| `src/components/journal-club/JournalClubPublicList.tsx` | NEW — Public-facing list (replaces hardcoded data) |
| `src/components/newsletter/NewsletterForm.tsx`          | NEW — Form for create/edit newsletter issues       |
| `src/components/newsletter/NewsletterManageList.tsx`    | NEW — List with search, filters, actions           |
| `src/components/spotlight/SpotlightManageList.tsx`      | NEW — List with search, filters, actions           |

### Wrappers (Astro-React bridge)

| File                                                    | Responsibility                                    |
| ------------------------------------------------------- | ------------------------------------------------- |
| `src/components/wrappers/JournalClubFormPage.tsx`       | AuthProvider + JournalClubForm                    |
| `src/components/wrappers/JournalClubManageListPage.tsx` | AuthProvider + JournalClubManageList              |
| `src/components/wrappers/JournalClubPublicListPage.tsx` | JournalClubPublicList (no auth needed for public) |
| `src/components/wrappers/NewsletterFormPage.tsx`        | AuthProvider + NewsletterForm                     |
| `src/components/wrappers/NewsletterManageListPage.tsx`  | AuthProvider + NewsletterManageList               |
| `src/components/wrappers/SpotlightManageListPage.tsx`   | AuthProvider + SpotlightManageList                |

### Dashboard Pages (×2 langs — `es` and `en`)

Each lang gets identical pages with different `lang` prop. Pattern follows existing `src/pages/es/dashboard/events/new.astro`.

**Journal Club:** `index.astro`, `new.astro`, `edit/[id].astro`, `[id].astro`
**Newsletter:** `index.astro`, `new.astro`, `edit/[id].astro`
**Spotlights:** `index.astro`, `edit/[id].astro`
**Admin Groups:** `index.astro`, `new.astro`, `edit/[id].astro`, `[id].astro`

---

## Phase 1: RBAC Core (Tasks 1-6)

### Task 1: RBAC Types

**Files:**

- Create: `src/lib/rbac/types.ts`
- Test: `tests/unit/lib/rbac/types.test.ts`

- [ ] **Step 1: Write the test for type constants**

```typescript
// tests/unit/lib/rbac/types.test.ts
import { describe, it, expect } from 'vitest';
import {
  RESOURCES,
  OPERATIONS,
  RESOURCE_ABBREV,
  OP_ABBREV,
} from '@/lib/rbac/types';

describe('RBAC Types', () => {
  it('defines 19 resources', () => {
    expect(RESOURCES).toHaveLength(19);
    expect(RESOURCES).toContain('events');
    expect(RESOURCES).toContain('journal-club');
    expect(RESOURCES).toContain('groups');
  });

  it('defines 8 operations', () => {
    expect(OPERATIONS).toHaveLength(8);
    expect(OPERATIONS).toContain('view');
    expect(OPERATIONS).toContain('publish');
  });

  it('has 2-char abbreviations for all resources', () => {
    for (const r of RESOURCES) {
      expect(RESOURCE_ABBREV[r]).toBeDefined();
      expect(RESOURCE_ABBREV[r]).toHaveLength(2);
    }
  });

  it('has 1-char abbreviations for all operations', () => {
    for (const op of OPERATIONS) {
      expect(OP_ABBREV[op]).toBeDefined();
      expect(OP_ABBREV[op]).toHaveLength(1);
    }
  });

  it('has no duplicate abbreviations', () => {
    const rAbbrevs = Object.values(RESOURCE_ABBREV);
    expect(new Set(rAbbrevs).size).toBe(rAbbrevs.length);
    const opAbbrevs = Object.values(OP_ABBREV);
    expect(new Set(opAbbrevs).size).toBe(opAbbrevs.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/lib/rbac/types.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the types module**

Create `src/lib/rbac/types.ts` with:

- `Resource` type union (19 values from spec section 6.1)
- `Operation` type union (8 values from spec section 6.2)
- `RESOURCES` const array, `OPERATIONS` const array
- `RESOURCE_ABBREV` and `OP_ABBREV` maps (from spec section 6.4)
- `RESOURCE_FROM_ABBREV` and `OP_FROM_ABBREV` reverse maps
- `PermissionGrant`, `RBACGroup`, `UserGroupAssignment`, `RBACAuditEntry` interfaces (from spec section 6.3)
- `Scope` type: `'own' | 'all'`
- `Effect` type: `'allow' | 'deny'`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/lib/rbac/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/rbac/types.ts tests/unit/lib/rbac/types.test.ts
git commit -m "feat(rbac): add RBAC type definitions and constants"
```

---

### Task 2: Permission Codec (encode/decode)

**Files:**

- Create: `src/lib/rbac/codec.ts`
- Test: `tests/unit/lib/rbac/codec.test.ts`
- Depends on: Task 1

- [ ] **Step 1: Write failing tests for encode/decode**

```typescript
// tests/unit/lib/rbac/codec.test.ts
import { describe, it, expect } from 'vitest';
import { encodePermissions, decodePermissions } from '@/lib/rbac/codec';
import type { PermissionGrant } from '@/lib/rbac/types';

describe('Permission Codec', () => {
  describe('encodePermissions', () => {
    it('encodes a single grant', () => {
      const grants: PermissionGrant[] = [
        {
          resource: 'events',
          operation: 'create',
          scope: 'all',
          effect: 'allow',
        },
      ];
      expect(encodePermissions(grants)).toBe('ev:c.a');
    });

    it('encodes multiple grants comma-separated', () => {
      const grants: PermissionGrant[] = [
        {
          resource: 'events',
          operation: 'create',
          scope: 'all',
          effect: 'allow',
        },
        {
          resource: 'events',
          operation: 'edit',
          scope: 'own',
          effect: 'allow',
        },
      ];
      expect(encodePermissions(grants)).toBe('ev:c.a,ev:e.o');
    });

    it('prefixes deny grants with !', () => {
      const grants: PermissionGrant[] = [
        {
          resource: 'forums',
          operation: 'delete',
          scope: 'all',
          effect: 'deny',
        },
      ];
      expect(encodePermissions(grants)).toBe('!fo:d.a');
    });

    it('compresses to resource wildcard when all ops have same scope', () => {
      const grants: PermissionGrant[] = OPERATIONS.map((op) => ({
        resource: 'events' as const,
        operation: op,
        scope: 'all' as const,
        effect: 'allow' as const,
      }));
      expect(encodePermissions(grants)).toBe('ev:*.a');
    });

    it('compresses to full wildcard for super-admin', () => {
      const grants: PermissionGrant[] = [];
      for (const r of RESOURCES) {
        for (const op of OPERATIONS) {
          grants.push({
            resource: r,
            operation: op,
            scope: 'all',
            effect: 'allow',
          });
        }
      }
      expect(encodePermissions(grants)).toBe('*:*.a');
    });
  });

  describe('decodePermissions', () => {
    it('decodes a single grant', () => {
      const result = decodePermissions('ev:c.a');
      expect(result.allows).toContainEqual({
        resource: 'events',
        operation: 'create',
        scope: 'all',
      });
    });

    it('decodes deny grants', () => {
      const result = decodePermissions('!fo:d.a');
      expect(result.denies).toContainEqual({
        resource: 'forums',
        operation: 'delete',
        scope: 'all',
      });
    });

    it('decodes wildcards', () => {
      const result = decodePermissions('*:*.a');
      expect(result.wildcards).toContainEqual({
        resource: '*',
        operation: '*',
        scope: 'all',
        effect: 'allow',
      });
    });

    it('round-trips encode → decode', () => {
      const grants: PermissionGrant[] = [
        {
          resource: 'events',
          operation: 'create',
          scope: 'all',
          effect: 'allow',
        },
        {
          resource: 'forums',
          operation: 'delete',
          scope: 'all',
          effect: 'deny',
        },
      ];
      const encoded = encodePermissions(grants);
      const decoded = decodePermissions(encoded);
      expect(decoded.allows).toHaveLength(1);
      expect(decoded.denies).toHaveLength(1);
    });

    it('handles empty string', () => {
      const result = decodePermissions('');
      expect(result.allows).toHaveLength(0);
      expect(result.denies).toHaveLength(0);
    });
  });
});
```

Note: import `RESOURCES` and `OPERATIONS` from types in the test file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/lib/rbac/codec.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement codec**

Create `src/lib/rbac/codec.ts`:

- `encodePermissions(grants: PermissionGrant[]): string` — abbreviate, prefix deny with `!`, compress wildcards per spec section 7.1 steps 5a-5c
- `decodePermissions(encoded: string): ResolvedPermissions` — parse comma-separated entries back into structured form
- `ResolvedPermissions` type: `{ allows: DecodedGrant[], denies: DecodedGrant[], wildcards: DecodedWildcard[] }`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/lib/rbac/codec.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/rbac/codec.ts tests/unit/lib/rbac/codec.test.ts
git commit -m "feat(rbac): add permission codec (encode/decode with wildcards)"
```

---

### Task 3: Permission Checker

**Files:**

- Create: `src/lib/rbac/checker.ts`
- Test: `tests/unit/lib/rbac/checker.test.ts`
- Depends on: Task 2

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/lib/rbac/checker.test.ts
import { describe, it, expect } from 'vitest';
import {
  checkPermission,
  hasDeny,
  hasAllow,
  getEffectiveScope,
} from '@/lib/rbac/checker';
import { decodePermissions } from '@/lib/rbac/codec';

describe('Permission Checker', () => {
  it('returns true for matching allow grant', () => {
    const perms = decodePermissions('ev:c.a');
    expect(checkPermission(perms, 'events', 'create')).toBe(true);
  });

  it('returns false for missing grant', () => {
    const perms = decodePermissions('ev:c.a');
    expect(checkPermission(perms, 'events', 'delete')).toBe(false);
  });

  it('returns false when denied', () => {
    const perms = decodePermissions('ev:c.a,!ev:c.a');
    expect(checkPermission(perms, 'events', 'create')).toBe(false);
  });

  it('scope: "all" required rejects "own" grant', () => {
    const perms = decodePermissions('ev:e.o');
    expect(checkPermission(perms, 'events', 'edit', 'all')).toBe(false);
  });

  it('scope: "own" or omitted accepts "all" grant', () => {
    const perms = decodePermissions('ev:e.a');
    expect(checkPermission(perms, 'events', 'edit', 'own')).toBe(true);
    expect(checkPermission(perms, 'events', 'edit')).toBe(true);
  });

  it('full wildcard grants everything', () => {
    const perms = decodePermissions('*:*.a');
    expect(checkPermission(perms, 'events', 'create')).toBe(true);
    expect(checkPermission(perms, 'newsletter', 'delete', 'all')).toBe(true);
  });

  it('resource wildcard grants all ops on that resource', () => {
    const perms = decodePermissions('ev:*.a');
    expect(checkPermission(perms, 'events', 'create')).toBe(true);
    expect(checkPermission(perms, 'events', 'delete')).toBe(true);
    expect(checkPermission(perms, 'newsletter', 'create')).toBe(false);
  });

  it('operation wildcard grants that op on all resources', () => {
    const perms = decodePermissions('*:v.a');
    expect(checkPermission(perms, 'events', 'view')).toBe(true);
    expect(checkPermission(perms, 'newsletter', 'view')).toBe(true);
    expect(checkPermission(perms, 'events', 'create')).toBe(false);
  });

  it('getEffectiveScope returns broadest scope', () => {
    const perms = decodePermissions('ev:e.a');
    expect(getEffectiveScope(perms, 'events', 'edit')).toBe('all');
  });

  it('getEffectiveScope returns own when only own granted', () => {
    const perms = decodePermissions('ev:e.o');
    expect(getEffectiveScope(perms, 'events', 'edit')).toBe('own');
  });

  it('getEffectiveScope returns null when no grant', () => {
    const perms = decodePermissions('ev:e.o');
    expect(getEffectiveScope(perms, 'events', 'delete')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/lib/rbac/checker.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement checker**

Create `src/lib/rbac/checker.ts`:

- `checkPermission(perms, resource, operation, requiredScope?)` — deny-first check, then allow check, wildcard-aware. If `requiredScope` is `'all'`, only `scope: 'all'` grants match. If omitted or `'own'`, both `own` and `all` match.
- `hasDeny(perms, resource, operation)` — check deny list + wildcards
- `hasAllow(perms, resource, operation, requiredScope?)` — check allow list + wildcards
- `getEffectiveScope(perms, resource, operation)` — returns `'all'`, `'own'`, or `null`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/lib/rbac/checker.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/rbac/checker.ts tests/unit/lib/rbac/checker.test.ts
git commit -m "feat(rbac): add permission checker with wildcard and deny support"
```

---

### Task 4: Permission Resolver

**Files:**

- Create: `src/lib/rbac/resolver.ts`
- Test: `tests/unit/lib/rbac/resolver.test.ts`
- Depends on: Task 2

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/lib/rbac/resolver.test.ts
import { describe, it, expect } from 'vitest';
import { resolvePermissions } from '@/lib/rbac/resolver';
import type { RBACGroup } from '@/lib/rbac/types';

describe('Permission Resolver', () => {
  const makeGroup = (
    id: string,
    permissions: RBACGroup['permissions']
  ): RBACGroup => ({
    id,
    name: id,
    description: '',
    permissions,
    isSystem: false,
    createdBy: 'test',
    createdAt: new Date() as any,
    updatedAt: new Date() as any,
  });

  it('merges permissions from multiple groups', () => {
    const groups = [
      makeGroup('g1', [
        {
          resource: 'events',
          operation: 'view',
          scope: 'all',
          effect: 'allow',
        },
      ]),
      makeGroup('g2', [
        {
          resource: 'events',
          operation: 'create',
          scope: 'own',
          effect: 'allow',
        },
      ]),
    ];
    const result = resolvePermissions(groups);
    expect(result).toHaveLength(2);
  });

  it('broadens scope: own + all → all', () => {
    const groups = [
      makeGroup('g1', [
        {
          resource: 'events',
          operation: 'edit',
          scope: 'own',
          effect: 'allow',
        },
      ]),
      makeGroup('g2', [
        {
          resource: 'events',
          operation: 'edit',
          scope: 'all',
          effect: 'allow',
        },
      ]),
    ];
    const result = resolvePermissions(groups);
    const editGrant = result.find(
      (g) => g.resource === 'events' && g.operation === 'edit'
    );
    expect(editGrant?.scope).toBe('all');
  });

  it('deny beats allow on same resource+operation', () => {
    const groups = [
      makeGroup('g1', [
        {
          resource: 'forums',
          operation: 'delete',
          scope: 'all',
          effect: 'allow',
        },
      ]),
      makeGroup('g2', [
        {
          resource: 'forums',
          operation: 'delete',
          scope: 'all',
          effect: 'deny',
        },
      ]),
    ];
    const result = resolvePermissions(groups);
    const deleteGrant = result.find(
      (g) => g.resource === 'forums' && g.operation === 'delete'
    );
    expect(deleteGrant?.effect).toBe('deny');
  });

  it('returns empty array for no groups', () => {
    expect(resolvePermissions([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/lib/rbac/resolver.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement resolver**

Create `src/lib/rbac/resolver.ts`:

- `resolvePermissions(groups: RBACGroup[]): PermissionGrant[]` — implements spec section 7.1 steps 1-4. Builds map keyed by `{resource}:{operation}`, merges scopes (broadest wins), deny beats allow.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/lib/rbac/resolver.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/rbac/resolver.ts tests/unit/lib/rbac/resolver.test.ts
git commit -m "feat(rbac): add permission resolver (merge, deny-wins, scope-broadening)"
```

---

### Task 5: RBAC React Hook & Components

**Files:**

- Create: `src/lib/rbac/hooks.ts`
- Create: `src/lib/rbac/index.ts`
- Create: `src/components/rbac/RequirePermission.tsx`
- Create: `src/components/rbac/AccessDenied.tsx`
- Test: `tests/unit/lib/rbac/hooks.test.ts`
- Test: `tests/unit/components/rbac/RequirePermission.test.tsx`
- Depends on: Tasks 2, 3

Note: `usePermissions()` reads claims directly via `user.getIdTokenResult()` — no AuthContext modification needed.

- [ ] **Step 1: Write failing test for usePermissions hook**

Test that `usePermissions()` returns `{ can, loading, permissions }`. Mock `useAuth()` to return a user whose `getIdTokenResult()` resolves claims with `rbac.p`. Verify `can('events', 'create')` returns correct values.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/lib/rbac/hooks.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement usePermissions hook**

Create `src/lib/rbac/hooks.ts`:

- `usePermissions()` — reads `user.getIdTokenResult().claims.rbac.p`, decodes via `decodePermissions`, provides `can(resource, operation, requiredScope?)` function. Caches decoded permissions in state. Re-decodes on user change.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/lib/rbac/hooks.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing test for RequirePermission**

Test that `RequirePermission` renders children when permission is granted, renders `AccessDenied` when denied, and renders `LoadingSpinner` while loading.

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/components/rbac/RequirePermission.test.tsx`
Expected: FAIL

- [ ] **Step 7: Implement RequirePermission and AccessDenied**

Create `src/components/rbac/RequirePermission.tsx` (as spec section 8.1).
Create `src/components/rbac/AccessDenied.tsx` — simple bilingual "Access Denied" message with link back to dashboard.

- [ ] **Step 8: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/components/rbac/RequirePermission.test.tsx`
Expected: PASS

- [ ] **Step 9: Create index.ts re-exports**

Create `src/lib/rbac/index.ts` — re-exports all public API from types, codec, checker, resolver, hooks.

- [ ] **Step 10: Commit**

```bash
git add src/lib/rbac/hooks.ts src/lib/rbac/index.ts \
  src/components/rbac/RequirePermission.tsx src/components/rbac/AccessDenied.tsx \
  tests/unit/lib/rbac/hooks.test.ts tests/unit/components/rbac/RequirePermission.test.tsx
git commit -m "feat(rbac): add usePermissions hook, RequirePermission, AccessDenied components"
```

---

### Task 6: Cloud Functions — Permission Resolution & Seed

**Files:**

- Create: `functions/src/rbac/resolvePermissions.ts`
- Create: `functions/src/rbac/seedGroups.ts`
- Create: `functions/src/rbac/backfillUsers.ts`
- Create: `functions/src/rbac/defaultGroups.ts` — default system group definitions
- Modify: `functions/src/index.ts` — export new functions
- Test: `tests/unit/functions/rbac/resolvePermissions.test.ts`
- Depends on: Tasks 1, 2, 4

- [ ] **Step 1: Write failing test for resolvePermissions Cloud Function**

Test the core logic: given a userId, mock Firestore reads for `rbac_user_groups` and `rbac_groups`, verify the function produces the correct compressed claims string and calls `auth.setCustomUserClaims()` with the right payload.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/functions/rbac/resolvePermissions.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement resolvePermissions**

Create `functions/src/rbac/resolvePermissions.ts`:

- `onUserGroupWrite` — Firestore trigger on `rbac_user_groups/{userId}`. Fetches groups, resolves permissions, encodes, sets custom claims, writes audit log.
- `onGroupWrite` — Firestore trigger on `rbac_groups/{groupId}`. Queries all users in that group, batch-resolves with concurrency limit (10), debounce via `pending_resolution` field, partial failure retry (max 3).

Import resolver from a shared location. Note: The resolver logic in `src/lib/rbac/resolver.ts` uses browser-compatible types. For Cloud Functions, either:

- Copy the core logic (small, ~50 lines), or
- Use a shared package path that both can import

Recommended: duplicate the resolver logic in `functions/src/rbac/` for simplicity since Cloud Functions have their own build. Keep types aligned.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/functions/rbac/resolvePermissions.test.ts`
Expected: PASS

- [ ] **Step 5: Implement seedGroups and defaultGroups**

Create `functions/src/rbac/defaultGroups.ts` — exports the 9 default system groups from spec section 9, each with full `permissions` arrays.

Create `functions/src/rbac/seedGroups.ts` — callable Cloud Function that writes default groups to `rbac_groups` if they don't exist. Sets `isSystem: true`.

- [ ] **Step 6: Implement backfillUsers**

Create `functions/src/rbac/backfillUsers.ts` — callable Cloud Function that:

1. Lists all users via Firebase Admin `auth().listUsers()`
2. For each user, reads their `role` from Firestore `users/{uid}`
3. Maps role → groups per spec section 12 Phase 2 table
4. Writes to `rbac_user_groups/{uid}`
5. Triggers resolution (or resolves inline)
6. Logs results

- [ ] **Step 7: Export from functions/src/index.ts**

Add exports for `onUserGroupWrite`, `onGroupWrite`, `seedDefaultGroups`, `backfillUsersToRBAC`.

- [ ] **Step 8: Run full RBAC test suite**

Run: `npm run test:unit -- tests/unit/lib/rbac/ tests/unit/functions/rbac/`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add functions/src/rbac/ functions/src/index.ts tests/unit/functions/rbac/
git commit -m "feat(rbac): add Cloud Functions for permission resolution, seed, and backfill"
```

---

### Task 6b: Cloud Function RBAC Middleware (Layer 2)

**Files:**

- Create: `functions/src/rbac/middleware.ts`
- Test: `tests/unit/functions/rbac/middleware.test.ts`
- Depends on: Tasks 2, 3

- [ ] **Step 1: Write failing test**

Test the Express-style middleware:

- Returns 403 when no RBAC claims present
- Returns 403 when permission is denied
- Returns 403 when permission is not granted
- Calls `next()` and sets `req.rbacScope` when permission is granted
- Correctly checks deny-first, then allow

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/functions/rbac/middleware.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement middleware**

Create `functions/src/rbac/middleware.ts`:

- `requirePermission(resource, operation, scope?)` — returns Express middleware (spec section 8.2)
- Decodes `req.auth.token.rbac.p` using codec (duplicate the decode logic here for Cloud Functions isolation)
- Deny-first check, then allow check
- Sets `req.rbacScope` for downstream ownership checks

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/functions/rbac/middleware.test.ts`
Expected: PASS

- [ ] **Step 5: Export from functions/src/index.ts**

Add `requirePermission` to exports so it can be used by other Cloud Function endpoints.

- [ ] **Step 6: Commit**

```bash
git add functions/src/rbac/middleware.ts tests/unit/functions/rbac/middleware.test.ts functions/src/index.ts
git commit -m "feat(rbac): add Cloud Function RBAC middleware (Layer 2 enforcement)"
```

---

## Phase 2: Content CRUD Services (Tasks 7-9)

### Task 7: Journal Club Service

**Files:**

- Create: `src/lib/journal-club.ts`
- Test: `tests/unit/lib/journal-club.test.ts`

- [ ] **Step 1: Write failing tests**

Test all CRUD functions with mock Firestore:

- `getJournalClubSessions()` — returns published sessions ordered by date desc
- `getJournalClubSession(id)` — returns single session or null
- `createJournalClubSession(data)` — writes to Firestore with `createdBy`, `createdAt`, `updatedAt`
- `updateJournalClubSession(id, data)` — updates with `updatedAt`
- `deleteJournalClubSession(id)` — deletes doc
- Falls back to mock data when `isUsingMockAPI()`

Follow the pattern in `src/lib/spotlights.ts` for mock data fallback and Firestore query structure.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/lib/journal-club.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement journal-club service**

Create `src/lib/journal-club.ts`:

- Import from `./firebase` (`db`, `isUsingMockAPI`)
- Collection name: `'journal_club_sessions'`
- Export `JournalClubSession` interface (from spec section 6.5)
- Mock data: 3-4 sample sessions for development
- All query patterns follow existing `src/lib/spotlights.ts`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/lib/journal-club.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/journal-club.ts tests/unit/lib/journal-club.test.ts
git commit -m "feat(journal-club): add Firestore service with CRUD operations"
```

---

### Task 8: Newsletter Service (upgrade)

**Files:**

- Rename: `src/lib/newsletter-archive.ts` → `src/lib/newsletter.ts`
- Modify: `src/lib/newsletter.ts` — add create/update/delete, add new fields
- Modify: `src/components/newsletter/NewsletterArchive.tsx` — update import path
- Modify: `src/components/wrappers/NewsletterArchivePage.tsx` — update import path
- Modify: `src/components/wrappers/NewsletterViewPage.tsx` — update import path (check if it imports from newsletter-archive)
- Test: `tests/unit/lib/newsletter.test.ts`

- [ ] **Step 1: Write failing tests for new CUD operations**

```typescript
// tests/unit/lib/newsletter.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('Newsletter Service', () => {
  it('createNewsletter writes to Firestore with required fields', async () => {
    // Mock addDoc, verify it receives createdBy, createdAt, updatedAt, status
  });

  it('updateNewsletter updates doc with updatedAt and updatedBy', async () => {
    // Mock updateDoc
  });

  it('deleteNewsletter removes doc', async () => {
    // Mock deleteDoc
  });

  it('getNewsletterArchive returns published newsletters ordered by date', async () => {
    // Existing behavior — verify mock data fallback works
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/lib/newsletter.test.ts`
Expected: FAIL

- [ ] **Step 3: Rename file and add CUD operations**

Rename `src/lib/newsletter-archive.ts` → `src/lib/newsletter.ts`.

Add to the file:

- Update `NewsletterIssue` interface with `status`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt` fields (spec section 6.6)
- `createNewsletter(data, userId)` — `addDoc` with `createdBy: userId`, `createdAt: serverTimestamp()`, `updatedAt: serverTimestamp()`
- `updateNewsletter(id, data, userId)` — `updateDoc` with `updatedBy: userId`, `updatedAt: serverTimestamp()`
- `deleteNewsletter(id)` — `deleteDoc`

- [ ] **Step 4: Update import paths in consumers**

Update all consumers that import from `@/lib/newsletter-archive` to use `@/lib/newsletter`:

- `src/components/newsletter/NewsletterArchive.tsx` (line 2: imports `getNewsletterArchive`)
- `src/components/newsletter/NewsletterView.tsx` (line 2: imports `getNewsletter, type NewsletterIssue`)
- `src/components/wrappers/NewsletterArchivePage.tsx` (if it imports from old path)
- `src/components/wrappers/NewsletterViewPage.tsx` (if it imports from old path)

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/lib/newsletter.test.ts`
Expected: PASS

- [ ] **Step 6: Verify no broken imports**

Run: `npm run check`
Expected: No new errors related to newsletter imports

- [ ] **Step 7: Commit**

```bash
git add src/lib/newsletter.ts src/components/newsletter/NewsletterArchive.tsx \
  src/components/newsletter/NewsletterView.tsx src/components/wrappers/NewsletterArchivePage.tsx \
  src/components/wrappers/NewsletterViewPage.tsx tests/unit/lib/newsletter.test.ts
git rm src/lib/newsletter-archive.ts
git commit -m "feat(newsletter): rename service, add create/update/delete operations"
```

---

### Task 9: Spotlights Service (add delete)

**Files:**

- Modify: `src/lib/spotlights.ts` — add `deleteSpotlight()`
- Test: `tests/unit/lib/spotlights-delete.test.ts`

- [ ] **Step 1: Write failing test for deleteSpotlight**

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/lib/spotlights-delete.test.ts`
Expected: FAIL

- [ ] **Step 3: Add deleteSpotlight to service**

Add to `src/lib/spotlights.ts`:

```typescript
export async function deleteSpotlight(id: string): Promise<void> {
  const docRef = doc(db, 'spotlights', id);
  await deleteDoc(docRef);
}
```

Also add `deleteDoc` to the imports from `firebase/firestore`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/lib/spotlights-delete.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/spotlights.ts tests/unit/lib/spotlights-delete.test.ts
git commit -m "feat(spotlights): add deleteSpotlight service function"
```

---

## Phase 3: CRUD Components & Pages (Tasks 10-14)

### Task 10: Journal Club — Form, List, Public List

**Files:**

- Create: `src/components/journal-club/JournalClubForm.tsx`
- Create: `src/components/journal-club/journal-club-form-schema.ts`
- Create: `src/components/journal-club/JournalClubManageList.tsx`
- Create: `src/components/journal-club/JournalClubPublicList.tsx`
- Create: `src/components/wrappers/JournalClubFormPage.tsx`
- Create: `src/components/wrappers/JournalClubManageListPage.tsx`
- Create: `src/components/wrappers/JournalClubPublicListPage.tsx`
- Depends on: Tasks 5, 7

- [ ] **Step 1: Create form schema**

Create `src/components/journal-club/journal-club-form-schema.ts` following the pattern from `src/components/events/event-form-schema.ts`:

- Zod schema with fields: `topic` (required, min 5), `presenter` (required), `date` (required), `description` (optional, max 5000), `paperUrl` (optional URL), `slidesUrl` (optional URL), `recordingUrl` (optional URL), `status` ('draft' | 'published' | 'cancelled'), `tags` (optional comma-separated string)
- i18n labels (es/en)
- `JournalClubFormData` type

- [ ] **Step 2: Create JournalClubForm component**

Create `src/components/journal-club/JournalClubForm.tsx`:

- Props: `lang`, `sessionId?` (for edit mode), `session?` (existing data)
- Uses React Hook Form + Zod resolver
- On submit: calls `createJournalClubSession` or `updateJournalClubSession` from service
- Wraps the submit area with `RequirePermission resource="journal-club" operation={sessionId ? 'edit' : 'create'}`
- Success message and redirect to management list
- Follow the structure/style of `src/components/events/EventForm.tsx`

- [ ] **Step 3: Create JournalClubManageList component**

Create `src/components/journal-club/JournalClubManageList.tsx`:

- Fetches all sessions (not just published) from service
- Search bar filtering by topic/presenter
- Status filter dropdown (all, draft, published, cancelled)
- Sorted by date descending
- Each row: date, topic, presenter, status badge, actions (edit, delete, toggle publish)
- Delete action gated by `can('journal-club', 'delete')`
- Edit action gated by `can('journal-club', 'edit')`
- "New Session" button gated by `can('journal-club', 'create')`

- [ ] **Step 4: Create JournalClubPublicList component**

Create `src/components/journal-club/JournalClubPublicList.tsx`:

- Fetches published sessions only
- Displays in a card/table format matching current hardcoded layout
- No auth required — public component

- [ ] **Step 5: Create wrapper components**

Create the three wrappers following the `EventFormPage.tsx` pattern:

- `JournalClubFormPage.tsx` — `AuthProvider` + `JournalClubForm`
- `JournalClubManageListPage.tsx` — `AuthProvider` + `JournalClubManageList`
- `JournalClubPublicListPage.tsx` — `JournalClubPublicList` (no AuthProvider needed)

- [ ] **Step 6: Commit**

```bash
git add src/components/journal-club/ src/components/wrappers/JournalClub*
git commit -m "feat(journal-club): add form, manage list, and public list components"
```

---

### Task 11: Journal Club — Dashboard Pages & Public Page Update

**Files:**

- Create: `src/pages/es/dashboard/journal-club/index.astro`
- Create: `src/pages/es/dashboard/journal-club/new.astro`
- Create: `src/pages/es/dashboard/journal-club/edit/[id].astro`
- Create: `src/pages/es/dashboard/journal-club/[id].astro`
- Create: `src/pages/en/dashboard/journal-club/index.astro`
- Create: `src/pages/en/dashboard/journal-club/new.astro`
- Create: `src/pages/en/dashboard/journal-club/edit/[id].astro`
- Create: `src/pages/en/dashboard/journal-club/[id].astro`
- Modify: `src/pages/es/journal-club.astro` — replace hardcoded data
- Modify: `src/pages/en/journal-club.astro` — replace hardcoded data
- Depends on: Task 10

- [ ] **Step 1: Create ES dashboard pages**

Follow the exact pattern from `src/pages/es/dashboard/events/new.astro`:

- Use `DashboardLayout`
- Import wrapper component with `client:only="react"`
- Spanish labels and back links

Create all 4 pages: index (list), new (create), edit/[id] (edit), [id] (detail).

- [ ] **Step 2: Create EN dashboard pages**

Same structure, `lang="en"`, English labels.

- [ ] **Step 3: Update public journal-club pages**

Modify `src/pages/es/journal-club.astro`:

- Remove the hardcoded `sessions` array
- Import `JournalClubPublicListPage` wrapper
- Add `<JournalClubPublicListPage client:only="react" lang="es" />` where the sessions list was
- Keep the rest of the page (hero, description) as-is

Do the same for `src/pages/en/journal-club.astro`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/es/dashboard/journal-club/ src/pages/en/dashboard/journal-club/ \
  src/pages/es/journal-club.astro src/pages/en/journal-club.astro
git commit -m "feat(journal-club): add dashboard CRUD pages, update public page to use Firestore"
```

---

### Task 12: Newsletter — Form, List, Dashboard Pages

**Files:**

- Create: `src/components/newsletter/NewsletterForm.tsx`
- Create: `src/components/newsletter/newsletter-form-schema.ts`
- Create: `src/components/newsletter/NewsletterManageList.tsx`
- Create: `src/components/wrappers/NewsletterFormPage.tsx`
- Create: `src/components/wrappers/NewsletterManageListPage.tsx`
- Create: `src/pages/{es,en}/dashboard/newsletter/index.astro`
- Create: `src/pages/{es,en}/dashboard/newsletter/new.astro`
- Create: `src/pages/{es,en}/dashboard/newsletter/edit/[id].astro`
- Depends on: Tasks 5, 8

- [ ] **Step 1: Create form schema**

`newsletter-form-schema.ts`: Zod schema with `title` (required), `issueNumber` (required number), `content` (required HTML string), `excerpt` (required, max 300), `coverImage` (optional URL), `status` ('draft' | 'published'). i18n labels.

- [ ] **Step 2: Create NewsletterForm component**

Props: `lang`, `newsletterId?`, `newsletter?`. React Hook Form + Zod. Uses `RequirePermission`. Calls service create/update. For the `content` field, use a `<textarea>` with HTML editing (open question — can upgrade to rich editor later).

- [ ] **Step 3: Create NewsletterManageList component**

Fetches all newsletters (all statuses). Search, status filter, sort by issue number. Actions: edit, delete, toggle publish. Permission-gated.

- [ ] **Step 4: Create wrappers**

`NewsletterFormPage.tsx`, `NewsletterManageListPage.tsx` — following existing wrapper pattern.

- [ ] **Step 5: Create dashboard pages (es + en)**

6 pages total: index, new, edit/[id] for each lang. Follow events dashboard page pattern.

- [ ] **Step 6: Commit**

```bash
git add src/components/newsletter/NewsletterForm.tsx \
  src/components/newsletter/newsletter-form-schema.ts \
  src/components/newsletter/NewsletterManageList.tsx \
  src/components/wrappers/Newsletter* \
  src/pages/es/dashboard/newsletter/ src/pages/en/dashboard/newsletter/
git commit -m "feat(newsletter): add CRUD form, manage list, and dashboard pages"
```

---

### Task 13: Spotlights — ManageList, Edit Support, Dashboard Pages

**Files:**

- Create: `src/components/spotlight/SpotlightManageList.tsx`
- Create: `src/components/wrappers/SpotlightManageListPage.tsx`
- Modify: `src/components/spotlight/SpotlightEditor.tsx` — add edit mode support
- Create: `src/pages/{es,en}/dashboard/spotlights/index.astro`
- Create: `src/pages/{es,en}/dashboard/spotlights/edit/[id].astro`
- Depends on: Tasks 5, 9

- [ ] **Step 1: Create SpotlightManageList**

Similar pattern to JournalClubManageList. Fetches all spotlights (all statuses). Search, status filter. Actions: edit, delete, toggle publish. Permission-gated.

- [ ] **Step 2: Create wrapper**

`SpotlightManageListPage.tsx` — AuthProvider + SpotlightManageList.

- [ ] **Step 3: Modify SpotlightEditor for edit mode**

Read `src/components/spotlight/SpotlightEditor.tsx` first. Add:

- Optional `spotlightId` prop
- When `spotlightId` is provided, fetch existing spotlight and populate form
- Change submit to call `updateSpotlight` instead of `createSpotlight`
- Add delete button (gated by `can('spotlights', 'delete')`)

- [ ] **Step 4: Create dashboard pages (es + en)**

4 pages: index and edit/[id] for each lang. The existing `new.astro` already exists at `src/pages/es/dashboard/spotlights/new.astro`.

- [ ] **Step 5: Commit**

```bash
git add src/components/spotlight/SpotlightManageList.tsx \
  src/components/spotlight/SpotlightEditor.tsx \
  src/components/wrappers/SpotlightManageListPage.tsx \
  src/pages/es/dashboard/spotlights/ src/pages/en/dashboard/spotlights/
git commit -m "feat(spotlights): add manage list, edit mode, and dashboard pages"
```

---

### Task 14: Events — Wire RBAC + Delete

**Files:**

- Modify: `src/components/events/EventList.tsx` — add delete action, permission checks
- Modify: `src/components/events/EventForm.tsx` — wrap with RequirePermission
- Depends on: Task 5

- [ ] **Step 1: Read existing EventList and EventForm**

Read `src/components/events/EventList.tsx` and `src/components/events/EventForm.tsx` to understand current structure.

- [ ] **Step 2: Add delete to EventList**

Add a delete button/action to each event row in the management list. Gate it with `can('events', 'delete')`. Implement delete by calling `deleteDoc` on the event document. Add confirmation dialog before delete.

- [ ] **Step 3: Add RequirePermission to EventForm**

Wrap the form submission with permission check. If creating: check `can('events', 'create')`. If editing: check `can('events', 'edit')`.

- [ ] **Step 4: Commit**

```bash
git add src/components/events/EventList.tsx src/components/events/EventForm.tsx
git commit -m "feat(events): add RBAC permission checks and delete action"
```

---

## Phase 4: Admin Group Management UI (Tasks 15-16)

### Task 15: Permission Matrix Picker

**Files:**

- Create: `src/components/rbac/PermissionMatrixPicker.tsx`
- Test: `tests/unit/components/rbac/PermissionMatrixPicker.test.tsx`
- Depends on: Task 1

- [ ] **Step 1: Write failing test**

Test that the matrix renders all resources as rows and all operations as columns. Test that changing a cell value calls `onChange` with the updated permissions array.

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement PermissionMatrixPicker**

Props: `value: PermissionGrant[]`, `onChange: (grants: PermissionGrant[]) => void`, `disabled?: boolean`

Renders a table:

- Header row: operation names
- Each body row: resource name + cells
- Each cell: dropdown with options: `—`, `own`, `all`, `deny:own`, `deny:all`
- When a cell changes, update the corresponding grant in the permissions array and call `onChange`

Use Tailwind classes matching existing admin UI style.

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add src/components/rbac/PermissionMatrixPicker.tsx \
  tests/unit/components/rbac/PermissionMatrixPicker.test.tsx
git commit -m "feat(rbac): add PermissionMatrixPicker grid component"
```

---

### Task 16: Admin Group CRUD Pages

**Files:**

- Create: `src/components/admin/GroupForm.tsx`
- Create: `src/components/admin/GroupList.tsx`
- Create: `src/components/admin/GroupDetail.tsx`
- Create: `src/components/admin/GroupMemberManager.tsx`
- Create: `src/components/wrappers/GroupFormPage.tsx`
- Create: `src/components/wrappers/GroupListPage.tsx`
- Create: `src/components/wrappers/GroupDetailPage.tsx`
- Create: `src/pages/{es,en}/dashboard/admin/groups/index.astro`
- Create: `src/pages/{es,en}/dashboard/admin/groups/new.astro`
- Create: `src/pages/{es,en}/dashboard/admin/groups/edit/[id].astro`
- Create: `src/pages/{es,en}/dashboard/admin/groups/[id].astro`
- Depends on: Tasks 5, 15

- [ ] **Step 1: Create GroupForm**

React Hook Form with:

- `name` (required)
- `description` (required)
- `PermissionMatrixPicker` for permissions
- On submit: writes to `rbac_groups` collection via Firestore
- For edit: fetches existing group, populates form
- System groups: disable name/description editing, allow permission changes

Gate with `RequirePermission resource="groups" operation="create"` (new) or `"edit"` (existing).

- [ ] **Step 2: Create GroupList**

Fetches all groups from `rbac_groups`. Shows name, description, isSystem badge, user count. Actions: edit, delete (not for system groups), view.

Gate with `RequirePermission resource="groups" operation="view"`.

- [ ] **Step 3: Create GroupDetail**

Shows group info + permissions table (read-only matrix) + `GroupMemberManager`.

- [ ] **Step 4: Create GroupMemberManager**

Shows list of users assigned to this group. Provides user search to add users. Remove button per user. On add/remove: updates `rbac_user_groups/{userId}` document (add/remove group ID from `groups` array).

Gate with `RequirePermission resource="groups" operation="assign"`.

- [ ] **Step 5: Create wrappers and dashboard pages**

Create wrappers and all 8 dashboard pages (4 per lang). Follow existing admin page pattern from `src/pages/es/dashboard/admin/`.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/Group* src/components/wrappers/Group* \
  src/pages/es/dashboard/admin/groups/ src/pages/en/dashboard/admin/groups/
git commit -m "feat(rbac): add admin group management UI with permission matrix"
```

---

## Phase 5: Firestore Rules & Migration (Tasks 17-18)

### Task 17: Firestore Rules Update

**Files:**

- Modify: `firestore.rules`
- Depends on: All previous tasks

- [ ] **Step 1: Read current firestore.rules**

Read the full `firestore.rules` file to understand current structure.

- [ ] **Step 2: Add RBAC helper functions**

Add `hasRBACAllow`, `hasRBACAllowAll`, `hasRBACDeny` functions at the top of the rules file (after existing helper functions). Use the comma-anchored regex patterns with wildcard support from spec section 8.3.

- [ ] **Step 3: Add rules for new collections**

Add rules for: `rbac_groups`, `rbac_user_groups`, `rbac_audit_log`, `journal_club_sessions` — from spec section 13.

- [ ] **Step 4: Update existing collection rules (dual-mode)**

For `newsletter_archive` and `spotlights`: replace existing rules with RBAC-aware rules from spec section 13 (public read for published + RBAC for management).

For `events`: add RBAC checks alongside existing `canModerate()`/`canAdminister()` checks using the `||` dual-mode pattern from spec section 13.

- [ ] **Step 5: Verify rules syntax**

Run: `npx firebase-tools emulators:start --only firestore` (or validate rules)
Expected: Rules parse without errors

- [ ] **Step 6: Commit**

```bash
git add firestore.rules
git commit -m "feat(rbac): update Firestore rules with RBAC helpers and new collection rules"
```

---

### Task 18: Firestore Indexes & Data Migration

**Files:**

- Modify: `firestore.indexes.json` (or create if doesn't exist)
- Depends on: Task 17

- [ ] **Step 1: Add composite indexes**

Add the indexes from spec section 15:

- `journal_club_sessions`: status + date
- `newsletter_archive`: status + publishedAt
- `spotlights`: status + publishedAt
- `rbac_user_groups`: groups array-contains (needed by batch resolution query in Task 6)

- [ ] **Step 2: Create data migration script**

Create `scripts/rbac-migration.ts` (or add as a Cloud Function):

- Backfill `createdBy`, `status`, `createdAt`, `updatedAt` on existing `newsletter_archive` docs (spec section 6.6)
- Backfill `createdBy`, `updatedAt` on existing `spotlights` docs (spec section 6.7)
- Uses a known admin UID as `createdBy` for backfill

This can run via Firebase emulator for testing, then against production when ready.

- [ ] **Step 3: Commit**

```bash
git add firestore.indexes.json scripts/rbac-migration.ts
git commit -m "chore: add Firestore indexes and data migration script for RBAC"
```

---

## Phase 6: Navigation, Types & Verification (Tasks 19-21)

### Task 19: Dashboard Navigation & Admin Types Update

**Files:**

- Modify: `src/types/admin.ts` — align `AdminPermission` type with new RBAC system
- Modify: Dashboard sidebar/navigation component (find the component that renders the dashboard sidebar menu)
- Depends on: Tasks 10-16

- [ ] **Step 1: Update AdminPermission type**

Read `src/types/admin.ts`. Update the `AdminPermission` type union to align with the new Resource + Operation enums. Add a comment noting that this type is being superseded by the RBAC system in `src/lib/rbac/types.ts` and will be removed in Phase 5 (legacy removal).

- [ ] **Step 2: Find and read the dashboard navigation component**

Search for the component that renders the dashboard sidebar. Check `src/layouts/DashboardLayout.astro` and any sidebar/nav components it imports.

- [ ] **Step 3: Add CRUD page links to dashboard navigation**

Add navigation links for:

- Journal Club management (`/dashboard/journal-club/`)
- Newsletter management (`/dashboard/newsletter/`)
- Spotlights management (`/dashboard/spotlights/`)
- Admin Groups (`/dashboard/admin/groups/`)

Gate each link with permission checks where possible (if navigation is a React component, use `usePermissions`; if Astro, add conditional rendering).

- [ ] **Step 4: Commit**

```bash
git add src/types/admin.ts src/layouts/DashboardLayout.astro
git commit -m "feat: update dashboard navigation with CRUD links and align admin types"
```

---

### Task 20: Integration Verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Run type checks**

Run: `npm run check`
Expected: No new type errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No new lint errors

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git commit -m "chore: fix lint/type issues from RBAC implementation"
```

---

### Task 21: Document Legacy Removal Plan (Spec Phase 5)

**Note:** This task documents what needs to happen for spec migration Phase 5 but does NOT execute it. Phase 5 should happen after the RBAC system has been running in dual-mode for a period and all users have been verified to have RBAC claims.

**Files:**

- Create: `docs/superpowers/plans/2026-03-23-rbac-legacy-removal.md`

- [ ] **Step 1: Write legacy removal plan**

Document the following steps for a future session:

1. Verify all users have RBAC claims (query `rbac_user_groups` for completeness)
2. Remove `canModerate()` / `canAdminister()` checks from `firestore.rules` — replace with pure RBAC checks
3. Remove `|| canModerate()` / `|| canAdminister()` dual-mode fallbacks from all Firestore rules
4. Replace all `AdminAuthGuard` component usage with `RequirePermission` (see spec section 16)
5. Remove `AdminAuthGuard` component
6. Remove legacy `role` check from frontend components
7. Keep `role` field on user docs for display purposes only

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-03-23-rbac-legacy-removal.md
git commit -m "docs: add legacy removal plan for RBAC Phase 5"
```
