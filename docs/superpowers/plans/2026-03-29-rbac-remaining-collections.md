# Migrate Remaining Collections to RBAC

**Goal:** Replace `canModerate()`/`canAdminister()` with RBAC permission checks in all remaining Firestore collections, then remove the legacy helper functions entirely.

**Priority:** Medium — improves consistency and enables granular permissions for all features.

**Prerequisites:** Phase 5 complete (done), all users have RBAC claims (done).

---

## Collections to migrate

### Batch 1: Content collections (lower risk)

| Collection                        | Current auth                 | Target RBAC resource | Complexity                                                  |
| --------------------------------- | ---------------------------- | -------------------- | ----------------------------------------------------------- |
| `jobs/{jobId}`                    | `canModerate()`, `isOwner()` | `jobs`               | Medium — has subcollections (applications, analytics)       |
| `blog/{postId}`                   | `canModerate()`              | `blog`               | Low                                                         |
| `resources/{resourceId}`          | `canModerate()`              | `resources`          | Medium — has subcollections (reviews, bookmarks, downloads) |
| `forums/{forumId}/posts/{postId}` | `canModerate()`              | `forums`             | Medium — nested subcollections (posts, replies)             |

### Batch 2: People & org collections (medium risk)

| Collection                   | Current auth                                    | Target RBAC resource | Complexity                                                         |
| ---------------------------- | ----------------------------------------------- | -------------------- | ------------------------------------------------------------------ |
| `users/{userId}`             | `canModerate()`, `canAdminister()`, `isOwner()` | `users`              | High — many subcollections (activity, notifications, compensation) |
| `companies/{companyId}`      | `canModerate()`                                 | `companies`          | Low                                                                |
| `commissions/{commissionId}` | `canModerate()`, `canAdminister()`              | `commissions`        | Low                                                                |

### Batch 3: Mentorship collections (higher risk)

| Collection                          | Current auth                       | Target RBAC resource | Complexity |
| ----------------------------------- | ---------------------------------- | -------------------- | ---------- |
| `mentors/{mentorId}`                | `canModerate()`, `canAdminister()` | `mentorship`         | Medium     |
| `mentees/{menteeId}`                | `canModerate()`, `canAdminister()` | `mentorship`         | Medium     |
| `mentorship_matches/{matchId}`      | `canModerate()`                    | `mentorship`         | Medium     |
| `mentorship_sessions/{sessionId}`   | `canModerate()`                    | `mentorship`         | Medium     |
| `mentorship_requests/{requestId}`   | `canModerate()`                    | `mentorship`         | Low        |
| `mentorship_feedback/{feedbackId}`  | `canModerate()`                    | `mentorship`         | Low        |
| `mentorship_goals/{goalId}`         | `canModerate()`                    | `mentorship`         | Low        |
| `mentorship_resources/{resourceId}` | `canModerate()`                    | `mentorship`         | Low        |

### Batch 4: Platform/admin collections (low priority)

| Collection                    | Current auth                       | Target RBAC resource | Complexity |
| ----------------------------- | ---------------------------------- | -------------------- | ---------- |
| `admin/{document=**}`         | `canAdminister()`                  | `settings`           | Low        |
| `logs/{logId}`                | `canAdminister()`                  | `analytics`          | Low        |
| `reports/{reportId}`          | `canModerate()`, `canAdminister()` | `reports`            | Low        |
| `analytics/{document=**}`     | `canAdminister()`                  | `analytics`          | Low        |
| `contactMessages/{messageId}` | `canModerate()`                    | `notifications`      | Low        |
| `mail/{mailId}`               | `canAdminister()`                  | `notifications`      | Low        |

---

## Migration pattern per collection

For each collection, apply the same pattern used for events/newsletter/spotlights:

```
// Before (legacy):
allow read: if isAuthenticated() && canModerate();
allow create: if isAuthenticated() && canModerate() && ...;
allow update: if isAuthenticated() && (isOwner(...) || canModerate()) && ...;
allow delete: if isAuthenticated() && canAdminister();

// After (RBAC):
allow read: if isAuthenticated() && !hasRBACDeny('{abbrev}', 'v') && hasRBACAllow('{abbrev}', 'v');
allow create: if isAuthenticated() && !hasRBACDeny('{abbrev}', 'c') && hasRBACAllow('{abbrev}', 'c')
  && request.resource.data.createdBy == request.auth.uid
  && request.resource.data.createdAt == request.time;
allow update: if isAuthenticated() && !hasRBACDeny('{abbrev}', 'e') && (
  hasRBACAllowAll('{abbrev}', 'e') ||
  (hasRBACAllow('{abbrev}', 'e') && resource.data.createdBy == request.auth.uid)
);
allow delete: if isAuthenticated() && !hasRBACDeny('{abbrev}', 'd') && (
  hasRBACAllowAll('{abbrev}', 'd') ||
  (hasRBACAllow('{abbrev}', 'd') && resource.data.createdBy == request.auth.uid)
);
```

## Execution order

1. **Batch 1** (content) — safest, follow existing patterns exactly
2. **Batch 2** (people/orgs) — users collection is complex, do last in batch
3. **Batch 3** (mentorship) — many collections but all follow same pattern
4. **Batch 4** (platform) — admin collections, lowest risk

Each batch:

- [ ] Update Firestore rules
- [ ] Update any Cloud Functions that use role checks for these collections
- [ ] Update any React components that use role-based gating
- [ ] Deploy rules
- [ ] Verify via beta

## Final step: Remove legacy helpers

After ALL collections are migrated:

- [ ] Remove `canModerate()` function definition from `firestore.rules`
- [ ] Remove `canAdminister()` function definition from `firestore.rules`
- [ ] Remove `getUserRole()` and `hasRole()` / `hasAnyRole()` if no longer referenced
- [ ] Remove `AdminPermission` type from `src/types/admin.ts`
- [ ] Remove `AdminAuthGuard` component and its usages in `/admin/*` pages
- [ ] Deploy and verify

## Default group permissions update

The 9 default groups already cover all resources. Verify the permission grants match expectations for each newly migrated collection — particularly:

- `member` group: should have `view.all` for content, `create.own`/`edit.own`/`delete.own` for forums/jobs
- `company` group: should have `jobs: create.own, edit.own, delete.own`
- `mentor` group: should have `mentorship: view.all, create.own, edit.own, delete.own`

Check `functions/src/rbac/defaultGroups.ts` and update if needed.
