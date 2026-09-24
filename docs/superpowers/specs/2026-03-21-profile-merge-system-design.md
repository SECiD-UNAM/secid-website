# Profile Merge System Design

## Problem

When an already-registered member registers with a new email, there is no way to associate their stale profile with the new account. This results in orphaned profiles and lost member history.

**Scenarios covered:**

- Admin pre-creates a member record; that person later signs up with a different email
- A member registered previously, lost access to that email, and re-registers with a new one

## Design Decisions

| Decision             | Choice                                                        | Rationale                                  |
| -------------------- | ------------------------------------------------------------- | ------------------------------------------ |
| Matching key         | `numeroCuenta` only                                           | Unique per UNAM student, already collected |
| Merge approval       | All merges require admin approval                             | Prevents unauthorized profile claiming     |
| Field selection      | User picks per field group (keep old / keep new / discard)    | Gives control over what data survives      |
| Reference migration  | Default on, admin can opt out per merge                       | Preserves activity history                 |
| Old doc handling     | Admin decides per merge (soft-delete / hard-delete / archive) | Flexible per situation                     |
| Auto-detection       | Notifies user, user initiates claim                           | Non-intrusive, user-driven                 |
| Architecture         | Shared merge engine + 3 thin triggers                         | DRY, one merge path to test and audit      |
| Client-side priority | Index collection + Firestore rules, minimal server-side       | Aligns with CDN-based approach             |
| Old Auth account     | Disabled post-merge, admin can delete                         | Prevents sign-in to orphaned profile       |

## Architecture Overview

Three mechanisms share a common merge engine:

1. **Auto-detection** — client reads `numero_cuenta_index` after user enters `numeroCuenta` during registration, sets `potentialMergeMatch` on own user doc
2. **Self-service claim** — user reviews matched profile, selects fields, creates a `merge_request` pending admin approval
3. **Admin merge tool** — admin initiates or reviews merges from the admin dashboard

```
┌─────────────────┐   ┌──────────────────┐   ┌─────────────────┐
│  Auto-Detection  │   │  Self-Service     │   │  Admin Merge    │
│  (registration)  │   │  Claim Flow       │   │  Tool           │
└────────┬─────────┘   └────────┬──────────┘   └────────┬────────┘
         │ sets flag            │ creates req           │ creates req
         ▼                     ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    merge_requests collection                     │
│              status: pending → approved → executing → completed  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ onStatusChange → approved
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Merge Engine (Cloud Function)               │
│  1. Apply field selections                                       │
│  2. Migrate references (if enabled)                              │
│  3. Handle old doc (soft-delete / hard-delete / archive)         │
│  4. Disable old Firebase Auth account                            │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model

### `merge_requests` collection

```typescript
interface MergeRequest {
  id: string; // auto-generated doc ID
  sourceUid: string; // old/stale profile UID
  targetUid: string; // new profile UID (survives)
  matchedBy: 'numeroCuenta';
  numeroCuenta: string;

  // Field-level merge selections per group
  fieldSelections: {
    basicInfo: 'source' | 'target' | 'discard';
    professional: 'source' | 'target' | 'discard';
    experience: 'source' | 'target' | 'discard';
    skills: 'source' | 'target' | 'discard';
    socialLinks: 'source' | 'target' | 'discard';
    education: 'source' | 'target' | 'discard';
    privacySettings: 'source' | 'target' | 'discard';
    notificationSettings: 'source' | 'target' | 'discard';
    settings: 'source' | 'target' | 'discard';
  };

  // Admin controls
  migrateReferences: boolean; // default true
  oldDocAction?: 'soft-delete' | 'hard-delete' | 'archive'; // optional, admin sets during review

  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'executing'
    | 'completed'
    | 'failed';
  initiatedBy: 'user' | 'admin';

  // Audit trail
  createdAt: Timestamp;
  createdBy: string;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  reviewNotes?: string;
  completedAt?: Timestamp;
  error?: string;
  migratedCollections?: string[]; // tracks partial progress on failure
  migrationProgress?: Record<string, string>; // collection → lastProcessedDocId for resumability
}
```

### `numero_cuenta_index` collection

```typescript
// Document ID = numeroCuenta value
interface NumeroCuentaIndex {
  uid: string;
  displayName: string;
}
```

Maintained exclusively by Cloud Functions. Read-only for authenticated clients.

**Uniqueness enforcement:** The index maintenance Cloud Function verifies uniqueness before writing. If a different UID already owns a `numeroCuenta`, the function does NOT overwrite — instead it flags the user doc with a `numeroCuentaConflict` field for admin resolution.

### New field on `users/{uid}`

```typescript
interface PotentialMergeMatch {
  matchedUid: string;
  numeroCuenta: string;
  detectedAt: Timestamp;
  dismissed: boolean;
}
```

### Field group mapping (actual Firestore paths)

| Group                | Firestore field paths                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| basicInfo            | `firstName`, `lastName`, `displayName`, `photoURL`                                                                    |
| professional         | `profile.company`, `profile.companyId`, `profile.position`, `profile.bio`, `profile.location`                         |
| experience           | `experience` (entire object: years, level, currentRole, previousRoles, industries)                                    |
| skills               | `skills` (top-level array)                                                                                            |
| socialLinks          | `socialMedia` (top-level object), `profile.linkedin`                                                                  |
| education            | `numeroCuenta`, `academicLevel`, `campus`, `generation`, `graduationYear`, `profile.degree`, `profile.specialization` |
| privacySettings      | `privacySettings` (entire object)                                                                                     |
| notificationSettings | `notificationSettings` (entire object)                                                                                |
| settings             | `settings` (entire object — language, profileVisibility, emailNotifications)                                          |

> Note: Field paths are based on actual Firestore document structure as written by the `onUserCreate` Cloud Function and `SignUpForm.tsx`, not TypeScript interfaces which may diverge. The `privacySettings` and `settings` fields coexist in Firestore — `privacySettings` is written by `onUserCreate`, while `settings` is the TypeScript `UserProfile.settings` object written by profile updates. Both are merge-relevant.

## Component 1: Auto-Detection

### Index Maintenance (Cloud Function)

An `onUserDocWritten` Cloud Function maintains `numero_cuenta_index`:

- **Created/Updated with `numeroCuenta`**:
  1. Check if `numero_cuenta_index/{numeroCuenta}` already exists with a _different_ UID
  2. If conflict: set `numeroCuentaConflict: { existingUid, numeroCuenta, detectedAt }` on the new user doc. Do NOT overwrite the index. Admin resolves manually.
  3. If no conflict: upsert `numero_cuenta_index/{numeroCuenta}` with `{ uid, displayName }`
- **Deleted or `numeroCuenta` removed**: delete corresponding index doc
- **Merge completed (soft-delete/archive)**: delete index entry for old UID

### Client-Side Detection (SignUpForm Step 3)

After the user enters their `numeroCuenta` during UNAM verification:

1. Read `numero_cuenta_index/{numeroCuenta}`
2. If doc exists AND `uid !== currentUser.uid`:
   - Set `potentialMergeMatch` on own user doc (allowed via Firestore rules — `potentialMergeMatch` added to user self-update allowlist)
3. If no match: proceed normally

### Dashboard Notification

In the member dashboard, if `userProfile.potentialMergeMatch` exists and `dismissed === false`:

> "We found an existing profile matching your UNAM account number. Would you like to claim it?"
> [Review Profile] [Dismiss]

- **Dismiss** sets `potentialMergeMatch.dismissed = true`
- **Review Profile** opens the claim flow

## Component 2: Self-Service Claim Flow

### Claim UI

A modal or dedicated page showing a side-by-side comparison:

- **Left column**: stale profile data (fetched by `matchedUid`)
- **Right column**: current profile data
- For each field group, radio buttons: **Keep old** / **Keep new** / **Discard**

**Firestore rule for reading the stale profile**: The existing `users` collection has `allow read: if true` for authenticated users. No additional read rule is needed. If this is tightened in the future, a merge-specific read rule should be added using `potentialMergeMatch.matchedUid`.

### Submission

User submits selections → creates `merge_request` doc:

- `status: 'pending'`
- `initiatedBy: 'user'`
- `migrateReferences: true` (default, admin can override)
- `oldDocAction`: not set (admin decides during review)

User sees confirmation:

> "Your profile claim request has been submitted. An admin will review it shortly."

### Rate limiting

Firestore rules enforce: only one `pending` merge request per `targetUid` at a time. After rejection, user must wait for admin to clear a cooldown flag (or 7 days auto-expire) before submitting again.

## Component 3: Admin Merge Tool

### Location

New section in admin dashboard (`src/components/admin/`).

### Two Entry Points

**1. Merge Requests Queue**

List of pending merge requests showing:

- Requester name + email (new profile)
- Stale profile name + email (old profile)
- `numeroCuenta` match
- Created date
- Actions: [Review] [Reject]

**2. Manual Merge**

Admin searches for two profiles by name/email/numeroCuenta and initiates a merge directly. Same field selection UI as claim flow.

### Review UI (shared for both entry points)

- Side-by-side profile comparison (reusable component shared with claim flow)
- If user-initiated: shows user's field selections, admin can override
- If admin-initiated: admin makes all selections
- **Admin-only controls:**
  - `migrateReferences`: toggle (default on)
  - `oldDocAction`: radio — Soft-delete / Hard-delete / Archive
  - `reviewNotes`: text field
- [Approve & Execute] [Reject] buttons

### Notifications

User is notified when their merge request is approved or rejected (in-app or email per `notificationSettings`).

## Component 4: Merge Engine (Cloud Function)

### Trigger

`onMergeRequestUpdated` — fires on any update to a `merge_requests` document. The function **must** check that the status transition is specifically from a non-`approved` status to `approved` (comparing `event.data.before` vs `event.data.after`). All other transitions are ignored.

### Configuration

- **Timeout**: 540 seconds (maximum for Cloud Functions v2)
- **Memory**: 512MB
- **Retry**: disabled (manual retry via admin)

### Execution Steps

1. Set request status to `executing`
2. Read both source and target user docs
3. Apply `fieldSelections` — for each group marked `source`, copy Firestore field paths from old doc to new doc (see field group mapping above)
4. If `migrateReferences === true`, update references across all collections (see Reference Migration below)
5. Handle old doc per `oldDocAction`:
   - `soft-delete`: set `{ merged: true, mergedInto: targetUid, mergedAt: timestamp }`
   - `hard-delete`: delete the document
   - `archive`: copy to `archived_users/{sourceUid}`, then delete from `users`
6. Disable old Firebase Auth account via `admin.auth().updateUser(sourceUid, { disabled: true })`
7. Remove `potentialMergeMatch` from target user doc
8. Delete `numero_cuenta_index` entry for old UID
9. Set request status to `completed`

### Reference Migration — Complete Collection Inventory

All collections that store user UIDs, with actual Firestore field names:

**Simple UID field updates** (query by field, update in batch):

| Collection             | Field(s)               | Query pattern                                                           |
| ---------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `jobs`                 | `postedBy`             | `where('postedBy', '==', sourceUid)`                                    |
| `applications`         | `applicantId`          | `where('applicantId', '==', sourceUid)`                                 |
| `events`               | `createdBy`            | `where('createdBy', '==', sourceUid)`                                   |
| `eventRegistrations`   | `userId`               | `where('userId', '==', sourceUid)`                                      |
| `connectionRequests`   | `from`                 | `where('from', '==', sourceUid)`                                        |
| `connectionRequests`   | `to`                   | `where('to', '==', sourceUid)`                                          |
| `messages`             | `senderId`             | `where('senderId', '==', sourceUid)`                                    |
| `messages`             | `recipientId`          | `where('recipientId', '==', sourceUid)`                                 |
| `resources`            | `uploadedBy`           | `where('uploadedBy', '==', sourceUid)`                                  |
| `resource_downloads`   | `userId`               | `where('userId', '==', sourceUid)`                                      |
| `resource_activities`  | `userId`               | `where('userId', '==', sourceUid)`                                      |
| `blog`                 | `authorId`             | `where('authorId', '==', sourceUid)`                                    |
| `companies`            | `createdBy`            | `where('createdBy', '==', sourceUid)`                                   |
| `commission_members`   | `userId`               | `where('userId', '==', sourceUid)`                                      |
| `reports`              | `reportedBy`           | `where('reportedBy', '==', sourceUid)`                                  |
| `resource_reviews`     | `reviewerId`           | `where('reviewerId', '==', sourceUid)`                                  |
| `resource_bookmarks`   | `userId`               | `where('userId', '==', sourceUid)`                                      |
| `resource_collections` | `createdBy`            | `where('createdBy', '==', sourceUid)`                                   |
| `mentorship_matches`   | `mentorId`             | `where('mentorId', '==', sourceUid)`                                    |
| `mentorship_matches`   | `menteeId`             | `where('menteeId', '==', sourceUid)`                                    |
| `mentorship_sessions`  | `mentorId`             | `where('mentorId', '==', sourceUid)`                                    |
| `mentorship_sessions`  | `menteeId`             | `where('menteeId', '==', sourceUid)`                                    |
| `mentorship_requests`  | `fromUserId`           | `where('fromUserId', '==', sourceUid)`                                  |
| `mentorship_requests`  | `toUserId`             | `where('toUserId', '==', sourceUid)`                                    |
| `mentorship_feedback`  | `fromUserId`           | `where('fromUserId', '==', sourceUid)`                                  |
| `mentorship_feedback`  | `toUserId`             | `where('toUserId', '==', sourceUid)`                                    |
| `mentorship_goals`     | `mentorId`             | `where('mentorId', '==', sourceUid)`                                    |
| `mentorship_goals`     | `menteeId`             | `where('menteeId', '==', sourceUid)`                                    |
| `mentorship_resources` | `sharedBy`             | `where('sharedBy', '==', sourceUid)`                                    |
| `mentorship` (legacy)  | `mentorId`, `menteeId` | `where('mentorId', '==', sourceUid)` (also check `menteeId`)            |
| `spotlights`           | `featuredMemberId`     | `where('featuredMemberId', '==', sourceUid)` (verify field name exists) |

**Subcollection updates** (query parent, then update subcollection docs):

| Parent Collection                 | Subcollection   | Field(s)      |
| --------------------------------- | --------------- | ------------- |
| `forums/{forumId}`                | `posts`         | `authorId`    |
| `forums/{forumId}/posts/{postId}` | `replies`       | `authorId`    |
| `jobs/{jobId}`                    | `applications`  | `applicantId` |
| `events/{eventId}`                | `registrations` | `userId`      |

**Document-ID-keyed collections** (doc ID = UID):

| Collection      | Strategy                                                       |
| --------------- | -------------------------------------------------------------- |
| `mentors/{uid}` | Copy `mentors/{sourceUid}` → `mentors/{targetUid}`, delete old |
| `mentees/{uid}` | Copy `mentees/{sourceUid}` → `mentees/{targetUid}`, delete old |

**Array fields on other users' documents** (read-modify-write):

| Collection         | Field                           | Strategy                                                                                                                                                                               |
| ------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users/{otherUid}` | `networking.connections`        | `arrayRemove(sourceUid)` + `arrayUnion(targetUid)`                                                                                                                                     |
| `users/{otherUid}` | `networking.pendingConnections` | Same                                                                                                                                                                                   |
| `users/{otherUid}` | `networking.followers`          | Same                                                                                                                                                                                   |
| `users/{otherUid}` | `networking.following`          | Same                                                                                                                                                                                   |
| `users/{otherUid}` | `networking.blockedUsers`       | Same                                                                                                                                                                                   |
| `conversations`    | `participants`                  | Read doc, replace sourceUid in string array, write back. Note: Firestore stores `participants` as `string[]` (plain UID array), not `ConversationParticipant[]` from TypeScript types. |

**Intentionally NOT migrated:**

| Collection                      | Reason                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| `admin_activity_log`            | Historical audit trail — old UID references are accurate for when the action occurred |
| `mail`                          | Transactional emails already sent                                                     |
| `newsletter`, `contactMessages` | Email-based, not UID-based                                                            |

> **Note on `messages` collection:** The application code writes `senderId`/`recipientId` (`src/lib/messaging.ts`), but Firestore rules reference `from`/`to`. This is a pre-existing codebase inconsistency. The merge engine uses `senderId`/`recipientId` (matching app code). Legacy documents using `from`/`to` may exist and would not be migrated — acceptable since they would also not be queryable by the app.

> **Note on `conversations.participants`:** Stored in Firestore as a plain `string[]` (array of UIDs), not as `ConversationParticipant[]` from TypeScript types. The merge engine operates on the actual stored shape.

> **Note on `onMemberStatusChange` trigger interaction:** The existing Cloud Function at `functions/src/index.ts` fires on any user doc update and syncs Google Groups if `lifecycle.status` changes. If the merge includes lifecycle field changes on the target user doc, this could trigger unintended group membership changes. The merge engine should either: (a) skip writing `lifecycle` fields that would trigger status transitions, or (b) write a `_mergeInProgress: true` flag that the `onMemberStatusChange` function checks and ignores.

### Batching and Progress Tracking

- Batched writes in groups of 500 (Firestore limit)
- `migratedCollections` array updated after each collection completes
- On failure, `lastProcessedDocId` stored per collection for resumability
- **Retry strategy**: Admin changes status from `failed` back to `approved`, engine resumes from `migratedCollections` checkpoint (skips already-migrated collections)

### Error Handling

If any step fails:

- Set request status to `failed` with error message
- `migratedCollections` array shows what was partially migrated
- `lastProcessedDocId` per collection enables resume from last checkpoint
- Admin can review and retry (re-approve)

No automatic rollback — partial migration is surfaced to admin for manual resolution.

## Firestore Security Rules

```
// numero_cuenta_index: read-only for authenticated users
match /numero_cuenta_index/{numeroCuenta} {
  allow read: if request.auth != null;
  allow write: if false; // Cloud Functions only (uses Admin SDK, bypasses rules)
}

// merge_requests: users create own, admins manage
// Rate limiting: client-side lib checks for existing pending request before creating.
// Server-side enforcement via Cloud Function that rejects if pending request already exists.
match /merge_requests/{requestId} {
  allow create: if request.auth != null
    && request.resource.data.targetUid == request.auth.uid
    && request.resource.data.status == 'pending'
    && request.resource.data.initiatedBy == 'user';
  allow read: if request.auth != null
    && (resource.data.targetUid == request.auth.uid
        || resource.data.sourceUid == request.auth.uid
        || canAdminister());
  allow update: if canAdminister();
  allow delete: if false;
}

// archived_users: admin only
match /archived_users/{userId} {
  allow read, write: if canAdminister();
}
```

**Changes to existing `users/{userId}` rules:**

- Add `potentialMergeMatch` to the user self-update allowlist in `firestore.rules` (existing allowlist at lines 91-99)

**Note:** Uses `canAdminister()` helper to match existing codebase convention (not `isAdmin()`).

### Firestore Indexes Required

Add to `firestore.indexes.json`:

```json
[
  {
    "collectionGroup": "merge_requests",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "merge_requests",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "targetUid", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" }
    ]
  }
]
```

## Reusable Components

### `ProfileComparison` component

Shared between self-service claim UI and admin merge tool:

- Two-column layout with source (old) and target (new) profiles
- Per-field-group radio selection (keep old / keep new / discard)
- Visual diff highlighting for changed values
- Props: `sourceProfile`, `targetProfile`, `selections`, `onSelectionsChange`, `readOnly?`

### `MergeRequestStatus` component

Status badge/indicator showing merge request progress:

- pending → approved → executing → completed/failed

## Files to Create/Modify

### New files

- `src/components/merge/ProfileComparison.tsx` — shared comparison UI
- `src/components/merge/ClaimFlow.tsx` — self-service claim modal/page
- `src/components/merge/MergeNotificationBanner.tsx` — dashboard notification
- `src/components/admin/MergeRequestsQueue.tsx` — admin queue
- `src/components/admin/AdminMergeTool.tsx` — admin manual merge + review UI
- `src/types/merge.ts` — MergeRequest, PotentialMergeMatch types
- `src/lib/merge/mutations.ts` — createMergeRequest, dismissMatch helpers
- `functions/src/merge-engine.ts` — merge execution Cloud Function
- `functions/src/numero-cuenta-index.ts` — index maintenance Cloud Function

### Modified files

- `functions/src/index.ts` — register new Cloud Functions
- `src/components/auth/SignUpForm.tsx` — add index lookup in Step 3
- `src/components/dashboard/` — add MergeNotificationBanner
- `src/components/admin/` — add merge section to admin nav
- `firestore.rules` — add rules for new collections + `potentialMergeMatch` to user allowlist
- `firestore.indexes.json` — add composite indexes for merge_requests queries
- `src/types/user.ts` — add `potentialMergeMatch` to user type
