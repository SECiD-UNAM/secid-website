# Profile Merge System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable members who re-register with a new email to associate their stale profile with the new account via auto-detection, self-service claim, and admin merge tools.

**Architecture:** Shared merge engine Cloud Function triggered by a `merge_requests` Firestore collection. Three thin entry points: (1) client-side auto-detection via `numero_cuenta_index`, (2) self-service claim flow with admin approval, (3) admin merge tool. All merges require admin approval before execution.

**Tech Stack:** TypeScript, Firebase (Firestore, Cloud Functions v2, Auth Admin SDK), React 18, Tailwind CSS, Zod, Lucide icons, Vitest

**Spec:** `docs/superpowers/specs/2026-03-21-profile-merge-system-design.md`

---

## File Structure

### New files

| File                                                           | Responsibility                                                       |
| -------------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/types/merge.ts`                                           | Type definitions for MergeRequest, PotentialMergeMatch, field groups |
| `src/lib/merge/mutations.ts`                                   | Client-side Firestore operations for merge requests                  |
| `src/lib/merge/field-groups.ts`                                | Field group → Firestore path mapping, merge logic                    |
| `functions/src/numero-cuenta-index.ts`                         | Cloud Function: maintain `numero_cuenta_index` with uniqueness       |
| `functions/src/merge-engine.ts`                                | Cloud Function: execute approved merges                              |
| `src/components/merge/MergeNotificationBanner.tsx`             | Dashboard notification for detected matches                          |
| `src/components/merge/ProfileComparison.tsx`                   | Reusable side-by-side profile comparison with field selection        |
| `src/components/merge/ClaimFlow.tsx`                           | Self-service claim modal                                             |
| `src/components/merge/MergeRequestStatus.tsx`                  | Status badge component                                               |
| `src/components/admin/MergeRequestsQueue.tsx`                  | Admin: pending merge requests list                                   |
| `src/components/admin/AdminMergeTool.tsx`                      | Admin: manual merge + review UI                                      |
| `tests/unit/lib/merge/field-groups.test.ts`                    | Tests for field group mapping                                        |
| `tests/unit/lib/merge/mutations.test.ts`                       | Tests for merge mutations                                            |
| `tests/unit/components/merge/ProfileComparison.test.tsx`       | Tests for comparison component                                       |
| `tests/unit/components/merge/MergeNotificationBanner.test.tsx` | Tests for notification banner                                        |

### Modified files

| File                                             | Change                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| `src/types/user.ts:48`                           | Add `potentialMergeMatch?` field to `UserProfile`                       |
| `firestore.rules:99`                             | Add `potentialMergeMatch` to self-update allowlist                      |
| `firestore.rules:707`                            | Add rules for `merge_requests`, `numero_cuenta_index`, `archived_users` |
| `firestore.indexes.json:119`                     | Add merge_requests composite indexes                                    |
| `functions/src/index.ts:1-10,398`                | Import and register new Cloud Functions                                 |
| `src/components/auth/SignUpForm.tsx:12,317-333`  | Add index lookup after `numeroCuenta` submission                        |
| `src/components/dashboard/DashboardShell.tsx:51` | Add MergeNotificationBanner above children                              |
| `src/components/admin/AdminNavigation.tsx:105`   | Add merge tool nav item                                                 |

---

## Task 1: Types & Data Model

**Files:**

- Create: `src/types/merge.ts`
- Modify: `src/types/user.ts:48`

- [ ] **Step 1: Create merge types file**

```typescript
// src/types/merge.ts
import type { Timestamp } from 'firebase/firestore';

export type FieldSelection = 'source' | 'target' | 'discard';

export type FieldGroupKey =
  | 'basicInfo'
  | 'professional'
  | 'experience'
  | 'skills'
  | 'socialLinks'
  | 'education'
  | 'privacySettings'
  | 'notificationSettings'
  | 'settings';

export type FieldSelections = Record<FieldGroupKey, FieldSelection>;

export type MergeRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed';

export type OldDocAction = 'soft-delete' | 'hard-delete' | 'archive';

export interface MergeRequest {
  id: string;
  sourceUid: string;
  targetUid: string;
  matchedBy: 'numeroCuenta';
  numeroCuenta: string;
  fieldSelections: FieldSelections;
  migrateReferences: boolean;
  oldDocAction?: OldDocAction;
  status: MergeRequestStatus;
  initiatedBy: 'user' | 'admin';
  createdAt: Timestamp;
  createdBy: string;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  reviewNotes?: string;
  completedAt?: Timestamp;
  error?: string;
  migratedCollections?: string[];
  migrationProgress?: Record<string, string>;
}

export interface PotentialMergeMatch {
  matchedUid: string;
  numeroCuenta: string;
  detectedAt: Timestamp;
  dismissed: boolean;
}

export interface NumeroCuentaIndex {
  uid: string;
  displayName: string;
}

export interface NumeroCuentaConflict {
  existingUid: string;
  numeroCuenta: string;
  detectedAt: Timestamp;
}
```

- [ ] **Step 2: Add potentialMergeMatch to UserProfile**

In `src/types/user.ts`, add after line 47 (before the closing `}` of `UserProfile`):

```typescript
  // Profile merge detection
  potentialMergeMatch?: {
    matchedUid: string;
    numeroCuenta: string;
    detectedAt: Date;
    dismissed: boolean;
  };
  numeroCuentaConflict?: {
    existingUid: string;
    numeroCuenta: string;
    detectedAt: Date;
  };
```

- [ ] **Step 3: Commit**

```bash
git add src/types/merge.ts src/types/user.ts
git commit -m "feat(merge): add type definitions for profile merge system"
```

---

## Task 2: Field Group Mapping

**Files:**

- Create: `src/lib/merge/field-groups.ts`
- Create: `tests/unit/lib/merge/field-groups.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/lib/merge/field-groups.test.ts
import { describe, it, expect } from 'vitest';
import {
  FIELD_GROUPS,
  getFieldsForGroup,
  applyFieldSelections,
} from '@/lib/merge/field-groups';
import type { FieldSelections } from '@/types/merge';

describe('FIELD_GROUPS', () => {
  it('should map basicInfo to correct Firestore paths', () => {
    expect(FIELD_GROUPS.basicInfo).toEqual([
      'firstName',
      'lastName',
      'displayName',
      'photoURL',
    ]);
  });

  it('should map all 9 field groups', () => {
    const keys = Object.keys(FIELD_GROUPS);
    expect(keys).toHaveLength(9);
    expect(keys).toContain('professional');
    expect(keys).toContain('experience');
    expect(keys).toContain('skills');
    expect(keys).toContain('socialLinks');
    expect(keys).toContain('education');
    expect(keys).toContain('privacySettings');
    expect(keys).toContain('notificationSettings');
    expect(keys).toContain('settings');
  });
});

describe('getFieldsForGroup', () => {
  it('should return fields for a valid group key', () => {
    const fields = getFieldsForGroup('basicInfo');
    expect(fields).toContain('firstName');
    expect(fields).toContain('photoURL');
  });
});

describe('applyFieldSelections', () => {
  const sourceDoc = {
    firstName: 'Old',
    lastName: 'User',
    displayName: 'Old User',
    photoURL: 'old.jpg',
    profile: {
      company: 'OldCorp',
      position: 'Dev',
      bio: '',
      location: '',
      linkedin: '',
    },
    skills: ['python'],
  };
  const targetDoc = {
    firstName: 'New',
    lastName: 'User',
    displayName: 'New User',
    photoURL: 'new.jpg',
    profile: {
      company: 'NewCorp',
      position: 'Lead',
      bio: 'hi',
      location: 'MX',
      linkedin: 'li',
    },
    skills: ['typescript'],
  };

  it('should keep source fields when selection is source', () => {
    const selections: FieldSelections = {
      basicInfo: 'source',
      professional: 'target',
      experience: 'discard',
      skills: 'source',
      socialLinks: 'discard',
      education: 'discard',
      privacySettings: 'discard',
      notificationSettings: 'discard',
      settings: 'discard',
    };
    const result = applyFieldSelections(sourceDoc, targetDoc, selections);
    expect(result.firstName).toBe('Old');
    expect(result['profile.company']).toBeUndefined();
    expect(result.skills).toEqual(['python']);
  });

  it('should return empty object for all discard', () => {
    const selections: FieldSelections = {
      basicInfo: 'discard',
      professional: 'discard',
      experience: 'discard',
      skills: 'discard',
      socialLinks: 'discard',
      education: 'discard',
      privacySettings: 'discard',
      notificationSettings: 'discard',
      settings: 'discard',
    };
    const result = applyFieldSelections(sourceDoc, targetDoc, selections);
    expect(Object.keys(result)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run tests/unit/lib/merge/field-groups.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/merge/field-groups.ts
import type { FieldGroupKey, FieldSelections } from '@/types/merge';

/**
 * Maps field group keys to their actual Firestore document paths.
 * These are the paths as stored in Firestore, not TypeScript interface names.
 */
export const FIELD_GROUPS: Record<FieldGroupKey, string[]> = {
  basicInfo: ['firstName', 'lastName', 'displayName', 'photoURL'],
  professional: [
    'profile.company',
    'profile.companyId',
    'profile.position',
    'profile.bio',
    'profile.location',
  ],
  experience: ['experience'],
  skills: ['skills'],
  socialLinks: ['socialMedia', 'profile.linkedin'],
  education: [
    'numeroCuenta',
    'academicLevel',
    'campus',
    'generation',
    'graduationYear',
    'profile.degree',
    'profile.specialization',
  ],
  privacySettings: ['privacySettings'],
  notificationSettings: ['notificationSettings'],
  settings: ['settings'],
};

export function getFieldsForGroup(groupKey: FieldGroupKey): string[] {
  return FIELD_GROUPS[groupKey] ?? [];
}

/**
 * Given source and target docs + user selections, returns a flat update object
 * with Firestore dot-notation paths to apply to the target document.
 *
 * Only 'source' selections produce updates (copy from source → target).
 * 'target' keeps existing values (no-op). 'discard' deletes nothing (data stays as-is on target).
 */
export function applyFieldSelections(
  sourceDoc: Record<string, any>,
  _targetDoc: Record<string, any>,
  selections: FieldSelections
): Record<string, any> {
  const updates: Record<string, any> = {};

  for (const [groupKey, selection] of Object.entries(selections)) {
    if (selection !== 'source') continue;

    const fields = FIELD_GROUPS[groupKey as FieldGroupKey];
    if (!fields) continue;

    for (const fieldPath of fields) {
      const value = getNestedValue(sourceDoc, fieldPath);
      if (value !== undefined) {
        updates[fieldPath] = value;
      }
    }
  }

  return updates;
}

/** Resolve a dot-notation path like 'profile.company' from a nested object. */
function getNestedValue(obj: Record<string, any>, path: string): any {
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run tests/unit/lib/merge/field-groups.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/merge/field-groups.ts tests/unit/lib/merge/field-groups.test.ts
git commit -m "feat(merge): add field group mapping with Firestore paths"
```

---

## Task 3: Firestore Rules & Indexes

**Files:**

- Modify: `firestore.rules:99,707`
- Modify: `firestore.indexes.json:119`

- [ ] **Step 1: Add potentialMergeMatch to user self-update allowlist**

In `firestore.rules`, line 99 — add `'potentialMergeMatch'` to the `.hasOnly()` array:

```
// Change line 99 from:
                                  'networking', 'activity']);
// To:
                                  'networking', 'activity',
                                  'potentialMergeMatch']);
```

- [ ] **Step 2: Add new collection rules before the closing `}}`**

Insert before line 708 (before the final `  }` + `}`) in `firestore.rules`:

```
    // =========================================================================
    // Profile Merge System
    // =========================================================================

    // numero_cuenta_index: read-only for authenticated users
    // Cloud Functions use Admin SDK (bypasses rules) to write
    match /numero_cuenta_index/{numeroCuenta} {
      allow read: if isAuthenticated();
      allow write: if false;
    }

    // merge_requests: users create their own, admins create and manage
    match /merge_requests/{requestId} {
      // Users can create pending requests for themselves
      allow create: if isAuthenticated()
        && request.resource.data.targetUid == request.auth.uid
        && request.resource.data.status == 'pending'
        && request.resource.data.initiatedBy == 'user';
      // Admins can create requests with any status (including pre-approved)
      allow create: if isAuthenticated() && canAdminister();
      allow read: if isAuthenticated()
        && (resource.data.targetUid == request.auth.uid
            || resource.data.sourceUid == request.auth.uid
            || canAdminister());
      allow update: if isAuthenticated() && canAdminister();
      allow delete: if false;
    }

    // archived_users: admin only
    match /archived_users/{userId} {
      allow read, write: if isAuthenticated() && canAdminister();
    }
```

- [ ] **Step 3: Add composite indexes for merge_requests**

In `firestore.indexes.json`, add two entries to the `indexes` array (before the closing `]`):

```json
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
```

- [ ] **Step 4: Commit**

```bash
git add firestore.rules firestore.indexes.json
git commit -m "feat(merge): add Firestore rules and indexes for merge system"
```

---

## Task 4: Client Merge Mutations Library

**Files:**

- Create: `src/lib/merge/mutations.ts`
- Create: `tests/unit/lib/merge/mutations.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/lib/merge/mutations.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase before imports
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockGetDocs = vi.fn();
const mockServerTimestamp = vi.fn(() => 'SERVER_TS');

vi.mock('firebase/firestore', () => ({
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  doc: (...args: any[]) => mockDoc(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
  isUsingMockAPI: () => false,
}));

import {
  checkNumeroCuentaMatch,
  createMergeRequest,
  dismissMergeMatch,
} from '@/lib/merge/mutations';

describe('checkNumeroCuentaMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when no match exists', async () => {
    mockDoc.mockReturnValue('docRef');
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const result = await checkNumeroCuentaMatch('12345', 'currentUid');
    expect(result).toBeNull();
  });

  it('should return match data when different UID owns the numeroCuenta', async () => {
    mockDoc.mockReturnValue('docRef');
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ uid: 'otherUid', displayName: 'Other User' }),
    });
    const result = await checkNumeroCuentaMatch('12345', 'currentUid');
    expect(result).toEqual({ uid: 'otherUid', displayName: 'Other User' });
  });

  it('should return null when same UID owns the numeroCuenta', async () => {
    mockDoc.mockReturnValue('docRef');
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ uid: 'currentUid', displayName: 'Same User' }),
    });
    const result = await checkNumeroCuentaMatch('12345', 'currentUid');
    expect(result).toBeNull();
  });
});

describe('dismissMergeMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update potentialMergeMatch.dismissed to true', async () => {
    mockDoc.mockReturnValue('docRef');
    mockUpdateDoc.mockResolvedValue(undefined);
    await dismissMergeMatch('uid123');
    expect(mockUpdateDoc).toHaveBeenCalledWith('docRef', {
      'potentialMergeMatch.dismissed': true,
      updatedAt: 'SERVER_TS',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run tests/unit/lib/merge/mutations.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/merge/mutations.ts
import { db, isUsingMockAPI } from '../firebase';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import type {
  MergeRequest,
  FieldSelections,
  NumeroCuentaIndex,
  PotentialMergeMatch,
} from '@/types/merge';

const COLLECTIONS = {
  USERS: 'users',
  MERGE_REQUESTS: 'merge_requests',
  NUMERO_CUENTA_INDEX: 'numero_cuenta_index',
};

/**
 * Check if a numeroCuenta is already registered to a different user.
 * Reads from the numero_cuenta_index collection (client read-only).
 */
export async function checkNumeroCuentaMatch(
  numeroCuenta: string,
  currentUid: string
): Promise<NumeroCuentaIndex | null> {
  if (isUsingMockAPI()) return null;

  const indexRef = doc(db, COLLECTIONS.NUMERO_CUENTA_INDEX, numeroCuenta);
  const snap = await getDoc(indexRef);

  if (!snap.exists()) return null;

  const data = snap.data() as NumeroCuentaIndex;
  if (data.uid === currentUid) return null;

  return data;
}

/**
 * Set potentialMergeMatch on the current user's document.
 */
export async function setPotentialMergeMatch(
  uid: string,
  match: { matchedUid: string; numeroCuenta: string }
): Promise<void> {
  if (isUsingMockAPI()) return;

  const userRef = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(userRef, {
    potentialMergeMatch: {
      matchedUid: match.matchedUid,
      numeroCuenta: match.numeroCuenta,
      detectedAt: serverTimestamp(),
      dismissed: false,
    },
    updatedAt: serverTimestamp(),
  });
}

/**
 * Dismiss the merge match notification.
 */
export async function dismissMergeMatch(uid: string): Promise<void> {
  if (isUsingMockAPI()) return;

  const userRef = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(userRef, {
    'potentialMergeMatch.dismissed': true,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Check if user already has a pending merge request.
 */
export async function hasPendingMergeRequest(
  targetUid: string
): Promise<boolean> {
  if (isUsingMockAPI()) return false;

  const q = query(
    collection(db, COLLECTIONS.MERGE_REQUESTS),
    where('targetUid', '==', targetUid),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Create a merge request (user-initiated).
 */
export async function createMergeRequest(params: {
  sourceUid: string;
  targetUid: string;
  numeroCuenta: string;
  fieldSelections: FieldSelections;
  createdBy: string;
}): Promise<string> {
  if (isUsingMockAPI()) return 'mock-merge-request-id';

  // Client-side rate limiting check
  const hasPending = await hasPendingMergeRequest(params.targetUid);
  if (hasPending) {
    throw new Error('You already have a pending merge request.');
  }

  const mergeRef = doc(collection(db, COLLECTIONS.MERGE_REQUESTS));

  const request: Omit<MergeRequest, 'id'> = {
    sourceUid: params.sourceUid,
    targetUid: params.targetUid,
    matchedBy: 'numeroCuenta',
    numeroCuenta: params.numeroCuenta,
    fieldSelections: params.fieldSelections,
    migrateReferences: true,
    status: 'pending',
    initiatedBy: 'user',
    createdAt: serverTimestamp() as any,
    createdBy: params.createdBy,
  };

  await setDoc(mergeRef, { ...request, id: mergeRef.id });
  return mergeRef.id;
}

/**
 * Fetch a user profile by UID (for the comparison view).
 */
export async function fetchUserProfile(uid: string): Promise<any | null> {
  if (isUsingMockAPI()) return null;

  const userRef = doc(db, COLLECTIONS.USERS, uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run tests/unit/lib/merge/mutations.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/merge/mutations.ts tests/unit/lib/merge/mutations.test.ts
git commit -m "feat(merge): add client-side merge mutations library"
```

---

## Task 5: Cloud Function — numero_cuenta_index Maintenance

**Files:**

- Create: `functions/src/numero-cuenta-index.ts`
- Modify: `functions/src/index.ts:1-10,398`

- [ ] **Step 1: Create the index maintenance function**

```typescript
// functions/src/numero-cuenta-index.ts
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Maintains the numero_cuenta_index collection whenever a user doc is
 * created, updated, or deleted. Enforces uniqueness — if a different UID
 * already owns the numeroCuenta, flags a conflict on the user doc instead
 * of overwriting the index.
 */
export const onUserNumeroCuentaChange = onDocumentWritten(
  'users/{userId}',
  async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();
    const userId = event.params.userId;

    const oldNumeroCuenta = beforeData?.numeroCuenta as string | undefined;
    const newNumeroCuenta = afterData?.numeroCuenta as string | undefined;

    // No change in numeroCuenta
    if (oldNumeroCuenta === newNumeroCuenta) return;

    // If old numeroCuenta was removed or changed, delete old index entry
    if (oldNumeroCuenta) {
      const oldIndexRef = db
        .collection('numero_cuenta_index')
        .doc(oldNumeroCuenta);
      const oldIndexSnap = await oldIndexRef.get();
      // Only delete if this user owns the index entry
      if (oldIndexSnap.exists && oldIndexSnap.data()?.uid === userId) {
        await oldIndexRef.delete();
        console.log(
          `Deleted index for numeroCuenta ${oldNumeroCuenta} (user ${userId})`
        );
      }
    }

    // If new numeroCuenta is set, create/update index entry
    if (newNumeroCuenta) {
      const indexRef = db
        .collection('numero_cuenta_index')
        .doc(newNumeroCuenta);
      const indexSnap = await indexRef.get();

      if (indexSnap.exists) {
        const existingUid = indexSnap.data()?.uid;
        if (existingUid && existingUid !== userId) {
          // Conflict: different user already owns this numeroCuenta
          console.warn(
            `numeroCuenta conflict: ${newNumeroCuenta} owned by ${existingUid}, ` +
              `attempted by ${userId}`
          );
          await db
            .collection('users')
            .doc(userId)
            .update({
              numeroCuentaConflict: {
                existingUid,
                numeroCuenta: newNumeroCuenta,
                detectedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
            });
          return;
        }
      }

      // No conflict — upsert the index
      const displayName =
        afterData?.displayName ||
        `${afterData?.firstName || ''} ${afterData?.lastName || ''}`.trim() ||
        afterData?.email ||
        '';

      await indexRef.set({ uid: userId, displayName });
      console.log(`Indexed numeroCuenta ${newNumeroCuenta} → ${userId}`);
    }
  }
);
```

- [ ] **Step 2: Register in functions/src/index.ts**

Add import at the top of `functions/src/index.ts` (after line 26):

```typescript
import { onUserNumeroCuentaChange } from './numero-cuenta-index';
```

Add re-export at the end of the file:

```typescript
// Profile Merge: numero_cuenta_index maintenance
export { onUserNumeroCuentaChange };
```

- [ ] **Step 3: Verify the functions compile**

Run: `cd functions && npm run build`
Expected: Clean compile, no errors

- [ ] **Step 4: Commit**

```bash
git add functions/src/numero-cuenta-index.ts functions/src/index.ts
git commit -m "feat(merge): add numero_cuenta_index Cloud Function with uniqueness enforcement"
```

---

## Task 6: Cloud Function — Merge Engine

**Files:**

- Create: `functions/src/merge-engine.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Create the merge engine**

```typescript
// functions/src/merge-engine.ts
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Field group → Firestore paths mapping (must match src/lib/merge/field-groups.ts)
const FIELD_GROUPS: Record<string, string[]> = {
  basicInfo: ['firstName', 'lastName', 'displayName', 'photoURL'],
  professional: [
    'profile.company',
    'profile.companyId',
    'profile.position',
    'profile.bio',
    'profile.location',
  ],
  experience: ['experience'],
  skills: ['skills'],
  socialLinks: ['socialMedia', 'profile.linkedin'],
  education: [
    'numeroCuenta',
    'academicLevel',
    'campus',
    'generation',
    'graduationYear',
    'profile.degree',
    'profile.specialization',
  ],
  privacySettings: ['privacySettings'],
  notificationSettings: ['notificationSettings'],
  settings: ['settings'],
};

// Collections to migrate with their UID field(s)
const SIMPLE_COLLECTIONS: Array<{ collection: string; field: string }> = [
  { collection: 'jobs', field: 'postedBy' },
  { collection: 'applications', field: 'applicantId' },
  { collection: 'events', field: 'createdBy' },
  { collection: 'eventRegistrations', field: 'userId' },
  { collection: 'connectionRequests', field: 'from' },
  { collection: 'connectionRequests', field: 'to' },
  { collection: 'messages', field: 'senderId' },
  { collection: 'messages', field: 'recipientId' },
  { collection: 'resources', field: 'uploadedBy' },
  { collection: 'resource_downloads', field: 'userId' },
  { collection: 'resource_activities', field: 'userId' },
  { collection: 'blog', field: 'authorId' },
  { collection: 'companies', field: 'createdBy' },
  { collection: 'commission_members', field: 'userId' },
  { collection: 'reports', field: 'reportedBy' },
  { collection: 'resource_reviews', field: 'reviewerId' },
  { collection: 'resource_bookmarks', field: 'userId' },
  { collection: 'resource_collections', field: 'createdBy' },
  { collection: 'mentorship_matches', field: 'mentorId' },
  { collection: 'mentorship_matches', field: 'menteeId' },
  { collection: 'mentorship_sessions', field: 'mentorId' },
  { collection: 'mentorship_sessions', field: 'menteeId' },
  { collection: 'mentorship_requests', field: 'fromUserId' },
  { collection: 'mentorship_requests', field: 'toUserId' },
  { collection: 'mentorship_feedback', field: 'fromUserId' },
  { collection: 'mentorship_feedback', field: 'toUserId' },
  { collection: 'mentorship_goals', field: 'mentorId' },
  { collection: 'mentorship_goals', field: 'menteeId' },
  { collection: 'mentorship_resources', field: 'sharedBy' },
  { collection: 'mentorship', field: 'mentorId' },
  { collection: 'mentorship', field: 'menteeId' },
  { collection: 'spotlights', field: 'featuredMemberId' },
];

const NETWORKING_FIELDS = [
  'networking.connections',
  'networking.pendingConnections',
  'networking.followers',
  'networking.following',
  'networking.blockedUsers',
];

function getNestedValue(obj: any, path: string): any {
  return path
    .split('.')
    .reduce((curr, key) => (curr != null ? curr[key] : undefined), obj);
}

/**
 * Merge engine: triggers when a merge_request status changes to 'approved'.
 */
export const onMergeRequestApproved = onDocumentUpdated(
  {
    document: 'merge_requests/{requestId}',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) return;

    // Only trigger on transition TO 'approved'
    if (beforeData.status === 'approved' || afterData.status !== 'approved')
      return;

    const requestId = event.params.requestId;
    const requestRef = db.collection('merge_requests').doc(requestId);

    const {
      sourceUid,
      targetUid,
      fieldSelections,
      migrateReferences,
      oldDocAction,
      migratedCollections: alreadyMigrated,
    } = afterData;

    console.log(
      `Executing merge: ${sourceUid} → ${targetUid} (request ${requestId})`
    );

    try {
      // Step 1: Set status to executing
      await requestRef.update({ status: 'executing' });

      // Step 2: Read both docs
      const [sourceSnap, targetSnap] = await Promise.all([
        db.collection('users').doc(sourceUid).get(),
        db.collection('users').doc(targetUid).get(),
      ]);

      if (!sourceSnap.exists)
        throw new Error(`Source user ${sourceUid} not found`);
      if (!targetSnap.exists)
        throw new Error(`Target user ${targetUid} not found`);

      const sourceDoc = sourceSnap.data()!;

      // Step 3: Apply field selections
      const updates: Record<string, any> = {};
      for (const [groupKey, selection] of Object.entries(fieldSelections)) {
        if (selection !== 'source') continue;
        const fields = FIELD_GROUPS[groupKey];
        if (!fields) continue;
        for (const fieldPath of fields) {
          const value = getNestedValue(sourceDoc, fieldPath);
          if (value !== undefined) {
            updates[fieldPath] = value;
          }
        }
      }

      // Write a merge-in-progress flag to prevent onMemberStatusChange from firing
      updates['_mergeInProgress'] = true;
      updates['updatedAt'] = admin.firestore.FieldValue.serverTimestamp();

      if (Object.keys(updates).length > 1) {
        await db.collection('users').doc(targetUid).update(updates);
      }

      // Step 4: Migrate references
      const migrated = alreadyMigrated || [];

      if (migrateReferences !== false) {
        // 4a: Simple collection field updates
        for (const { collection: collName, field } of SIMPLE_COLLECTIONS) {
          const collKey = `${collName}:${field}`;
          if (migrated.includes(collKey)) continue;

          await migrateSimpleCollection(collName, field, sourceUid, targetUid);
          migrated.push(collKey);
          await requestRef.update({ migratedCollections: migrated });
        }

        // 4b: Subcollection updates
        await migrateSubcollections(sourceUid, targetUid, migrated, requestRef);

        // 4c: Document-ID-keyed collections (mentors, mentees)
        await migrateDocIdCollections(
          sourceUid,
          targetUid,
          migrated,
          requestRef
        );

        // 4d: Networking arrays on other users
        await migrateNetworkingArrays(
          sourceUid,
          targetUid,
          migrated,
          requestRef
        );

        // 4e: Conversations participants array
        await migrateConversations(sourceUid, targetUid, migrated, requestRef);
      }

      // Step 5: Handle old doc
      const action = oldDocAction || 'soft-delete';
      if (action === 'soft-delete') {
        await db.collection('users').doc(sourceUid).update({
          merged: true,
          mergedInto: targetUid,
          mergedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else if (action === 'archive') {
        await db.collection('archived_users').doc(sourceUid).set(sourceDoc);
        await db.collection('users').doc(sourceUid).delete();
      } else if (action === 'hard-delete') {
        await db.collection('users').doc(sourceUid).delete();
      }

      // Step 6: Disable old Firebase Auth account
      try {
        await admin.auth().updateUser(sourceUid, { disabled: true });
      } catch (authErr: any) {
        console.warn(
          `Could not disable auth for ${sourceUid}: ${authErr.message}`
        );
      }

      // Step 7: Clean up target doc
      await db.collection('users').doc(targetUid).update({
        potentialMergeMatch: admin.firestore.FieldValue.delete(),
        _mergeInProgress: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Step 8: Delete old index entry
      const numeroCuenta = afterData.numeroCuenta;
      if (numeroCuenta) {
        const indexRef = db.collection('numero_cuenta_index').doc(numeroCuenta);
        const indexSnap = await indexRef.get();
        if (indexSnap.exists && indexSnap.data()?.uid === sourceUid) {
          await indexRef.delete();
        }
      }

      // Step 9: Mark complete
      await requestRef.update({
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        migratedCollections: migrated,
      });

      console.log(`Merge completed: ${sourceUid} → ${targetUid}`);
    } catch (err: any) {
      console.error(`Merge failed for request ${requestId}:`, err);
      await requestRef.update({
        status: 'failed',
        error: err.message || String(err),
      });
    }
  }
);

// ---- Helper functions ----

async function migrateSimpleCollection(
  collName: string,
  field: string,
  sourceUid: string,
  targetUid: string
) {
  const q = db.collection(collName).where(field, '==', sourceUid);
  const snap = await q.get();
  if (snap.empty) return;

  let batch = db.batch();
  let count = 0;
  for (const docSnap of snap.docs) {
    batch.update(docSnap.ref, { [field]: targetUid });
    count++;
    if (count >= 500) {
      await batch.commit();
      batch = db.batch(); // new batch after commit
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
}

async function migrateSubcollections(
  sourceUid: string,
  targetUid: string,
  migrated: string[],
  requestRef: FirebaseFirestore.DocumentReference
) {
  const subcollections = [
    { parent: 'forums', sub: 'posts', field: 'authorId' },
    { parent: 'jobs', sub: 'applications', field: 'applicantId' },
    { parent: 'events', sub: 'registrations', field: 'userId' },
  ];

  for (const { parent, sub, field } of subcollections) {
    const key = `${parent}/*/${sub}:${field}`;
    if (migrated.includes(key)) continue;

    const q = db.collectionGroup(sub).where(field, '==', sourceUid);
    const snap = await q.get();
    if (!snap.empty) {
      let batch = db.batch();
      let count = 0;
      for (const docSnap of snap.docs) {
        batch.update(docSnap.ref, { [field]: targetUid });
        count++;
        if (count >= 500) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
    }
    migrated.push(key);
    await requestRef.update({ migratedCollections: migrated });
  }

  // Forum replies (nested deeper)
  const repliesKey = 'forums/*/posts/*/replies:authorId';
  if (!migrated.includes(repliesKey)) {
    const q = db.collectionGroup('replies').where('authorId', '==', sourceUid);
    const snap = await q.get();
    if (!snap.empty) {
      let batch = db.batch();
      let count = 0;
      for (const docSnap of snap.docs) {
        batch.update(docSnap.ref, { authorId: targetUid });
        count++;
        if (count >= 500) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
    }
    migrated.push(repliesKey);
    await requestRef.update({ migratedCollections: migrated });
  }
}

async function migrateDocIdCollections(
  sourceUid: string,
  targetUid: string,
  migrated: string[],
  requestRef: FirebaseFirestore.DocumentReference
) {
  for (const collName of ['mentors', 'mentees']) {
    const key = `${collName}:docId`;
    if (migrated.includes(key)) continue;

    const sourceRef = db.collection(collName).doc(sourceUid);
    const snap = await sourceRef.get();
    if (snap.exists) {
      await db.collection(collName).doc(targetUid).set(snap.data()!);
      await sourceRef.delete();
    }
    migrated.push(key);
    await requestRef.update({ migratedCollections: migrated });
  }
}

async function migrateNetworkingArrays(
  sourceUid: string,
  targetUid: string,
  migrated: string[],
  requestRef: FirebaseFirestore.DocumentReference
) {
  const key = 'users:networking-arrays';
  if (migrated.includes(key)) return;

  for (const fieldPath of NETWORKING_FIELDS) {
    const q = db
      .collection('users')
      .where(fieldPath, 'array-contains', sourceUid);
    const snap = await q.get();
    if (snap.empty) continue;

    // Two passes: arrayRemove first, then arrayUnion.
    // Cannot combine in a single batch.update() call on the same doc
    // because only the last update per doc takes effect in a batch.
    let batch = db.batch();
    let count = 0;
    for (const docSnap of snap.docs) {
      batch.update(docSnap.ref, {
        [fieldPath]: admin.firestore.FieldValue.arrayRemove(sourceUid),
      });
      count++;
      if (count >= 500) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) await batch.commit();

    batch = db.batch();
    count = 0;
    for (const docSnap of snap.docs) {
      batch.update(docSnap.ref, {
        [fieldPath]: admin.firestore.FieldValue.arrayUnion(targetUid),
      });
      count++;
      if (count >= 500) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
  }

  migrated.push(key);
  await requestRef.update({ migratedCollections: migrated });
}

async function migrateConversations(
  sourceUid: string,
  targetUid: string,
  migrated: string[],
  requestRef: FirebaseFirestore.DocumentReference
) {
  const key = 'conversations:participants';
  if (migrated.includes(key)) return;

  const q = db
    .collection('conversations')
    .where('participants', 'array-contains', sourceUid);
  const snap = await q.get();

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const participants: string[] = data.participants || [];
    const updated = participants.map((uid: string) =>
      uid === sourceUid ? targetUid : uid
    );
    await docSnap.ref.update({ participants: updated });
  }

  migrated.push(key);
  await requestRef.update({ migratedCollections: migrated });
}
```

- [ ] **Step 2: Add guard to onMemberStatusChange**

In `functions/src/index.ts`, inside the `onMemberStatusChange` function, add after line 354 (`if (!beforeData || !afterData) return;`):

```typescript
// Skip during merge operations to prevent unintended group changes
if (afterData._mergeInProgress) return;
```

- [ ] **Step 3: Register merge engine in functions/src/index.ts**

Add import (near the top, after the numero-cuenta-index import):

```typescript
import { onMergeRequestApproved } from './merge-engine';
```

Add re-export at the end:

```typescript
// Profile Merge: merge engine
export { onMergeRequestApproved };
```

- [ ] **Step 4: Verify the functions compile**

Run: `cd functions && npm run build`
Expected: Clean compile, no errors

- [ ] **Step 5: Commit**

```bash
git add functions/src/merge-engine.ts functions/src/index.ts
git commit -m "feat(merge): add merge engine Cloud Function with reference migration"
```

---

## Task 7: MergeNotificationBanner Component

**Files:**

- Create: `src/components/merge/MergeNotificationBanner.tsx`
- Create: `tests/unit/components/merge/MergeNotificationBanner.test.tsx`
- Modify: `src/components/dashboard/DashboardShell.tsx:51`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/components/merge/MergeNotificationBanner.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let mockUserProfile: any = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    userProfile: mockUserProfile,
    user: { uid: 'test-uid' },
  }),
}));

vi.mock('@/lib/merge/mutations', () => ({
  dismissMergeMatch: vi.fn(),
}));

import { MergeNotificationBanner } from '@/components/merge/MergeNotificationBanner';

describe('MergeNotificationBanner', () => {
  it('should render nothing when no potentialMergeMatch', () => {
    mockUserProfile = { email: 'test@test.com' };
    const { container } = render(<MergeNotificationBanner lang="en" />);
    expect(container.innerHTML).toBe('');
  });

  it('should render nothing when match is dismissed', () => {
    mockUserProfile = {
      potentialMergeMatch: { matchedUid: 'old-uid', dismissed: true },
    };
    const { container } = render(<MergeNotificationBanner lang="en" />);
    expect(container.innerHTML).toBe('');
  });

  it('should render banner when undismissed match exists', () => {
    mockUserProfile = {
      potentialMergeMatch: {
        matchedUid: 'old-uid',
        numeroCuenta: '12345',
        dismissed: false,
      },
    };
    render(<MergeNotificationBanner lang="en" />);
    expect(screen.getByText(/existing profile/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run tests/unit/components/merge/MergeNotificationBanner.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```tsx
// src/components/merge/MergeNotificationBanner.tsx
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { dismissMergeMatch } from '@/lib/merge/mutations';
import { AlertCircle, X } from 'lucide-react';

interface MergeNotificationBannerProps {
  lang?: 'es' | 'en';
  onReviewClick?: () => void;
}

export const MergeNotificationBanner: React.FC<
  MergeNotificationBannerProps
> = ({ lang = 'es', onReviewClick }) => {
  const { userProfile, user } = useAuth();
  const [dismissing, setDismissing] = useState(false);

  const match = userProfile?.potentialMergeMatch;
  if (!match || match.dismissed) return null;

  const handleDismiss = async () => {
    if (!user?.uid) return;
    setDismissing(true);
    try {
      await dismissMergeMatch(user.uid);
    } catch (err) {
      console.error('Error dismissing merge match:', err);
    } finally {
      setDismissing(false);
    }
  };

  return (
    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {lang === 'es'
              ? 'Encontramos un perfil existente que coincide con tu número de cuenta de la UNAM. ¿Te gustaría reclamarlo?'
              : 'We found an existing profile matching your UNAM account number. Would you like to claim it?'}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={onReviewClick}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              {lang === 'es' ? 'Revisar Perfil' : 'Review Profile'}
            </button>
            <button
              onClick={handleDismiss}
              disabled={dismissing}
              className="rounded-md border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-700 dark:text-blue-300"
            >
              {lang === 'es' ? 'Descartar' : 'Dismiss'}
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="text-blue-400 hover:text-blue-600"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run tests/unit/components/merge/MergeNotificationBanner.test.tsx`
Expected: PASS

- [ ] **Step 5: Integrate into DashboardShell**

In `src/components/dashboard/DashboardShell.tsx`, add import at top:

```typescript
import { MergeNotificationBanner } from '@/components/merge/MergeNotificationBanner';
```

Replace line 51-52:

```tsx
          <main className="flex-1 lg:ml-64">
            <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
```

With:

```tsx
          <main className="flex-1 lg:ml-64">
            <div className="px-4 py-8 sm:px-6 lg:px-8">
              <MergeNotificationBanner lang={lang} />
              {children}
            </div>
```

- [ ] **Step 6: Commit**

```bash
git add src/components/merge/MergeNotificationBanner.tsx tests/unit/components/merge/MergeNotificationBanner.test.tsx src/components/dashboard/DashboardShell.tsx
git commit -m "feat(merge): add merge notification banner to dashboard"
```

---

## Task 8: ProfileComparison Component

**Files:**

- Create: `src/components/merge/ProfileComparison.tsx`
- Create: `tests/unit/components/merge/ProfileComparison.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/components/merge/ProfileComparison.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileComparison } from '@/components/merge/ProfileComparison';
import type { FieldSelections } from '@/types/merge';

const sourceProfile = {
  firstName: 'Juan',
  lastName: 'Garcia',
  displayName: 'Juan Garcia',
  profile: { company: 'OldCorp', position: 'Dev', bio: 'Old bio', location: 'CDMX', linkedin: '' },
  skills: ['python', 'sql'],
};

const targetProfile = {
  firstName: 'Juan',
  lastName: 'Garcia',
  displayName: 'Juan G',
  profile: { company: 'NewCorp', position: 'Lead', bio: 'New bio', location: 'MTY', linkedin: 'li/juang' },
  skills: ['typescript'],
};

const defaultSelections: FieldSelections = {
  basicInfo: 'target',
  professional: 'target',
  experience: 'target',
  skills: 'target',
  socialLinks: 'target',
  education: 'target',
  privacySettings: 'target',
  notificationSettings: 'target',
  settings: 'target',
};

describe('ProfileComparison', () => {
  it('should render source and target profile data', () => {
    render(
      <ProfileComparison
        sourceProfile={sourceProfile}
        targetProfile={targetProfile}
        selections={defaultSelections}
        onSelectionsChange={vi.fn()}
      />
    );
    expect(screen.getByText('OldCorp')).toBeTruthy();
    expect(screen.getByText('NewCorp')).toBeTruthy();
  });

  it('should render radio buttons for each field group', () => {
    render(
      <ProfileComparison
        sourceProfile={sourceProfile}
        targetProfile={targetProfile}
        selections={defaultSelections}
        onSelectionsChange={vi.fn()}
      />
    );
    // 9 groups × 3 options = 27 radio buttons
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBe(27);
  });

  it('should call onSelectionsChange when radio is clicked', () => {
    const onChange = vi.fn();
    render(
      <ProfileComparison
        sourceProfile={sourceProfile}
        targetProfile={targetProfile}
        selections={defaultSelections}
        onSelectionsChange={onChange}
      />
    );
    const sourceRadios = screen.getAllByRole('radio');
    fireEvent.click(sourceRadios[0]); // first source radio
    expect(onChange).toHaveBeenCalled();
  });

  it('should disable radios when readOnly', () => {
    render(
      <ProfileComparison
        sourceProfile={sourceProfile}
        targetProfile={targetProfile}
        selections={defaultSelections}
        onSelectionsChange={vi.fn()}
        readOnly
      />
    );
    const radios = screen.getAllByRole('radio');
    radios.forEach((radio) => {
      expect(radio).toBeDisabled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run tests/unit/components/merge/ProfileComparison.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```tsx
// src/components/merge/ProfileComparison.tsx
import React from 'react';
import { FIELD_GROUPS } from '@/lib/merge/field-groups';
import type {
  FieldGroupKey,
  FieldSelection,
  FieldSelections,
} from '@/types/merge';

interface ProfileComparisonProps {
  sourceProfile: Record<string, any>;
  targetProfile: Record<string, any>;
  selections: FieldSelections;
  onSelectionsChange: (selections: FieldSelections) => void;
  readOnly?: boolean;
  lang?: 'es' | 'en';
}

const GROUP_LABELS: Record<FieldGroupKey, { es: string; en: string }> = {
  basicInfo: { es: 'Información Básica', en: 'Basic Info' },
  professional: { es: 'Profesional', en: 'Professional' },
  experience: { es: 'Experiencia', en: 'Experience' },
  skills: { es: 'Habilidades', en: 'Skills' },
  socialLinks: { es: 'Redes Sociales', en: 'Social Links' },
  education: { es: 'Educación', en: 'Education' },
  privacySettings: { es: 'Privacidad', en: 'Privacy Settings' },
  notificationSettings: { es: 'Notificaciones', en: 'Notification Settings' },
  settings: { es: 'Configuración', en: 'Settings' },
};

const SELECTION_OPTIONS: Array<{
  value: FieldSelection;
  labelEs: string;
  labelEn: string;
}> = [
  { value: 'source', labelEs: 'Mantener anterior', labelEn: 'Keep old' },
  { value: 'target', labelEs: 'Mantener nuevo', labelEn: 'Keep new' },
  { value: 'discard', labelEs: 'Descartar', labelEn: 'Discard' },
];

function getNestedValue(obj: Record<string, any>, path: string): any {
  return path
    .split('.')
    .reduce((curr, key) => (curr != null ? curr[key] : undefined), obj);
}

function formatValue(value: any): string {
  if (value == null) return '—';
  if (Array.isArray(value)) return value.join(', ') || '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export const ProfileComparison: React.FC<ProfileComparisonProps> = ({
  sourceProfile,
  targetProfile,
  selections,
  onSelectionsChange,
  readOnly = false,
  lang = 'es',
}) => {
  const handleChange = (groupKey: FieldGroupKey, value: FieldSelection) => {
    onSelectionsChange({ ...selections, [groupKey]: value });
  };

  return (
    <div className="space-y-6">
      {(Object.keys(FIELD_GROUPS) as FieldGroupKey[]).map((groupKey) => {
        const fields = FIELD_GROUPS[groupKey];
        const label = GROUP_LABELS[groupKey][lang];

        return (
          <div
            key={groupKey}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              {label}
            </h3>

            {/* Field values comparison */}
            <div className="mb-3 grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {lang === 'es' ? 'Perfil anterior' : 'Old profile'}
                </p>
                {fields.map((fieldPath) => (
                  <div
                    key={fieldPath}
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="font-mono text-xs text-gray-400">
                      {fieldPath}:{' '}
                    </span>
                    {formatValue(getNestedValue(sourceProfile, fieldPath))}
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {lang === 'es' ? 'Perfil nuevo' : 'New profile'}
                </p>
                {fields.map((fieldPath) => (
                  <div
                    key={fieldPath}
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="font-mono text-xs text-gray-400">
                      {fieldPath}:{' '}
                    </span>
                    {formatValue(getNestedValue(targetProfile, fieldPath))}
                  </div>
                ))}
              </div>
            </div>

            {/* Selection radios */}
            <div className="flex gap-4">
              {SELECTION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-1.5 text-sm"
                >
                  <input
                    type="radio"
                    name={`merge-${groupKey}`}
                    value={option.value}
                    checked={selections[groupKey] === option.value}
                    onChange={() => handleChange(groupKey, option.value)}
                    disabled={readOnly}
                    className="text-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    {lang === 'es' ? option.labelEs : option.labelEn}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run tests/unit/components/merge/ProfileComparison.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/merge/ProfileComparison.tsx tests/unit/components/merge/ProfileComparison.test.tsx
git commit -m "feat(merge): add ProfileComparison component with field group selection"
```

---

## Task 9: MergeRequestStatus Component

**Files:**

- Create: `src/components/merge/MergeRequestStatus.tsx`

- [ ] **Step 1: Create status badge component**

```tsx
// src/components/merge/MergeRequestStatus.tsx
import React from 'react';
import type { MergeRequestStatus as StatusType } from '@/types/merge';
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  StatusType,
  {
    label: { es: string; en: string };
    color: string;
    icon: React.ComponentType<any>;
  }
> = {
  pending: {
    label: { es: 'Pendiente', en: 'Pending' },
    color:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    icon: Clock,
  },
  approved: {
    label: { es: 'Aprobada', en: 'Approved' },
    color:
      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    icon: CheckCircle,
  },
  rejected: {
    label: { es: 'Rechazada', en: 'Rejected' },
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    icon: XCircle,
  },
  executing: {
    label: { es: 'Ejecutando', en: 'Executing' },
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    icon: Loader2,
  },
  completed: {
    label: { es: 'Completada', en: 'Completed' },
    color:
      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    icon: CheckCircle,
  },
  failed: {
    label: { es: 'Fallida', en: 'Failed' },
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    icon: AlertTriangle,
  },
};

interface MergeRequestStatusProps {
  status: StatusType;
  lang?: 'es' | 'en';
}

export const MergeRequestStatusBadge: React.FC<MergeRequestStatusProps> = ({
  status,
  lang = 'es',
}) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
    >
      <Icon
        className={`h-3 w-3 ${status === 'executing' ? 'animate-spin' : ''}`}
      />
      {config.label[lang]}
    </span>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/merge/MergeRequestStatus.tsx
git commit -m "feat(merge): add MergeRequestStatus badge component"
```

---

## Task 10: Self-Service Claim Flow

**Files:**

- Create: `src/components/merge/ClaimFlow.tsx`

- [ ] **Step 1: Create the claim flow component**

```tsx
// src/components/merge/ClaimFlow.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchUserProfile,
  createMergeRequest,
  hasPendingMergeRequest,
} from '@/lib/merge/mutations';
import { ProfileComparison } from './ProfileComparison';
import { MergeRequestStatusBadge } from './MergeRequestStatus';
import type { FieldSelections } from '@/types/merge';
import { X, Loader2, CheckCircle } from 'lucide-react';

interface ClaimFlowProps {
  lang?: 'es' | 'en';
  onClose: () => void;
}

const DEFAULT_SELECTIONS: FieldSelections = {
  basicInfo: 'target',
  professional: 'target',
  experience: 'target',
  skills: 'target',
  socialLinks: 'target',
  education: 'target',
  privacySettings: 'target',
  notificationSettings: 'target',
  settings: 'target',
};

export const ClaimFlow: React.FC<ClaimFlowProps> = ({
  lang = 'es',
  onClose,
}) => {
  const { user, userProfile } = useAuth();
  const [sourceProfile, setSourceProfile] = useState<Record<
    string,
    any
  > | null>(null);
  const [selections, setSelections] =
    useState<FieldSelections>(DEFAULT_SELECTIONS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchedUid = userProfile?.potentialMergeMatch?.matchedUid;
  const numeroCuenta = userProfile?.potentialMergeMatch?.numeroCuenta;

  useEffect(() => {
    if (!matchedUid) return;
    fetchUserProfile(matchedUid)
      .then(setSourceProfile)
      .catch(() =>
        setError(
          lang === 'es'
            ? 'Error al cargar el perfil.'
            : 'Error loading profile.'
        )
      )
      .finally(() => setLoading(false));
  }, [matchedUid, lang]);

  const handleSubmit = async () => {
    if (!user?.uid || !matchedUid || !numeroCuenta) return;
    setSubmitting(true);
    setError(null);

    try {
      const hasPending = await hasPendingMergeRequest(user.uid);
      if (hasPending) {
        setError(
          lang === 'es'
            ? 'Ya tienes una solicitud pendiente.'
            : 'You already have a pending request.'
        );
        return;
      }

      await createMergeRequest({
        sourceUid: matchedUid,
        targetUid: user.uid,
        numeroCuenta,
        fieldSelections: selections,
        createdBy: user.uid,
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(
        err.message ||
          (lang === 'es'
            ? 'Error al enviar la solicitud.'
            : 'Error submitting request.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 text-center dark:bg-gray-800">
          <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-500" />
          <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            {lang === 'es' ? 'Solicitud Enviada' : 'Request Submitted'}
          </h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {lang === 'es'
              ? 'Un administrador revisará tu solicitud pronto.'
              : 'An admin will review your request shortly.'}
          </p>
          <button
            onClick={onClose}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {lang === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {lang === 'es'
              ? 'Reclamar Perfil Existente'
              : 'Claim Existing Profile'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {lang === 'es'
            ? 'Selecciona qué datos mantener de cada perfil. Un administrador revisará tu solicitud.'
            : 'Select which data to keep from each profile. An admin will review your request.'}
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : sourceProfile ? (
          <>
            <ProfileComparison
              sourceProfile={sourceProfile}
              targetProfile={userProfile || {}}
              selections={selections}
              onSelectionsChange={setSelections}
              lang={lang}
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {lang === 'es' ? 'Enviar Solicitud' : 'Submit Request'}
              </button>
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-gray-500">
            {lang === 'es' ? 'No se encontró el perfil.' : 'Profile not found.'}
          </p>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Wire ClaimFlow to MergeNotificationBanner**

In `src/components/merge/MergeNotificationBanner.tsx`, add import and state:

```tsx
import { ClaimFlow } from './ClaimFlow';
```

Add state inside the component:

```tsx
const [showClaimFlow, setShowClaimFlow] = useState(false);
```

Update the "Review Profile" button to open the flow:

```tsx
<button
  onClick={() => setShowClaimFlow(true)}
  ...
```

Add the modal at the end of the component return (before the final closing `</div>`):

```tsx
{
  showClaimFlow && (
    <ClaimFlow lang={lang} onClose={() => setShowClaimFlow(false)} />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/merge/ClaimFlow.tsx src/components/merge/MergeNotificationBanner.tsx
git commit -m "feat(merge): add self-service claim flow with profile comparison"
```

---

## Task 11: Auto-Detection in SignUpForm

**Files:**

- Modify: `src/components/auth/SignUpForm.tsx:12,317-333`

- [ ] **Step 1: Add imports to SignUpForm**

In `src/components/auth/SignUpForm.tsx`, add after line 14 (`import { auth, db, storage } from '@/lib/firebase';`):

```typescript
import { getDoc, doc as firestoreDoc } from 'firebase/firestore';
import {
  checkNumeroCuentaMatch,
  setPotentialMergeMatch,
} from '@/lib/merge/mutations';
```

Note: `doc` is already imported from `firebase/firestore` on line 12. Use the existing import — `checkNumeroCuentaMatch` and `setPotentialMergeMatch` handle doc references internally. Only add the merge mutation imports:

```typescript
import {
  checkNumeroCuentaMatch,
  setPotentialMergeMatch,
} from '@/lib/merge/mutations';
```

- [ ] **Step 2: Add merge detection after UNAM data is saved**

In `src/components/auth/SignUpForm.tsx`, inside `onUnamSubmit` after line 333 (`updatedAt: serverTimestamp(),`) and the `});` that closes `updateDoc`, add:

```typescript
// Check for existing profile with same numeroCuenta
try {
  const match = await checkNumeroCuentaMatch(data.numeroCuenta, user.uid);
  if (match) {
    await setPotentialMergeMatch(user.uid, {
      matchedUid: match.uid,
      numeroCuenta: data.numeroCuenta,
    });
  }
} catch (matchErr) {
  // Non-blocking: merge detection failure shouldn't break registration
  console.warn('Merge match detection failed:', matchErr);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/SignUpForm.tsx
git commit -m "feat(merge): add auto-detection in SignUpForm UNAM verification step"
```

---

## Task 12: Admin Merge Requests Queue

**Files:**

- Create: `src/components/admin/MergeRequestsQueue.tsx`

- [ ] **Step 1: Create the queue component**

```tsx
// src/components/admin/MergeRequestsQueue.tsx
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { MergeRequestStatusBadge } from '@/components/merge/MergeRequestStatus';
import { ProfileComparison } from '@/components/merge/ProfileComparison';
import type {
  MergeRequest,
  FieldSelections,
  OldDocAction,
} from '@/types/merge';
import { Loader2, Eye, XCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface MergeRequestsQueueProps {
  lang?: 'es' | 'en';
}

export const MergeRequestsQueue: React.FC<MergeRequestsQueueProps> = ({
  lang = 'es',
}) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MergeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [sourceProfile, setSourceProfile] = useState<any>(null);
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [selections, setSelections] = useState<FieldSelections | null>(null);
  const [migrateRefs, setMigrateRefs] = useState(true);
  const [oldDocAction, setOldDocAction] = useState<OldDocAction>('soft-delete');
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    const q =
      filter === 'pending'
        ? query(
            collection(db, 'merge_requests'),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
          )
        : query(collection(db, 'merge_requests'), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, (snap) => {
      setRequests(
        snap.docs.map((d) => ({ ...d.data(), id: d.id }) as MergeRequest)
      );
      setLoading(false);
    });

    return unsub;
  }, [filter]);

  const handleReview = async (request: MergeRequest) => {
    setReviewingId(request.id);
    setSelections(request.fieldSelections);
    setMigrateRefs(request.migrateReferences);
    setReviewNotes('');

    const [src, tgt] = await Promise.all([
      getDoc(doc(db, 'users', request.sourceUid)),
      getDoc(doc(db, 'users', request.targetUid)),
    ]);
    setSourceProfile(src.exists() ? src.data() : null);
    setTargetProfile(tgt.exists() ? tgt.data() : null);
  };

  const handleApprove = async (requestId: string) => {
    if (!user?.uid || !selections) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'merge_requests', requestId), {
        status: 'approved',
        fieldSelections: selections,
        migrateReferences: migrateRefs,
        oldDocAction,
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid,
        reviewNotes: reviewNotes || null,
      });
      setReviewingId(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user?.uid) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'merge_requests', requestId), {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid,
        reviewNotes: reviewNotes || null,
      });
      setReviewingId(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async (requestId: string) => {
    if (!user?.uid) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'merge_requests', requestId), {
        status: 'approved',
        error: null,
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid,
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Review modal
  if (reviewingId && selections) {
    const request = requests.find((r) => r.id === reviewingId);
    if (!request) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {lang === 'es'
              ? 'Revisar Solicitud de Fusión'
              : 'Review Merge Request'}
          </h3>
          <button
            onClick={() => setReviewingId(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm">
            <strong>numeroCuenta:</strong> {request.numeroCuenta}
          </p>
          <p className="text-sm">
            <strong>{lang === 'es' ? 'Iniciado por' : 'Initiated by'}:</strong>{' '}
            {request.initiatedBy}
          </p>
        </div>

        {sourceProfile && targetProfile && (
          <ProfileComparison
            sourceProfile={sourceProfile}
            targetProfile={targetProfile}
            selections={selections}
            onSelectionsChange={setSelections}
            lang={lang}
          />
        )}

        {/* Admin controls */}
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h4 className="text-sm font-semibold">
            {lang === 'es' ? 'Controles de Administrador' : 'Admin Controls'}
          </h4>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={migrateRefs}
              onChange={(e) => setMigrateRefs(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">
              {lang === 'es'
                ? 'Migrar referencias en todas las colecciones'
                : 'Migrate references across all collections'}
            </span>
          </label>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {lang === 'es'
                ? 'Acción del documento anterior'
                : 'Old document action'}
            </label>
            <div className="flex gap-4">
              {(
                ['soft-delete', 'hard-delete', 'archive'] as OldDocAction[]
              ).map((action) => (
                <label
                  key={action}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <input
                    type="radio"
                    name="oldDocAction"
                    value={action}
                    checked={oldDocAction === action}
                    onChange={() => setOldDocAction(action)}
                  />
                  {action}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {lang === 'es' ? 'Notas de revisión' : 'Review notes'}
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-700"
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => handleReject(request.id)}
            disabled={actionLoading}
            className="flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            {lang === 'es' ? 'Rechazar' : 'Reject'}
          </button>
          <button
            onClick={() => handleApprove(request.id)}
            disabled={actionLoading}
            className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {lang === 'es' ? 'Aprobar y Ejecutar' : 'Approve & Execute'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {lang === 'es' ? 'Solicitudes de Fusión' : 'Merge Requests'}
        </h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
        >
          <option value="pending">
            {lang === 'es' ? 'Pendientes' : 'Pending'}
          </option>
          <option value="all">{lang === 'es' ? 'Todas' : 'All'}</option>
        </select>
      </div>

      {requests.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          {lang === 'es' ? 'No hay solicitudes.' : 'No requests.'}
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  numeroCuenta: {req.numeroCuenta}
                </p>
                <p className="text-xs text-gray-500">
                  {req.sourceUid.slice(0, 8)}... → {req.targetUid.slice(0, 8)}
                  ...
                </p>
                <MergeRequestStatusBadge status={req.status} lang={lang} />
                {req.error && (
                  <p className="text-xs text-red-600">{req.error}</p>
                )}
              </div>
              <div className="flex gap-2">
                {req.status === 'pending' && (
                  <button
                    onClick={() => handleReview(req)}
                    className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    <Eye className="h-3 w-3" />
                    {lang === 'es' ? 'Revisar' : 'Review'}
                  </button>
                )}
                {req.status === 'failed' && (
                  <button
                    onClick={() => handleRetry(req.id)}
                    disabled={actionLoading}
                    className="flex items-center gap-1 rounded-md bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-700"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {lang === 'es' ? 'Reintentar' : 'Retry'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/MergeRequestsQueue.tsx
git commit -m "feat(merge): add admin merge requests queue with review UI"
```

---

## Task 13: Admin Manual Merge Tool

**Files:**

- Create: `src/components/admin/AdminMergeTool.tsx`

- [ ] **Step 1: Create the admin merge tool**

```tsx
// src/components/admin/AdminMergeTool.tsx
import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileComparison } from '@/components/merge/ProfileComparison';
import { MergeRequestsQueue } from './MergeRequestsQueue';
import type {
  FieldSelections,
  OldDocAction,
  MergeRequest,
} from '@/types/merge';
import { Search, Loader2, GitMerge } from 'lucide-react';

interface AdminMergeToolProps {
  lang?: 'es' | 'en';
}

const DEFAULT_SELECTIONS: FieldSelections = {
  basicInfo: 'target',
  professional: 'target',
  experience: 'target',
  skills: 'target',
  socialLinks: 'target',
  education: 'target',
  privacySettings: 'target',
  notificationSettings: 'target',
  settings: 'target',
};

export const AdminMergeTool: React.FC<AdminMergeToolProps> = ({
  lang = 'es',
}) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'queue' | 'manual'>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [sourceProfile, setSourceProfile] = useState<any>(null);
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [selections, setSelections] =
    useState<FieldSelections>(DEFAULT_SELECTIONS);
  const [migrateRefs, setMigrateRefs] = useState(true);
  const [oldDocAction, setOldDocAction] = useState<OldDocAction>('soft-delete');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      // Search by email, numeroCuenta, or name
      const results: any[] = [];
      const searches = [
        query(
          collection(db, 'users'),
          where('email', '==', searchQuery.trim())
        ),
        query(
          collection(db, 'users'),
          where('numeroCuenta', '==', searchQuery.trim())
        ),
      ];

      for (const q of searches) {
        const snap = await getDocs(q);
        snap.docs.forEach((d) => {
          if (!results.find((r) => r.uid === d.id)) {
            results.push({ uid: d.id, ...d.data() });
          }
        });
      }

      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const selectProfile = (profile: any, role: 'source' | 'target') => {
    if (role === 'source') setSourceProfile(profile);
    else setTargetProfile(profile);
  };

  const handleCreateMerge = async () => {
    if (!user?.uid || !sourceProfile || !targetProfile) return;
    setSubmitting(true);
    try {
      const mergeRef = doc(collection(db, 'merge_requests'));
      // Two-write pattern: create as 'pending' then update to 'approved'.
      // This ensures onDocumentUpdated fires for the status transition.
      const request: Omit<MergeRequest, 'id'> = {
        sourceUid: sourceProfile.uid,
        targetUid: targetProfile.uid,
        matchedBy: 'numeroCuenta',
        numeroCuenta:
          sourceProfile.numeroCuenta || targetProfile.numeroCuenta || '',
        fieldSelections: selections,
        migrateReferences: migrateRefs,
        oldDocAction,
        status: 'pending',
        initiatedBy: 'admin',
        createdAt: serverTimestamp() as any,
        createdBy: user.uid,
      };
      await setDoc(mergeRef, { ...request, id: mergeRef.id });
      // Immediately approve — triggers onDocumentUpdated → merge engine
      await updateDoc(mergeRef, {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid,
        reviewNotes: reviewNotes || null,
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const resetManualMerge = () => {
    setSourceProfile(null);
    setTargetProfile(null);
    setSelections(DEFAULT_SELECTIONS);
    setMigrateRefs(true);
    setOldDocAction('soft-delete');
    setReviewNotes('');
    setSubmitted(false);
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <GitMerge className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {lang === 'es' ? 'Fusión de Perfiles' : 'Profile Merge'}
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        <button
          onClick={() => setTab('queue')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            tab === 'queue'
              ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          {lang === 'es' ? 'Cola de Solicitudes' : 'Request Queue'}
        </button>
        <button
          onClick={() => setTab('manual')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            tab === 'manual'
              ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          {lang === 'es' ? 'Fusión Manual' : 'Manual Merge'}
        </button>
      </div>

      {tab === 'queue' ? (
        <MergeRequestsQueue lang={lang} />
      ) : submitted ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-900/20">
          <p className="font-medium text-green-800 dark:text-green-300">
            {lang === 'es'
              ? 'Fusión iniciada. Revisa el estado en la cola.'
              : 'Merge initiated. Check status in the queue.'}
          </p>
          <button
            onClick={resetManualMerge}
            className="mt-3 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            {lang === 'es' ? 'Nueva Fusión' : 'New Merge'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Search */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={
                lang === 'es'
                  ? 'Buscar por email o número de cuenta...'
                  : 'Search by email or account number...'
              }
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {lang === 'es' ? 'Buscar' : 'Search'}
            </button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">
                {lang === 'es' ? 'Resultados:' : 'Results:'}
              </p>
              {searchResults.map((profile) => (
                <div
                  key={profile.uid}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {profile.firstName} {profile.lastName} ({profile.email})
                    </p>
                    <p className="text-xs text-gray-500">
                      UID: {profile.uid.slice(0, 12)}... | numeroCuenta:{' '}
                      {profile.numeroCuenta || '—'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectProfile(profile, 'source')}
                      disabled={targetProfile?.uid === profile.uid}
                      className="rounded-md border border-orange-300 px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-30"
                    >
                      {lang === 'es' ? 'Anterior' : 'Old'}
                    </button>
                    <button
                      onClick={() => selectProfile(profile, 'target')}
                      disabled={sourceProfile?.uid === profile.uid}
                      className="rounded-md border border-green-300 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-30"
                    >
                      {lang === 'es' ? 'Nuevo' : 'New'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected profiles + comparison */}
          {sourceProfile && targetProfile && (
            <>
              <ProfileComparison
                sourceProfile={sourceProfile}
                targetProfile={targetProfile}
                selections={selections}
                onSelectionsChange={setSelections}
                lang={lang}
              />

              {/* Admin controls */}
              <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={migrateRefs}
                    onChange={(e) => setMigrateRefs(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">
                    {lang === 'es'
                      ? 'Migrar referencias'
                      : 'Migrate references'}
                  </span>
                </label>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {lang === 'es'
                      ? 'Acción del documento anterior'
                      : 'Old document action'}
                  </label>
                  <div className="flex gap-4">
                    {(
                      [
                        'soft-delete',
                        'hard-delete',
                        'archive',
                      ] as OldDocAction[]
                    ).map((action) => (
                      <label
                        key={action}
                        className="flex items-center gap-1.5 text-sm"
                      >
                        <input
                          type="radio"
                          name="manualOldDocAction"
                          checked={oldDocAction === action}
                          onChange={() => setOldDocAction(action)}
                        />
                        {action}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {lang === 'es' ? 'Notas' : 'Notes'}
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-700"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCreateMerge}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GitMerge className="h-4 w-4" />
                  )}
                  {lang === 'es' ? 'Ejecutar Fusión' : 'Execute Merge'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/AdminMergeTool.tsx
git commit -m "feat(merge): add admin manual merge tool with profile search"
```

---

## Task 14: Admin Navigation Integration

**Files:**

- Modify: `src/components/admin/AdminNavigation.tsx:4-20,105`

- [ ] **Step 1: Add GitMerge icon import**

In `src/components/admin/AdminNavigation.tsx`, add `GitMerge` to the lucide-react import (line 4-20):

```typescript
import {
  LayoutDashboard,
  Users,
  Shield,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
  ChevronDown,
  User,
  Search,
  Home,
  AlertTriangle,
  BookUser,
  GitMerge,
} from 'lucide-react';
```

- [ ] **Step 2: Add merge nav item**

In `src/components/admin/AdminNavigation.tsx`, add after the moderation entry (after line 105, before the analytics entry):

```typescript
    {
      key: 'merge-profiles',
      label: language === 'es' ? 'Fusionar Perfiles' : 'Merge Profiles',
      icon: GitMerge,
      path: '/admin/merge-profiles',
      requiredPermission: 'admin',
    },
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminNavigation.tsx
git commit -m "feat(merge): add merge profiles entry to admin navigation"
```

---

## Task 15: Admin Merge Page

**Files:**

- Create: `src/pages/es/admin/merge-profiles.astro` (or equivalent route)

- [ ] **Step 1: Check existing admin page pattern**

Look at an existing admin page (e.g., `src/pages/es/admin/index.astro` or similar) to match the layout pattern. Create the merge profiles page following the same pattern.

```astro
---
// src/pages/es/admin/merge-profiles.astro
import AdminLayout from '@/layouts/AdminLayout.astro';
import { AdminMergeTool } from '@/components/admin/AdminMergeTool';
---

<AdminLayout title="Fusionar Perfiles" lang="es">
  <AdminMergeTool client:load lang="es" />
</AdminLayout>
```

Note: If the project uses a different admin routing pattern (e.g., client-side routing within a single admin page), integrate the `AdminMergeTool` component at the appropriate route instead.

- [ ] **Step 2: Create English route if needed**

```astro
---
// src/pages/en/admin/merge-profiles.astro
import AdminLayout from '@/layouts/AdminLayout.astro';
import { AdminMergeTool } from '@/components/admin/AdminMergeTool';
---

<AdminLayout title="Merge Profiles" lang="en">
  <AdminMergeTool client:load lang="en" />
</AdminLayout>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/*/admin/merge-profiles.astro
git commit -m "feat(merge): add admin merge profiles pages for es/en"
```

---

## Task 16: Final Verification

- [ ] **Step 1: Run full type check**

Run: `npm run check`
Expected: No TypeScript errors

- [ ] **Step 2: Run full lint**

Run: `npm run lint`
Expected: No lint errors (or fix any that appear)

- [ ] **Step 3: Run all unit tests**

Run: `npm run test:unit`
Expected: All tests pass including new merge tests

- [ ] **Step 4: Verify Cloud Functions build**

Run: `cd functions && npm run build`
Expected: Clean compile

- [ ] **Step 5: Final commit if any lint/type fixes were needed**

```bash
git add -A
git commit -m "fix(merge): address lint and type-check issues"
```
