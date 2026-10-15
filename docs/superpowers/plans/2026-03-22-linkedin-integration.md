# LinkedIn Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add LinkedIn and GitHub as login providers, display LinkedIn Verified badges, and enhance the LinkedIn profile import parser with PDF support.

**Architecture:** Three phases building on existing OAuth infrastructure. Phase 1 wires up the UI and adds auto-merge logic for same-email conflicts. Phase 2 adds a Cloud Function for LinkedIn verification badge checks. Phase 3 expands the client-side parser and adds a Cloud Function for PDF parsing.

**Tech Stack:** React 18, Firebase Auth (OIDC), Firebase Cloud Functions, Vitest, Tailwind CSS, pdf-parse

**Spec:** `docs/superpowers/specs/2026-03-22-linkedin-integration-design.md`

---

## File Structure

### New files

| File                                                           | Responsibility                                                                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/auth/provider-id-map.ts`                              | Maps short provider names (`'linkedin'`) to Firebase provider IDs (`'linkedin.com'`)                                                       |
| `src/lib/auth/auto-merge.ts`                                   | Handles `auth/account-exists-with-different-credential` — stores pending credential, finds existing provider, prompts user, links accounts |
| `src/components/auth/AccountMergePrompt.tsx`                   | UI component for the auto-merge prompt ("Sign in with [Google] to link your LinkedIn account")                                             |
| `src/lib/linkedin-parser/experience-parser.ts`                 | Renamed from `src/lib/linkedin-parser.ts` — existing experience parser                                                                     |
| `src/lib/linkedin-parser/education-parser.ts`                  | Parse education section from LinkedIn text                                                                                                 |
| `src/lib/linkedin-parser/skills-parser.ts`                     | Parse skills section from LinkedIn text                                                                                                    |
| `src/lib/linkedin-parser/certifications-parser.ts`             | Parse certifications section from LinkedIn text                                                                                            |
| `src/lib/linkedin-parser/languages-parser.ts`                  | Parse languages section from LinkedIn text                                                                                                 |
| `src/lib/linkedin-parser/deduplication.ts`                     | Smart deduplication for imported profile data                                                                                              |
| `src/lib/linkedin-parser/transformers.ts`                      | Maps parsed types → domain types (`EducationEntry`, `Certification`, `Language`)                                                           |
| `src/lib/linkedin-parser/index.ts`                             | Re-exports all parsers + transformers                                                                                                      |
| `src/components/profile/LinkedInImportModal.tsx`               | Multi-section import modal with tabs + PDF upload                                                                                          |
| `src/components/shared/LinkedInVerifiedBadge.tsx`              | LinkedIn Verified badge component                                                                                                          |
| `functions/src/check-linkedin-verification.ts`                 | Cloud Function: check LinkedIn verification status                                                                                         |
| `functions/src/parse-linkedin-pdf.ts`                          | Cloud Function: parse uploaded LinkedIn PDF                                                                                                |
| `tests/unit/lib/auth/provider-id-map.test.ts`                  | Tests for provider ID mapping                                                                                                              |
| `tests/unit/lib/auth/auto-merge.test.ts`                       | Tests for auto-merge logic                                                                                                                 |
| `tests/unit/lib/linkedin-parser/education-parser.test.ts`      | Tests for education parser                                                                                                                 |
| `tests/unit/lib/linkedin-parser/skills-parser.test.ts`         | Tests for skills parser                                                                                                                    |
| `tests/unit/lib/linkedin-parser/certifications-parser.test.ts` | Tests for certifications parser                                                                                                            |
| `tests/unit/lib/linkedin-parser/languages-parser.test.ts`      | Tests for languages parser                                                                                                                 |
| `tests/unit/lib/linkedin-parser/deduplication.test.ts`         | Tests for deduplication logic                                                                                                              |

### Modified files

| File                                                     | Changes                                                                                                                                                                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types/user.ts:72`                                   | Expand `SupportedProvider` to `'google' \| 'github' \| 'linkedin'`, add `linkedinVerified` and `linkedinVerifiedAt` fields to `UserProfile`                                                          |
| `src/lib/auth/oauth-providers.ts:22`                     | Remove duplicate `SupportedProvider`, import from `@/types/user`. Use `PROVIDER_ID_MAP` in `unlinkOAuthProvider`. Ensure `linkedAccounts` stores short-form providerId (matches `SupportedProvider`) |
| `src/lib/auth.ts:26`                                     | Update import of `SupportedProvider` to come from `@/types/user`                                                                                                                                     |
| `src/components/auth/SocialLoginButtons.tsx`             | Remove `@ts-nocheck`, add LinkedIn + GitHub buttons, integrate auto-merge handler                                                                                                                    |
| `src/components/settings/SecuritySettings.tsx`           | Verify compiles after type refactor (imports `SupportedProvider` from `@/lib/auth/oauth-providers`)                                                                                                  |
| `src/lib/linkedin-parser.ts`                             | **Rename** to `src/lib/linkedin-parser/experience-parser.ts` (resolves file vs directory conflict)                                                                                                   |
| `src/components/profile/tabs/CareerTab.tsx:10`           | Update import path, replace inline import with `LinkedInImportModal`                                                                                                                                 |
| `tests/unit/components/auth/SocialLoginButtons.test.tsx` | Un-skip tests, remove `@ts-nocheck`, fix assertion CSS classes and lang mismatches                                                                                                                   |
| `tests/unit/lib/linkedin-parser.test.ts`                 | Update import path after rename                                                                                                                                                                      |
| `firestore.rules`                                        | Update user self-update allowlist for new profile array fields                                                                                                                                       |
| `functions/src/index.ts`                                 | Register `checkLinkedInVerification` and `parseLinkedInPdf`                                                                                                                                          |

---

## Phase 1: Login & Identity

### Task 1: Fix `SupportedProvider` Type and Provider ID Mapping

**Files:**

- Modify: `src/types/user.ts:72`
- Create: `src/lib/auth/provider-id-map.ts`
- Modify: `src/lib/auth/oauth-providers.ts:22`
- Modify: `src/lib/auth.ts:26`
- Create: `tests/unit/lib/auth/provider-id-map.test.ts`

- [ ] **Step 1: Write test for provider ID mapping**

```typescript
// tests/unit/lib/auth/provider-id-map.test.ts
import { describe, it, expect } from 'vitest';
import {
  toFirebaseProviderId,
  fromFirebaseProviderId,
  PROVIDER_ID_MAP,
} from '@/lib/auth/provider-id-map';

describe('provider-id-map', () => {
  it('maps google to google.com', () => {
    expect(toFirebaseProviderId('google')).toBe('google.com');
  });

  it('maps github to github.com', () => {
    expect(toFirebaseProviderId('github')).toBe('github.com');
  });

  it('maps linkedin to linkedin.com', () => {
    expect(toFirebaseProviderId('linkedin')).toBe('linkedin.com');
  });

  it('reverse maps google.com to google', () => {
    expect(fromFirebaseProviderId('google.com')).toBe('google');
  });

  it('reverse maps linkedin.com to linkedin', () => {
    expect(fromFirebaseProviderId('linkedin.com')).toBe('linkedin');
  });

  it('returns undefined for unknown provider', () => {
    expect(fromFirebaseProviderId('unknown.com')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/lib/auth/provider-id-map.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Update `src/types/user.ts`**

Change line 72 from:

```typescript
export type SupportedProvider = 'google';
```

To:

```typescript
export type SupportedProvider = 'google' | 'github' | 'linkedin';
```

Also add LinkedIn verification fields to `UserProfile` (after `securityEvents` around line 47):

```typescript
// LinkedIn verification
linkedinVerified?: boolean;
linkedinVerifiedAt?: Date;
```

- [ ] **Step 4: Create provider ID mapping**

```typescript
// src/lib/auth/provider-id-map.ts
import type { SupportedProvider } from '@/types/user';

export const PROVIDER_ID_MAP: Record<SupportedProvider, string> = {
  google: 'google.com',
  github: 'github.com',
  linkedin: 'linkedin.com',
} as const;

const REVERSE_MAP: Record<string, SupportedProvider> = Object.fromEntries(
  Object.entries(PROVIDER_ID_MAP).map(([k, v]) => [v, k as SupportedProvider])
);

export function toFirebaseProviderId(provider: SupportedProvider): string {
  return PROVIDER_ID_MAP[provider];
}

export function fromFirebaseProviderId(
  firebaseId: string
): SupportedProvider | undefined {
  return REVERSE_MAP[firebaseId];
}
```

- [ ] **Step 5: Update `oauth-providers.ts` — remove duplicate type, use mapping in unlink**

- Remove line 22 (`export type SupportedProvider = ...`)
- Add import: `import type { SupportedProvider } from '@/types/user';`
- Add import: `import { toFirebaseProviderId } from './provider-id-map';`
- In `unlinkOAuthProvider` (line 173), change `await unlink(user, providerId)` to `await unlink(user, toFirebaseProviderId(providerId))`
- Keep re-exporting `SupportedProvider` for backward compatibility: `export type { SupportedProvider } from '@/types/user';`
- Export `addLinkedAccount` (line 228): add `export` keyword so `auto-merge.ts` can import it for updating linked accounts after merge
- **Note on `linkedAccounts` storage format:** The `addLinkedAccount` function (line 228) stores `providerId` using the short form (e.g., `'linkedin'`) which comes from the `SupportedProvider` type. The `removeLinkedAccount` function (line 257) compares against the same short form. This is consistent. The `toFirebaseProviderId` mapping is only needed when calling Firebase SDK methods (`unlink`, etc.), not for Firestore storage.

- [ ] **Step 6: Update `auth.ts` — import from correct source**

Line 26: change `type SupportedProvider` import to come from `@/types/user` (or keep importing from `oauth-providers.ts` since it re-exports — verify both compile).

- [ ] **Step 6b: Verify `SecuritySettings.tsx` compiles**

`src/components/settings/SecuritySettings.tsx` imports `SupportedProvider` from `@/lib/auth/oauth-providers`. Since we're re-exporting from that file, this should work without changes. Verify: `npx tsc --noEmit src/components/settings/SecuritySettings.tsx` (or just run full type-check in Step 7).

- [ ] **Step 7: Run tests**

Run: `npx vitest run tests/unit/lib/auth/provider-id-map.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/types/user.ts src/lib/auth/provider-id-map.ts src/lib/auth/oauth-providers.ts src/lib/auth.ts tests/unit/lib/auth/provider-id-map.test.ts
git commit -m "refactor(auth): unify SupportedProvider type and add provider ID mapping"
```

---

### Task 2: Add LinkedIn and GitHub Buttons to SocialLoginButtons

**Files:**

- Modify: `src/components/auth/SocialLoginButtons.tsx`
- Modify: `tests/unit/components/auth/SocialLoginButtons.test.tsx`

- [ ] **Step 1: Update `SocialLoginButtons.tsx`**

Remove `// @ts-nocheck` from line 1.

Add imports at top:

```typescript
import type { SupportedProvider } from '@/types/user';
```

Expand the `providers` array (line 36) to include LinkedIn and GitHub:

```typescript
const providers: ProviderConfig[] = [
  {
    id: 'google',
    name: 'Google',
    bgColor: 'bg-white hover:bg-gray-50',
    hoverColor: 'hover:bg-gray-50',
    textColor: 'text-gray-700',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    bgColor: 'bg-[#0A66C2] hover:bg-[#004182]',
    hoverColor: 'hover:bg-[#004182]',
    textColor: 'text-white',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    id: 'github',
    name: 'GitHub',
    bgColor: 'bg-gray-900 hover:bg-gray-800',
    hoverColor: 'hover:bg-gray-800',
    textColor: 'text-white',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
];
```

**Important:** Steps 1 and 2 MUST be done together before running any type checks. The component uses `SupportedProvider` without importing it, relying on `@ts-nocheck`. Removing `@ts-nocheck` without adding the import will cause a compile error.

- [ ] **Step 2: Un-skip and fix tests**

In `tests/unit/components/auth/SocialLoginButtons.test.tsx`:

- Remove `// @ts-nocheck` from line 1
- Change `describe.skip('SocialLoginButtons'` to `describe('SocialLoginButtons'`
- Fix these specific assertion issues:
  1. **Line 200 (LinkedIn styling):** Change `toHaveClass('bg-blue-600')` → `toHaveClass('bg-[#0A66C2]')`
  2. **Lines 96-108 (rendering test):** Tests mix English/Spanish assertions with default `lang="es"`. Either add `lang="en"` to render calls or change assertions to match Spanish text
  3. **Lines 213-218 (button attributes):** Tests check `data-variant` and `data-size` attributes from a mocked `Button` component that the implementation doesn't use. Remove or update these assertions to match the actual `<button>` element structure
  4. **Line 649 (spacing test):** Checks for `.flex.items-center.justify-center.space-x-3` selector which doesn't exist in the implementation. Update to match actual layout

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/unit/components/auth/SocialLoginButtons.test.tsx`
Expected: PASS — if failures remain, read the error messages and fix the specific assertion mismatches.

- [ ] **Step 4: Fix any remaining test assertion mismatches**

Compare each failing assertion against the actual rendered output. The pattern is always: test expects class X but component uses class Y.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/SocialLoginButtons.tsx tests/unit/components/auth/SocialLoginButtons.test.tsx
git commit -m "feat(auth): add LinkedIn and GitHub social login buttons"
```

---

### Task 3: Build Auto-Merge Logic for Same-Email Conflicts

**Files:**

- Create: `src/lib/auth/auto-merge.ts`
- Create: `tests/unit/lib/auth/auto-merge.test.ts`
- Modify: `src/lib/auth/oauth-providers.ts:130-135`

- [ ] **Step 1: Write tests for auto-merge handler**

```typescript
// tests/unit/lib/auth/auto-merge.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase modules before importing
vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  linkWithCredential: vi.fn(),
  OAuthProvider: { credentialFromError: vi.fn() },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {},
  db: {},
}));

import {
  handleAccountExistsError,
  type PendingMerge,
} from '@/lib/auth/auto-merge';

describe('handleAccountExistsError', () => {
  it('returns null if error is not account-exists-with-different-credential', async () => {
    const error = { code: 'auth/popup-closed', customData: {} };
    const result = await handleAccountExistsError(error);
    expect(result).toBeNull();
  });

  it('returns PendingMerge with existing provider info for matching error', async () => {
    const { getDocs } = await import('firebase/firestore');
    const { OAuthProvider } = await import('firebase/auth');

    const mockCredential = { providerId: 'linkedin.com' };
    (OAuthProvider.credentialFromError as any).mockReturnValue(mockCredential);

    (getDocs as any).mockResolvedValue({
      empty: false,
      docs: [{ data: () => ({ lastLoginProvider: 'google' }) }],
    });

    const error = {
      code: 'auth/account-exists-with-different-credential',
      customData: { email: 'user@example.com' },
    };

    const result = await handleAccountExistsError(error);

    expect(result).toEqual({
      email: 'user@example.com',
      pendingCredential: mockCredential,
      existingProvider: 'google',
    });
  });

  it('returns null if no existing user found in Firestore', async () => {
    const { getDocs } = await import('firebase/firestore');
    const { OAuthProvider } = await import('firebase/auth');

    (OAuthProvider.credentialFromError as any).mockReturnValue({});
    (getDocs as any).mockResolvedValue({ empty: true, docs: [] });

    const error = {
      code: 'auth/account-exists-with-different-credential',
      customData: { email: 'user@example.com' },
    };

    const result = await handleAccountExistsError(error);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/lib/auth/auto-merge.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement auto-merge handler**

```typescript
// src/lib/auth/auto-merge.ts
import {
  signInWithPopup,
  linkWithCredential,
  OAuthProvider,
  type AuthCredential,
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { SupportedProvider } from '@/types/user';
import { getProvider } from './oauth-providers';
import { fromFirebaseProviderId } from './provider-id-map';

export interface PendingMerge {
  email: string;
  pendingCredential: AuthCredential;
  existingProvider: SupportedProvider;
}

/**
 * Check if a Firebase auth error is an account-exists-with-different-credential
 * error and extract the information needed to complete the merge.
 */
export async function handleAccountExistsError(
  error: any
): Promise<PendingMerge | null> {
  if (error.code !== 'auth/account-exists-with-different-credential') {
    return null;
  }

  const email = error.customData?.email;
  if (!email) return null;

  const pendingCredential = OAuthProvider.credentialFromError(error);
  if (!pendingCredential) return null;

  // Find existing account's provider by querying Firestore
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const existingUserData = snapshot.docs[0].data();
  const existingProvider = (existingUserData.lastLoginProvider ||
    'google') as SupportedProvider;

  return { email, pendingCredential, existingProvider };
}

/**
 * Complete the merge by signing in with the existing provider
 * and linking the pending credential.
 */
export async function completeMerge(
  existingProvider: SupportedProvider,
  pendingCredential: AuthCredential
): Promise<void> {
  const provider = getProvider(existingProvider);
  const result = await signInWithPopup(auth, provider);
  await linkWithCredential(result.user, pendingCredential);

  // Update linkedAccounts in Firestore
  const { addLinkedAccount } = await import('./oauth-providers');
  const linkedProviderName = fromFirebaseProviderId(
    pendingCredential.providerId
  );
  if (linkedProviderName) {
    await addLinkedAccount(result.user.uid, {
      providerId: linkedProviderName,
      email: result.user.email || '',
      displayName: result.user.displayName || '',
      linkedAt: new Date(),
    });
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/lib/auth/auto-merge.test.ts`
Expected: PASS

- [ ] **Step 5: Integrate auto-merge into `signInWithOAuth`**

In `src/lib/auth/oauth-providers.ts`, modify the catch block (lines 130-135):

```typescript
} catch (error: any) {
  // Check if this is an account-exists-with-different-credential error
  const { handleAccountExistsError } = await import('./auto-merge');
  const pendingMerge = await handleAccountExistsError(error);

  if (pendingMerge) {
    // Re-throw with merge info attached so the UI can handle it
    const mergeError = new Error(
      `An account with ${pendingMerge.email} already exists via ${pendingMerge.existingProvider}. Sign in with ${pendingMerge.existingProvider} to link your accounts.`
    );
    (mergeError as any).code = 'auth/account-exists-with-different-credential';
    (mergeError as any).pendingMerge = pendingMerge;
    throw mergeError;
  }

  console.error(`OAuth sign-in error with ${providerId}:`, error);
  const wrapped = new Error(getOAuthErrorMessage(error.code, providerId));
  (wrapped as any).code = error.code;
  throw wrapped;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/auto-merge.ts src/lib/auth/oauth-providers.ts tests/unit/lib/auth/auto-merge.test.ts
git commit -m "feat(auth): add auto-merge handler for same-email cross-provider conflicts"
```

---

### Task 4: Add AccountMergePrompt UI Component

**Files:**

- Create: `src/components/auth/AccountMergePrompt.tsx`
- Modify: `src/components/auth/SocialLoginButtons.tsx`

- [ ] **Step 1: Create the merge prompt component**

```typescript
// src/components/auth/AccountMergePrompt.tsx
import React from 'react';
import type { SupportedProvider } from '@/types/user';

interface AccountMergePromptProps {
  email: string;
  existingProvider: SupportedProvider;
  onSignInWithExisting: () => void;
  onCancel: () => void;
  lang: 'es' | 'en';
  loading?: boolean;
}

const PROVIDER_LABELS: Record<SupportedProvider, string> = {
  google: 'Google',
  github: 'GitHub',
  linkedin: 'LinkedIn',
};

export const AccountMergePrompt: React.FC<AccountMergePromptProps> = ({
  email,
  existingProvider,
  onSignInWithExisting,
  onCancel,
  lang,
  loading = false,
}) => {
  const providerName = PROVIDER_LABELS[existingProvider];

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
      <p className="text-sm text-amber-800 dark:text-amber-200">
        {lang === 'es'
          ? `Ya existe una cuenta con ${email} vía ${providerName}. Inicia sesión con ${providerName} para vincular tus cuentas automáticamente.`
          : `An account with ${email} already exists via ${providerName}. Sign in with ${providerName} to link your accounts automatically.`}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onSignInWithExisting}
          disabled={loading}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {loading
            ? (lang === 'es' ? 'Vinculando...' : 'Linking...')
            : (lang === 'es' ? `Iniciar sesión con ${providerName}` : `Sign in with ${providerName}`)}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
        >
          {lang === 'es' ? 'Cancelar' : 'Cancel'}
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Integrate merge prompt into SocialLoginButtons**

In `SocialLoginButtons.tsx`, add state and handler:

```typescript
import { AccountMergePrompt } from './AccountMergePrompt';
import { completeMerge } from '@/lib/auth/auto-merge';
import type { PendingMerge } from '@/lib/auth/auto-merge';

// Inside component, add state:
const [pendingMerge, setPendingMerge] = useState<PendingMerge | null>(null);
const [merging, setMerging] = useState(false);
```

In the catch block of `handleProviderSignIn`, before the generic error handling:

```typescript
if ((error as any).pendingMerge) {
  setPendingMerge((error as any).pendingMerge);
  setLoading(null);
  return;
}
```

Add the merge prompt in JSX, before the provider buttons:

```tsx
{
  pendingMerge && (
    <AccountMergePrompt
      email={pendingMerge.email}
      existingProvider={pendingMerge.existingProvider}
      lang={lang}
      loading={merging}
      onSignInWithExisting={async () => {
        setMerging(true);
        try {
          await completeMerge(
            pendingMerge.existingProvider,
            pendingMerge.pendingCredential
          );
          setPendingMerge(null);
          toast.success(
            lang === 'es'
              ? '¡Cuentas vinculadas exitosamente!'
              : 'Accounts linked successfully!'
          );
          onSuccess?.();
        } catch (err: any) {
          toast.error(
            lang === 'es'
              ? 'Error al vincular cuentas'
              : 'Failed to link accounts'
          );
        } finally {
          setMerging(false);
        }
      }}
      onCancel={() => setPendingMerge(null)}
    />
  );
}
```

- [ ] **Step 3: Run full test suite for auth components**

Run: `npx vitest run tests/unit/components/auth/`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/AccountMergePrompt.tsx src/components/auth/SocialLoginButtons.tsx
git commit -m "feat(auth): add account merge prompt for cross-provider email conflicts"
```

---

## Phase 2: Trust & Verification

### Task 5: Create LinkedIn Verified Badge Component

**Files:**

- Create: `src/components/shared/LinkedInVerifiedBadge.tsx`

- [ ] **Step 1: Create the badge component**

```typescript
// src/components/shared/LinkedInVerifiedBadge.tsx
import React from 'react';

interface LinkedInVerifiedBadgeProps {
  lang?: 'es' | 'en';
  size?: 'sm' | 'md';
  className?: string;
}

export const LinkedInVerifiedBadge: React.FC<LinkedInVerifiedBadgeProps> = ({
  lang = 'es',
  size = 'sm',
  className = '',
}) => {
  const tooltip = lang === 'es' ? 'Verificado en LinkedIn' : 'Verified on LinkedIn';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-0.5 ${className}`}
    >
      <svg
        className={`${iconSize} text-[#0A66C2]`}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
      <svg
        className={`${size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} -ml-1 text-green-500`}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
      <span className="sr-only">{tooltip}</span>
    </span>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/LinkedInVerifiedBadge.tsx
git commit -m "feat(auth): add LinkedIn Verified badge component"
```

---

### Task 6: Create Cloud Function for LinkedIn Verification Check

**Files:**

- Create: `functions/src/check-linkedin-verification.ts`
- Modify: `functions/src/index.ts`

**Note:** This task creates the Cloud Function skeleton. The actual LinkedIn API call depends on the "Verified on LinkedIn" API product upgrade being approved. If not yet approved, the function returns `false` gracefully.

- [ ] **Step 1: Create the verification check function**

```typescript
// functions/src/check-linkedin-verification.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

export const checkLinkedInVerification = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { accessToken } = request.data;
    if (!accessToken || typeof accessToken !== 'string') {
      throw new HttpsError('invalid-argument', 'accessToken is required');
    }

    const uid = request.auth.uid;

    try {
      // Call LinkedIn Verification API
      const response = await fetch(
        'https://api.linkedin.com/v2/memberVerifications?q=member',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': '202401',
          },
        }
      );

      if (!response.ok) {
        // API not available or token invalid — fail gracefully
        console.warn(
          `LinkedIn verification check failed for ${uid}: ${response.status}`
        );
        return { verified: false, reason: 'api_unavailable' };
      }

      const data = await response.json();
      const verified = data.elements?.length > 0;

      // Write result to Firestore (server-only, bypasses rules)
      await db.doc(`users/${uid}`).update({
        linkedinVerified: verified,
        linkedinVerifiedAt: FieldValue.serverTimestamp(),
      });

      return { verified };
    } catch (error) {
      console.error(`LinkedIn verification error for ${uid}:`, error);
      return { verified: false, reason: 'error' };
    }
  }
);
```

- [ ] **Step 2: Register in `functions/src/index.ts`**

Add at top:

```typescript
export { checkLinkedInVerification } from './check-linkedin-verification';
```

- [ ] **Step 3: Trigger verification after LinkedIn login**

In `src/lib/auth/oauth-providers.ts`, after successful LinkedIn sign-in (inside `signInWithOAuth`, after `updateUserOAuthInfo`), add:

```typescript
// Trigger LinkedIn verification check if signed in with LinkedIn
if (providerId === 'linkedin') {
  try {
    const oauthCredential = OAuthProvider.credentialFromResult(credential);
    if (oauthCredential?.accessToken) {
      const { getFunctions, httpsCallable } = await import(
        'firebase/functions'
      );
      const functions = getFunctions();
      const checkVerification = httpsCallable(
        functions,
        'checkLinkedInVerification'
      );
      // Fire and forget — don't block login on verification check
      checkVerification({ accessToken: oauthCredential.accessToken }).catch(
        console.warn
      );
    }
  } catch (e) {
    console.warn('LinkedIn verification check skipped:', e);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add functions/src/check-linkedin-verification.ts functions/src/index.ts src/lib/auth/oauth-providers.ts
git commit -m "feat(auth): add LinkedIn verification check Cloud Function"
```

---

## Phase 3: Enhanced Content Import

### Task 7: Add Education Parser

**Files:**

- Create: `src/lib/linkedin-parser/education-parser.ts`
- Create: `tests/unit/lib/linkedin-parser/education-parser.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// tests/unit/lib/linkedin-parser/education-parser.test.ts
import { describe, it, expect } from 'vitest';
import {
  parseLinkedInEducation,
  type ParsedEducationEntry,
} from '@/lib/linkedin-parser/education-parser';

describe('parseLinkedInEducation', () => {
  it('parses a single education entry with degree and field', () => {
    const text = `Universidad Nacional Autónoma de México
Bachelor of Science - BS, Data Science
2018 - 2022`;

    const result = parseLinkedInEducation(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      school: 'Universidad Nacional Autónoma de México',
      degree: 'Bachelor of Science - BS',
      field: 'Data Science',
      startYear: 2018,
      endYear: 2022,
    });
  });

  it('parses entry without field of study', () => {
    const text = `MIT
Master of Science
2020 - 2022`;

    const result = parseLinkedInEducation(text);
    expect(result).toHaveLength(1);
    expect(result[0].school).toBe('MIT');
    expect(result[0].degree).toBe('Master of Science');
    expect(result[0].field).toBeUndefined();
  });

  it('parses multiple entries', () => {
    const text = `Universidad Nacional Autónoma de México
Licenciatura, Ciencia de Datos
2018 - 2022

Instituto Politécnico Nacional
Maestría, Inteligencia Artificial
2022 - 2024`;

    const result = parseLinkedInEducation(text);
    expect(result).toHaveLength(2);
    expect(result[0].school).toBe('Universidad Nacional Autónoma de México');
    expect(result[1].school).toBe('Instituto Politécnico Nacional');
  });

  it('returns empty array for empty input', () => {
    expect(parseLinkedInEducation('')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/lib/linkedin-parser/education-parser.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement education parser**

```typescript
// src/lib/linkedin-parser/education-parser.ts
export interface ParsedEducationEntry {
  school: string;
  degree?: string;
  field?: string;
  startYear?: number;
  endYear?: number;
}

const YEAR_RANGE_RE = /^(\d{4})\s*[-–]\s*(\d{4}|present|actual)$/i;

export function parseLinkedInEducation(text: string): ParsedEducationEntry[] {
  const entries: ParsedEducationEntry[] = [];
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    const school = lines[i];
    if (!school) break;

    const entry: ParsedEducationEntry = { school };

    const nextLine = lines[i + 1];
    if (nextLine && !YEAR_RANGE_RE.test(nextLine)) {
      // Degree line — may contain "Degree, Field" or just "Degree"
      const commaIdx = nextLine.indexOf(',');
      if (commaIdx > -1) {
        entry.degree = nextLine.slice(0, commaIdx).trim();
        entry.field = nextLine.slice(commaIdx + 1).trim();
      } else {
        entry.degree = nextLine;
      }

      const dateLine = lines[i + 2];
      if (dateLine) {
        const dateMatch = dateLine.match(YEAR_RANGE_RE);
        if (dateMatch) {
          entry.startYear = parseInt(dateMatch[1], 10);
          if (!/present|actual/i.test(dateMatch[2])) {
            entry.endYear = parseInt(dateMatch[2], 10);
          }
          i += 3;
        } else {
          i += 2;
        }
      } else {
        i += 2;
      }
    } else if (nextLine && YEAR_RANGE_RE.test(nextLine)) {
      const dateMatch = nextLine.match(YEAR_RANGE_RE);
      if (dateMatch) {
        entry.startYear = parseInt(dateMatch[1], 10);
        if (!/present|actual/i.test(dateMatch[2])) {
          entry.endYear = parseInt(dateMatch[2], 10);
        }
      }
      i += 2;
    } else {
      i += 1;
    }

    entries.push(entry);
  }

  return entries;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/lib/linkedin-parser/education-parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/linkedin-parser/education-parser.ts tests/unit/lib/linkedin-parser/education-parser.test.ts
git commit -m "feat(parser): add LinkedIn education section parser"
```

---

### Task 8: Add Skills Parser

**Files:**

- Create: `src/lib/linkedin-parser/skills-parser.ts`
- Create: `tests/unit/lib/linkedin-parser/skills-parser.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// tests/unit/lib/linkedin-parser/skills-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseLinkedInSkills } from '@/lib/linkedin-parser/skills-parser';

describe('parseLinkedInSkills', () => {
  it('parses newline-separated skills', () => {
    const text = `Python
Machine Learning
Data Visualization
SQL`;

    const result = parseLinkedInSkills(text);
    expect(result).toEqual([
      'Python',
      'Machine Learning',
      'Data Visualization',
      'SQL',
    ]);
  });

  it('ignores endorsement counts', () => {
    const text = `Python · 15 endorsements
Machine Learning · 8 endorsements
SQL`;

    const result = parseLinkedInSkills(text);
    expect(result).toEqual(['Python', 'Machine Learning', 'SQL']);
  });

  it('trims whitespace and removes empty lines', () => {
    const text = `  Python

  Machine Learning  `;

    const result = parseLinkedInSkills(text);
    expect(result).toEqual(['Python', 'Machine Learning']);
  });

  it('returns empty array for empty input', () => {
    expect(parseLinkedInSkills('')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/lib/linkedin-parser/skills-parser.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement skills parser**

```typescript
// src/lib/linkedin-parser/skills-parser.ts
export function parseLinkedInSkills(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/·.*$/, '').trim())
    .filter(Boolean);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/lib/linkedin-parser/skills-parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/linkedin-parser/skills-parser.ts tests/unit/lib/linkedin-parser/skills-parser.test.ts
git commit -m "feat(parser): add LinkedIn skills section parser"
```

---

### Task 9: Add Certifications Parser

**Files:**

- Create: `src/lib/linkedin-parser/certifications-parser.ts`
- Create: `tests/unit/lib/linkedin-parser/certifications-parser.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// tests/unit/lib/linkedin-parser/certifications-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseLinkedInCertifications } from '@/lib/linkedin-parser/certifications-parser';

describe('parseLinkedInCertifications', () => {
  it('parses certification with issuer and date', () => {
    const text = `AWS Solutions Architect
Amazon Web Services (AWS)
Issued Jan 2023`;

    const result = parseLinkedInCertifications(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'AWS Solutions Architect',
      issuer: 'Amazon Web Services (AWS)',
      issuedDate: 'Jan 2023',
    });
  });

  it('parses multiple certifications', () => {
    const text = `AWS Solutions Architect
Amazon Web Services (AWS)
Issued Jan 2023

Google Professional Data Engineer
Google
Issued Mar 2022`;

    const result = parseLinkedInCertifications(text);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('AWS Solutions Architect');
    expect(result[1].name).toBe('Google Professional Data Engineer');
  });

  it('handles Spanish date format', () => {
    const text = `Certificación en Ciencia de Datos
Coursera
Issued Ene 2023`;

    const result = parseLinkedInCertifications(text);
    expect(result[0].issuedDate).toBe('Ene 2023');
  });

  it('returns empty array for empty input', () => {
    expect(parseLinkedInCertifications('')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/lib/linkedin-parser/certifications-parser.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement certifications parser**

```typescript
// src/lib/linkedin-parser/certifications-parser.ts
export interface ParsedCertificationEntry {
  name: string;
  issuer?: string;
  issuedDate?: string;
}

const ISSUED_RE = /^issued\s+(.+)$/i;

export function parseLinkedInCertifications(
  text: string
): ParsedCertificationEntry[] {
  const entries: ParsedCertificationEntry[] = [];
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    const name = lines[i];
    if (!name) break;

    const entry: ParsedCertificationEntry = { name };

    const nextLine = lines[i + 1];
    if (nextLine && !ISSUED_RE.test(nextLine)) {
      entry.issuer = nextLine;

      const dateLine = lines[i + 2];
      if (dateLine) {
        const match = dateLine.match(ISSUED_RE);
        if (match) {
          entry.issuedDate = match[1].trim();
          i += 3;
        } else {
          i += 2;
        }
      } else {
        i += 2;
      }
    } else if (nextLine && ISSUED_RE.test(nextLine)) {
      const match = nextLine.match(ISSUED_RE);
      if (match) entry.issuedDate = match[1].trim();
      i += 2;
    } else {
      i += 1;
    }

    entries.push(entry);
  }

  return entries;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/lib/linkedin-parser/certifications-parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/linkedin-parser/certifications-parser.ts tests/unit/lib/linkedin-parser/certifications-parser.test.ts
git commit -m "feat(parser): add LinkedIn certifications section parser"
```

---

### Task 10: Add Languages Parser

**Files:**

- Create: `src/lib/linkedin-parser/languages-parser.ts`
- Create: `tests/unit/lib/linkedin-parser/languages-parser.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// tests/unit/lib/linkedin-parser/languages-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseLinkedInLanguages } from '@/lib/linkedin-parser/languages-parser';

describe('parseLinkedInLanguages', () => {
  it('parses languages with proficiency', () => {
    const text = `Spanish
Native or bilingual proficiency

English
Professional working proficiency

French
Limited working proficiency`;

    const result = parseLinkedInLanguages(text);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      language: 'Spanish',
      proficiency: 'Native or bilingual proficiency',
    });
    expect(result[1]).toEqual({
      language: 'English',
      proficiency: 'Professional working proficiency',
    });
  });

  it('handles languages without proficiency', () => {
    const text = `Spanish
English`;

    const result = parseLinkedInLanguages(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ language: 'Spanish', proficiency: undefined });
  });

  it('returns empty array for empty input', () => {
    expect(parseLinkedInLanguages('')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/lib/linkedin-parser/languages-parser.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement languages parser**

```typescript
// src/lib/linkedin-parser/languages-parser.ts
export interface ParsedLanguageEntry {
  language: string;
  proficiency?: string;
}

const PROFICIENCY_KEYWORDS = [
  'native',
  'bilingual',
  'professional',
  'working',
  'limited',
  'elementary',
  'nativo',
  'bilingüe',
  'profesional',
  'elemental',
  'competencia',
];

function isProficiencyLine(line: string): boolean {
  const lower = line.toLowerCase();
  return PROFICIENCY_KEYWORDS.some((kw) => lower.includes(kw));
}

export function parseLinkedInLanguages(text: string): ParsedLanguageEntry[] {
  const entries: ParsedLanguageEntry[] = [];
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    const language = lines[i];
    if (!language) break;

    const nextLine = lines[i + 1];
    if (nextLine && isProficiencyLine(nextLine)) {
      entries.push({ language, proficiency: nextLine });
      i += 2;
    } else {
      entries.push({ language, proficiency: undefined });
      i += 1;
    }
  }

  return entries;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/lib/linkedin-parser/languages-parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/linkedin-parser/languages-parser.ts tests/unit/lib/linkedin-parser/languages-parser.test.ts
git commit -m "feat(parser): add LinkedIn languages section parser"
```

---

### Task 11: Add Deduplication Logic

**Files:**

- Create: `src/lib/linkedin-parser/deduplication.ts`
- Create: `tests/unit/lib/linkedin-parser/deduplication.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// tests/unit/lib/linkedin-parser/deduplication.test.ts
import { describe, it, expect } from 'vitest';
import {
  deduplicateExperience,
  deduplicateSkills,
} from '@/lib/linkedin-parser/deduplication';

describe('deduplicateExperience', () => {
  it('identifies duplicate by company+title case-insensitive', () => {
    const existing = [
      {
        company: 'BBVA',
        position: 'Data Scientist',
        id: '1',
        startDate: new Date(),
        current: false,
      },
    ];
    const imported = [
      {
        company: 'bbva',
        position: 'data scientist',
        startDate: { month: 1, year: 2022 },
        current: true,
      },
    ];

    const result = deduplicateExperience(existing, imported);
    expect(result.duplicates).toHaveLength(1);
    expect(result.newEntries).toHaveLength(0);
  });

  it('identifies new entries', () => {
    const existing = [
      {
        company: 'BBVA',
        position: 'Data Scientist',
        id: '1',
        startDate: new Date(),
        current: false,
      },
    ];
    const imported = [
      {
        company: 'Google',
        position: 'ML Engineer',
        startDate: { month: 6, year: 2020 },
        current: false,
      },
    ];

    const result = deduplicateExperience(existing, imported);
    expect(result.duplicates).toHaveLength(0);
    expect(result.newEntries).toHaveLength(1);
  });
});

describe('deduplicateSkills', () => {
  it('merges skills case-insensitively', () => {
    const existing = ['Python', 'Machine Learning'];
    const imported = ['python', 'SQL', 'machine learning', 'React'];

    const result = deduplicateSkills(existing, imported);
    expect(result).toEqual(['Python', 'Machine Learning', 'SQL', 'React']);
  });

  it('preserves original casing from existing skills', () => {
    const existing = ['TensorFlow'];
    const imported = ['tensorflow'];

    const result = deduplicateSkills(existing, imported);
    expect(result).toEqual(['TensorFlow']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/lib/linkedin-parser/deduplication.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement deduplication**

```typescript
// src/lib/linkedin-parser/deduplication.ts
import type { ParsedLinkedInEntry } from '../linkedin-parser';

interface ExistingExperience {
  company: string;
  position: string;
  [key: string]: any;
}

export function deduplicateExperience(
  existing: ExistingExperience[],
  imported: ParsedLinkedInEntry[]
): { duplicates: ParsedLinkedInEntry[]; newEntries: ParsedLinkedInEntry[] } {
  const existingSet = new Set(
    existing.map(
      (e) =>
        `${e.company.trim().toLowerCase()}|${e.position.trim().toLowerCase()}`
    )
  );

  const duplicates: ParsedLinkedInEntry[] = [];
  const newEntries: ParsedLinkedInEntry[] = [];

  for (const entry of imported) {
    const key = `${entry.company.trim().toLowerCase()}|${entry.position.trim().toLowerCase()}`;
    if (existingSet.has(key)) {
      duplicates.push(entry);
    } else {
      newEntries.push(entry);
    }
  }

  return { duplicates, newEntries };
}

export function deduplicateSkills(
  existing: string[],
  imported: string[]
): string[] {
  const seen = new Map<string, string>();

  // Add existing skills first (preserves their casing)
  for (const skill of existing) {
    seen.set(skill.toLowerCase(), skill);
  }

  // Add imported skills only if not already present
  for (const skill of imported) {
    const lower = skill.toLowerCase();
    if (!seen.has(lower)) {
      seen.set(lower, skill);
    }
  }

  return Array.from(seen.values());
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/lib/linkedin-parser/deduplication.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/linkedin-parser/deduplication.ts tests/unit/lib/linkedin-parser/deduplication.test.ts
git commit -m "feat(parser): add deduplication logic for LinkedIn profile imports"
```

---

### Task 12: Restructure Parser into Directory Module

**Files:**

- Rename: `src/lib/linkedin-parser.ts` → `src/lib/linkedin-parser/experience-parser.ts`
- Create: `src/lib/linkedin-parser/transformers.ts`
- Create: `src/lib/linkedin-parser/index.ts`
- Modify: `src/components/profile/tabs/CareerTab.tsx:10`
- Modify: `tests/unit/lib/linkedin-parser.test.ts`

**Note:** `src/lib/linkedin-parser.ts` is a flat file. We cannot create `src/lib/linkedin-parser/` as a directory while the file exists — the module resolution would be ambiguous. We must rename the file first.

- [ ] **Step 1: Rename the original parser file**

```bash
mkdir -p src/lib/linkedin-parser
git mv src/lib/linkedin-parser.ts src/lib/linkedin-parser/experience-parser.ts
```

- [ ] **Step 2: Create the transformers module**

Maps parser output types to existing domain types from `@/types/member`:

```typescript
// src/lib/linkedin-parser/transformers.ts
import type { EducationEntry, Certification, Language } from '@/types/member';
import type { ParsedEducationEntry } from './education-parser';
import type { ParsedCertificationEntry } from './certifications-parser';
import type { ParsedLanguageEntry } from './languages-parser';

export function toEducationEntry(parsed: ParsedEducationEntry): EducationEntry {
  return {
    id: crypto.randomUUID(),
    institution: parsed.school,
    degree: parsed.degree || '',
    fieldOfStudy: parsed.field,
    startDate: parsed.startYear ? new Date(parsed.startYear, 0, 1) : new Date(),
    endDate: parsed.endYear ? new Date(parsed.endYear, 0, 1) : undefined,
    current: !parsed.endYear,
  };
}

const PROFICIENCY_MAP: Record<string, Language['proficiency']> = {
  'native or bilingual': 'native',
  'nativo o bilingüe': 'native',
  'full professional': 'advanced',
  'professional working': 'advanced',
  profesional: 'advanced',
  'limited working': 'intermediate',
  elementary: 'beginner',
  elemental: 'beginner',
};

export function toLanguage(parsed: ParsedLanguageEntry): Language {
  let proficiency: Language['proficiency'] = 'intermediate';
  if (parsed.proficiency) {
    const lower = parsed.proficiency.toLowerCase();
    for (const [key, value] of Object.entries(PROFICIENCY_MAP)) {
      if (lower.includes(key)) {
        proficiency = value;
        break;
      }
    }
  }
  return { id: crypto.randomUUID(), name: parsed.language, proficiency };
}

export function toCertification(
  parsed: ParsedCertificationEntry
): Certification {
  return {
    id: crypto.randomUUID(),
    name: parsed.name,
    issuer: parsed.issuer || '',
    issueDate: parsed.issuedDate ? new Date(parsed.issuedDate) : new Date(),
    verified: false,
  };
}
```

- [ ] **Step 3: Create the index file**

```typescript
// src/lib/linkedin-parser/index.ts
export {
  parseLinkedInText,
  parseMonthYear,
  type ParsedLinkedInEntry,
} from './experience-parser';
export {
  parseLinkedInEducation,
  type ParsedEducationEntry,
} from './education-parser';
export { parseLinkedInSkills } from './skills-parser';
export {
  parseLinkedInCertifications,
  type ParsedCertificationEntry,
} from './certifications-parser';
export {
  parseLinkedInLanguages,
  type ParsedLanguageEntry,
} from './languages-parser';
export { deduplicateExperience, deduplicateSkills } from './deduplication';
export { toEducationEntry, toLanguage, toCertification } from './transformers';
```

- [ ] **Step 4: Update imports**

In `src/components/profile/tabs/CareerTab.tsx`, line 10:

```typescript
import { parseLinkedInText } from '@/lib/linkedin-parser';
```

(No change needed — the directory index resolves automatically)

In `tests/unit/lib/linkedin-parser.test.ts`, update imports:

```typescript
import {
  parseLinkedInText,
  parseMonthYear,
} from '../../../src/lib/linkedin-parser';
```

(Same — directory index resolves)

- [ ] **Step 5: Run existing parser tests to verify nothing broke**

Run: `npx vitest run tests/unit/lib/linkedin-parser`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/linkedin-parser/ tests/unit/lib/linkedin-parser.test.ts src/components/profile/tabs/CareerTab.tsx
git commit -m "refactor(parser): restructure LinkedIn parser into directory module with transformers"
```

---

### Task 13: Create LinkedIn PDF Parsing Cloud Function

**Files:**

- Create: `functions/src/parse-linkedin-pdf.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Install pdf-parse in functions**

Run: `cd /Users/artemiopadilla/Documents/repos/GitHub/secid/secid-website/functions && npm install pdf-parse && npm install --save-dev @types/pdf-parse`

- [ ] **Step 2: Create the PDF parsing function**

```typescript
// functions/src/parse-linkedin-pdf.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import pdf from 'pdf-parse';

const db = getFirestore();
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_UPLOADS_PER_HOUR = 5;

export const parseLinkedInPdf = onCall(
  { cors: true, memory: '512MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { pdfData } = request.data;
    if (!pdfData || typeof pdfData !== 'string') {
      throw new HttpsError('invalid-argument', 'pdfData (base64) is required');
    }

    const uid = request.auth.uid;

    // Rate limiting (with cleanup of old timestamps)
    const rateRef = db.collection('rate_limits').doc(`pdf_parse_${uid}`);
    const rateDoc = await rateRef.get();
    const windowStart = Date.now() - RATE_LIMIT_WINDOW;
    if (rateDoc.exists) {
      const data = rateDoc.data();
      const recentUploads = (data?.timestamps || []).filter(
        (t: number) => t > windowStart
      );
      // Write back filtered list to prevent unbounded growth
      await rateRef.set({ timestamps: recentUploads });
      if (recentUploads.length >= MAX_UPLOADS_PER_HOUR) {
        throw new HttpsError(
          'resource-exhausted',
          'Rate limit exceeded. Try again later.'
        );
      }
    }

    // Decode and validate
    const buffer = Buffer.from(pdfData, 'base64');
    if (buffer.length > MAX_FILE_SIZE) {
      throw new HttpsError('invalid-argument', 'File exceeds 5MB limit');
    }

    // Check PDF magic bytes
    if (buffer.slice(0, 5).toString() !== '%PDF-') {
      throw new HttpsError('invalid-argument', 'Invalid PDF file');
    }

    try {
      const parsed = await pdf(buffer);
      const text = parsed.text;

      // Update rate limit
      await rateRef.set(
        {
          timestamps: FieldValue.arrayUnion(Date.now()),
        },
        { merge: true }
      );

      // Return raw text — client-side parsers handle structuring
      return { text, pageCount: parsed.numpages };
    } catch (error) {
      console.error(`PDF parse error for ${uid}:`, error);
      throw new HttpsError('internal', 'Failed to parse PDF');
    }
  }
);
```

- [ ] **Step 3: Register in `functions/src/index.ts`**

Add:

```typescript
export { parseLinkedInPdf } from './parse-linkedin-pdf';
```

- [ ] **Step 4: Commit**

```bash
git add functions/src/parse-linkedin-pdf.ts functions/src/index.ts functions/package.json functions/package-lock.json
git commit -m "feat(parser): add LinkedIn PDF parsing Cloud Function"
```

---

### Task 14: Create LinkedIn Import Modal

**Files:**

- Create: `src/components/profile/LinkedInImportModal.tsx`
- Modify: `src/components/profile/tabs/CareerTab.tsx`

This is the main user-facing feature of Phase 3 — a multi-section modal with tabs for each LinkedIn profile section plus PDF upload.

- [ ] **Step 1: Create the import modal component**

```typescript
// src/components/profile/LinkedInImportModal.tsx
import React, { useState, useCallback } from 'react';
import { XMarkIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import { parseLinkedInText } from '@/lib/linkedin-parser';
import { parseLinkedInEducation } from '@/lib/linkedin-parser/education-parser';
import { parseLinkedInSkills } from '@/lib/linkedin-parser/skills-parser';
import { parseLinkedInCertifications } from '@/lib/linkedin-parser/certifications-parser';
import { parseLinkedInLanguages } from '@/lib/linkedin-parser/languages-parser';
import { toEducationEntry, toLanguage, toCertification } from '@/lib/linkedin-parser/transformers';
import { deduplicateExperience, deduplicateSkills } from '@/lib/linkedin-parser/deduplication';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { WorkExperience, EducationEntry, Certification, Language } from '@/types/member';

type TabId = 'experience' | 'education' | 'skills' | 'certifications' | 'languages';

interface LinkedInImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ImportedData) => void;
  existingExperience?: WorkExperience[];
  existingSkills?: string[];
  lang: 'es' | 'en';
}

interface ImportedData {
  experience?: WorkExperience[];
  education?: EducationEntry[];
  skills?: string[];
  certifications?: Certification[];
  languages?: Language[];
}

const TABS: { id: TabId; labelEs: string; labelEn: string }[] = [
  { id: 'experience', labelEs: 'Experiencia', labelEn: 'Experience' },
  { id: 'education', labelEs: 'Educación', labelEn: 'Education' },
  { id: 'skills', labelEs: 'Habilidades', labelEn: 'Skills' },
  { id: 'certifications', labelEs: 'Certificaciones', labelEn: 'Certifications' },
  { id: 'languages', labelEs: 'Idiomas', labelEn: 'Languages' },
];

export const LinkedInImportModal: React.FC<LinkedInImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingExperience = [],
  existingSkills = [],
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('experience');
  const [texts, setTexts] = useState<Record<TabId, string>>({
    experience: '', education: '', skills: '', certifications: '', languages: '',
  });
  const [pdfUploading, setPdfUploading] = useState(false);
  const [preview, setPreview] = useState<ImportedData | null>(null);

  const handleParse = useCallback(() => {
    const data: ImportedData = {};

    if (texts.experience.trim()) {
      const parsed = parseLinkedInText(texts.experience);
      const { newEntries } = deduplicateExperience(existingExperience, parsed);
      data.experience = newEntries.map(e => ({
        id: crypto.randomUUID(),
        company: e.company,
        position: e.position,
        startDate: e.startDate ? new Date(e.startDate.year, e.startDate.month - 1, 1) : new Date(),
        endDate: e.endDate ? new Date(e.endDate.year, e.endDate.month - 1, 1) : undefined,
        current: e.current,
        location: e.location,
      }));
    }
    if (texts.education.trim()) {
      data.education = parseLinkedInEducation(texts.education).map(toEducationEntry);
    }
    if (texts.skills.trim()) {
      data.skills = deduplicateSkills(existingSkills, parseLinkedInSkills(texts.skills));
    }
    if (texts.certifications.trim()) {
      data.certifications = parseLinkedInCertifications(texts.certifications).map(toCertification);
    }
    if (texts.languages.trim()) {
      data.languages = parseLinkedInLanguages(texts.languages).map(toLanguage);
    }

    setPreview(data);
  }, [texts, existingExperience, existingSkills]);

  const handlePdfUpload = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert(lang === 'es' ? 'El archivo excede 5MB' : 'File exceeds 5MB');
      return;
    }
    setPdfUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const functions = getFunctions();
      const parsePdf = httpsCallable(functions, 'parseLinkedInPdf');
      const result = await parsePdf({ pdfData: base64 });
      const { text } = result.data as { text: string };
      // Pre-fill all tabs with the full text — user can switch tabs to refine
      setTexts(prev => ({ ...prev, experience: text }));
    } catch (e) {
      alert(lang === 'es' ? 'Error al procesar el PDF' : 'Failed to process PDF');
    } finally {
      setPdfUploading(false);
    }
  }, [lang]);

  if (!isOpen) return null;

  // Render modal with tabs, text areas, preview, and import button
  // Implementation follows existing modal patterns in the codebase
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {lang === 'es' ? 'Importar desde LinkedIn' : 'Import from LinkedIn'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* PDF Upload */}
        <div className="mb-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-primary-400 dark:border-gray-600">
            <DocumentArrowUpIcon className="h-6 w-6 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {pdfUploading
                ? (lang === 'es' ? 'Procesando...' : 'Processing...')
                : (lang === 'es' ? 'Subir PDF de LinkedIn' : 'Upload LinkedIn PDF')}
            </span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              disabled={pdfUploading}
              onChange={e => e.target.files?.[0] && handlePdfUpload(e.target.files[0])}
            />
          </label>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-3 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {lang === 'es' ? tab.labelEs : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Text area for active tab */}
        <textarea
          className="mb-4 w-full rounded-lg border border-gray-300 p-3 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          rows={8}
          placeholder={lang === 'es'
            ? `Pega tu sección de ${TABS.find(t => t.id === activeTab)?.labelEs} de LinkedIn aquí...`
            : `Paste your LinkedIn ${TABS.find(t => t.id === activeTab)?.labelEn} section here...`}
          value={texts[activeTab]}
          onChange={e => setTexts(prev => ({ ...prev, [activeTab]: e.target.value }))}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
          >
            {lang === 'es' ? 'Cancelar' : 'Cancel'}
          </button>
          {!preview ? (
            <button
              onClick={handleParse}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              {lang === 'es' ? 'Vista previa' : 'Preview'}
            </button>
          ) : (
            <button
              onClick={() => { onImport(preview); onClose(); }}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              {lang === 'es' ? 'Importar datos' : 'Import data'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Integrate into CareerTab**

Replace the existing inline LinkedIn import modal in `CareerTab.tsx` with:

```typescript
import { LinkedInImportModal } from '../LinkedInImportModal';
```

Wire the modal's `onImport` callback to update the form state with imported data.

- [ ] **Step 3: Commit**

```bash
git add src/components/profile/LinkedInImportModal.tsx src/components/profile/tabs/CareerTab.tsx
git commit -m "feat(parser): add multi-section LinkedIn import modal with PDF upload"
```

---

### Task 15: Update Firestore Rules for New Profile Fields

**Files:**

- Modify: `firestore.rules`

- [ ] **Step 1: Check current allowlist**

Read the `hasOnly(...)` list in the user self-update rule (around lines 91-99 of `firestore.rules`).

- [ ] **Step 2: Add new profile array fields to the allowlist**

Add these fields to the `hasOnly` array (these are user-writable profile fields from the enhanced parser):

- `educationHistory` (or whatever field name is used for education entries)
- `certifications`
- `languages`

**Do NOT add** `linkedinVerified` or `linkedinVerifiedAt` — these are intentionally server-only writes via Admin SDK.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "chore(rules): add new profile fields to Firestore user update allowlist"
```

---

### Task 16: Integrate LinkedIn Verified Badge into Profile Views

**Files:**

- Modify: Member directory card component (find via grep for member card/directory)
- Modify: Profile page component
- Modify: Mentorship listing component

- [ ] **Step 1: Find the components that display member info**

```bash
grep -r "displayName\|memberCard\|MemberCard" src/components/ --include="*.tsx" -l
```

- [ ] **Step 2: Add the badge next to member names**

Import and render `LinkedInVerifiedBadge` conditionally:

```typescript
import { LinkedInVerifiedBadge } from '@/components/shared/LinkedInVerifiedBadge';

// In the JSX, next to the member name:
{member.linkedinVerified && <LinkedInVerifiedBadge lang={lang} />}
```

Add to the three locations specified in the spec: member directory cards, profile pages, mentorship listings.

- [ ] **Step 3: Commit**

```bash
git add src/components/
git commit -m "feat(auth): display LinkedIn Verified badge on member profiles"
```

---

### Task 17: Run Full Test Suite and Verify

**Note:** The LinkedIn verification API endpoint (`https://api.linkedin.com/v2/memberVerifications`) and version header should be verified against current LinkedIn documentation at implementation time, as LinkedIn migrates APIs periodically.

- [ ] **Step 1: Run all unit tests**

Run: `npm run test:unit`
Expected: All PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors (fix any that appear)

- [ ] **Step 3: Run type check**

Run: `npm run type-check`
Expected: No errors

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "chore: fix lint and type errors from LinkedIn integration"
```
