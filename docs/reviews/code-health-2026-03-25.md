# Code Health & Branch State Review: feature/hub

**Date**: 2026-03-25
**Reviewer**: Centinela (QA Agent)
**Scope**: Full branch audit — git state, build, imports, tests, feature completeness, security

## Executive Summary

The feature/hub branch is **deployable to beta** with conditions. The Astro build passes with 0 errors and 0 warnings. Core features (companies directory, salary insights, compensation sub-collection, getSalaryStats CF) are wired correctly. However, CI is **blocked on Prettier formatting** (204 files need `npm run format`), 22 unit tests are failing due to mock drift on two test files, and 5 source files are untracked and need to be committed before a clean merge to main.

---

## 1. Git Status

### PASS — No broken tracked files

Only `functions/lib/index.js` and `functions/lib/index.js.map` are modified (compiled output) — expected, not a concern.

### ACTION REQUIRED — Untracked source files

These files are **untracked but imported by committed code**:

| File                                                         | Status    | Impact if not committed                                                                              |
| ------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------- |
| `src/lib/auth/provider-id-map.ts`                            | Untracked | No imports found — orphan file                                                                       |
| `functions/src/pdf-parse.d.ts`                               | Untracked | Type declaration for pdf-parse; `parse-linkedin-pdf.ts` is commented out so no immediate build break |
| `tests/unit/functions/parse-linkedin-pdf.test.ts`            | Untracked | Tests not running in CI                                                                              |
| `tests/unit/lib/auth/provider-id-map.test.ts`                | Untracked | Tests not running in CI                                                                              |
| `tests/unit/components/profile/LinkedInImportModal.test.tsx` | Untracked | Tests not running in CI                                                                              |

`src/components/profile/LinkedInImportModal.tsx` — **verified tracked** (committed in `3782a30`).

### PASS — No stray files requiring action

Root HTML files (`component-examples.html`, `journal-club.html`) are untracked but also not gitignored — they appear to be local development artifacts. Not a blocker but should be added to `.gitignore`.

---

## 2. Build Health

### PASS — `npm run check` (Astro TypeScript): **0 errors, 0 warnings**

491 files checked clean. Hints only (unused `t` variables in `.astro` pages, deprecated `AdminPermission` type — known pre-existing).

### PASS — `cd functions && npx tsc --noEmit`: **passes with no output**

Functions TypeScript build is clean.

### BLOCKED — CI Prettier formatting check: **204 files fail**

This is the sole reason CI is red. All files are style-only (indentation, trailing commas, spacing). No logic change required.

**Action**: Run `npm run format` at root to fix all 204 files in one pass, then commit.

Key affected paths:

- `functions/src/` (all files including rbac/ module)
- `src/components/admin/`, `src/components/auth/`, `src/components/companies/`
- `src/components/dashboard/`, `src/components/listing/`
- `scripts/rbac-migration.ts`

---

## 3. Deploy Status

### FAIL — CI failing (Prettier)

```
completed  failure  fix: add missing newsletter.ts service file  Continuous Integration  feature/hub  push
completed  success  fix: add missing newsletter.ts service file  Deploy Beta             feature/hub  push
```

Deploy Beta job succeeded (it deploys even when CI fails, per TD-033). The site is live at beta.secid.mx but CI badge is red.

### PASS — getSalaryStats CF: exported from `functions/src/index.ts:606`

```
export { getSalaryStats } from "./get-salary-stats";
```

LinkedIn and PDF parse CFs correctly commented out:

```
// export { linkedinAuthRedirect, linkedinAuthCallback, exchangeLinkedInCode } from "./linkedin-auth";
// export { parseLinkedInPdf } from "./parse-linkedin-pdf";
```

---

## 4. Broken Imports / Dead Code

### PASS — No imports of deleted files

- `BottomNav.tsx` / `BottomNavAuth.tsx`: no references found.
- `CompanyNetworkGraph.tsx` / `CompanyTimeline.tsx`: no references found.

### PASS — `lucide-react` is in `package.json`

The package is declared as a dependency (`^0.323.0`) and used across 30 files. This is intentional — `lucide-react` is NOT a build-breaking import in this project; it is a declared dependency.

### PASS — `extractSalaryDataPoints` / `getMemberProfiles` removed

No references to either old function found in `src/`. The CF-based refactor is complete.

### WARNING — `src/lib/auth/provider-id-map.ts` is untracked but not imported

The file exists locally but no other file imports it. It is either a leftover or a future utility. If it is needed, commit it; if not, delete it.

---

## 5. File Consistency

### PASS — `ModernLayout.astro`

No FeedbackFAB import — the layout was replaced with a static HTML link. No SSR issue.

### PASS — `firebase.json`

`predeploy` does not run lint (only runs the build):

```
"predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
```

### PASS — `functions/src/index.ts` exports

`getSalaryStats` exported. LinkedIn and parseLinkedInPdf correctly commented out.

### PASS — `firestore.rules` compensation sub-collection

```
match /compensation/{entryId} {
  allow read, write: if isAuthenticated() && isOwner(userId);
  allow read: if isAuthenticated() && canModerate();
}
```

Rule is inside `match /users/{userId}` — correct scoping.

### PASS — `CompensationFields` writes to sub-collection

`src/components/profile/shared/CompensationFields.tsx` calls:

- `getDoc(doc(db, 'users', userId, 'compensation', roleId))` on mount
- `setDoc(doc(db, 'users', userId, 'compensation', roleId), {...})` on save

---

## 6. Test Health

### PASS — Salary tax tests: 44/44 passing

`tests/unit/lib/tax/` — all 3 files clean.

### PASS — Salary component tests: 33/33 passing

`tests/unit/components/salary/` — all 4 files clean.

### FAIL — pdf-generator tests: 20/20 failing (TC-cv-pdf-001 through TC-cv-pdf-018 + 2 more)

**Root cause**: `src/lib/cv/pdf-generator.ts` was upgraded with accent-color bullet points that call `pdf.setFillColor(...)` and `pdf.circle(...)`, plus `pdf.internal.getNumberOfPages()`. The jsPDF mock in the test file does not include these methods:

```typescript
// Missing from mockJsPDFInstance in tests/unit/lib/cv/pdf-generator.test.ts:
setFillColor: vi.fn(),
circle: vi.fn(),
internal: { getNumberOfPages: vi.fn(() => 1) }
```

This is a test drift issue — the implementation advanced but the mock was not updated. All 20 tests fail with `TypeError: pdf.setFillColor is not a function`.

**Action for Forja**: Add `setFillColor`, `circle`, and `internal` to the `mockJsPDFInstance` in `tests/unit/lib/cv/pdf-generator.test.ts`.

### FAIL — verify-request tests: 2/7 failing

**Root cause**: Two tests expect `error: 'Session not validated'` when a Bearer token is present but there is no session. The implementation was changed to attempt JWT decode on any Bearer token and now returns `error: 'Invalid or expired token'` for non-JWT tokens.

Test assertions (lines 55, 69):

```typescript
expect(result.error).toBe('Session not validated');
```

Actual behavior (verify-request.ts:87):

```typescript
error: 'Invalid or expired token',
```

This is a **behavior drift** — the tests reflect the original design (Bearer without session = "Session not validated"), but the implementation now falls through to JWT decode. One of the two must be authoritative. The current implementation is arguably safer (it attempts validation rather than rejecting). Tests should be updated to match the new contract, OR the implementation should be reverted to return 'Session not validated' immediately if no `request.session` is set.

**Recommendation**: Update the 2 test assertions to `'Invalid or expired token'` since the current implementation is correct behavior (attempting JWT decode is the right fallback).

### Note on untracked test files (3 files, ~37 tests)

- `tests/unit/functions/parse-linkedin-pdf.test.ts`
- `tests/unit/lib/auth/provider-id-map.test.ts`
- `tests/unit/components/profile/LinkedInImportModal.test.tsx`

These tests are not running in CI because they are untracked. They should be committed.

---

## 7. Feature Completeness Checklist

| Feature                                                             | Status | Notes                                                                               |
| ------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| `/es/companies` and `/en/companies` — list + map views              | PASS   | `src/pages/es/companies/index.astro`, `[slug].astro`, `profile.astro` — all present |
| `/es/dashboard/companies` and `/en/dashboard/companies`             | PASS   | `src/pages/es/dashboard/companies/index.astro` exists                               |
| `/es/dashboard/salary-insights` and `/en/dashboard/salary-insights` | PASS   | `src/pages/es/dashboard/salary-insights/index.astro` and EN equivalent exist        |
| `DashboardSidebar` has companies + salary-insights links            | PASS   | Lines 111, 117 in `DashboardSidebar.tsx`                                            |
| `DashboardBottomNav` has companies in tabs + salary in More sheet   | PASS   | Lines 112, 140 in `DashboardBottomNav.tsx`                                          |
| `CompensationFields` writes to sub-collection                       | PASS   | Confirmed — `setDoc(doc(db, 'users', userId, 'compensation', roleId))`              |
| `SalaryInsights` calls `getSalaryStats` CF                          | PASS   | `httpsCallable(functions, 'getSalaryStats')` at line 135-139                        |
| Firestore rules for compensation sub-collection                     | PASS   | Rule present at correct path in `firestore.rules`                                   |
| `getSalaryStats` CF exported from `functions/src/index.ts`          | PASS   | Line 606                                                                            |

**All 9 feature completeness items: PASS.**

---

## 8. Dependency Security

### Root (`npm audit`)

- 0 critical
- 11 high
- 14 moderate
- Total: 25 vulnerabilities

High vulnerabilities are pre-existing (tracked as TD-004, TD-005 in TECH_DEBT.md). No new critical CVEs introduced by this branch's changes.

### Functions (`npm audit`)

- 9 low
- 9 high (picomatch ReDoS — pre-existing)
- Total: 18 vulnerabilities

Pre-existing, tracked as TD-001 / TD-004. Fixable with `npm audit fix` in functions/.

---

## Summary of Action Items

### Blocking for CI green (must fix before merge to main)

| #   | Item                                 | Command                                                                                 |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------- |
| B-1 | Run Prettier on all 204 files        | `npm run format && git add -A && git commit -m "style: format all files with prettier"` |
| B-2 | Fix pdf-generator test mock          | Add `setFillColor`, `circle`, `internal` to `mockJsPDFInstance`                         |
| B-3 | Fix 2 verify-request test assertions | Update expected error to `'Invalid or expired token'`                                   |
| B-4 | Commit 5 untracked source/test files | `git add src/lib/auth/provider-id-map.ts functions/src/pdf-parse.d.ts tests/unit/...`   |

### Non-blocking but recommended before main merge

| #   | Item                                                                       |
| --- | -------------------------------------------------------------------------- |
| R-1 | Add `component-examples.html` and `journal-club.html` to `.gitignore`      |
| R-2 | Confirm `provider-id-map.ts` is needed — commit it with tests or delete it |
| R-3 | Run `cd functions && npm audit fix` to clear known fixable CVEs            |

---

## Verdict

**APPROVED WITH CONDITIONS**

The branch is functionally complete and the build is clean. CI is blocked solely by Prettier formatting (B-1) and 22 test failures caused by mock drift (B-2, B-3). All feature-completeness items pass. Fix B-1 through B-4, re-run CI, and the branch is ready to merge to main.
