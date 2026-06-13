# Code Review: RBAC System + Content CRUD

**Date**: 2026-03-26
**Reviewer**: Centinela (QA Agent)
**Scope**: RBAC permission types, codec, checker, resolver, CF triggers, middleware, Firestore rules, content CRUD services (journal-club, newsletter, spotlights), EventList delete, admin group management UI, PermissionMatrixPicker, mobile nav, secret admin toggle

## Summary

The RBAC system is architecturally sound: the deny-first algorithm is correct, codec/decoder are consistent between server and client, the 151 unit tests all pass, and Firestore rule regex patterns are safe. The critical issue is an **inconsistency in the deny-first enforcement across collections** in `firestore.rules` that means `canModerate()` can silently bypass an explicit RBAC deny on the `events` collection — while it cannot on `newsletter_archive` and `spotlights`. This is either a bug or an undocumented design choice that must be clarified before production. A second security concern is the `usePermissions()` hook forcing a Firebase token refresh on every mount, which will cause a thundering-herd of token refresh requests when the dashboard renders multiple RBAC-gated components simultaneously.

---

## Findings

### Critical (must fix before merge)

- **[C-1]** **Inconsistent deny-first enforcement between collections**: The events collection uses a different rule structure where `canModerate()` lives OUTSIDE the `!hasRBACDeny` guard, allowing moderators to bypass an explicit RBAC deny. `newsletter_archive`, `spotlights`, and `journal_club_sessions` correctly place the `!hasRBACDeny` check as the outermost AND condition, so an explicit deny overrides even admin role.
  - File: `firestore.rules:273-288` (events update/delete)
  - Impact: An RBAC admin who explicitly denies a moderator from editing events (`!ev:e.a` in their claims) will find their deny ignored because `canModerate()` is a parallel OR branch. The security model is inconsistent between content types.
  - Current events update structure:
    ```
    allow update: if isAuthenticated() && (
      (!hasRBACDeny('ev', 'e') && (
        hasRBACAllowAll('ev', 'e') || (hasRBACAllow('ev', 'e') && isOwner)
      )) ||
      (isOwner || canModerate())   // <-- canModerate bypasses !hasRBACDeny
    )
    ```
  - Expected (consistent with nl/sp/jc):
    ```
    allow update: if isAuthenticated() && (
      (hasRBACAllowAll('ev', 'e') || canModerate()) ||
      (hasRBACAllow('ev', 'e') && resource.data.createdBy == request.auth.uid)
    ) && !hasRBACDeny('ev', 'e');
    ```
  - **Decision needed**: Decide whether deny should override all role checks (nl/sp/jc model) or only RBAC-based checks (events model). Then make all collections consistent.

- **[C-2]** **`usePermissions()` forces token refresh on every mount**: `hooks.ts:23` calls `getIdTokenResult(true)` — the `true` parameter forces a server-side token refresh on every call. The hook is instantiated in `RequirePermission`, `usePermissions()` in `DashboardBottomNav`, `GroupMemberManager`, `GroupDetail`, `GroupForm`, `EventList`, and all other RBAC-gated components. A dashboard page with 5–10 RBAC-gated components will issue 5–10 simultaneous token refresh requests on every page load.
  - File: `src/lib/rbac/hooks.ts:23`
  - Impact: Thundering herd of token refresh calls on dashboard render. Firebase rate-limits token refreshes; users could receive `auth/too-many-requests` errors. Token refresh is also slow (~200–500ms), causing visible RBAC loading flicker for every gated component independently.
  - Fix: Remove `true` from `getIdTokenResult(true)`. Custom claims are propagated within ~1 minute of a claims update. If immediate post-assignment refresh is needed, expose a `refreshPermissions()` function that callers can invoke explicitly (e.g., after `GroupMemberManager` assigns a user). The hook itself should read the cached token.

---

### Warning (should fix)

- **[W-1]** **Dual permission-check implementations with different semantics**: There are two separate and independent implementations:
  - `functions/src/rbac/resolution-logic.ts` — `checkPermission()` returns `{allowed, scope, denied}` and operates on `DecodedToken[]`
  - `src/lib/rbac/checker.ts` — `checkPermission()` takes `ResolvedPermissions` (with separate `allows`, `denies`, `wildcards` arrays)
  - `src/lib/rbac/codec.ts` — `decodePermissions()` returns `ResolvedPermissions`
  - `functions/src/rbac/resolution-logic.ts` — `decodeClaimsPermissions()` returns `DecodedToken[]`

  These two decoders produce different data structures from the same claims string. Both implement deny-first correctly, but they are not guaranteed to stay in sync as the system evolves. Any bug fix in one must be mirrored in the other.
  - File: `functions/src/rbac/resolution-logic.ts` and `src/lib/rbac/checker.ts`+`codec.ts`
  - Fix: Document explicitly that both implementations must be kept in sync, with a comment cross-referencing them. Ideally, compile a single shared pure-TS module usable in both environments (no Firebase deps), eliminating the duplication.

- **[W-2]** **`spotlights.ts` `updateSpotlight` does not track `updatedBy`**: The `updateNewsletter()` function records `updatedBy: userId` on every update, but `updateSpotlight()` does not accept or store a `userId` parameter, and `updateJournalClubSession()` accepts it but does not write it to Firestore.
  - File: `src/lib/spotlights.ts:93`, `src/lib/journal-club.ts:158-167`
  - Impact: Audit trail incomplete for spotlights and journal-club. Cannot determine who made the last change to a record.
  - Fix: Add `updatedBy: userId` to both `updateSpotlight()` and `updateJournalClubSession()` write payloads, mirroring `newsletter.ts` pattern.

- **[W-3]** **Missing `createdAt == request.time` server-timestamp enforcement on new RBAC content collections**: The `journal_club_sessions`, `newsletter_archive`, and `spotlights` create rules do NOT enforce `request.resource.data.createdAt == request.time`. Older collections (events, jobs, forums) all enforce this to prevent backdated timestamps. The new collections accept any client-supplied `createdAt` value.
  - File: `firestore.rules:861-862`, `529-531`, `743-744`
  - Impact: A client with write permission could create content with a fabricated `createdAt` timestamp (e.g., backdating a newsletter issue). Low-severity for content integrity, but inconsistent with the rest of the schema.
  - Fix: Add `&& request.resource.data.createdAt == request.time` to the create rule for all three collections. (Note: client must use `serverTimestamp()`, which it already does in all three services.)

- **[W-4]** **`GroupMemberManager` writes to `rbac_user_groups` without error feedback in the UI**: When `handleAddUser()` or `handleRemoveUser()` fails, the error is only logged to console — the UI does not display an error message to the operator.
  - File: `src/components/admin/GroupMemberManager.tsx:233-237`, `259-263`
  - Impact: An admin who fails to add a user (e.g., due to Firestore permission error or network timeout) receives no feedback and may believe the operation succeeded.
  - Fix: Add an `operationError` state, set it in the catch blocks, and render it near the search/member area.

- **[W-5]** **`rbac_groups` delete rule does not check `!hasRBACDeny('gr', 'd')`**: The delete rule for `rbac_groups` is missing the deny check, inconsistent with all other RBAC-controlled collections.
  - File: `firestore.rules:835-836`
  - Current: `allow delete: if isAuthenticated() && (hasRBACAllow('gr', 'd') || canAdminister()) && !resource.data.isSystem;`
  - The `!resource.data.isSystem` guard is present, but there is no `!hasRBACDeny('gr', 'd')` guard. If a deny is set for a user on `gr:delete`, `hasRBACAllow` would still return false so the deny would not matter practically — but for consistency and future-proofing add `&& !hasRBACDeny('gr', 'd')`.

- **[W-6]** **`hasRBACAllow` used without deny check for `rbac_groups` read/create/update**: Unlike content collections, the `rbac_groups` rules use `hasRBACAllow` without the corresponding `!hasRBACDeny` guard.
  - File: `firestore.rules:832-834`
  - Impact: An explicit deny on `gr:view` or `gr:create` would be silently ignored. Explicit denies on group management permissions may be used to restrict specific power users.
  - Fix: Add `!hasRBACDeny('gr', 'v')`, `!hasRBACDeny('gr', 'c')`, `!hasRBACDeny('gr', 'e')` to the respective rules.

- **[W-7]** **`GroupMemberManager` user search queries by email prefix only, caseSensitive**: The search uses `where('email', '>=', trimmed.toLowerCase())` but does not lowercase the stored email field. If emails in Firestore are stored mixed-case (as Firebase Auth sometimes delivers them), search results will be missed.
  - File: `src/components/admin/GroupMemberManager.tsx:168-170`
  - Fix: Ensure emails are normalized to lowercase on write (check registration flow), or document that this query is case-sensitive so admins know to search in lowercase.

---

### Suggestion (consider)

- **[S-1]** **`updateJournalClubSession` `userId` parameter is accepted but unused**: The function signature accepts `userId: string` but writes nothing with it.
  - File: `src/lib/journal-club.ts:158`
  - Suggestion: Write `updatedBy: userId` to Firestore (aligns with W-2 above).

- **[S-2]** **`resolveUserPermissions` in `resolvePermissions.ts` does not write an audit log on success**: `onUserGroupWrite` writes an audit log after every resolution, but the batch re-resolution triggered by `onGroupWrite` (which calls `resolveUserPermissions` per user) does not write per-user audit logs — only a group-level summary.
  - File: `functions/src/rbac/resolvePermissions.ts:192-218`
  - Suggestion: Add a per-user audit log call in `resolveUserPermissions` or at minimum write the group-level log with the full list of affected user IDs (currently it only writes the count).

- **[S-3]** **`DashboardBottomNav` `hasRBAC` detection heuristic is fragile**: `const hasRBAC = !rbacLoading && can('groups', 'view')` uses `can('groups', 'view')` as a proxy for "RBAC claims are present". This means users who have RBAC claims but NO `groups:view` permission will be treated as having no RBAC, falling back to role-based checks. A better heuristic: `const hasRBAC = !rbacLoading && permissions !== null`.
  - File: `src/components/nav/DashboardBottomNav.tsx:218`
  - Suggestion: Expose `permissions` from `usePermissions()` hook (it already returns it) and check `permissions !== null` instead of using a specific permission as a proxy.

- **[S-4]** **Secret admin toggle (`adminMode`) has no server-side validation**: The `adminMode` flag is stored in `sessionStorage` only. It controls which admin navigation items are shown in the bottom sheet. This is a pure UX feature (the actual admin pages are protected by `RequirePermission`), but the name "admin mode" may create a false sense of elevated privilege.
  - File: `src/components/nav/DashboardBottomNav.tsx:44-87`
  - Suggestion: Rename to `showAdminNav` or `developerMode` to avoid confusion. Add a comment clarifying it is display-only and has no security function.

- **[S-5]** **`onUserGroupWrite` does not handle the case where `rbac: undefined` in `setCustomUserClaims` may fail on some Firebase environments**: Setting a claim key to `undefined` should remove it, but behavior varies. Prefer `{ ...existingClaims }` with an explicit `delete newClaims.rbac` rather than `rbac: undefined`.
  - File: `functions/src/rbac/resolvePermissions.ts:48-51`
  - Suggestion: Use `delete claims.rbac` after spreading to ensure clean removal.

- **[S-6]** **`EventList` delete operation lacks optimistic UI rollback on failure**: `handleDelete` optimistically updates `deletedIds` but has no rollback if `deleteDoc` fails — the event disappears from the list even if deletion failed.
  - File: `src/components/events/EventList.tsx:546-557`
  - Suggestion: Add error handling that removes the ID from `deletedIds` if the Firestore call rejects.

- **[S-7]** **`newsletter.ts` `createNewsletter` does not enforce `createdBy` from the `data` param**: The function signature accepts `data: Omit<NewsletterIssue, 'id' | 'createdAt' | 'updatedAt'>` which includes `createdBy`. The caller could pass any `createdBy` value and the function would write it directly. Only the Firestore rule (`request.resource.data.createdBy == request.auth.uid`) prevents spoofing.
  - File: `src/lib/newsletter.ts:94-104`
  - Suggestion: Overwrite `data.createdBy` with the `userId` parameter to make the service layer self-defending: `createdBy: userId` instead of relying solely on the rule. This matches the pattern in `journal-club.ts:createJournalClubSession`.

---

## Dead Code Scan

- **Unused `userId` parameter in `updateJournalClubSession`**: The parameter is declared and passed through the call chain but never written to Firestore.
- **`requirePermission` middleware exported from `functions/src/index.ts`** but not used by any Cloud Function in the codebase. It appears to be infrastructure scaffolding for future HTTP endpoints. Not harmful but contributes to bundle size.
- No unused imports detected in reviewed files.
- No commented-out code blocks (beyond the intentional LinkedIn CF comments).
- No unreachable code detected.

---

## Code Quality

- **Clean Code**: Most files follow single-responsibility principle. `get-salary-stats.ts` at ~415 lines is the largest file and contains multiple embedded aggregate functions (`safeAggregate`, `buildHistogram`, inline aggregate loops). These are justified by the CF context (can't import shared utilities into CF easily), but the file is on the edge of "god function" territory.
- **Function length**: `getSalaryStats` handler body is ~310 lines. This is the only violation. All RBAC core files are well within the 30-line limit.
- **DRY**: The content CRUD services (`journal-club.ts`, `newsletter.ts`, `spotlights.ts`) each define their own `clean()` function with identical implementations. This is a minor DRY violation acceptable in service files where importing from a shared utility would add coupling.
- **Code smells**: `DashboardBottomNav.tsx` at ~610 lines is a large component. The admin-items and content-items construction logic (lines 231-266) could be extracted into helper functions.
- **Refactoring suggestions**: Extract `EventList` delete with rollback (see S-6) into a `useDeleteWithOptimism` hook.

---

## Architecture Compliance

- **Dependency direction**: PASS. `resolution-logic.ts` has zero Firebase dependencies. Codec and checker in `src/lib/rbac/` are pure TypeScript.
- **Layer separation**: PASS. Firestore rules are the enforcement layer; CF triggers are the claims-update layer; React hooks are the read layer. Layers do not cross boundaries.
- **Interface boundaries**: PASS. `requirePermission` middleware decouples CF HTTP handlers from auth logic.
- **Dual implementation concern**: The existence of two independent implementations of the same decode/check logic (server + client) is an architectural risk, not a violation per se, but it creates a maintenance liability (see W-1).

---

## Test Quality

- **FIRST compliance**: PASS. 151 tests run in 1.36 seconds. Tests use mock Firebase objects, no real network calls.
- **Arrange-Act-Assert pattern**: Checked `checker.test.ts`, `codec.test.ts`, `resolvePermissions.test.ts` — all follow AAA cleanly.
- **Coverage**: RBAC core logic (codec, checker, resolver, middleware) is well covered. Missing test areas:
  - No tests for `updateJournalClubSession`, `updateNewsletter`, `updateSpotlight` (CRUD services)
  - No tests for `GroupMemberManager` add/remove operations
  - No tests for the admin toggle `sessionStorage` logic in `DashboardBottomNav`
  - No tests for `EventList` delete optimistic update
- **Test logic**: No `if/else` or loops found in test bodies.
- **AC traceability**: No spec file was provided for this feature. Tests have TC-IDs in `resolvePermissions.test.ts` and `salary-stats-rbac.test.ts`.

---

## Security Checklist Results

| Check                              | Status  | Notes                                                 |
| ---------------------------------- | ------- | ----------------------------------------------------- | --- | ---------------- |
| No hardcoded secrets               | PASS    | No credentials in reviewed files                      |
| Input validation at boundaries     | PASS    | Zod schemas in forms; `sanitizeHtml` for HTML content |
| No injection vectors               | PASS    | Firestore SDK parameterizes all queries               |
| Auth enforced on all endpoints     | PARTIAL | Events collection deny inconsistency (C-1)            |
| No critical CVEs                   | PASS    | 12 high (pre-existing), 0 critical                    |
| Token claims verifiable            | PASS    | All CF endpoints verify via `verifyIdToken()`         |
| `rbac_user_groups` write-protected | PASS    | Rules require `hasRBACAllow('gr','a')                 |     | canAdminister()` |

---

## Verdict

**APPROVED WITH CONDITIONS**

The RBAC system core is correct and well-tested. The implementation is production-ready after the following are addressed:

**Must fix before production (security + correctness):**

1. **C-1** — Decide on and implement a consistent deny-enforcement pattern across all content collections in `firestore.rules`
2. **C-2** — Remove forced token refresh (`true` param) from `getIdTokenResult` in `usePermissions` hook

**Should fix before production (data integrity + UX):** 3. **W-2** — Add `updatedBy` tracking to `updateSpotlight` and `updateJournalClubSession` 4. **W-3** — Add `createdAt == request.time` enforcement to new collection create rules 5. **W-4** — Add UI error feedback for `GroupMemberManager` add/remove failures

**Can defer to next sprint:**

- W-5, W-6 (RBAC groups deny guard gaps)
- W-7 (email search case sensitivity)
- S-1 through S-7 (improvements and suggestions)
