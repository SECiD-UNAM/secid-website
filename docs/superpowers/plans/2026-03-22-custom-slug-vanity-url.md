# Custom Slug (Vanity URL) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let members set a custom URL slug for their profile and CV pages (vanity URL).

**Architecture:** Persist an optional `slug` field on the Firestore `users` document. The mapper uses stored slug with fallback to `slugify(displayName)`. The slug query uses a Firestore indexed `where()` instead of the current client-side scan. A new input field in the Personal tab of ProfileEdit lets users set their slug with format + uniqueness validation.

**Tech Stack:** TypeScript, React, Firebase Firestore, Astro

**Spec:** `docs/superpowers/specs/2026-03-22-custom-slug-vanity-url-design.md`

---

### Task 1: Add `slug` to FormData type and initial data

**Files:**

- Modify: `src/components/profile/profile-edit-types.ts`

- [ ] **Step 1: Add `slug` field to `FormData` interface**

In `src/components/profile/profile-edit-types.ts`, add `slug: string;` after `photoURL: string;` in the `FormData` interface (line 22):

```typescript
// Personal Information
displayName: string;
firstName: string;
lastName: string;
email: string;
phoneNumber: string;
location: string;
bio: string;
photoURL: string;
slug: string;
```

- [ ] **Step 2: Add `slug` to `INITIAL_FORM_DATA`**

In the same file, add `slug: '',` after `photoURL: '',` (line 97):

```typescript
photoURL: '',
slug: '',
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (slug is now part of FormData but not yet used)

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/profile-edit-types.ts
git commit -m "feat(slug): add slug field to ProfileEdit FormData type"
```

---

### Task 2: Add `slug` to Firestore security rules

**Files:**

- Modify: `firestore.rules:91-103`

- [ ] **Step 1: Add `'slug'` to the owner-update allowlist**

In `firestore.rules`, add `'slug'` to the `hasOnly` list. Change line 102-103 from:

```
                                  'networking', 'activity',
                                  'potentialMergeMatch']);
```

to:

```
                                  'networking', 'activity',
                                  'potentialMergeMatch',
                                  'slug']);
```

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "feat(slug): add slug to Firestore owner-update allowlist"
```

---

### Task 3: Update mapper to use stored slug with fallback

**Files:**

- Modify: `src/lib/members/mapper.ts:114`

- [ ] **Step 1: Change slug assignment in `mapUserDocToMemberProfile()`**

In `src/lib/members/mapper.ts`, change line 114 from:

```typescript
const slug = slugify(displayName);
```

to:

```typescript
const slug = data.slug || slugify(displayName);
```

- [ ] **Step 2: Export `slugify` for use in the UI**

Add `export` to the function declaration at line 11:

```typescript
export function slugify(text: string): string {
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/members/mapper.ts
git commit -m "feat(slug): use stored slug with slugify fallback in mapper"
```

---

### Task 4: Fix `getMemberProfile()` heuristic and replace client-side slug scan

**Files:**

- Modify: `src/lib/members/queries.ts:179-233`

- [ ] **Step 1: Replace `getMemberBySlug()` with Firestore indexed query**

In `src/lib/members/queries.ts`, replace the `getMemberBySlug` function (lines 215-233) with:

```typescript
/**
 * Look up a member by their URL slug via Firestore indexed query.
 */
async function getMemberBySlug(slug: string): Promise<MemberProfile | null> {
  try {
    const q = query(
      collection(db, COLLECTIONS.MEMBERS),
      where('slug', '==', slug),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const d = snapshot.docs[0];
      return mapUserDocToMemberProfile(d.id, d.data());
    }

    return null;
  } catch (error) {
    console.error('Error fetching member by slug:', error);
    throw error;
  }
}
```

Ensure `where` is imported from `firebase/firestore` (check existing imports at top of file).

- [ ] **Step 2: Fix `getMemberProfile()` to try UID first, then slug**

Replace the `getMemberProfile` function (lines 179-210) with:

```typescript
/**
 * Get a single member profile by UID or slug.
 * Tries UID document lookup first; falls back to slug query.
 */
export async function getMemberProfile(
  idOrSlug: string
): Promise<MemberProfile | null> {
  if (isUsingMockAPI()) {
    return createMockMemberProfile(1);
  }

  try {
    // Try UID lookup first
    const docRef = doc(db, COLLECTIONS.MEMBERS, idOrSlug);
    let docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      docSnap = await getDocFromServer(docRef);
    }

    if (docSnap.exists()) {
      return mapUserDocToMemberProfile(docSnap.id, docSnap.data());
    }

    // Fall back to slug query
    return getMemberBySlug(idOrSlug);
  } catch (error) {
    console.error('Error fetching member profile:', error);
    throw error;
  }
}
```

- [ ] **Step 3: Remove the old slug heuristic comment**

Update the JSDoc above the function — the old comment `Slugs are detected by the presence of a hyphen` is no longer accurate. The new comment is included in the code above.

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/members/queries.ts
git commit -m "feat(slug): indexed Firestore slug query + UID-first lookup"
```

---

### Task 5: Add slug validation utility

**Files:**

- Create: `src/lib/members/slug-validation.ts`

- [ ] **Step 1: Create the slug validation module**

Create `src/lib/members/slug-validation.ts`:

```typescript
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

const RESERVED_SLUGS = new Set([
  'admin',
  'profile',
  'dashboard',
  'api',
  'login',
  'settings',
  'members',
  'cv',
  'new',
  'edit',
  'search',
  'blog',
  'forum',
  'events',
  'mentorship',
  'join',
  'register',
  'logout',
  'en',
  'es',
]);

export function validateSlugFormat(slug: string): string | null {
  if (!slug) return null; // empty is valid (will use fallback)
  if (RESERVED_SLUGS.has(slug)) return 'reserved';
  if (!SLUG_REGEX.test(slug)) return 'format';
  return null;
}

export async function isSlugAvailable(
  slug: string,
  currentUid: string
): Promise<boolean> {
  if (!slug) return true;

  const q = query(collection(db, 'users'), where('slug', '==', slug), limit(2));
  const snapshot = await getDocs(q);

  // Available if no docs found, or only the current user's doc
  return snapshot.docs.every((d) => d.id === currentUid);
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/members/slug-validation.ts
git commit -m "feat(slug): add slug format and uniqueness validation"
```

---

### Task 6: Add slug field to PersonalTab UI

**Files:**

- Modify: `src/components/profile/tabs/PersonalTab.tsx:110-125`

- [ ] **Step 1: Add imports**

At the top of `src/components/profile/tabs/PersonalTab.tsx`, add to the heroicons import:

```typescript
import {
  UserCircleIcon,
  CameraIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
```

Add new imports after the existing ones:

```typescript
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { slugify } from '@/lib/members/mapper';
import {
  validateSlugFormat,
  isSlugAvailable,
} from '@/lib/members/slug-validation';
```

- [ ] **Step 2: Add slug state and validation logic**

Inside the `PersonalTab` component, before the `return`, add:

```typescript
const { user } = useAuth();
const [slugStatus, setSlugStatus] = useState<
  'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved'
>('idle');

const derivedSlug = slugify(
  formData.displayName || `${formData.firstName} ${formData.lastName}`.trim()
);
const effectiveSlug = formData.slug || derivedSlug;

const checkSlugAvailability = useCallback(
  async (value: string) => {
    if (!value) {
      setSlugStatus('idle');
      return;
    }
    const formatError = validateSlugFormat(value);
    if (formatError === 'reserved') {
      setSlugStatus('reserved');
      return;
    }
    if (formatError === 'format') {
      setSlugStatus('invalid');
      return;
    }
    setSlugStatus('checking');
    try {
      const available = await isSlugAvailable(value, user?.uid || '');
      setSlugStatus(available ? 'available' : 'taken');
    } catch {
      setSlugStatus('idle');
    }
  },
  [user?.uid]
);
```

- [ ] **Step 3: Add the slug input field**

After the "Display name" `</div>` closing tag (after line 125), add:

```tsx
{
  /* Custom URL Slug */
}
<div>
  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
    <LinkIcon className="mr-1 inline h-4 w-4" />
    {lang === 'es' ? 'URL personalizada' : 'Custom URL'}
  </label>
  <input
    type="text"
    value={formData.slug}
    onChange={(e) => {
      const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      setFormData((prev) => ({ ...prev, slug: value }));
      setSlugStatus('idle');
    }}
    onBlur={(e) => checkSlugAvailability(e.target.value)}
    placeholder={derivedSlug}
    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
  />
  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
    secid.org/{lang}/members/
    <span className="font-medium text-gray-700 dark:text-gray-300">
      {effectiveSlug}
    </span>
    /cv
  </p>
  {slugStatus === 'checking' && (
    <p className="mt-1 text-xs text-gray-500">
      {lang === 'es'
        ? 'Verificando disponibilidad...'
        : 'Checking availability...'}
    </p>
  )}
  {slugStatus === 'available' && (
    <p className="mt-1 text-xs text-green-600 dark:text-green-400">
      {lang === 'es' ? 'Disponible' : 'Available'}
    </p>
  )}
  {slugStatus === 'taken' && (
    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
      {lang === 'es'
        ? 'Este slug ya está en uso'
        : 'This slug is already taken'}
    </p>
  )}
  {slugStatus === 'invalid' && (
    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
      {lang === 'es'
        ? 'Solo letras minúsculas, números y guiones (3-40 caracteres)'
        : 'Only lowercase letters, numbers, and hyphens (3-40 chars)'}
    </p>
  )}
  {slugStatus === 'reserved' && (
    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
      {lang === 'es' ? 'Esta palabra está reservada' : 'This word is reserved'}
    </p>
  )}
</div>;
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/profile/tabs/PersonalTab.tsx
git commit -m "feat(slug): add custom URL slug field to PersonalTab"
```

---

### Task 7: Wire slug into ProfileEdit save and load

**Files:**

- Modify: `src/components/profile/ProfileEdit.tsx`

- [ ] **Step 1: Load slug in `populateFormFromProfile()`**

In `src/components/profile/ProfileEdit.tsx`, in the `setFormData` call inside `populateFormFromProfile()` (around line 181), add `slug` after `photoURL`:

```typescript
    setFormData({
      displayName: profile.displayName || '',
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      email: profile['email'] || fallbackEmail || '',
      phoneNumber: profile.phoneNumber || rd.phone || '',
      location: profile.location || '',
      bio: profile.bio || '',
      photoURL: profile.photoURL || '',
      slug: profile.slug || '',
```

Note: `profile.slug` may come from `mapUserDocToMemberProfile` which now reads `data.slug` from Firestore. For the `userProfile` path (not a MemberProfile), add a fallback: the raw Firestore doc may have `slug` directly. The `profile.slug || ''` handles both cases.

- [ ] **Step 2: Add `slug` to `handleSave()` updates object**

In the `handleSave()` function (around line 399), add `slug` to the updates object. Add after the `photoURL` line:

```typescript
        photoURL: formData.photoURL,
        slug: formData.slug || deleteField(),
```

Add `deleteField` to the Firestore imports at the top of the file. Find the existing import from `firebase/firestore` and add `deleteField`:

```typescript
import {
  doc,
  updateDoc,
  serverTimestamp,
  deleteField,
} from 'firebase/firestore';
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/ProfileEdit.tsx
git commit -m "feat(slug): wire slug into profile save and load"
```

---

### Task 8: Verify end-to-end

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: PASS (or only pre-existing warnings)

- [ ] **Step 3: Run tests**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(slug): address lint/test issues from slug feature"
```
